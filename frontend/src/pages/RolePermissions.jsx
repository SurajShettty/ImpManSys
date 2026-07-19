import React, { useEffect, useState } from 'react'
import api from '../api/client'

export default function RolePermissions() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [matrix, setMatrix] = useState({}) // { [roleId]: Set(permissionCodes) }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    Promise.all([api.get('/roles/'), api.get('/roles/permissions/all')])
      .then(async ([rolesRes, permsRes]) => {
        setRoles(rolesRes.data)
        setPermissions(permsRes.data)
        const matrixData = {}
        await Promise.all(
          rolesRes.data.map((role) =>
            api.get(`/roles/${role.id}/permissions`).then((res) => {
              matrixData[role.id] = new Set(res.data.permissions.map((p) => p.code))
            })
          )
        )
        setMatrix(matrixData)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load roles and permissions')
        setLoading(false)
      })
  }, [])

  const togglePermission = (roleId, code) => {
    setMatrix((prev) => {
      const next = new Set(prev[roleId] || [])
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return { ...prev, [roleId]: next }
    })
  }

  const saveRole = async (roleId) => {
    setSaving(roleId)
    setError('')
    try {
      const codes = Array.from(matrix[roleId] || [])
      await api.put(`/roles/${roleId}/permissions`, { permission_codes: codes })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update permissions')
    } finally {
      setSaving(null)
    }
  }

  const grouped = permissions.reduce((acc, p) => {
    const cat = p.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(p)
    return acc
  }, {})

  if (loading) return <div className="muted">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Role Permissions Matrix</h2>
      </div>
      {error && <div className="error">{error}</div>}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="table permissions-matrix">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Role</th>
              {permissions.map((p) => (
                <th key={p.code} title={p.description}>
                  <div className="permission-col-header">
                    <span className="permission-name">{p.name}</span>
                    <span className="permission-code">{p.code}</span>
                  </div>
                </th>
              ))}
              <th style={{ width: 1 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <strong>{role.name}</strong>
                  {role.name === 'Administrator' && (
                    <div className="muted" style={{ fontSize: '0.75rem' }}>All permissions</div>
                  )}
                </td>
                {permissions.map((p) => {
                  const checked = matrix[role.id]?.has(p.code) || role.name === 'Administrator'
                  return (
                    <td key={p.code} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={role.name === 'Administrator'}
                        onChange={() => togglePermission(role.id, p.code)}
                        aria-label={`${role.name} can ${p.name}`}
                      />
                    </td>
                  )
                })}
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => saveRole(role.id)}
                    disabled={saving === role.id || role.name === 'Administrator'}
                  >
                    {saving === role.id ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Permission Categories</h3>
        {Object.entries(grouped).map(([category, perms]) => (
          <div key={category} style={{ marginBottom: '0.75rem' }}>
            <strong>{category}</strong>
            <div className="permission-category">
              {perms.map((p) => (
                <span key={p.code} className="badge badge-grey" title={p.description}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
