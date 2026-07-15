import React from 'react'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Implementation Management System</div>
        <div className="navbar-user">
          <span>
            {user?.email} ({user?.role_name})
          </span>
          <button className="btn btn-primary" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>
      <div className="container">
        <h2>Dashboard</h2>
        <p>Welcome, {user?.name || user?.email}.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <h3>Active Projects</h3>
            <p style={{ fontSize: '2rem', margin: 0 }}>0</p>
          </div>
          <div className="card">
            <h3>Delayed</h3>
            <p style={{ fontSize: '2rem', margin: 0 }}>0</p>
          </div>
          <div className="card">
            <h3>Go-Live This Month</h3>
            <p style={{ fontSize: '2rem', margin: 0 }}>0</p>
          </div>
          <div className="card">
            <h3>Open Issues</h3>
            <p style={{ fontSize: '2rem', margin: 0 }}>0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
