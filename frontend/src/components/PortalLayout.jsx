import React, { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PortalLayout() {
  const { user, logout } = useAuth()
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

  return (
    <div>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div className="navbar-brand">
            <img src="/digii-logo.png" alt="Digii" className="navbar-logo" />
            <span className="navbar-ims">Client Portal</span>
          </div>
          <div className="navbar-links">
            <NavLink to="/portal" end className="nav-link">Overview</NavLink>
            <NavLink to="/portal/phases" className="nav-link">Phases</NavLink>
            <NavLink to="/portal/meetings" className="nav-link">Meetings</NavLink>
            <NavLink to="/portal/notifications" className="nav-link">Notifications</NavLink>
          </div>
        </div>
        <div className="navbar-user">
          <button
            className="theme-toggle"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          />
          <span className="theme-toggle-label">{darkMode ? 'Dark' : 'Light'}</span>
          <span className="muted">{user?.email}</span>
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
