import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

export default function SearchResults() {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) {
      setResults({ clients: [], projects: [], tasks: [], users: [] })
      return
    }
    setLoading(true)
    setError('')
    api
      .get('/search/', { params: { q } })
      .then((res) => setResults(res.data))
      .catch(() => setError('Search failed'))
      .finally(() => setLoading(false))
  }, [q])

  const total =
    (results?.clients?.length || 0) +
    (results?.projects?.length || 0) +
    (results?.tasks?.length || 0) +
    (results?.users?.length || 0)

  return (
    <div>
      <div className="page-header">
        <h2>Search</h2>
      </div>
      {q ? (
        <p className="muted">
          {loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'} for “${q}”`}
        </p>
      ) : (
        <p className="muted">Type in the search box above to find clients, projects, tasks, and users.</p>
      )}
      {error && <div className="error">{error}</div>}

      {results && results.clients.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Clients</h3>
          {results.clients.map((c) => (
            <p key={c.id} style={{ margin: '0.35rem 0' }}>
              <Link to={`/clients/${c.id}`}>{c.name}</Link>
              {c.crm_id && <span className="muted"> · {c.crm_id}</span>}
              {c.institution_type && <span className="muted"> · {c.institution_type}</span>}
            </p>
          ))}
        </div>
      )}

      {results && results.projects.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Projects</h3>
          {results.projects.map((p) => (
            <p key={p.id} style={{ margin: '0.35rem 0' }}>
              <Link to={`/projects/${p.id}`}>{p.name}</Link>
              {p.client_name && <span className="muted"> · {p.client_name}</span>}
              <span className="muted"> · {p.progress}%</span>
            </p>
          ))}
        </div>
      )}

      {results && results.tasks.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Tasks</h3>
          {results.tasks.map((t) => (
            <p key={t.id} style={{ margin: '0.35rem 0' }}>
              <Link to={`/projects/${t.project_id}`}>{t.title}</Link>
              <span className="muted"> · {t.project_name} · {t.status} · {t.priority}</span>
            </p>
          ))}
        </div>
      )}

      {results && results.users.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Users</h3>
          {results.users.map((u) => (
            <p key={u.id} style={{ margin: '0.35rem 0' }}>
              {u.name} <span className="muted">· {u.email} · {u.role}</span>
            </p>
          ))}
        </div>
      )}

      {results && !loading && q && total === 0 && (
        <div className="muted">No results found.</div>
      )}
    </div>
  )
}
