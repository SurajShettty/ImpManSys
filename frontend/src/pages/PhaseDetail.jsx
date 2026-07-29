import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge, ProgressBar } from '../components/ui'
import { ModuleTimeline, GanttTimeline } from '../components/Timeline'

const ACTIVITY_STATUSES = [
  'Not Started',
  'In Progress',
  'Waiting for Client',
  'Waiting for Internal Team',
  'Blocked',
  'Under Testing',
  'Completed',
  'Cancelled',
]

const ACTIVITY_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

const PHASE_TYPES = [
  'New Implementation',
  'Additional Module',
  'Migration',
  'Upgrade',
  'Feature Rollout',
  'Integration',
  'Custom Development',
]

const PHASE_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']

const EDITABLE_FIELDS = ['name', 'description', 'type', 'status', 'start_date', 'end_date']

const EMPTY_MEETING = {
  title: '',
  meeting_date: '',
  participants: '',
  discussion: '',
  decisions: '',
  action_items: '',
  next_follow_up: '',
}

const ACTIVITY_CATEGORIES = ['Regular', 'Custom Development', 'Enhancement']

const EMPTY_ACTIVITY_DETAIL = {
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Not Started',
  start_date: '',
  due_date: '',
  estimated_hours: '',
  actual_hours: '',
  progress: 0,
  owner_id: '',
  reviewer_id: '',
  client_spoc: '',
  client_spoc_email: '',
  client_spoc_phone: '',
  uat_proposed: false,
  delay_reason: '',
  client_response: '',
  internal_response: '',
  external_link: '',
  category: 'Regular',
  proposed_timeline: '',
  module_status: '',
}

function toForm(phase) {
  const f = {}
  for (const key of EDITABLE_FIELDS) {
    f[key] = phase[key] == null ? '' : phase[key]
  }
  return f
}

export default function PhaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState(null)
  const [plan, setPlan] = useState([])
  const [catalog, setCatalog] = useState([])
  const [expanded, setExpanded] = useState({})
  const [selectedModule, setSelectedModule] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [newChecklist, setNewChecklist] = useState({})
  const [meetings, setMeetings] = useState([])
  const [meetingModalOpen, setMeetingModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [meetingForm, setMeetingForm] = useState(EMPTY_MEETING)
  const [savingMeeting, setSavingMeeting] = useState(false)
  const [expandedMeetings, setExpandedMeetings] = useState({})
  const [activityModalOpen, setActivityModalOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null)
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY_DETAIL)
  const [savingActivity, setSavingActivity] = useState(false)

  const loadPlan = () =>
    Promise.all([api.get(`/phases/${id}`), api.get(`/phases/${id}/plan`), api.get(`/phases/${id}/meetings`)]).then(
      ([p, pl, m]) => {
        setPhase(p.data)
        setPlan(pl.data)
        setMeetings(m.data)
      }
    )

  const load = () => {
    Promise.all([loadPlan(), api.get('/modules/')])
      .then(([, cat]) => setCatalog(cat.data))
      .catch(() => setError('Failed to load phase'))
  }

  useEffect(load, [id])

  const usedModuleIds = new Set(plan.map((pm) => pm.module_id))
  // Kickoff is auto-created for every phase; don't offer it in the add-module dropdown.
  const available = catalog.filter((m) => !usedModuleIds.has(m.id) && m.name !== 'Kickoff')
  const moduleGroups = available.reduce((groups, m) => {
    const cat = m.category || 'Other'
    const existing = groups.find(([name]) => name === cat)
    if (existing) {
      existing[1].push(m)
    } else {
      groups.push([cat, [m]])
    }
    return groups
  }, [])

  const addModule = async () => {
    if (!selectedModule) return
    setBusy(true)
    setError('')
    try {
      await api.post(`/phases/${id}/modules`, { module_id: Number(selectedModule) })
      setSelectedModule('')
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add module')
    } finally {
      setBusy(false)
    }
  }

  const removeModule = async (pmId) => {
    setBusy(true)
    try {
      await api.delete(`/phases/${id}/modules/${pmId}`)
      await loadPlan()
    } finally {
      setBusy(false)
    }
  }

  const updateActivityStatus = async (activityId, status) => {
    await api.put(`/activities/${activityId}`, { status })
    await loadPlan()
  }

  const updateActivityPriority = async (activityId, priority) => {
    setError('')
    try {
      await api.put(`/activities/${activityId}`, { priority })
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update activity priority')
    }
  }

  const updateActivityDueDate = async (activityId, dueDate) => {
    setError('')
    try {
      await api.put(`/activities/${activityId}`, { due_date: dueDate || null })
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update due date')
    }
  }

  const isOverdue = (activity) =>
    activity.due_date &&
    activity.status !== 'Completed' &&
    activity.status !== 'Cancelled' &&
    new Date(activity.due_date) < new Date(new Date().toDateString())

  // ----- Drag-and-drop activity reordering within a module -----
  const dragRef = React.useRef({ phaseModuleId: null, activityId: null })

  const onDragStart = (e, phaseModuleId, activityId) => {
    dragRef.current = { phaseModuleId, activityId }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, phaseModuleId) => {
    if (dragRef.current.phaseModuleId === phaseModuleId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const onDrop = async (e, phaseModuleId, targetActivityId) => {
    e.preventDefault()
    const { phaseModuleId: srcPhaseModuleId, activityId: srcActivityId } = dragRef.current
    if (srcPhaseModuleId !== phaseModuleId || srcActivityId === targetActivityId) return

    setPlan((prev) =>
      prev.map((pm) => {
        if (pm.id !== phaseModuleId) return pm
        const ids = pm.activities.map((a) => a.id)
        const from = ids.indexOf(srcActivityId)
        const to = ids.indexOf(targetActivityId)
        if (from === -1 || to === -1) return pm
        const reordered = [...pm.activities]
        const [moved] = reordered.splice(from, 1)
        reordered.splice(to, 0, moved)
        return { ...pm, activities: reordered }
      })
    )

    try {
      const phaseModule = plan.find((pm) => pm.id === phaseModuleId)
      if (phaseModule) {
        const ids = phaseModule.activities.map((a) => a.id)
        const from = ids.indexOf(srcActivityId)
        const to = ids.indexOf(targetActivityId)
        ids.splice(to, 0, ids.splice(from, 1)[0])
        await api.post(`/activities/reorder/${phaseModuleId}`, { ordered_activity_ids: ids })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reorder activities')
      await loadPlan()
    }
  }

  const toggleChecklist = async (itemId, completed) => {
    await api.put(`/activities/checklist/${itemId}`, { completed })
    await loadPlan()
  }

  const addChecklistItem = async (activityId) => {
    const text = newChecklist[activityId]?.trim()
    if (!text) return
    setError('')
    try {
      await api.post(`/activities/${activityId}/checklist`, { item: text })
      setNewChecklist({ ...newChecklist, [activityId]: '' })
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add checklist item')
    }
  }

  const deleteChecklistItem = async (itemId) => {
    setError('')
    try {
      await api.delete(`/activities/checklist/${itemId}`)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete checklist item')
    }
  }

  const deleteActivity = async (activityId, activityTitle) => {
    if (!window.confirm(`Delete activity "${activityTitle}"?`)) return
    setError('')
    try {
      await api.delete(`/activities/${activityId}`)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete activity')
    }
  }

  const deletePhase = async () => {
    if (!window.confirm(`Delete phase "${phase.name}"? This will remove all modules and activities.`)) return
    setError('')
    try {
      await api.delete(`/phases/${id}`)
      navigate('/phases')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete phase')
    }
  }

  const startEdit = () => {
    setEditForm(toForm(phase))
    setEditing(true)
    setError('')
  }

  const setEdit = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.value })

  const submitEdit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    setError('')
    try {
      const payload = {}
      for (const key of EDITABLE_FIELDS) {
        payload[key] = editForm[key] === '' ? null : editForm[key]
      }
      await api.put(`/phases/${id}`, payload)
      setEditing(false)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update phase')
    } finally {
      setSavingEdit(false)
    }
  }

  const openMeetingModal = (meeting = null) => {
    setEditingMeeting(meeting)
    setMeetingForm(
      meeting
        ? {
            title: meeting.title || '',
            meeting_date: meeting.meeting_date || '',
            participants: meeting.participants || '',
            discussion: meeting.discussion || '',
            decisions: meeting.decisions || '',
            action_items: meeting.action_items || '',
            next_follow_up: meeting.next_follow_up || '',
          }
        : EMPTY_MEETING
    )
    setMeetingModalOpen(true)
    setError('')
  }

  const closeMeetingModal = () => {
    setMeetingModalOpen(false)
    setEditingMeeting(null)
    setMeetingForm(EMPTY_MEETING)
  }

  const submitMeeting = async (e) => {
    e.preventDefault()
    setSavingMeeting(true)
    setError('')
    try {
      const payload = { ...meetingForm }
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = null
      }
      if (editingMeeting) {
        await api.put(`/phases/${id}/meetings/${editingMeeting.id}`, payload)
      } else {
        await api.post(`/phases/${id}/meetings`, payload)
      }
      closeMeetingModal()
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save meeting')
    } finally {
      setSavingMeeting(false)
    }
  }

  const deleteMeeting = async (meeting) => {
    if (!window.confirm(`Delete meeting "${meeting.title}"?`)) return
    setError('')
    try {
      await api.delete(`/phases/${id}/meetings/${meeting.id}`)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete meeting')
    }
  }

  const activityToForm = (activity) => {
    const f = {}
    for (const key of Object.keys(EMPTY_ACTIVITY_DETAIL)) {
      const value = activity[key]
      if (value === null || value === undefined) {
        f[key] = key === 'uat_proposed' ? false : ''
      } else {
        f[key] = value
      }
    }
    return f
  }

  const openActivityModal = (activity) => {
    setEditingActivity(activity)
    setActivityForm(activityToForm(activity))
    setActivityModalOpen(true)
    setError('')
  }

  const closeActivityModal = () => {
    setActivityModalOpen(false)
    setEditingActivity(null)
    setActivityForm(EMPTY_ACTIVITY_DETAIL)
  }

  const submitActivity = async (e) => {
    e.preventDefault()
    setSavingActivity(true)
    setError('')
    try {
      const payload = {}
      for (const key of Object.keys(EMPTY_ACTIVITY_DETAIL)) {
        const value = activityForm[key]
        if (value === '' || value === null || value === undefined) {
          payload[key] = null
        } else {
          payload[key] = value
        }
      }
      payload.estimated_hours = payload.estimated_hours ? Number(payload.estimated_hours) : null
      payload.actual_hours = payload.actual_hours ? Number(payload.actual_hours) : null
      payload.progress = payload.progress ? Number(payload.progress) : 0
      payload.owner_id = payload.owner_id ? Number(payload.owner_id) : null
      payload.reviewer_id = payload.reviewer_id ? Number(payload.reviewer_id) : null

      await api.put(`/activities/${editingActivity.id}`, payload)
      closeActivityModal()
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update activity')
    } finally {
      setSavingActivity(false)
    }
  }

  if (!phase) return <div className="muted">{error || 'Loading…'}</div>

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/phases">Phases</Link> / {phase.name}
      </div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>{phase.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StatusBadge value={phase.status} />
          <button className="btn btn-danger btn-sm" onClick={deletePhase}>
            Delete Phase
          </button>
        </div>
      </div>

      {!editing ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="page-header" style={{ marginTop: 0 }}>
            <h3 style={{ margin: 0 }}>Phase Details</h3>
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>
          </div>
          <div className="stat-grid">
            <div><p className="stat-label">Type</p><p>{phase.type}</p></div>
            <div><p className="stat-label">Status</p><p>{phase.status}</p></div>
            <div><p className="stat-label">Overall Progress</p><ProgressBar value={phase.progress} /></div>
            <div><p className="stat-label">Start</p><p>{phase.start_date || '—'}</p></div>
            <div><p className="stat-label">End</p><p>{phase.end_date || '—'}</p></div>
          </div>
          {phase.description && (
            <div style={{ marginTop: '0.5rem' }}>
              <p className="stat-label">Description</p>
              <p style={{ margin: 0 }}>{phase.description}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Edit Phase Details</h3>
          <form onSubmit={submitEdit}>
            <div className="form-row">
              <div>
                <label>Name *</label>
                <input value={editForm.name} onChange={setEdit('name')} required />
              </div>
              <div>
                <label>Type</label>
                <select value={editForm.type} onChange={setEdit('type')}>
                  {PHASE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={editForm.status} onChange={setEdit('status')}>
                  {PHASE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Start Date</label>
                <input type="date" value={editForm.start_date} onChange={setEdit('start_date')} />
              </div>
              <div>
                <label>End Date</label>
                <input type="date" value={editForm.end_date} onChange={setEdit('end_date')} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label>Description</label>
              <textarea rows={3} value={editForm.description} onChange={setEdit('description')} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Note: status auto-updates from activity progress unless set to "On Hold" or "Cancelled".
            </p>
          </form>
        </div>
      )}

      <div className="phase-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', alignItems: 'start' }}>
        <div className="phase-main">
          <div className="page-header">
            <h3 style={{ margin: 0 }}>Modules & Implementation Plan</h3>
            <div className="add-module-control">
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="add-module-select"
              >
                <option value="">Select a module to add…</option>
                {moduleGroups.map(([category, mods]) => (
                  <optgroup key={category} label={category}>
                    {mods.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={addModule}
                disabled={busy || !selectedModule}
              >
                + Add Module
              </button>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <p className="muted">Adding a module auto-generates its predefined activities. Kickoff is included by default.</p>

          {plan.length === 0 && <div className="muted">No modules added yet.</div>}

          {plan.map((pm) => (
            <div key={pm.id}>
              <div className="accordion-header" onClick={() => setExpanded((e) => ({ ...e, [pm.id]: !e[pm.id] }))}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <strong>{expanded[pm.id] ? '▼' : '▶'} {pm.module?.name}</strong>
                  <StatusBadge value={pm.status} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ProgressBar value={pm.progress} />
                  {pm.module?.name !== 'Kickoff' && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => { e.stopPropagation(); removeModule(pm.id) }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {expanded[pm.id] && (
                <div className="accordion-body">
                  <div className="module-block">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: '1%' }} aria-label="Reorder"></th>
                          <th style={{ width: '22%' }}>Activity</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Due Date</th>
                          <th>Progress</th>
                          <th>Checklist</th>
                          <th style={{ width: '1%', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pm.activities.map((activity) => {
                          const overdue = isOverdue(activity)
                          return (
                          <tr
                            key={activity.id}
                            className={overdue ? 'task-overdue' : ''}
                            draggable
                            onDragStart={(e) => onDragStart(e, pm.id, activity.id)}
                            onDragOver={(e) => onDragOver(e, pm.id)}
                            onDrop={(e) => onDrop(e, pm.id, activity.id)}
                          >
                            <td className="drag-handle" title="Drag to reorder">⠿</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {activity.title}
                                {activity.category && activity.category !== 'Regular' && (
                                  <span className={`badge badge-${activity.category === 'Enhancement' ? 'amber' : 'blue'}`}>
                                    {activity.category}
                                  </span>
                                )}
                                {activity.external_link && (
                                  <a
                                    href={activity.external_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="badge badge-grey"
                                    title="Open external link"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    ↗
                                  </a>
                                )}
                              </div>
                            </td>
                            <td>
                              <select
                                value={activity.priority}
                                onChange={(e) => updateActivityPriority(activity.id, e.target.value)}
                                className={`priority-select priority-${activity.priority?.toLowerCase()}`}
                              >
                                {ACTIVITY_PRIORITIES.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                value={activity.status}
                                onChange={(e) => updateActivityStatus(activity.id, e.target.value)}
                                className={`status-select status-${activity.status?.toLowerCase().replace(/ /g, '-')}`}
                              >
                                {ACTIVITY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                              </select>
                            </td>
                            <td>
                              <input
                                type="date"
                                value={activity.due_date || ''}
                                onChange={(e) => updateActivityDueDate(activity.id, e.target.value)}
                                className={overdue ? 'due-date-input overdue' : 'due-date-input'}
                              />
                              {overdue && <span className="badge badge-red" style={{ marginLeft: '0.25rem' }}>Overdue</span>}
                            </td>
                            <td style={{ minWidth: 120 }}><ProgressBar value={activity.progress} /></td>
                            <td>
                              {activity.checklist_items.length > 0 && (
                                <ul className="checklist">
                                  {activity.checklist_items.map((ci) => (
                                    <li key={ci.id}>
                                      <input
                                        type="checkbox"
                                        checked={ci.completed}
                                        onChange={(e) => toggleChecklist(ci.id, e.target.checked)}
                                      />
                                      <span style={{ flex: 1 }}>{ci.item}</span>
                                      <button
                                        type="button"
                                        className="checklist-delete"
                                        onClick={() => deleteChecklistItem(ci.id)}
                                        aria-label={`Delete checklist item "${ci.item}"`}
                                        title="Delete checklist item"
                                      >
                                        ×
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="inline-form" style={{ marginTop: '0.5rem', flexWrap: 'nowrap' }}>
                                <input
                                  type="text"
                                  placeholder="Add checklist item…"
                                  value={newChecklist[activity.id] || ''}
                                  onChange={(e) => setNewChecklist({ ...newChecklist, [activity.id]: e.target.value })}
                                  onKeyDown={(e) => e.key === 'Enter' && addChecklistItem(activity.id)}
                                  style={{ flex: 1, minWidth: 120 }}
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => addChecklistItem(activity.id)}
                                  disabled={!newChecklist[activity.id]?.trim()}
                                >
                                  Add
                                </button>
                              </div>
                            </td>
                            <td>
                              <div className="actions">
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openActivityModal(activity)}
                                >
                                  Edit Details
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => deleteActivity(activity.id, activity.title)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {plan.length > 0 && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Gantt Timeline</h3>
              <GanttTimeline
                modules={plan}
                phaseStart={phase.start_date}
                phaseEnd={phase.end_date}
              />
            </div>
          )}
        </div>

        <div className="phase-sidebar">
          {plan.length > 0 && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Status Timeline</h3>
              <ModuleTimeline modules={plan} />
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="page-header" style={{ marginTop: 0 }}>
              <h3 style={{ margin: 0 }}>Meetings & Communication Log</h3>
              <button className="btn btn-primary btn-sm" onClick={() => openMeetingModal()}>
                + Add Meeting
              </button>
            </div>
            {meetings.length === 0 ? (
              <p className="muted">No meetings recorded yet.</p>
            ) : (
              <div className="meetings-list">
                {meetings.map((m) => {
                  const isExpanded = expandedMeetings[m.id]
                  return (
                    <div className="meeting-card" key={m.id}>
                      <div className="meeting-summary">
                        <button
                          type="button"
                          className="meeting-toggle"
                          onClick={() => setExpandedMeetings((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                          aria-label={isExpanded ? 'Collapse meeting' : 'Expand meeting'}
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <div className="meeting-summary-text">
                          <strong className="meeting-title">{m.title}</strong>
                          <span className="muted">{m.meeting_date}</span>
                          {m.participants && <span className="muted">• {m.participants}</span>}
                          {m.next_follow_up && <span className="muted">• Next: {m.next_follow_up}</span>}
                        </div>
                        <div className="actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openMeetingModal(m)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteMeeting(m)}>Delete</button>
                        </div>
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
            )}
          </div>
        </div>
      </div>

      {meetingModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeMeetingModal() }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingMeeting ? 'Edit Meeting' : 'Add Meeting'}</h3>
              <button className="modal-close" onClick={closeMeetingModal}>×</button>
            </div>
            <form onSubmit={submitMeeting}>
              <div className="modal-body">
                <div className="form-row">
                  <div>
                    <label>Title *</label>
                    <input
                      value={meetingForm.title}
                      onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Date *</label>
                    <input
                      type="date"
                      value={meetingForm.meeting_date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Participants</label>
                    <input
                      value={meetingForm.participants}
                      onChange={(e) => setMeetingForm({ ...meetingForm, participants: e.target.value })}
                      placeholder="e.g. John, Jane, Client POC"
                    />
                  </div>
                  <div>
                    <label>Next Follow-up</label>
                    <input
                      type="date"
                      value={meetingForm.next_follow_up}
                      onChange={(e) => setMeetingForm({ ...meetingForm, next_follow_up: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Discussion / MoM</label>
                  <textarea
                    rows={3}
                    value={meetingForm.discussion}
                    onChange={(e) => setMeetingForm({ ...meetingForm, discussion: e.target.value })}
                    placeholder="Key points discussed..."
                  />
                </div>
                <div className="form-group">
                  <label>Decisions</label>
                  <textarea
                    rows={2}
                    value={meetingForm.decisions}
                    onChange={(e) => setMeetingForm({ ...meetingForm, decisions: e.target.value })}
                    placeholder="Decisions made in the meeting..."
                  />
                </div>
                <div className="form-group">
                  <label>Action Items</label>
                  <textarea
                    rows={2}
                    value={meetingForm.action_items}
                    onChange={(e) => setMeetingForm({ ...meetingForm, action_items: e.target.value })}
                    placeholder="Who does what by when..."
                  />
                </div>
                {error && <div className="error" style={{ marginBottom: 0 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={closeMeetingModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingMeeting}>
                  {savingMeeting ? 'Saving…' : (editingMeeting ? 'Update Meeting' : 'Add Meeting')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activityModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeActivityModal() }}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3>Edit Activity Details</h3>
              <button className="modal-close" onClick={closeActivityModal}>×</button>
            </div>
            <form onSubmit={submitActivity}>
              <div className="modal-body">
                <div className="form-row">
                  <div>
                    <label>Title *</label>
                    <input
                      value={activityForm.title}
                      onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label>Category</label>
                    <select
                      value={activityForm.category}
                      onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                    >
                      {ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <select
                      value={activityForm.status}
                      onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value })}
                    >
                      {ACTIVITY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Priority</label>
                    <select
                      value={activityForm.priority}
                      onChange={(e) => setActivityForm({ ...activityForm, priority: e.target.value })}
                    >
                      {ACTIVITY_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={activityForm.start_date}
                      onChange={(e) => setActivityForm({ ...activityForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={activityForm.due_date}
                      onChange={(e) => setActivityForm({ ...activityForm, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Proposed Timeline</label>
                    <input
                      type="date"
                      value={activityForm.proposed_timeline}
                      onChange={(e) => setActivityForm({ ...activityForm, proposed_timeline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Progress (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={activityForm.progress}
                      onChange={(e) => setActivityForm({ ...activityForm, progress: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Estimated Hours</label>
                    <input
                      type="number"
                      value={activityForm.estimated_hours}
                      onChange={(e) => setActivityForm({ ...activityForm, estimated_hours: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Actual Hours</label>
                    <input
                      type="number"
                      value={activityForm.actual_hours}
                      onChange={(e) => setActivityForm({ ...activityForm, actual_hours: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <label>Client SPOC</label>
                    <input
                      value={activityForm.client_spoc}
                      onChange={(e) => setActivityForm({ ...activityForm, client_spoc: e.target.value })}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label>Client SPOC Email</label>
                    <input
                      type="email"
                      value={activityForm.client_spoc_email}
                      onChange={(e) => setActivityForm({ ...activityForm, client_spoc_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Client SPOC Phone</label>
                    <input
                      value={activityForm.client_spoc_phone}
                      onChange={(e) => setActivityForm({ ...activityForm, client_spoc_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Module Status</label>
                    <input
                      value={activityForm.module_status}
                      onChange={(e) => setActivityForm({ ...activityForm, module_status: e.target.value })}
                      placeholder="e.g. Finance V2 Status"
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <label>External Link (ClickUp/Jira)</label>
                    <input
                      value={activityForm.external_link}
                      onChange={(e) => setActivityForm({ ...activityForm, external_link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="checkbox-field">
                    <input
                      id="uat_proposed"
                      type="checkbox"
                      checked={activityForm.uat_proposed}
                      onChange={(e) => setActivityForm({ ...activityForm, uat_proposed: e.target.checked })}
                    />
                    <label htmlFor="uat_proposed">UAT Proposed by Partner</label>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Description</label>
                  <textarea
                    rows={2}
                    value={activityForm.description}
                    onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Reason for Delay</label>
                  <textarea
                    rows={2}
                    value={activityForm.delay_reason}
                    onChange={(e) => setActivityForm({ ...activityForm, delay_reason: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Response from Partner</label>
                  <textarea
                    rows={2}
                    value={activityForm.client_response}
                    onChange={(e) => setActivityForm({ ...activityForm, client_response: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Response from Digii / Internal</label>
                  <textarea
                    rows={2}
                    value={activityForm.internal_response}
                    onChange={(e) => setActivityForm({ ...activityForm, internal_response: e.target.value })}
                  />
                </div>

                {error && <div className="error" style={{ marginBottom: 0 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={closeActivityModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingActivity}>
                  {savingActivity ? 'Saving…' : 'Save Activity Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
