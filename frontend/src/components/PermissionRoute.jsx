import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PermissionRoute({ permission, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return user.permissions?.includes(permission) ? children : <Navigate to="/" replace />
}
