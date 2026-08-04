import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyClients from './pages/MyClients'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Phases from './pages/Phases'
import PhaseDetail from './pages/PhaseDetail'
import Users from './pages/Users'
import SearchResults from './pages/SearchResults'
import Notifications from './pages/Notifications'
import AuditLogs from './pages/AuditLogs'
import RecycleBin from './pages/RecycleBin'
import RolePermissions from './pages/RolePermissions'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import RoleRoute from './components/RoleRoute'
import PermissionRoute from './components/PermissionRoute'

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
        <Route
          path="/my-clients"
          element={
            <RoleRoute allowedRoles={['Customer Success Manager', 'Relationship Manager']}>
              <MyClients />
            </RoleRoute>
          }
        />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/phases" element={<Phases />} />
        <Route path="/phases/:id" element={<PhaseDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/users"
          element={
            <PermissionRoute permission="user.view">
              <Users />
            </PermissionRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <PermissionRoute permission="audit.view">
              <AuditLogs />
            </PermissionRoute>
          }
        />
        <Route
          path="/recycle-bin"
          element={
            <PermissionRoute permission="recycle_bin.view">
              <RecycleBin />
            </PermissionRoute>
          }
        />
        <Route
          path="/role-permissions"
          element={
            <PermissionRoute permission="role.manage">
              <RolePermissions />
            </PermissionRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
