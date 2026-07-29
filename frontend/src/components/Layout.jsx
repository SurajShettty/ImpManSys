import React, { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function AdminDropdown({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  const canAudit = user?.permissions?.includes('audit.view')
  const canRecycle = user?.permissions?.includes('recycle_bin.view')
  const canRoles = user?.permissions?.includes('role.manage')

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!canAudit && !canRecycle && !canRoles) return null

  const isActive =
    location.pathname.startsWith('/audit-logs') ||
    location.pathname.startsWith('/recycle-bin') ||
    location.pathname.startsWith('/role-permissions')

  return (
    <div ref={ref} className={`nav-dropdown ${open ? 'open' : ''}`}>
      <button
        type="button"
        className={`nav-dropdown-toggle ${isActive ? 'active' : ''}`}
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Admin <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          {canAudit && (
            <NavLink to="/audit-logs" className="nav-link">
              Audit Logs
            </NavLink>
          )}
          {canRecycle && (
            <NavLink to="/recycle-bin" className="nav-link">
              Recycle Bin
            </NavLink>
          )}
          {canRoles && (
            <NavLink to="/role-permissions" className="nav-link">
              Roles
            </NavLink>
          )}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved === 'dark'
  })

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((d) => !d)

  const submitSearch = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  return (
    <div>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="navbar-brand">
            <img src="/digii-logo.png" alt="Digii" className="navbar-logo" />
            <span className="navbar-ims">IMS</span>
          </div>
          <div className="navbar-links">
            <NavLink to="/" end className="nav-link">Dashboard</NavLink>
            <NavLink to="/clients" className="nav-link">Clients</NavLink>
            <NavLink to="/projects" className="nav-link">Projects</NavLink>
            {user?.permissions?.includes('user.view') && (
              <NavLink to="/users" className="nav-link">Users</NavLink>
            )}
            <AdminDropdown user={user} />
          </div>
        </div>
        <div className="navbar-user">
          <form onSubmit={submitSearch} className="navbar-search">
            <input
              type="search"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Global search"
            />
          </form>
          <button
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          />
          <span className="theme-toggle-label">{darkMode ? 'Dark' : 'Light'}</span>
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
