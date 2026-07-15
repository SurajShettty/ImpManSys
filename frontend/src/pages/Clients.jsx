import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge } from '../components/ui'

const BLANK = {
  name: '',
  institution_type: '',
  crm_id: '',
  priority: 'Medium',
  go_live_date: '',
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.get('/clients/').then((res) => setClients(res.data)).catch(() => setError('Failed to load clients'))
  }

  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      // Drop empty optional fields so the API keeps them null.
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      await api.post('/clients/', payload)
      setForm(BLANK)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div>
      <div className="page-header">
        <h2>Clients</h2>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Client'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>Name *</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label>Institution Type</label>
                <input value={form.institution_type} onChange={set('institution_type')} />
              </div>
              <div>
                <label>CRM ID</label>
                <input value={form.crm_id} onChange={set('crm_id')} />
              </div>
              <div>
                <label>Priority</label>
                <select value={form.priority} onChange={set('priority')}>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div>
                <label>Expected Go-Live</label>
                <input type="date" value={form.go_live_date} onChange={set('go_live_date')} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Go-Live</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/clients/${c.id}`}>{c.name}</Link></td>
                <td>{c.institution_type || '—'}</td>
                <td><PriorityBadge value={c.priority} /></td>
                <td><StatusBadge value={c.status} /></td>
                <td>{c.go_live_date || '—'}</td>
                <td>{c.project_count}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center' }}>No clients yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
