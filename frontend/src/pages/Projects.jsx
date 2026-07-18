import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, ProgressBar } from '../components/ui'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState({})
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    Promise.all([api.get('/projects/'), api.get('/clients/')])
      .then(([p, c]) => {
        setProjects(p.data)
        setClients(Object.fromEntries(c.data.map((cl) => [cl.id, cl.name])))
      })
      .catch(() => setError('Failed to load projects'))
  }

  useEffect(() => {
    load()
  }, [])

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await api.delete(`/projects/${project.id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete project')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Projects</h2>
        <span className="muted">Create projects from a client's page</span>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Progress</th>
              <th>End Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/projects/${p.id}`}>{p.name}</Link></td>
                <td>{clients[p.client_id] || '—'}</td>
                <td>{p.type}</td>
                <td><StatusBadge value={p.status} /></td>
                <td><ProgressBar value={p.progress} /></td>
                <td>{p.end_date || '—'}</td>
                <td>
                  <div className="actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteProject(p)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center' }}>No projects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
