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

const INSTITUTION_TYPES = ['University', 'College', 'School']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const CLIENT_STATUSES = ['Active', 'On Hold', 'Completed', 'Churned']

// Fields the edit form manages, so we can build the payload generically.
const EDITABLE_FIELDS = [
  'name',
  'institution_type',
  'crm_id',
  'priority',
  'status',
  'contract_start',
  'contract_end',
  'go_live_date',
  'csm_id',
  'pm_id',
  'sales_owner',
]

// Turn a client record into flat form values (null -> '' so inputs stay controlled).
function toForm(client) {
  const f = {}
  for (const key of EDITABLE_FIELDS) {
    f[key] = client[key] == null ? '' : client[key]
  }
  return f
}

export default function ClientDetail() {
  const { id } = useParams()
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')

  // Project creation
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'New Implementation', end_date: '' })
  const [saving, setSaving] = useState(false)

  // Client editing
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  const load = () => {
    Promise.all([api.get(`/clients/${id}`), api.get(`/clients/${id}/projects`)])
      .then(([c, p]) => {
        setClient(c.data)
        setProjects(p.data)
      })
      .catch(() => setError('Failed to load client'))
    // Users power the CSM / PM dropdowns. Non-fatal if the role can't list users.
    api.get('/users/').then((res) => setUsers(res.data)).catch(() => setUsers([]))
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

  const startEdit = () => {
    setEditForm(toForm(client))
    setEditing(true)
    setError('')
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    setError('')
    try {
      const payload = {}
      for (const key of EDITABLE_FIELDS) {
        const value = editForm[key]
        if (key === 'csm_id' || key === 'pm_id') {
          payload[key] = value === '' ? null : Number(value)
        } else {
          payload[key] = value === '' ? null : value
        }
      }
      await api.put(`/clients/${id}`, payload)
      setEditing(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update client')
    } finally {
      setSavingEdit(false)
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setEdit = (k) => (e) => setEditForm({ ...editForm, [k]: e.target.value })

  if (!client) return <div className="muted">{error || 'Loading…'}</div>

  return (
    <div>
      <div className="breadcrumb"><Link to="/clients">Clients</Link> / {client.name}</div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>{client.name} <PriorityBadge value={client.priority} /></h2>
        <StatusBadge value={client.status} />
      </div>

      {error && <div className="error">{error}</div>}

      {!editing ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="page-header" style={{ marginTop: 0 }}>
            <h3 style={{ margin: 0 }}>Client Details</h3>
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>
          </div>
          <div className="stat-grid">
            <div><p className="stat-label">Institution Type</p><p>{client.institution_type || '—'}</p></div>
            <div><p className="stat-label">CRM ID</p><p>{client.crm_id || '—'}</p></div>
            <div><p className="stat-label">Priority</p><p>{client.priority}</p></div>
            <div><p className="stat-label">Status</p><p>{client.status}</p></div>
            <div><p className="stat-label">Contract</p><p>{client.contract_start || '—'} → {client.contract_end || '—'}</p></div>
            <div><p className="stat-label">Expected Go-Live</p><p>{client.go_live_date || '—'}</p></div>
            <div><p className="stat-label">CSM</p><p>{client.csm?.name || '—'}</p></div>
            <div><p className="stat-label">Project Manager</p><p>{client.pm?.name || '—'}</p></div>
            <div><p className="stat-label">Sales Owner</p><p>{client.sales_owner || '—'}</p></div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Edit Client Details</h3>
          <form onSubmit={submitEdit}>
            <div className="form-row">
              <div>
                <label>Name *</label>
                <input value={editForm.name} onChange={setEdit('name')} required />
              </div>
              <div>
                <label>Institution Type</label>
                <select value={editForm.institution_type} onChange={setEdit('institution_type')}>
                  <option value="">Select…</option>
                  {INSTITUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label>CRM ID</label>
                <input value={editForm.crm_id} onChange={setEdit('crm_id')} />
              </div>
              <div>
                <label>Priority</label>
                <select value={editForm.priority} onChange={setEdit('priority')}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={editForm.status} onChange={setEdit('status')}>
                  {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Customer Success Manager</label>
                <select value={editForm.csm_id} onChange={setEdit('csm_id')}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label>Project Manager</label>
                <select value={editForm.pm_id} onChange={setEdit('pm_id')}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label>Sales Owner</label>
                <input value={editForm.sales_owner} onChange={setEdit('sales_owner')} />
              </div>
              <div>
                <label>Contract Start</label>
                <input type="date" value={editForm.contract_start} onChange={setEdit('contract_start')} />
              </div>
              <div>
                <label>Contract End</label>
                <input type="date" value={editForm.contract_end} onChange={setEdit('contract_end')} />
              </div>
              <div>
                <label>Expected Go-Live</label>
                <input type="date" value={editForm.go_live_date} onChange={setEdit('go_live_date')} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-light" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
            {users.length === 0 && (
              <p className="muted" style={{ marginBottom: 0 }}>
                No users available for CSM/PM (your role may not permit listing users).
              </p>
            )}
          </form>
        </div>
      )}

      <div className="page-header">
        <h3 style={{ margin: 0 }}>Projects</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

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
