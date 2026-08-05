import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge, ProgressBar } from '../components/ui'

const CARDS = [
  { key: 'clients', label: 'My Clients', note: 'Assigned to you as CSM/RM', tone: 'blue' },
  { key: 'overdue_follow_ups', label: 'Follow-ups Due', note: 'Due today or overdue', tone: 'red' },
  { key: 'activities_due', label: 'Activities Due', note: 'Due today or overdue', tone: 'amber' },
  { key: 'delayed_phases', label: 'Delayed Phases', note: 'Past planned end date', tone: 'red' },
  { key: 'go_live_soon', label: 'Go-Live Soon', note: 'Within the next 30 days', tone: 'green' },
]

export default function MyClients() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completing, setCompleting] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError('')
    api
      .get('/workspace/my-clients')
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load your workspace'))
      .finally(() => setLoading(false))
  }, [])

  const counts = data?.counts || {}

  const markFollowUpDone = async (f) => {
    setCompleting(f.meeting_id)
    setError('')
    try {
      await api.put(`/phases/${f.phase_id}/meetings/${f.meeting_id}`, { next_follow_up: null })
      setData((prev) => {
        const remaining = prev.follow_ups.filter((row) => row.meeting_id !== f.meeting_id)
        const wasDue = f.overdue || f.due_today
        return {
          ...prev,
          follow_ups: remaining,
          counts: {
            ...prev.counts,
            overdue_follow_ups: wasDue ? prev.counts.overdue_follow_ups - 1 : prev.counts.overdue_follow_ups,
          },
        }
      })
    } catch (err) {
      setError('Failed to mark follow-up as done')
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>My Worklist</h2>
          <p className="muted">Follow-ups, overdue work, and delayed phases across your assigned clients.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="dashboard-stat-grid">
        {loading && !data
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
              <p className="stat-value">{data ? counts[c.key] : '-'}</p>
              <p className="muted">{c.note}</p>
            </div>
          ))}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="dashboard-card-header">
          <h3>Meeting Follow-ups</h3>
        </div>
        {!data || data.follow_ups.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nothing due</h3>
            <p className="muted">No meeting follow-ups in the next 14 days.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Phase</th>
                  <th>Client</th>
                  <th>Follow-up Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.follow_ups.map((f) => (
                  <tr key={f.meeting_id}>
                    <td><Link to={`/phases/${f.phase_id}?tab=meetings&meeting=${f.meeting_id}`}>{f.title}</Link></td>
                    <td><Link to={`/phases/${f.phase_id}`}>{f.phase_name}</Link></td>
                    <td><Link to={`/clients/${f.client_id}`}>{f.client_name}</Link></td>
                    <td>{f.next_follow_up}</td>
                    <td>
                      {f.overdue ? (
                        <span className="badge badge-red">Overdue</span>
                      ) : f.due_today ? (
                        <span className="badge badge-amber">Due today</span>
                      ) : (
                        <span className="badge badge-grey">Upcoming</span>
                      )}
                    </td>
                    <td className="actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="mark-done-btn"
                        onClick={() => markFollowUpDone(f)}
                        disabled={completing === f.meeting_id}
                      >
                        {completing === f.meeting_id ? (
                          <>
                            <span className="mark-done-spinner" aria-hidden="true" />
                            Marking…
                          </>
                        ) : (
                          <>
                            <svg className="mark-done-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path
                                d="M3.5 8.5L6.5 11.5L12.5 4.5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Mark as Done
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="dashboard-card-header">
          <h3>Activities Needing Attention</h3>
        </div>
        {!data || data.activities_due.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nothing overdue</h3>
            <p className="muted">No activities due today or overdue across your clients.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Module</th>
                  <th>Phase</th>
                  <th>Client</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.activities_due.map((a) => (
                  <tr key={a.id} className={a.overdue ? 'task-overdue' : ''}>
                    <td>
                      <Link to={`/phases/${a.phase_id}?tab=overview&module=${a.phase_module_id}&activity=${a.id}`}>
                        {a.title}
                      </Link>
                    </td>
                    <td>
                      {a.module_name ? (
                        <Link to={`/phases/${a.phase_id}?tab=overview&module=${a.phase_module_id}`}>{a.module_name}</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td><Link to={`/phases/${a.phase_id}`}>{a.phase_name}</Link></td>
                    <td><Link to={`/clients/${a.client_id}`}>{a.client_name}</Link></td>
                    <td>
                      {a.due_date}
                      {a.overdue && <span className="badge badge-red" style={{ marginLeft: '0.35rem' }}>Overdue</span>}
                    </td>
                    <td><StatusBadge value={a.status} /></td>
                    <td><PriorityBadge value={a.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="dashboard-card-header">
          <h3>Delayed Phases</h3>
        </div>
        {!data || data.delayed_phases.length === 0 ? (
          <div className="empty-state compact">
            <h3>Nothing delayed</h3>
            <p className="muted">No phases past their planned end date.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Client</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.delayed_phases.map((p) => (
                  <tr key={p.id} className="task-overdue">
                    <td><Link to={`/phases/${p.id}`}>{p.name}</Link></td>
                    <td><Link to={`/clients/${p.client_id}`}>{p.client_name}</Link></td>
                    <td>{p.end_date}</td>
                    <td><StatusBadge value={p.status} /></td>
                    <td style={{ minWidth: 120 }}><ProgressBar value={p.progress} /></td>
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
