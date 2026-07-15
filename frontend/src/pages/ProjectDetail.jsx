import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [plan, setPlan] = useState([])
  const [catalog, setCatalog] = useState([])
  const [expanded, setExpanded] = useState({})
  const [selectedModule, setSelectedModule] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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

  if (!project) return <div className="muted">{error || 'Loading…'}</div>

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link> / {project.name}
      </div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>{project.name}</h2>
        <StatusBadge value={project.status} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="stat-grid">
          <div><p className="stat-label">Type</p><p>{project.type}</p></div>
          <div><p className="stat-label">Overall Progress</p><ProgressBar value={project.progress} /></div>
          <div><p className="stat-label">Start</p><p>{project.start_date || '—'}</p></div>
          <div><p className="stat-label">End</p><p>{project.end_date || '—'}</p></div>
        </div>
      </div>

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
                        <th style={{ width: '40%' }}>Task</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Progress</th>
                        <th>Checklist</th>
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
                            {task.checklist_items.length === 0 ? (
                              <span className="muted">—</span>
                            ) : (
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
