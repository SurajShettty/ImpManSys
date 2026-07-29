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
      setResults({ clients: [], phases: [], activities: [], users: [] })
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
    (results?.phases?.length || 0) +
    (results?.activities?.length || 0) +
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
        <p className="muted">Type in the search box above to find clients, phases, activities, and users.</p>
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

      {results && results.phases.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Phases</h3>
          {results.phases.map((p) => (
            <p key={p.id} style={{ margin: '0.35rem 0' }}>
              <Link to={`/phases/${p.id}`}>{p.name}</Link>
              {p.client_name && <span className="muted"> · {p.client_name}</span>}
              <span className="muted"> · {p.progress}%</span>
            </p>
          ))}
        </div>
      )}

      {results && results.activities.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Activities</h3>
          {results.activities.map((a) => (
            <p key={a.id} style={{ margin: '0.35rem 0' }}>
              <Link to={`/phases/${a.phase_id}`}>{a.title}</Link>
              <span className="muted"> · {a.phase_name} · {a.status} · {a.priority}</span>
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
