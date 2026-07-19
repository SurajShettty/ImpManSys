import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge, ProgressBar } from '../components/ui'
import { PhaseTimeline, GanttTimeline } from '../components/Timeline'

const TASK_STATUSES = [
  'Not Started',
  'In Progress',
  'Waiting for Client',
  'Waiting for Internal Team',
  'Blocked',
  'Under Testing',
  'Completed',
  'Cancelled',
]

const TASK_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

const PROJECT_TYPES = [
  'New Implementation',
  'Additional Module',
  'Migration',
  'Upgrade',
  'Feature Rollout',
  'Integration',
  'Custom Development',
]

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']

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

function toForm(project) {
  const f = {}
  for (const key of EDITABLE_FIELDS) {
    f[key] = project[key] == null ? '' : project[key]
  }
  return f
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
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

  const loadPlan = () =>
    Promise.all([api.get(`/projects/${id}`), api.get(`/projects/${id}/plan`), api.get(`/projects/${id}/meetings`)]).then(
      ([p, pl, m]) => {
        setProject(p.data)
        setPlan(pl.data)
        setMeetings(m.data)
      }
    )

  const load = () => {
    Promise.all([loadPlan(), api.get('/modules/')])
      .then(([, cat]) => setCatalog(cat.data))
      .catch(() => setError('Failed to load project'))
  }

  useEffect(load, [id])

  const usedModuleIds = new Set(plan.map((pm) => pm.module_id))
  const available = catalog.filter((m) => !usedModuleIds.has(m.id))
  // Group available modules by category for the add-module dropdown.
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
      await api.post(`/projects/${id}/modules`, { module_id: Number(selectedModule) })
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
      await api.delete(`/projects/${id}/modules/${pmId}`)
      await loadPlan()
    } finally {
      setBusy(false)
    }
  }

  const updateTaskStatus = async (taskId, status) => {
    await api.put(`/tasks/${taskId}`, { status })
    await loadPlan()
  }

  const updateTaskPriority = async (taskId, priority) => {
    setError('')
    try {
      await api.put(`/tasks/${taskId}`, { priority })
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update task priority')
    }
  }

  const updateTaskDueDate = async (taskId, dueDate) => {
    setError('')
    try {
      await api.put(`/tasks/${taskId}`, { due_date: dueDate || null })
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update due date')
    }
  }

  const isOverdue = (task) =>
    task.due_date &&
    task.status !== 'Completed' &&
    task.status !== 'Cancelled' &&
    new Date(task.due_date) < new Date(new Date().toDateString())

  // ----- Drag-and-drop task reordering -----
  const dragRef = React.useRef({ phaseId: null, taskId: null })

  const onDragStart = (e, phaseId, taskId) => {
    dragRef.current = { phaseId, taskId }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, phaseId) => {
    if (dragRef.current.phaseId === phaseId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const onDrop = async (e, phaseId, targetTaskId) => {
    e.preventDefault()
    const { phaseId: srcPhaseId, taskId: srcTaskId } = dragRef.current
    if (srcPhaseId !== phaseId || srcTaskId === targetTaskId) return

    // Optimistically reorder in local state.
    setPlan((prev) =>
      prev.map((pm) => ({
        ...pm,
        phases: pm.phases.map((phase) => {
          if (phase.id !== phaseId) return phase
          const ids = phase.tasks.map((t) => t.id)
          const from = ids.indexOf(srcTaskId)
          const to = ids.indexOf(targetTaskId)
          if (from === -1 || to === -1) return phase
          const reordered = [...phase.tasks]
          const [moved] = reordered.splice(from, 1)
          reordered.splice(to, 0, moved)
          return { ...phase, tasks: reordered }
        }),
      }))
    )

    try {
      const phase = plan
        .flatMap((pm) => pm.phases)
        .find((p) => p.id === phaseId)
      if (phase) {
        const ids = phase.tasks.map((t) => t.id)
        const from = ids.indexOf(srcTaskId)
        const to = ids.indexOf(targetTaskId)
        ids.splice(to, 0, ids.splice(from, 1)[0])
        await api.post(`/tasks/reorder/${phaseId}`, { ordered_task_ids: ids })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reorder tasks')
      await loadPlan()
    }
  }

  const toggleChecklist = async (itemId, completed) => {
    await api.put(`/tasks/checklist/${itemId}`, { completed })
    await loadPlan()
  }

  const addChecklistItem = async (taskId) => {
    const text = newChecklist[taskId]?.trim()
    if (!text) return
    setError('')
    try {
      await api.post(`/tasks/${taskId}/checklist`, { item: text })
      setNewChecklist({ ...newChecklist, [taskId]: '' })
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add checklist item')
    }
  }

  const deleteChecklistItem = async (itemId) => {
    setError('')
    try {
      await api.delete(`/tasks/checklist/${itemId}`)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete checklist item')
    }
  }

  const deleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Delete task "${taskTitle}"?`)) return
    setError('')
    try {
      await api.delete(`/tasks/${taskId}`)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete task')
    }
  }

  const deleteProject = async () => {
    if (!window.confirm(`Delete project "${project.name}"? This will remove all modules, phases, and tasks.`)) return
    setError('')
    try {
      await api.delete(`/projects/${id}`)
      navigate('/projects')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete project')
    }
  }

  const startEdit = () => {
    setEditForm(toForm(project))
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
      await api.put(`/projects/${id}`, payload)
      setEditing(false)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update project')
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
        await api.put(`/projects/${id}/meetings/${editingMeeting.id}`, payload)
      } else {
        await api.post(`/projects/${id}/meetings`, payload)
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
      await api.delete(`/projects/${id}/meetings/${meeting.id}`)
      await loadPlan()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete meeting')
    }
  }

  if (!project) return <div className="muted">{error || 'Loading…'}</div>

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link> / {project.name}
      </div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>{project.name}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <StatusBadge value={project.status} />
          <button className="btn btn-danger btn-sm" onClick={deleteProject}>
            Delete Project
          </button>
        </div>
      </div>

      {!editing ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="page-header" style={{ marginTop: 0 }}>
            <h3 style={{ margin: 0 }}>Project Details</h3>
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>
          </div>
          <div className="stat-grid">
            <div><p className="stat-label">Type</p><p>{project.type}</p></div>
            <div><p className="stat-label">Status</p><p>{project.status}</p></div>
            <div><p className="stat-label">Overall Progress</p><ProgressBar value={project.progress} /></div>
            <div><p className="stat-label">Start</p><p>{project.start_date || '—'}</p></div>
            <div><p className="stat-label">End</p><p>{project.end_date || '—'}</p></div>
          </div>
          {project.description && (
            <div style={{ marginTop: '0.5rem' }}>
              <p className="stat-label">Description</p>
              <p style={{ margin: 0 }}>{project.description}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Edit Project Details</h3>
          <form onSubmit={submitEdit}>
            <div className="form-row">
              <div>
                <label>Name *</label>
                <input value={editForm.name} onChange={setEdit('name')} required />
              </div>
              <div>
                <label>Type</label>
                <select value={editForm.type} onChange={setEdit('type')}>
                  {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={editForm.status} onChange={setEdit('status')}>
                  {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
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
              Note: status auto-updates from task progress unless set to "On Hold" or "Cancelled".
            </p>
          </form>
        </div>
      )}

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
      <p className="muted">Adding a module auto-generates its 7-phase implementation plan.</p>

      {plan.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Status Timeline</h3>
          {plan.map((pm) => (
            <div key={`timeline-${pm.id}`} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{pm.module?.name}</strong>
                <span className="muted">{pm.progress}%</span>
              </div>
              <PhaseTimeline phases={pm.phases} />
            </div>
          ))}
        </div>
      )}

      {plan.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Gantt Timeline</h3>
          <GanttTimeline
            projectModules={plan}
            projectStart={project.start_date}
            projectEnd={project.end_date}
          />
        </div>
      )}

      {/* Meetings & Communication Log */}
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
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => { e.stopPropagation(); removeModule(pm.id) }}
              >
                Remove
              </button>
            </div>
          </div>

          {expanded[pm.id] && (
            <div className="accordion-body">
              {pm.phases.map((phase) => (
                <div className="phase-block" key={phase.id}>
                  <div className="phase-title">{phase.sequence}. {phase.name}</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '1%' }} aria-label="Reorder"></th>
                        <th style={{ width: '22%' }}>Task</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Progress</th>
                        <th>Checklist</th>
                        <th style={{ width: '1%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase.tasks.map((task) => {
                        const overdue = isOverdue(task)
                        return (
                        <tr
                          key={task.id}
                          className={overdue ? 'task-overdue' : ''}
                          draggable
                          onDragStart={(e) => onDragStart(e, phase.id, task.id)}
                          onDragOver={(e) => onDragOver(e, phase.id)}
                          onDrop={(e) => onDrop(e, phase.id, task.id)}
                        >
                          <td className="drag-handle" title="Drag to reorder">⠿</td>
                          <td>{task.title}</td>
                          <td>
                            <select
                              value={task.priority}
                              onChange={(e) => updateTaskPriority(task.id, e.target.value)}
                              className={`priority-select priority-${task.priority?.toLowerCase()}`}
                            >
                              {TASK_PRIORITIES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              className={`status-select status-${task.status?.toLowerCase().replace(/ /g, '-')}`}
                            >
                              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td>
                            <input
                              type="date"
                              value={task.due_date || ''}
                              onChange={(e) => updateTaskDueDate(task.id, e.target.value)}
                              className={overdue ? 'due-date-input overdue' : 'due-date-input'}
                            />
                            {overdue && <span className="badge badge-red" style={{ marginLeft: '0.25rem' }}>Overdue</span>}
                          </td>
                          <td style={{ minWidth: 120 }}><ProgressBar value={task.progress} /></td>
                          <td>
                            {task.checklist_items.length > 0 && (
                              <ul className="checklist">
                                {task.checklist_items.map((ci) => (
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
                                value={newChecklist[task.id] || ''}
                                onChange={(e) => setNewChecklist({ ...newChecklist, [task.id]: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem(task.id)}
                                style={{ flex: 1, minWidth: 120 }}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => addChecklistItem(task.id)}
                                disabled={!newChecklist[task.id]?.trim()}
                              >
                                Add
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteTask(task.id, task.title)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

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
    </div>
  )
}
