import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const CARDS = [
  { key: 'total_clients', label: 'Total Clients', note: 'Live client records', tone: 'blue' },
  { key: 'active_phases', label: 'Active Phases', note: 'Not started, in progress, or on hold', tone: 'green' },
  { key: 'delayed_phases', label: 'Delayed Phases', note: 'Past planned end date', tone: 'red' },
  { key: 'go_live_this_month', label: 'Go-Live This Month', note: 'Clients due this month', tone: 'amber' },
  { key: 'total_phases', label: 'Total Phases', note: 'All implementation phases', tone: 'grey' },
]

const CLIENT_STATUSES = ['Active', 'On Hold', 'Completed', 'Churned']
const PHASE_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const REGIONS = ['North', 'South', 'East', 'West', 'Central']

function pct(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({ client_status: '', region: '', phase_status: '', owner_id: '' })

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''))
    setLoading(true)
    setError('')
    api
      .get('/dashboard/summary', { params })
      .then((res) => setSummary(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data)).catch(() => setUsers([]))
  }, [])

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value })
  const clearFilters = () => setFilters({ client_status: '', region: '', phase_status: '', owner_id: '' })
  const hasFilters = Object.values(filters).some(Boolean)

  const activePhases = summary?.active_phases || 0
  const delayedPhases = summary?.delayed_phases || 0
  const totalPhases = summary?.total_phases || 0
  const totalClients = summary?.total_clients || 0
  const delayedPct = pct(delayedPhases, totalPhases)
  const activePct = pct(activePhases, totalPhases)
  const avgPhases = totalClients ? (totalPhases / totalClients).toFixed(1) : '0.0'

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Welcome, {user?.name || user?.email}.</p>
        </div>
        <div className="dashboard-actions">
          <Link className="btn btn-light btn-sm" to="/phases">View Phases</Link>
          <Link className="btn btn-primary btn-sm" to="/clients">View Clients</Link>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginTop: '-0.25rem' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div>
            <label>Client Status</label>
            <select value={filters.client_status} onChange={setFilter('client_status')}>
              <option value="">All statuses</option>
              {CLIENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label>Region</label>
            <select value={filters.region} onChange={setFilter('region')}>
              <option value="">All regions</option>
              {REGIONS.map((region) => <option key={region}>{region}</option>)}
            </select>
          </div>
          <div>
            <label>Phase Status</label>
            <select value={filters.phase_status} onChange={setFilter('phase_status')}>
              <option value="">All phase statuses</option>
              {PHASE_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          {users.length > 0 && (
            <div>
              <label>Owner</label>
              <select value={filters.owner_id} onChange={setFilter('owner_id')}>
                <option value="">All CSMs / PMs</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label>&nbsp;</label>
            <button type="button" className="btn btn-light" onClick={clearFilters} disabled={!hasFilters} style={{ width: '100%' }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-stat-grid">
        {loading && !summary
          ? CARDS.map((c) => (
            <div className="dashboard-stat-card" key={c.key}>
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-value" />
              <div className="skeleton skeleton-line" />
            </div>
          ))
          : CARDS.map((c) => (
            <div className={`dashboard-stat-card dashboard-stat-${c.tone}`} key={c.key}>
              <p className="stat-label">{c.label}</p>
              <p className="stat-value">{summary ? summary[c.key] : '-'}</p>
              <p className="muted">{c.note}</p>
            </div>
          ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="dashboard-card-header">
            <h3>Delivery Health</h3>
            <span className={`badge ${delayedPhases > 0 ? 'badge-red' : 'badge-green'}`}>
              {delayedPhases > 0 ? `${delayedPhases} delayed` : 'On track'}
            </span>
          </div>
          <div className="dashboard-health-bars">
            <div>
              <div className="dashboard-row-label">
                <span>Active phases</span>
                <strong>{activePct}%</strong>
              </div>
              <div className="dashboard-meter">
                <div className="dashboard-meter-fill dashboard-meter-green" style={{ width: `${activePct}%` }} />
              </div>
            </div>
            <div>
              <div className="dashboard-row-label">
                <span>Delayed phases</span>
                <strong>{delayedPct}%</strong>
              </div>
              <div className="dashboard-meter">
                <div className="dashboard-meter-fill dashboard-meter-red" style={{ width: `${delayedPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="dashboard-card-header">
            <h3>Implementation Load</h3>
          </div>
          <div className="dashboard-insight-list">
            <div>
              <span className="stat-label">Average phases per client</span>
              <strong>{avgPhases}</strong>
            </div>
            <div>
              <span className="stat-label">Go-lives this month</span>
              <strong>{summary?.go_live_this_month ?? '-'}</strong>
            </div>
            <div>
              <span className="stat-label">Total active workload</span>
              <strong>{activePhases}</strong>
            </div>
          </div>
        </div>

        <div className="card dashboard-quick-card">
          <div className="dashboard-card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="dashboard-quick-actions">
            <Link to="/clients">Open client tracker</Link>
            <Link to="/phases">Review phase progress</Link>
            <Link to="/search">Search records</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
