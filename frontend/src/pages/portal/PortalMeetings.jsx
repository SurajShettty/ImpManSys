import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'

export default function PortalMeetings() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    api
      .get('/portal/meetings')
      .then((res) => setMeetings(res.data))
      .catch(() => setError('Failed to load meetings'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h2>Meetings</h2>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="container">Loading...</div>
      ) : meetings.length === 0 ? (
        <div className="empty-state compact">
          <h3>No meetings shared yet</h3>
          <p className="muted">Meeting notes your CSM shares with you will appear here.</p>
        </div>
      ) : (
        <div className="card">
          <div className="meetings-list">
            {meetings.map((m) => {
              const isExpanded = !!expanded[m.id]
              return (
                <div className="meeting-card" key={m.id}>
                  <div className="meeting-summary">
                    <button
                      type="button"
                      className="meeting-toggle"
                      onClick={() => setExpanded((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                      aria-label={isExpanded ? 'Collapse meeting' : 'Expand meeting'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <div className="meeting-summary-text">
                      <strong className="meeting-title">{m.title}</strong>
                      <span className="muted">{m.meeting_date}</span>
                      {m.participants && <span className="muted">• {m.participants}</span>}
                    </div>
                    {m.phase?.name && (
                      <div className="actions">
                        <Link to={`/portal/phases/${m.phase_id}`} className="btn btn-light btn-sm">
                          {m.phase.name}
                        </Link>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="meeting-details">
                      {m.discussion && (
                        <div className="meeting-field">
                          <span className="meeting-label">Discussion / MoM</span>
                          <p>{m.discussion}</p>
                        </div>
                      )}
                      {m.decisions && (
                        <div className="meeting-field">
                          <span className="meeting-label">Decisions</span>
                          <p>{m.decisions}</p>
                        </div>
                      )}
                      {m.action_items && (
                        <div className="meeting-field">
                          <span className="meeting-label">Action Items</span>
                          <p>{m.action_items}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
