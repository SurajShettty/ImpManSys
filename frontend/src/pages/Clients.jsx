import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { StatusBadge, PriorityBadge, Pagination, pageRangeText, MultiSelect } from '../components/ui'
import { STATE_NAMES } from '../components/IndiaMap'

const PAGE_SIZE = 20

const BLANK = {
  name: '',
  institution_type: '',
  crm_id: '',
  priority: 'Medium',
  go_live_date: '',
  region: '',
  state: '',
  instance_link: '',
  implementation_state: '',
  new_recurring: '',
  kickoff_meeting_date: '',
  billing_date: '',
  total_users: '',
  csm_ids: [],
  rm_ids: [],
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
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({ region: '', status: '', implementation_state: '' })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const load = () => {
    setError('')
    const params = { page, page_size: PAGE_SIZE }
    if (filters.region) params.region = filters.region
    if (filters.status) params.status = filters.status
    if (filters.implementation_state) params.implementation_state = filters.implementation_state
    api
      .get('/clients/', { params })
      .then((res) => {
        setClients(res.data.items || [])
        setTotal(res.data.total || 0)
        setPages(res.data.pages || 1)
      })
      .catch(() => setError('Failed to load clients'))
  }

  useEffect(load, [filters, page])

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [filters])

  // Users power the CSM / RM pickers on the create form. Non-fatal if the role can't list users.
  useEffect(() => {
    api.get('/users/').then((res) => setUsers(res.data)).catch(() => setUsers([]))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.csm_ids.length === 0) {
      setError('Select at least one Customer Success Manager')
      return
    }
    if (form.rm_ids.length === 0) {
      setError('Select at least one Relationship Manager')
      return
    }
    setSaving(true)
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
  const setMulti = (k) => (ids) => setForm({ ...form, [k]: ids })

  const exportCsv = async () => {
    setError('')
    try {
      const params = {}
      if (filters.region) params.region = filters.region
      if (filters.status) params.status = filters.status
      if (filters.implementation_state) params.implementation_state = filters.implementation_state
      const res = await api.get('/clients/export', { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'clients.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export clients')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Clients</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-light" onClick={exportCsv}>
            Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New Client'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={submit}>
            <div className="form-row">
              <div>
                <label>Name *</label>
                <input value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label>Institution Type *</label>
                <select value={form.institution_type} onChange={set('institution_type')} required>
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
                <label>Region *</label>
                <select value={form.region} onChange={set('region')} required>
                  <option value="">Select…</option>
                  {REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label>State *</label>
                <select value={form.state} onChange={set('state')} required>
                  <option value="">Select…</option>
                  {STATE_NAMES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>Instance Link *</label>
                <input value={form.instance_link} onChange={set('instance_link')} required />
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
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Customer Success Manager(s) *</label>
                <MultiSelect
                  options={users}
                  value={form.csm_ids}
                  onChange={setMulti('csm_ids')}
                  placeholder="Select at least one…"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Relationship Manager(s) *</label>
                <MultiSelect
                  options={users}
                  value={form.rm_ids}
                  onChange={setMulti('rm_ids')}
                  placeholder="Select at least one…"
                />
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

      {error && <div className="error">{error}</div>}
      <p className="muted">{pageRangeText(page, PAGE_SIZE, total, 'clients')}</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Region</th>
                <th>State</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Implementation State</th>
                <th>New / Recurring</th>
                <th>Kickoff</th>
                <th>Billing / Go-Live</th>
                <th>Total Users</th>
                <th>Phases</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="client-name-cell">
                      <Link to={`/clients/${c.id}`}>{c.name}</Link>
                      {c.instance_link && (
                        <a
                          href={c.instance_link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-light btn-sm instance-link-btn"
                          title={c.instance_link}
                          aria-label={`Open ${c.name}'s instance`}
                        >
                          🔗
                        </a>
                      )}
                    </div>
                  </td>
                  <td>{c.region || '—'}</td>
                  <td>{c.state || '—'}</td>
                  <td><PriorityBadge value={c.priority} /></td>
                  <td><StatusBadge value={c.status} /></td>
                  <td>{c.implementation_state || '—'}</td>
                  <td>{c.new_recurring || '—'}</td>
                  <td>{c.kickoff_meeting_date || '—'}</td>
                  <td>{c.billing_date || '—'}</td>
                  <td>{c.total_users ?? '—'}</td>
                  <td>{c.phase_count}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={11} className="muted" style={{ textAlign: 'center' }}>No clients match the filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  )
}
