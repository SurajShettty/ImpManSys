import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, ProgressBar, Pagination, pageRangeText } from '../components/ui'

const PAGE_SIZE = 20
const PHASE_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const PHASE_TYPES = [
  'New Implementation',
  'Additional Module',
  'Migration',
  'Upgrade',
  'Feature Rollout',
  'Integration',
  'Custom Development',
]

export default function Phases() {
  const [phases, setPhases] = useState([])
  const [clients, setClients] = useState([])
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    client_id: '',
    status: '',
    type: '',
    from: '',
    to: '',
  })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const load = () => {
    setError('')
    const params = { page, page_size: PAGE_SIZE }
    if (filters.client_id) params.client_id = filters.client_id
    if (filters.status) params.status = filters.status
    if (filters.type) params.type = filters.type
    if (filters.from) params.start_from = filters.from
    if (filters.to) params.end_by = filters.to
    api
      .get('/phases/', { params })
      .then((res) => {
        setPhases(res.data.items || [])
        setTotal(res.data.total || 0)
        setPages(res.data.pages || 1)
      })
      .catch(() => setError('Failed to load phases'))
  }

  useEffect(load, [filters, page])

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [filters])

  // The client filter dropdown needs every client, independent of the phase list's pagination.
  useEffect(() => {
    api
      .get('/clients/', { params: { page_size: 100 } })
      .then((res) => setClients(res.data.items || []))
      .catch(() => {})
  }, [])

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((cl) => [cl.id, cl.name])),
    [clients]
  )

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  const clearFilters = () =>
    setFilters({ client_id: '', status: '', type: '', from: '', to: '' })

  return (
    <div>
      <div className="page-header">
        <h2>Phases</h2>
        <span className="muted">Create phases from a client's page</span>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div>
            <label>Client</label>
            <select value={filters.client_id} onChange={set('client_id')}>
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={filters.status} onChange={set('status')}>
              <option value="">All statuses</option>
              {PHASE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Type</label>
            <select value={filters.type} onChange={set('type')}>
              <option value="">All types</option>
              {PHASE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Start from</label>
            <input type="date" value={filters.from} onChange={set('from')} />
          </div>
          <div>
            <label>End by</label>
            <input type="date" value={filters.to} onChange={set('to')} />
          </div>
          <div>
            <label>&nbsp;</label>
            <button type="button" className="btn btn-light" onClick={clearFilters} style={{ width: '100%' }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      <p className="muted">{pageRangeText(page, PAGE_SIZE, total, 'phases')}</p>

      <div className="card" style={{ padding: 0, overflow: 'visible' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>End Date</th>
              <th>Modules</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => {
              const modules = (p.module_names || p.modules || [])
                .map((module) => (typeof module === 'string' ? module : module?.name))
                .filter(Boolean)
              const visibleModules = modules.slice(0, 3)
              const hiddenCount = modules.length - visibleModules.length
              return (
                <tr key={p.id}>
                  <td><Link to={`/phases/${p.id}`}>{p.name}</Link></td>
                  <td>{clientMap[p.client_id] || '—'}</td>
                  <td>{p.type}</td>
                  <td><StatusBadge value={p.status} /></td>
                  <td><ProgressBar value={p.progress} /></td>
                  <td>{p.end_date || '—'}</td>
                  <td>
                    <div className="module-badges">
                      {visibleModules.map((name) => (
                        <span className="badge badge-grey module-badge" key={name}>{name}</span>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="badge badge-blue module-more" title={modules.join(', ')}>
                          +{hiddenCount}
                          <span className="module-tooltip">{modules.join(', ')}</span>
                        </span>
                      )}
                      {modules.length === 0 && <span className="muted">—</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {phases.length === 0 && (
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center' }}>No phases match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  )
}
