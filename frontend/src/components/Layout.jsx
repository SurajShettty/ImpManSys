import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="navbar-brand">IMS</div>
          <div className="navbar-links">
            <NavLink to="/" end className="nav-link">Dashboard</NavLink>
            <NavLink to="/clients" className="nav-link">Clients</NavLink>
            <NavLink to="/projects" className="nav-link">Projects</NavLink>
          </div>
        </div>
        <div className="navbar-user">
          <span className="muted">
            {user?.email} ({user?.role_name})
          </span>
          <button className="btn btn-light btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>
      <div className="container">
        <Outlet />
      </div>
    </div>
  )
}
