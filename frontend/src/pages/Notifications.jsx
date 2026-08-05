import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Pagination, pageRangeText } from '../components/ui'

const PAGE_SIZE = 20
const TYPE_COLOURS = { due_today: 'amber', overdue: 'red', assigned: 'blue', client_assigned: 'green', meeting_follow_up: 'amber' }
const TYPE_LABELS = { due_today: 'Due today', overdue: 'Overdue', assigned: 'Assigned', client_assigned: 'New client', meeting_follow_up: 'Follow-up' }

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    api
      .get('/notifications/', { params: { page, page_size: PAGE_SIZE } })
      .then((res) => {
        setItems(res.data.items || [])
        setTotal(res.data.total || 0)
        setPages(res.data.pages || 1)
        setUnreadCount(res.data.unread_count || 0)
      })
      .catch(() => setError('Failed to load notifications'))
  }

  useEffect(load, [page])

  const openNotification = async (n) => {
    if (!n.is_read) {
      try {
        await api.post(`/notifications/${n.id}/read`)
      } catch {
        // ignore - navigation still proceeds
      }
    }
    if (n.phase_id) {
      navigate(n.meeting_id ? `/phases/${n.phase_id}?tab=meetings&meeting=${n.meeting_id}` : `/phases/${n.phase_id}`)
    } else if (n.client_id) navigate(`/clients/${n.client_id}`)
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      load()
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Notifications</h2>
        <button className="btn btn-light btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all read
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      <p className="muted">{pageRangeText(page, PAGE_SIZE, total, 'notifications')}</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Message</th>
              <th>Client</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr
                key={n.id}
                onClick={() => openNotification(n)}
                style={{ cursor: 'pointer', fontWeight: n.is_read ? 'normal' : 600 }}
              >
                <td><span className={`badge badge-${TYPE_COLOURS[n.type] || 'grey'}`}>{TYPE_LABELS[n.type] || n.type}</span></td>
                <td>{n.message}</td>
                <td>{n.client_name || '—'}</td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{new Date(n.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ textAlign: 'center' }}>
                  No notifications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  )
}
