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
  const [usersError, setUsersError] = useState('')
  const [rolesError, setRolesError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  const loadUsers = () => {
    setUsersError('')
    api
      .get('/users/')
      .then((res) => setUsers(res.data))
      .catch((err) => setUsersError(err.response?.data?.detail || 'Failed to load users'))
  }

  const loadRoles = () => {
    setRolesError('')
    api
      .get('/roles/')
      .then((res) => setRoles(res.data))
      .catch((err) => setRolesError(err.response?.data?.detail || 'Failed to load roles'))
  }

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setUsersError('')
    try {
      const payload = {
        ...form,
        role_id: parseInt(form.role_id, 10),
      }
      await api.post('/users/', payload)
      setForm(BLANK)
      setShowForm(false)
      loadUsers()
    } catch (err) {
      setUsersError(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }

  const set = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [k]: value })
  }

  const selectedRole = roles.find((r) => r.id === parseInt(form.role_id, 10))

  return (
    <div>
      <div className="page-header">
        <h2>Users</h2>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>
      {usersError && <div className="error">{usersError}</div>}
      {rolesError && <div className="error">{rolesError}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={submit}>
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
              <div>
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="role">Role *</label>
                <select id="role" value={form.role_id} onChange={set('role_id')} required>
                  <option value="">Select a role…</option>
                  {roles.length === 0 && (
                    <option value="" disabled>
                      No roles available
                    </option>
                  )}
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {selectedRole && (
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {selectedRole.description || 'No description for this role.'}
                  </p>
                )}
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={set('is_active')}
              />
              <label htmlFor="is_active" style={{ margin: 0 }}>
                Active account
              </label>
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn btn-primary" disabled={saving || roles.length === 0}>
                {saving ? 'Saving…' : 'Create User'}
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
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role?.name || '—'}</td>
                <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
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
    </div>
  )
}
