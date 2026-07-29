import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { PriorityBadge, ProgressBar, StatusBadge } from '../components/ui'

function ResultSection({ title, count, children }) {
  if (!count) return null
  return (
    <div className="card search-section">
      <div className="dashboard-card-header">
        <h3>{title}</h3>
        <span className="badge badge-grey">{count}</span>
      </div>
      <div className="search-result-list">{children}</div>
    </div>
  )
}

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
    <div className="search-page">
      <div className="page-header">
        <h2>Search</h2>
      </div>
      {q ? (
        <p className="muted">
          {loading ? 'Searching...' : `${total} result${total === 1 ? '' : 's'} for "${q}"`}
        </p>
      ) : (
        <p className="muted">Type in the search box above to find clients, phases, activities, and users.</p>
      )}
      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="card">
          <div className="skeleton skeleton-heading" />
          <div className="skeleton-grid">
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
            <div className="skeleton skeleton-line" />
          </div>
        </div>
      )}

      {!loading && results && (
        <ResultSection title="Clients" count={results.clients.length}>
          {results.clients.map((c) => (
            <Link className="search-result" to={`/clients/${c.id}`} key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <div className="search-meta">
                  {c.crm_id && <span>{c.crm_id}</span>}
                  {c.institution_type && <span>{c.institution_type}</span>}
                </div>
              </div>
              <StatusBadge value={c.status} />
            </Link>
          ))}
        </ResultSection>
      )}

      {!loading && results && (
        <ResultSection title="Phases" count={results.phases.length}>
          {results.phases.map((p) => (
            <Link className="search-result" to={`/phases/${p.id}`} key={p.id}>
              <div>
                <strong>{p.name}</strong>
                <div className="search-meta">
                  {p.client_name && <span>{p.client_name}</span>}
                  {p.type && <span>{p.type}</span>}
                  {p.end_date && <span>Ends {p.end_date}</span>}
                </div>
              </div>
              <div className="search-result-side">
                <StatusBadge value={p.status} />
                <ProgressBar value={p.progress} />
              </div>
            </Link>
          ))}
        </ResultSection>
      )}

      {!loading && results && (
        <ResultSection title="Activities" count={results.activities.length}>
          {results.activities.map((a) => (
            <Link className="search-result" to={`/phases/${a.phase_id}`} key={a.id}>
              <div>
                <strong>{a.title}</strong>
                <div className="search-meta">
                  {a.client_name && <span>{a.client_name}</span>}
                  {a.phase_name && <span>{a.phase_name}</span>}
                  {a.module_name && <span>{a.module_name}</span>}
                  {a.owner && <span>Owner: {a.owner}</span>}
                  {a.due_date && <span>Due {a.due_date}</span>}
                </div>
              </div>
              <div className="search-result-side">
                <StatusBadge value={a.status} />
                <PriorityBadge value={a.priority} />
              </div>
            </Link>
          ))}
        </ResultSection>
      )}

      {!loading && results && (
        <ResultSection title="Users" count={results.users.length}>
          {results.users.map((u) => (
            <div className="search-result" key={u.id}>
              <div>
                <strong>{u.name}</strong>
                <div className="search-meta">
                  <span>{u.email}</span>
                  {u.role && <span>{u.role}</span>}
                </div>
              </div>
            </div>
          ))}
        </ResultSection>
      )}

      {results && !loading && q && total === 0 && (
        <div className="card empty-state">
          <h3>No results found</h3>
          <p className="muted">Try a client name, phase name, module, status, priority, CRM ID, or user email.</p>
        </div>
      )}
    </div>
  )
}
