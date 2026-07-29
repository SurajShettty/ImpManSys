import React, { useEffect, useRef, useState } from 'react'
import api from '../api/client'

function formatRemaining(expiresAt, now) {
  if (!expiresAt) return '—'
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return 'Expired'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function Section({ title, entity, items, render, restoring, onRestore, now }) {
  if (!items || items.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <table className="table">
        <tbody>
          {items.map((item) => {
            const remaining = formatRemaining(item.expires_at, now)
            const expired = remaining === 'Expired'
            return (
              <tr key={item.id}>
                <td>{render(item)}</td>
                <td className="muted" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                  {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '—'}
                </td>
                <td style={{ width: '1%', whiteSpace: 'nowrap' }}>
                  <span className={`countdown ${expired ? 'expired' : ''}`}>
                    {expired ? 'Expired' : `${remaining} left`}
                  </span>
                </td>
                <td style={{ width: '1%' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onRestore(entity, item.id)}
                    disabled={expired || restoring === `${entity}-${item.id}`}
                  >
                    {restoring === `${entity}-${item.id}` ? 'Restoring…' : 'Restore'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function RecycleBin() {
  const [bin, setBin] = useState(null)
  const [error, setError] = useState('')
  const [restoring, setRestoring] = useState('')
  const [now, setNow] = useState(Date.now())
  const timerRef = useRef(null)

  const load = () => {
    setError('')
    api
      .get('/recycle-bin/')
      .then((res) => setBin(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load recycle bin'))
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const restore = async (entity, id) => {
    setRestoring(`${entity}-${id}`)
    setError('')
    try {
      await api.post(`/recycle-bin/restore/${entity}/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to restore item')
    } finally {
      setRestoring('')
    }
  }

  const empty =
    bin &&
    bin.clients.length === 0 &&
    bin.phases.length === 0 &&
    bin.activities.length === 0 &&
    bin.users.length === 0 &&
    bin.meetings.length === 0

  return (
    <div>
      <div className="page-header">
        <h2>Recycle Bin</h2>
        <span className="muted">Items can be restored within 12 hours of deletion</span>
      </div>
      {error && <div className="error">{error}</div>}
      {!bin && <div className="muted">Loading…</div>}
      {empty && <div className="muted">Recycle bin is empty. Deleted items will appear here for 12 hours.</div>}

      {bin && (
        <>
          <Section
            title="Clients"
            entity="clients"
            items={bin.clients}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(c) => (
              <>
                <strong>{c.name}</strong>
                {c.crm_id && <span className="muted"> · {c.crm_id}</span>}
              </>
            )}
          />
          <Section
            title="Phases"
            entity="phases"
            items={bin.phases}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(p) => (
              <>
                <strong>{p.name}</strong>
                {p.client_name && <span className="muted"> · {p.client_name}</span>}
                {p.client_deleted && (
                  <span className="badge badge-red" style={{ marginLeft: '0.5rem' }}>
                    Client deleted — restore client first
                  </span>
                )}
              </>
            )}
          />
          <Section
            title="Activities"
            entity="activities"
            items={bin.activities}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(a) => (
              <>
                <strong>{a.title}</strong>
                <span className="muted"> · {a.phase_name}</span>
              </>
            )}
          />
          <Section
            title="Users"
            entity="users"
            items={bin.users}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(u) => (
              <>
                <strong>{u.name}</strong>
                <span className="muted"> · {u.email}</span>
              </>
            )}
          />
          <Section
            title="Meetings"
            entity="meetings"
            items={bin.meetings}
            restoring={restoring}
            onRestore={restore}
            now={now}
            render={(m) => (
              <>
                <strong>{m.title}</strong>
                <span className="muted"> · {m.phase_name || 'Phase unavailable'}</span>
              </>
            )}
          />
        </>
      )}
    </div>
  )
}
