import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { StatusBadge, ProgressBar } from '../../components/ui'

export default function PortalPhases() {
  const [phases, setPhases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/portal/phases')
      .then((res) => setPhases(res.data))
      .catch(() => setError('Failed to load phases'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h2>Phases</h2>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="container">Loading...</div>
      ) : phases.length === 0 ? (
        <div className="empty-state compact">
          <h3>No phases yet</h3>
          <p className="muted">Your implementation phases will appear here once set up.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/portal/phases/${p.id}`}>{p.name}</Link></td>
                    <td>{p.type}</td>
                    <td><StatusBadge value={p.status} /></td>
                    <td style={{ minWidth: 160 }}><ProgressBar value={p.progress} /></td>
                    <td className="muted">{p.start_date || '—'}</td>
                    <td className="muted">{p.end_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
