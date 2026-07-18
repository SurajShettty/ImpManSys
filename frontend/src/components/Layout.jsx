import React, { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
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
            <span className="navbar-ims">IMS</span>
          </div>
          <div className="navbar-links">
            <NavLink to="/" end className="nav-link">Dashboard</NavLink>
            <NavLink to="/clients" className="nav-link">Clients</NavLink>
            <NavLink to="/projects" className="nav-link">Projects</NavLink>
            {user?.role_name === 'Administrator' && (
              <NavLink to="/users" className="nav-link">Users</NavLink>
            )}
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
