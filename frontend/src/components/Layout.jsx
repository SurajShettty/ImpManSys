import React, { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

const NOTIFICATION_TYPE_COLOURS = { due_today: 'amber', overdue: 'red', assigned: 'blue' }
const NOTIFICATION_TYPE_LABELS = { due_today: 'Due today', overdue: 'Overdue', assigned: 'Assigned' }
const NOTIFICATION_POLL_MS = 60000

function NotificationBell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)

  const load = () => {
    api
      .get('/notifications/', { params: { page: 1, page_size: 10 } })
      .then((res) => {
        setNotifications(res.data.items || [])
        setUnreadCount(res.data.unread_count || 0)
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, NOTIFICATION_POLL_MS)
    return () => clearInterval(interval)
  }, [])

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

  const openNotification = async (n) => {
    setOpen(false)
    if (!n.is_read) {
      try {
        await api.post(`/notifications/${n.id}/read`)
        load()
      } catch {
        // ignore - navigation still proceeds
      }
    }
    if (n.phase_id) navigate(`/phases/${n.phase_id}`)
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      load()
    } catch {
      // ignore
    }
  }

  return (
    <div ref={ref} className={`nav-dropdown ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="notification-bell"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="nav-dropdown-menu notification-panel">
          {notifications.length === 0 && <p className="muted notification-empty">No notifications.</p>}
          {notifications.map((n) => (
            <button
              type="button"
              key={n.id}
              className={`notification-item ${n.is_read ? '' : 'unread'}`}
              onClick={() => openNotification(n)}
            >
              <span className={`badge badge-${NOTIFICATION_TYPE_COLOURS[n.type] || 'grey'}`}>
                {NOTIFICATION_TYPE_LABELS[n.type] || n.type}
              </span>
              <span className="notification-message">{n.message}</span>
              {n.client_name && <span className="notification-client muted">{n.client_name}</span>}
            </button>
          ))}
          <div className="notification-footer">
            <button type="button" className="btn btn-light btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>
              Mark all read
            </button>
            <NavLink to="/notifications" className="nav-link" onClick={() => setOpen(false)}>
              View all
            </NavLink>
          </div>
        </div>
      )}
    </div>
  )
}

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
            <NavLink to="/phases" className="nav-link">Phases</NavLink>
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
          <NotificationBell />
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
