import React, { useEffect, useState } from 'react'
import api from '../api/client'

const BLANK = {
  name: '',
  email: '',
  password: '',
  role_id: '',
  is_active: true,
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadUsers = () => {
    setError('')
    api
      .get('/users/')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load users'))
  }

  const loadRoles = () => {
    setError('')
    api
      .get('/roles/')
      .then((res) => setRoles(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load roles'))
  }

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(BLANK)
    setShowModal(true)
    setError('')
  }

  const openEdit = (user) => {
    setEditingId(user.id)
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role_id: user.role_id ? String(user.role_id) : '',
      is_active: user.is_active ?? true,
    })
    setShowModal(true)
    setError('')
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(BLANK)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role_id: parseInt(form.role_id, 10),
        is_active: form.is_active,
      }
      if (form.password) {
        payload.password = form.password
      }

      if (editingId) {
        await api.put(`/users/${editingId}`, payload)
      } else {
        await api.post('/users/', payload)
      }
      closeModal()
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    setError('')
    try {
      await api.put(`/users/${user.id}`, { is_active: !user.is_active })
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user status')
    }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete user ${user.name} (${user.email})?`)) return
    setError('')
    try {
      await api.delete(`/users/${user.id}`)
      loadUsers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [k]: value })
  }

  const selectedRole = roles.find((r) => r.id === parseInt(form.role_id, 10))

  const modalTitle = editingId ? 'Edit User' : 'New User'
  const submitLabel = saving ? 'Saving…' : editingId ? 'Update User' : 'Create User'

  return (
    <div>
      <div className="page-header">
        <h2>Users</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          + New User
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                </td>
                <td>{u.email}</td>
                <td>{u.role?.name || '—'}</td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-green' : 'badge-grey'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-light btn-sm" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center' }}>
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submit}>
              <div className="modal-header">
                <h3>{modalTitle}</h3>
                <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div>
                    <label htmlFor="name">Name *</label>
                    <input id="name" value={form.name} onChange={set('name')} required />
                  </div>
                  <div>
                    <label htmlFor="email">Email *</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div>
                    <label htmlFor="password">
                      Password {editingId ? '(leave blank to keep current)' : '*'}
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={set('password')}
                      required={!editingId}
                      minLength={editingId && form.password ? 6 : undefined}
                    />
                  </div>
                  <div>
                    <label htmlFor="role">Role *</label>
                    <p className="field-hint">
                      {selectedRole
                        ? selectedRole.description || 'No description for this role.'
                        : '\u00A0'}
                    </p>
                    <select id="role" value={form.role_id} onChange={set('role_id')} required>
                      <option value="">Select a role…</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group checkbox-field">
                  <input id="is_active" type="checkbox" checked={form.is_active} onChange={set('is_active')} />
                  <label htmlFor="is_active">Active account</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || roles.length === 0}>
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
