import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { ProgressBar } from '../components/ui'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showExcluded, setShowExcluded] = useState(false)

  useEffect(() => {
    api
      .get('/analytics/summary')
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="container">Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!data) return null

  const ttgl = data.time_to_go_live
  const totalClients = ttgl.included.length + ttgl.excluded.length

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Analytics</h2>
          <p className="muted">Time-to-go-live and module bottleneck trends across your clients.</p>
        </div>
      </div>

      <div className="card">
        <div className="dashboard-card-header">
          <h3>Average Time to Go-Live</h3>
        </div>
        {ttgl.included.length === 0 ? (
          <div className="empty-state compact">
            <h3>No clients have gone live yet</h3>
            <p className="muted">This fills in once a client's implementation state reaches "Go Live".</p>
          </div>
        ) : (
          <>
            <p className="stat-value" style={{ fontSize: '2rem' }}>{ttgl.average_days} days</p>
            <p className="muted">
              Based on {ttgl.included.length} of {totalClients} live client{totalClients === 1 ? '' : 's'}
              {ttgl.excluded.length > 0 && ` — ${ttgl.excluded.length} excluded (insufficient or inconsistent dates)`}
            </p>
            <div className="table-scroll" style={{ marginTop: '0.75rem' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Days</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {ttgl.included.map((r) => (
                    <tr key={r.client_id}>
                      <td><Link to={`/clients/${r.client_id}`}>{r.client_name}</Link></td>
                      <td>{r.days}</td>
                      <td className="muted">{r.start_date}</td>
                      <td className="muted">{r.end_date}</td>
                      <td><span className="badge badge-grey">{r.basis}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ttgl.excluded.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setShowExcluded((s) => !s)}>
                  {showExcluded ? 'Hide' : 'Show'} excluded clients
                </button>
                {showExcluded && (
                  <ul style={{ marginTop: '0.5rem' }}>
                    {ttgl.excluded.map((r) => (
                      <li key={r.client_id} className="muted">
                        <Link to={`/clients/${r.client_id}`}>{r.client_name}</Link> — {r.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="dashboard-card-header">
          <h3>Module Bottlenecks</h3>
        </div>
        {data.module_bottlenecks.length === 0 ? (
          <div className="empty-state compact">
            <h3>No modules in use yet</h3>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Instances</th>
                  <th>Completion Rate</th>
                  <th>Stuck</th>
                  <th>Overdue Activities</th>
                </tr>
              </thead>
              <tbody>
                {data.module_bottlenecks.map((m, i) => (
                  <tr key={m.module_id} className={i < 3 && m.overdue_activity_count > 0 ? 'task-overdue' : ''}>
                    <td>{m.module_name}</td>
                    <td className="muted">{m.instance_count}</td>
                    <td style={{ minWidth: 140 }}><ProgressBar value={m.completion_rate} /></td>
                    <td className="muted">{m.stuck_count}</td>
                    <td>
                      {m.overdue_activity_count}
                      {m.overdue_activity_count > 0 && (
                        <span className="badge badge-red" style={{ marginLeft: '0.35rem' }}>Overdue</span>
                      )}
                    </td>
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
