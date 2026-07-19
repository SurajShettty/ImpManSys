import React, { useEffect, useRef, useState } from 'react'
import api from '../api/client'

function formatRemaining(expiresAt, now) {
  if (!expiresAt) return '—'
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function Section({ title, entity, items, render, restoring, onRestore, now }) {
  if (!items || items.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <table className="table">
        <tbody>
          {items.map((item) => {
            const remaining = formatRemaining(item.expires_at, now)
            const expired = remaining === 'Expired'
            return (
              <tr key={item.id}>
                <td>{render(item)}</td>
                <td className="muted" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                  {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '—'}
                </td>
                <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                  <span className={`countdown ${expired ? 'expired' : ''}`}>
                    {expired ? 'Expired' : `${remaining} left`}
                  </span>
                </td>
                <td style={{ width: '1%' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onRestore(entity, item.id)}
                    disabled={expired || restoring === `${entity}-${item.id}`}
                  >
                    {restoring === `${entity}-${item.id}` ? 'Restoring…' : 'Restore'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function RecycleBin() {
  const [bin, setBin] = useState(null)
  const [error, setError] = useState('')
  const [restoring, setRestoring] = useState('')
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef(null)

  const load = () => {
    setError('')
    api
      .get('/recycle-bin/')
      .then((res) => setBin(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load recycle bin'))
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const restore = async (entity, id) => {
    setRestoring(`${entity}-${id}`)
    setError('')
    try {
      await api.post(`/recycle-bin/restore/${entity}/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to restore item')
    } finally {
      setRestoring('')
    }
  }

  const empty =
    bin &&
    bin.clients.length === 0 &&
    bin.projects.length === 0 &&
    bin.tasks.length === 0 &&
    bin.users.length === 0

  return (
    <div>
      <div className="page-header">
        <h2>Recycle Bin</h2>
        <span className="muted">Items can be restored within 12 hours of deletion</span>
      </div>
      {error && <div className="error">{error}</div>}
      {!bin && <div className="muted">Loading…</div>}
      {empty && <div className="muted">Recycle bin is empty. Deleted items will appear here for 12 hours.</div>}

      {bin && (
        <>
          <Section
            title="Clients"
            entity="clients"
            items={bin.clients}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(c) => (
              <>
                <strong>{c.name}</strong>
                {c.crm_id && <span className="muted"> · {c.crm_id}</span>}
              </>
            )}
          />
          <Section
            title="Projects"
            entity="projects"
            items={bin.projects}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(p) => (
              <>
                <strong>{p.name}</strong>
                {p.client_name && <span className="muted"> · {p.client_name}</span>}
                {p.client_deleted && (
                  <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}>
                    Client deleted — restore client first
                  </span>
                )}
              </>
            )}
          />
          <Section
            title="Tasks"
            entity="tasks"
            items={bin.tasks}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(t) => (
              <>
                <strong>{t.title}</strong>
                <span className="muted"> · {t.project_name}</span>
              </>
            )}
          />
          <Section
            title="Users"
            entity="users"
            items={bin.users}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(u) => (
              <>
                <strong>{u.name}</strong>
                <span className="muted"> · {u.email}</span>
              </>
            )}
          />
        </>
      )}
    </div>
  )
}
