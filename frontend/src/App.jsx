import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Users from './pages/Users'
import SearchResults from './pages/SearchResults'
import AuditLogs from './pages/AuditLogs'
import RecycleBin from './pages/RecycleBin'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import RoleRoute from './components/RoleRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route
          path="/users"
          element={
            <RoleRoute allowedRoles={['Administrator']}>
              <Users />
            </RoleRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RoleRoute allowedRoles={['Administrator', 'Management']}>
              <AuditLogs />
            </RoleRoute>
          }
        />
        <Route
          path="/recycle-bin"
          element={
            <RoleRoute allowedRoles={['Administrator']}>
              <RecycleBin />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
