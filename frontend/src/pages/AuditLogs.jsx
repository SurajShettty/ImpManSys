import React, { useEffect, useState } from 'react'
import api from '../api/client'

const ENTITIES = ['client', 'project', 'project_module', 'module', 'task', 'phase', 'user']
const ACTIONS = ['create', 'update', 'delete', 'restore']
const PAGE_SIZE = 20

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({ entity: '', action: '', user_id: '' })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    const params = { page, page_size: PAGE_SIZE }
    if (filters.entity) params.entity = filters.entity
    if (filters.action) params.action = filters.action
    if (filters.user_id) params.user_id = filters.user_id
    api
      .get('/audit-logs/', { params })
      .then((res) => {
        setLogs(res.data.items || [])
        setTotal(res.data.total || 0)
        setPages(res.data.pages || 1)
      })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load audit logs'))
  }

  useEffect(() => {
    load()
  }, [filters, page])

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [filters])

  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data)).catch(() => {})
  }, [])

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const clear = () => setFilters({ entity: '', action: '', user_id: '' })

  const userName = (id) => users.find((u) => u.id === id)?.name || `#${id}`

  const actionBadge = (action) => {
    const cls =
      action === 'delete'
        ? 'badge-red'
        : action === 'create'
        ? 'badge-green'
        : action === 'restore'
        ? 'badge-theme'
        : 'badge-amber'
    return <span className={`badge ${cls}`}>{action}</span>
  }

  const hasFilters = filters.entity || filters.action || filters.user_id
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  const pageNumbers = []
  const maxButtons = 7
  let from = Math.max(1, page - 3)
  let to = Math.min(pages, from + maxButtons - 1)
  from = Math.max(1, to - maxButtons + 1)
  for (let i = from; i <= to; i++) pageNumbers.push(i)

  return (
    <div>
      <div className="page-header">
        <h2>Audit Logs</h2>
      </div>

      <div className="card filter-bar">
        <div className="filter-group">
          <label>Entity</label>
          <select value={filters.entity} onChange={set('entity')}>
            <option value="">All entities</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{e.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Action</label>
          <select value={filters.action} onChange={set('action')}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>User</label>
          <select value={filters.user_id} onChange={set('user_id')}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button type="button" className="btn btn-light btn-sm filter-clear" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      <p className="muted">
        {total === 0 ? 'No entries' : `Showing ${start}–${end} of ${total} entries`}
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Entity</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td>{log.user_id ? userName(log.user_id) : '—'}</td>
                <td><span className="badge badge-grey">{log.entity}</span></td>
                <td>{actionBadge(log.action)}</td>
                <td>{log.details || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                  No audit log entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-light btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ‹ Prev
          </button>
          {from > 1 && (
            <>
              <button className="pagination-btn" onClick={() => setPage(1)}>1</button>
              {from > 2 && <span className="pagination-ellipsis">…</span>}
            </>
          )}
          {pageNumbers.map((n) => (
            <button
              key={n}
              className={`pagination-btn ${n === page ? 'active' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          {to < pages && (
            <>
              {to < pages - 1 && <span className="pagination-ellipsis">…</span>}
              <button className="pagination-btn" onClick={() => setPage(pages)}>{pages}</button>
            </>
          )}
          <button
            className="btn btn-light btn-sm"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  )
}
