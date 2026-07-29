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

function pct(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export default function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/dashboard/summary')
      .then((res) => setSummary(res.data))
      .catch(() => setError('Failed to load dashboard'))
  }, [])

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

      <div className="dashboard-stat-grid">
        {CARDS.map((c) => (
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
