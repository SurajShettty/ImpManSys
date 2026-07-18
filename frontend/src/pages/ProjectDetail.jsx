import React, { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge, ProgressBar } from '../components/ui'

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

  const loadPlan = () =>
    Promise.all([api.get(`/projects/${id}`), api.get(`/projects/${id}/plan`)]).then(
      ([p, pl]) => {
        setProject(p.data)
        setPlan(pl.data)
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
        <div className="inline-form">
          <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
            <option value="">Select module…</option>
            {available.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={addModule} disabled={busy || !selectedModule}>
            + Add Module
          </button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <p className="muted">Adding a module auto-generates its 7-phase implementation plan.</p>

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
                        <th style={{ width: '25%' }}>Task</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Checklist</th>
                        <th style={{ width: '1%', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase.tasks.map((task) => (
                        <tr key={task.id}>
                          <td>{task.title}</td>
                          <td><PriorityBadge value={task.priority} /></td>
                          <td>
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                            >
                              {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                            </select>
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
                                    {ci.item}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
