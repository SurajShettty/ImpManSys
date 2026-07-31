import React, { useEffect, useRef, useState } from 'react'

// Map a status string to a RAG-style badge colour.
const STATUS_COLOURS = {
  // Generic / phase / module
  'Not Started': 'grey',
  'In Progress': 'blue',
  'On Hold': 'amber',
  'Completed': 'green',
  'Cancelled': 'red',
  // Client
  'Active': 'green',
  'Churned': 'red',
  // Activity-specific
  'Waiting for Client': 'amber',
  'Waiting for Internal Team': 'amber',
  'Blocked': 'red',
  'Under Testing': 'theme',
}

const PRIORITY_COLOURS = {
  Critical: 'red',
  High: 'amber',
  Medium: 'blue',
  Low: 'grey',
}

export function StatusBadge({ value }) {
  const colour = STATUS_COLOURS[value] || 'grey'
  return <span className={`badge badge-${colour}`}>{value}</span>
}

export function PriorityBadge({ value }) {
  const colour = PRIORITY_COLOURS[value] || 'grey'
  return <span className={`badge badge-${colour}`}>{value}</span>
}

export function ProgressBar({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="muted" style={{ minWidth: 38 }}>{pct}%</span>
    </div>
  )
}

// Page-number strip with prev/next, used by any server-paginated list.
export function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null

  const maxButtons = 7
  let from = Math.max(1, page - 3)
  let to = Math.min(pages, from + maxButtons - 1)
  from = Math.max(1, to - maxButtons + 1)
  const pageNumbers = []
  for (let i = from; i <= to; i++) pageNumbers.push(i)

  return (
    <div className="pagination">
      <button
        className="btn btn-light btn-sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        ‹ Prev
      </button>
      {from > 1 && (
        <>
          <button className="pagination-btn" onClick={() => onPageChange(1)}>1</button>
          {from > 2 && <span className="pagination-ellipsis">…</span>}
        </>
      )}
      {pageNumbers.map((n) => (
        <button
          key={n}
          className={`pagination-btn ${n === page ? 'active' : ''}`}
          onClick={() => onPageChange(n)}
        >
          {n}
        </button>
      ))}
      {to < pages && (
        <>
          {to < pages - 1 && <span className="pagination-ellipsis">…</span>}
          <button className="pagination-btn" onClick={() => onPageChange(pages)}>{pages}</button>
        </>
      )}
      <button
        className="btn btn-light btn-sm"
        onClick={() => onPageChange(Math.min(pages, page + 1))}
        disabled={page === pages}
      >
        Next ›
      </button>
    </div>
  )
}

// "Showing X–Y of Z entries" helper text for a paginated list.
export function pageRangeText(page, pageSize, total, noun = 'entries') {
  if (total === 0) return `No ${noun}`
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return `Showing ${start}–${end} of ${total} ${noun}`
}

// A closed-by-default dropdown with checkboxes, for picking several options
// from a list (e.g. assigning multiple CSMs/RMs to a client). Shows a search
// box once there are enough options to make scanning them impractical.
export function MultiSelect({ options, value, onChange, placeholder = 'Select…', searchThreshold = 6 }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch('')
      searchRef.current?.focus()
    }
  }, [open])

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  const selectedLabels = options.filter((o) => value.includes(o.id)).map((o) => o.name)
  const showSearch = options.length > searchThreshold
  const term = search.trim().toLowerCase()
  const filteredOptions = term ? options.filter((o) => o.name.toLowerCase().includes(term)) : options

  return (
    <div className={`multiselect ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="multiselect-trigger"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`multiselect-value ${selectedLabels.length ? '' : 'muted'}`}>
          {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
        </span>
      </button>
      {open && (
        <div className="multiselect-menu" role="listbox">
          {showSearch && (
            <input
              ref={searchRef}
              type="text"
              className="multiselect-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {filteredOptions.length === 0 && (
            <p className="muted multiselect-empty">{options.length === 0 ? 'No options.' : 'No matches.'}</p>
          )}
          {filteredOptions.map((o) => (
            <label className="multiselect-option" key={o.id}>
              <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />
              <span>{o.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
