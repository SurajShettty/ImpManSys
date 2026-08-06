import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleRoute({ allowedRoles, excludeRoles, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (excludeRoles?.includes(user.role_name)) {
    return <Navigate to="/portal" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role_name)) {
    return <Navigate to={user.role_name === 'Client' ? '/portal' : '/'} replace />
  }

  return children
}
