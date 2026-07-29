import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, ProgressBar } from '../components/ui'

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

  const load = () => {
    setError('')
    Promise.all([api.get('/phases/'), api.get('/clients/')])
      .then(([p, c]) => {
        setPhases(p.data)
        setClients(c.data)
      })
      .catch(() => setError('Failed to load phases'))
  }

  useEffect(() => {
    load()
  }, [])

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map((cl) => [cl.id, cl.name])),
    [clients]
  )

  const filtered = useMemo(() => {
    return phases.filter((p) => {
      if (filters.client_id && p.client_id !== Number(filters.client_id)) return false
      if (filters.status && p.status !== filters.status) return false
      if (filters.type && p.type !== filters.type) return false
      if (filters.from && (!p.start_date || p.start_date < filters.from)) return false
      if (filters.to && (!p.end_date || p.end_date > filters.to)) return false
      return true
    })
  }, [phases, filters])

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  const clearFilters = () =>
    setFilters({ client_id: '', status: '', type: '', from: '', to: '' })

  const deletePhase = async (phase) => {
    if (!window.confirm(`Delete phase "${phase.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`/phases/${phase.id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete phase')
    }
  }

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
      <p className="muted">{filtered.length} of {phases.length} phases</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>End Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/phases/${p.id}`}>{p.name}</Link></td>
                <td>{clientMap[p.client_id] || '—'}</td>
                <td>{p.type}</td>
                <td><StatusBadge value={p.status} /></td>
                <td><ProgressBar value={p.progress} /></td>
                <td>{p.end_date || '—'}</td>
                <td>
                  <div className="actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePhase(p)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center' }}>No phases match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
