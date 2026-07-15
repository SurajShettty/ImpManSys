import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge, ProgressBar } from '../components/ui'

const PROJECT_TYPES = [
  'New Implementation',
  'Additional Module',
  'Migration',
  'Upgrade',
  'Feature Rollout',
  'Integration',
  'Custom Development',
]

export default function ClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'New Implementation', end_date: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([api.get(`/clients/${id}`), api.get(`/clients/${id}/projects`)])
      .then(([c, p]) => {
        setClient(c.data)
        setProjects(p.data)
      })
      .catch(() => setError('Failed to load client'))
  }

  useEffect(load, [id])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { client_id: Number(id), name: form.name, type: form.type }
      if (form.end_date) payload.end_date = form.end_date
      await api.post('/projects/', payload)
      setForm({ name: '', type: 'New Implementation', end_date: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (!client) return <div className="muted">{error || 'Loading…'}</div>

  return (
    <div>
      <div className="breadcrumb"><Link to="/clients">Clients</Link> / {client.name}</div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>{client.name} <PriorityBadge value={client.priority} /></h2>
        <StatusBadge value={client.status} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="stat-grid">
          <div><p className="stat-label">Institution Type</p><p>{client.institution_type || '—'}</p></div>
          <div><p className="stat-label">CRM ID</p><p>{client.crm_id || '—'}</p></div>
          <div><p className="stat-label">Contract</p><p>{client.contract_start || '—'} → {client.contract_end || '—'}</p></div>
          <div><p className="stat-label">Expected Go-Live</p><p>{client.go_live_date || '—'}</p></div>
          <div><p className="stat-label">CSM</p><p>{client.csm?.name || '—'}</p></div>
          <div><p className="stat-label">Project Manager</p><p>{client.pm?.name || '—'}</p></div>
        </div>
      </div>

      <div className="page-header">
        <h3 style={{ margin: 0 }}>Projects</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>Project Name *</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label>Type</label>
                <select value={form.type} onChange={set('type')}>
                  {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>Target End Date</label>
                <input type="date" value={form.end_date} onChange={set('end_date')} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Status</th><th>Progress</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/projects/${p.id}`}>{p.name}</Link></td>
                <td>{p.type}</td>
                <td><StatusBadge value={p.status} /></td>
                <td><ProgressBar value={p.progress} /></td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr><td colSpan={4} className="muted" style={{ textAlign: 'center' }}>No projects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
