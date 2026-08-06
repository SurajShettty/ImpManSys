import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../api/client'
import { StatusBadge, PriorityBadge, ProgressBar } from '../../components/ui'

function ActivityCard({ activity, onToggleChecklist, onSaveResponse }) {
  const [response, setResponse] = useState(activity.client_response || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = response !== (activity.client_response || '')

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await onSaveResponse(activity.id, response)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <strong>{activity.title}</strong>
        <PriorityBadge value={activity.priority} />
        <StatusBadge value={activity.status} />
        {activity.uat_proposed && <span className="badge badge-blue">UAT Proposed</span>}
        {activity.due_date && <span className="muted">Due {activity.due_date}</span>}
      </div>

      {activity.description && <p className="muted" style={{ marginTop: '0.5rem' }}>{activity.description}</p>}

      <div style={{ marginTop: '0.5rem', maxWidth: 320 }}>
        <ProgressBar value={activity.progress} />
      </div>

      {activity.checklist_items.length > 0 && (
        <ul className="checklist" style={{ marginTop: '0.75rem' }}>
          {activity.checklist_items.map((ci) => (
            <li key={ci.id}>
              <input
                type="checkbox"
                checked={ci.completed}
                onChange={(e) => onToggleChecklist(ci.id, e.target.checked)}
              />
              <span style={{ flex: 1 }}>{ci.item}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="form-group" style={{ marginTop: '0.75rem' }}>
        <label>Your response</label>
        <textarea
          rows={2}
          value={response}
          onChange={(e) => { setResponse(e.target.value); setSaved(false) }}
          placeholder="Add a comment or confirmation for this item…"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && !dirty && <span className="muted">Saved</span>}
        </div>
      </div>
    </div>
  )
}

export default function PortalPhaseDetail() {
  const { id } = useParams()
  const [phase, setPhase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    api
      .get(`/portal/phases/${id}`)
      .then((res) => setPhase(res.data))
      .catch(() => setError('Failed to load this phase'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const toggleChecklist = async (itemId, completed) => {
    setPhase((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => ({
        ...m,
        activities: m.activities.map((a) => ({
          ...a,
          checklist_items: a.checklist_items.map((ci) => (ci.id === itemId ? { ...ci, completed } : ci)),
        })),
      })),
    }))
    try {
      await api.patch(`/portal/checklist-items/${itemId}`, { completed })
    } catch {
      load()
    }
  }

  const saveResponse = async (activityId, client_response) => {
    await api.patch(`/portal/activities/${activityId}/response`, { client_response })
    setPhase((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => ({
        ...m,
        activities: m.activities.map((a) => (a.id === activityId ? { ...a, client_response } : a)),
      })),
    }))
  }

  if (loading) return <div className="container">Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!phase) return null

  return (
    <div>
      <Link to="/portal/phases" className="muted">‹ Back to phases</Link>

      <div className="page-header" style={{ marginTop: '0.5rem' }}>
        <div>
          <h2>{phase.name}</h2>
          {phase.description && <p className="muted">{phase.description}</p>}
        </div>
        <StatusBadge value={phase.status} />
      </div>

      <div style={{ maxWidth: 400, marginBottom: '1rem' }}>
        <ProgressBar value={phase.progress} />
      </div>

      {phase.modules.length === 0 ? (
        <div className="empty-state compact">
          <h3>Nothing here yet</h3>
          <p className="muted">Modules and activities will appear here once your implementation plan is set up.</p>
        </div>
      ) : (
        phase.modules.map((m) => (
          <div key={m.id} style={{ marginBottom: '1.5rem' }}>
            <div className="dashboard-card-header">
              <h3>{m.module_name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <StatusBadge value={m.status} />
                <span style={{ minWidth: 140, display: 'inline-block' }}><ProgressBar value={m.progress} /></span>
              </div>
            </div>
            {m.activities.length === 0 ? (
              <p className="muted">No activities in this module yet.</p>
            ) : (
              m.activities.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  onToggleChecklist={toggleChecklist}
                  onSaveResponse={saveResponse}
                />
              ))
            )}
          </div>
        ))
      )}
    </div>
  )
}
