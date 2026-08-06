import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { StatusBadge, ProgressBar } from '../../components/ui'

export default function PortalOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .get('/portal/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load your overview'))
      .finally(() => setLoading(false))
  }, [])

  if (loading && !data) {
    return <div className="container">Loading...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!data) return null

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>{data.client_name}</h2>
          <p className="muted">Your implementation progress with Digii.</p>
        </div>
      </div>

      <div className="dashboard-stat-grid">
        <div className="dashboard-stat-card dashboard-stat-blue">
          <p className="stat-label">Overall Progress</p>
          <p className="stat-value">{data.overall_progress}%</p>
        </div>
        <div className="dashboard-stat-card dashboard-stat-green">
          <p className="stat-label">Phases</p>
          <p className="stat-value">{data.phase_count}</p>
        </div>
        <div className="dashboard-stat-card dashboard-stat-amber">
          <p className="stat-label">Open Activities</p>
          <p className="stat-value">{data.open_activities}</p>
        </div>
        <div className="dashboard-stat-card">
          <p className="stat-label">Go-Live Date</p>
          <p className="stat-value" style={{ fontSize: '1.1rem' }}>
            {data.agreed_go_live_date || data.go_live_date || '—'}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="dashboard-card-header">
          <h3>Phases</h3>
        </div>
        {data.phases.length === 0 ? (
          <div className="empty-state compact">
            <h3>No phases yet</h3>
            <p className="muted">Your implementation phases will appear here once set up.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.phases.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/portal/phases/${p.id}`}>{p.name}</Link></td>
                    <td><StatusBadge value={p.status} /></td>
                    <td style={{ minWidth: 160 }}><ProgressBar value={p.progress} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="dashboard-card-header">
          <h3>Upcoming Meetings</h3>
        </div>
        {data.upcoming_meetings.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nothing scheduled</h3>
            <p className="muted">No upcoming meeting follow-ups.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Phase</th>
                  <th>Follow-up Date</th>
                </tr>
              </thead>
              <tbody>
                {data.upcoming_meetings.map((m) => (
                  <tr key={m.id}>
                    <td>{m.title}</td>
                    <td><Link to={`/portal/phases/${m.phase_id}`}>{m.phase_name}</Link></td>
                    <td>{m.next_follow_up}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
