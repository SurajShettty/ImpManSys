import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const CARDS = [
  { key: 'total_clients', label: 'Total Clients' },
  { key: 'active_projects', label: 'Active Projects' },
  { key: 'delayed_projects', label: 'Delayed Projects' },
  { key: 'go_live_this_month', label: 'Go-Live This Month' },
  { key: 'total_projects', label: 'Total Projects' },
]

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

  return (
    <div>
      <h2>Dashboard</h2>
      <p className="muted">Welcome, {user?.name || user?.email}.</p>
      {error && <div className="error">{error}</div>}
      <div className="stat-grid">
        {CARDS.map((c) => (
          <div className="card" key={c.key}>
            <p className="stat-label">{c.label}</p>
            <p className="stat-value">{summary ? summary[c.key] : '–'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
