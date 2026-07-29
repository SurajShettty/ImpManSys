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
  region: '',
  implementation_state: '',
  new_recurring: '',
  kickoff_meeting_date: '',
  billing_date: '',
  rm_id: '',
  total_users: '',
}

const REGIONS = ['North', 'South', 'East', 'West', 'Central']
const NEW_RECURRING = ['New', 'Recurring']
const IMPLEMENTATION_STATES = ['Go Live', 'Ongoing', 'Yet to start']
const CLIENT_STATUSES = ['Active', 'On Hold', 'Completed', 'Churned']

export default function Clients() {
  const [clients, setClients] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState({ region: '', status: '', implementation_state: '' })

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
      if (payload.total_users) payload.total_users = Number(payload.total_users)
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

  const filteredClients = clients.filter((c) => {
    if (filters.region && c.region !== filters.region) return false
    if (filters.status && c.status !== filters.status) return false
    if (filters.implementation_state && c.implementation_state !== filters.implementation_state) return false
    return true
  })

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
                <select value={form.institution_type} onChange={set('institution_type')}>
                  <option value="">Select…</option>
                  <option>University</option>
                  <option>College</option>
                  <option>School</option>
                </select>
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
              <div>
                <label>Region</label>
                <select value={form.region} onChange={set('region')}>
                  <option value="">Select…</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label>Implementation State</label>
                <select value={form.implementation_state} onChange={set('implementation_state')}>
                  <option value="">Select…</option>
                  {IMPLEMENTATION_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>New / Recurring</label>
                <select value={form.new_recurring} onChange={set('new_recurring')}>
                  <option value="">Select…</option>
                  {NEW_RECURRING.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label>Kickoff Meeting Date</label>
                <input type="date" value={form.kickoff_meeting_date} onChange={set('kickoff_meeting_date')} />
              </div>
              <div>
                <label>Billing / Go-Live Date</label>
                <input type="date" value={form.billing_date} onChange={set('billing_date')} />
              </div>
              <div>
                <label>Total Users</label>
                <input type="number" value={form.total_users} onChange={set('total_users')} />
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

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div>
            <label>Region</label>
            <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })}>
              <option value="">All</option>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              {CLIENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Implementation State</label>
            <select value={filters.implementation_state} onChange={(e) => setFilters({ ...filters, implementation_state: e.target.value })}>
              <option value="">All</option>
              {IMPLEMENTATION_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Region</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Implementation State</th>
              <th>New / Recurring</th>
              <th>Instance Link</th>
              <th>Kickoff</th>
              <th>Billing / Go-Live</th>
              <th>Total Users</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/clients/${c.id}`}>{c.name}</Link></td>
                <td>{c.region || '—'}</td>
                <td><PriorityBadge value={c.priority} /></td>
                <td><StatusBadge value={c.status} /></td>
                <td>{c.implementation_state || '—'}</td>
                <td>{c.new_recurring || '—'}</td>
                <td>
                  {c.instance_link ? (
                    <a href={c.instance_link} target="_blank" rel="noreferrer">Open</a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{c.kickoff_meeting_date || '—'}</td>
                <td>{c.billing_date || '—'}</td>
                <td>{c.total_users ?? '—'}</td>
                <td>{c.project_count}</td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr><td colSpan={11} className="muted" style={{ textAlign: 'center' }}>No clients match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
