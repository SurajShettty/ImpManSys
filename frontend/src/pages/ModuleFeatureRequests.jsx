import React, { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge } from '../components/ui'

const FEATURE_TYPES = ['Feature', 'Enhancement', 'Bug']
const FEATURE_STATUSES = ['Requested', 'In Progress', 'Done', 'Rejected']
const FEATURE_PRIORITIES = ['Low', 'Medium', 'High']

const BLANK = {
  module_id: '',
  title: '',
  description: '',
  type: 'Feature',
  status: 'Requested',
  priority: 'Medium',
  clickup_link: '',
  requested_by_client_id: '',
}

export default function ModuleFeatureRequests() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [modules, setModules] = useState([])
  const [users, setUsers] = useState([])
  const [clients, setClients] = useState([])
  const [filters, setFilters] = useState({
    module_id: '',
    status: '',
    type: '',
    priority: '',
    requested_by: '',
    requested_by_client_id: '',
  })
  const [groupBy, setGroupBy] = useState('none')
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const canCreate = user?.permissions?.includes('feature_request.create')
  const canUpdate = user?.permissions?.includes('feature_request.update')
  const canDelete = user?.permissions?.includes('feature_request.delete')

  const load = () => {
    setError('')
    const params = {}
    if (filters.module_id) params.module_id = filters.module_id
    if (filters.status) params.status = filters.status
    if (filters.type) params.type = filters.type
    if (filters.priority) params.priority = filters.priority
    if (filters.requested_by) params.requested_by = filters.requested_by
    if (filters.requested_by_client_id) params.requested_by_client_id = filters.requested_by_client_id
    api
      .get('/module-features/', { params })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load feature requests'))
  }

  useEffect(load, [filters])

  useEffect(() => {
    api.get('/modules/').then((res) => setModules(res.data)).catch(() => {})
    api.get('/users/').then((res) => setUsers(res.data)).catch(() => {})
    api.get('/clients/', { params: { page_size: 100 } }).then((res) => setClients(res.data.items || [])).catch(() => {})
  }, [])

  const setFilter = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const clearFilters = () =>
    setFilters({ module_id: '', status: '', type: '', priority: '', requested_by: '', requested_by_client_id: '' })
  const hasFilters =
    filters.module_id ||
    filters.status ||
    filters.type ||
    filters.priority ||
    filters.requested_by ||
    filters.requested_by_client_id

  const openCreate = () => {
    setEditingId(null)
    setForm(BLANK)
    setShowModal(true)
    setError('')
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      module_id: String(item.module_id),
      title: item.title,
      description: item.description || '',
      type: item.type,
      status: item.status,
      priority: item.priority,
      clickup_link: item.clickup_link || '',
      requested_by_client_id: item.requested_by_client_id ? String(item.requested_by_client_id) : '',
    })
    setShowModal(true)
    setError('')
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(BLANK)
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        module_id: parseInt(form.module_id, 10),
        title: form.title,
        description: form.description || null,
        type: form.type,
        status: form.status,
        priority: form.priority,
        clickup_link: form.clickup_link || null,
        requested_by_client_id: form.requested_by_client_id ? parseInt(form.requested_by_client_id, 10) : null,
      }
      if (editingId) {
        await api.put(`/module-features/${editingId}`, payload)
      } else {
        await api.post('/module-features/', payload)
      }
      closeModal()
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save feature request')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    setError('')
    try {
      await api.delete(`/module-features/${item.id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete feature request')
    }
  }

  const groupKey = (item) => {
    if (groupBy === 'module') return item.module?.name || 'Unknown module'
    if (groupBy === 'status') return item.status
    return null
  }

  const groups =
    groupBy === 'none'
      ? { '': items }
      : items.reduce((acc, item) => {
          const key = groupKey(item)
          acc[key] = acc[key] || []
          acc[key].push(item)
          return acc
        }, {})

  const renderTable = (rows) => (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Module</th>
            <th>Type</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Requested By</th>
            <th>Client</th>
            <th>Created</th>
            <th>ClickUp</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.title}</strong>
                {item.description && (
                  <span className="muted" style={{ display: 'block', fontSize: '0.85em' }}>
                    {item.description}
                  </span>
                )}
              </td>
              <td>{item.module?.name || '—'}</td>
              <td><span className="badge badge-blue">{item.type}</span></td>
              <td><StatusBadge value={item.status} /></td>
              <td><PriorityBadge value={item.priority} /></td>
              <td className="muted">{item.requester?.name || '—'}</td>
              <td className="muted">{item.requested_by_client?.name || '—'}</td>
              <td className="muted">{new Date(item.created_at).toLocaleDateString()}</td>
              <td>
                {item.clickup_link && (
                  <a
                    href={item.clickup_link}
                    target="_blank"
                    rel="noreferrer"
                    className="badge badge-grey"
                    title="Open in ClickUp"
                  >
                    ↗ ClickUp
                  </a>
                )}
              </td>
              <td>
                <div className="actions" style={{ justifyContent: 'flex-end' }}>
                  {canUpdate && (
                    <button className="btn btn-light btn-sm" onClick={() => openEdit(item)}>
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button className="btn btn-danger btn-sm" onClick={() => remove(item)}>
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="muted" style={{ textAlign: 'center' }}>
                No feature requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )

  const modalTitle = editingId ? 'Edit Feature Request' : 'New Feature Request'
  const submitLabel = saving ? 'Saving…' : editingId ? 'Update Request' : 'Create Request'

  return (
    <div>
      <div className="page-header">
        <h2>Feature Requests</h2>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate}>
            + New Feature Request
          </button>
        )}
      </div>

      <div className="card filter-bar">
        <div className="filter-group">
          <label>Module</label>
          <select value={filters.module_id} onChange={setFilter('module_id')}>
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={setFilter('status')}>
            <option value="">All statuses</option>
            {FEATURE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select value={filters.type} onChange={setFilter('type')}>
            <option value="">All types</option>
            {FEATURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Priority</label>
          <select value={filters.priority} onChange={setFilter('priority')}>
            <option value="">All priorities</option>
            {FEATURE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Requested By</label>
          <select value={filters.requested_by} onChange={setFilter('requested_by')}>
            <option value="">All requesters</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Requested By Client</label>
          <select value={filters.requested_by_client_id} onChange={setFilter('requested_by_client_id')}>
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Group By</label>
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="none">None</option>
            <option value="module">Module</option>
            <option value="status">Status</option>
          </select>
        </div>
        {hasFilters && (
          <button type="button" className="btn btn-light btn-sm filter-clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {groupBy === 'none'
        ? renderTable(items)
        : Object.keys(groups).sort().map((key) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <h4>{key}</h4>
              {renderTable(groups[key])}
            </div>
          ))}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-row">
                  <div>
                    <label>Module *</label>
                    <select value={form.module_id} onChange={set('module_id')} required>
                      <option value="">Select a module</option>
                      {modules.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Title *</label>
                    <input value={form.title} onChange={set('title')} required />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <label>Type</label>
                    <select value={form.type} onChange={set('type')}>
                      {FEATURE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Priority</label>
                    <select value={form.priority} onChange={set('priority')}>
                      {FEATURE_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  {editingId && (
                    <div>
                      <label>Status</label>
                      <select value={form.status} onChange={set('status')}>
                        {FEATURE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-row" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <label>ClickUp Link</label>
                    <input value={form.clickup_link} onChange={set('clickup_link')} placeholder="https://..." />
                  </div>
                  <div>
                    <label>Requested By Client</label>
                    <select value={form.requested_by_client_id} onChange={set('requested_by_client_id')}>
                      <option value="">Internal / not client-specific</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={set('description')} />
                </div>

                {error && <div className="error" style={{ marginBottom: 0 }}>{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {submitLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
