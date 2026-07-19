import React from 'react'

// Map a status string to a RAG-style badge colour.
const STATUS_COLOURS = {
  // Generic / project / module
  'Not Started': 'grey',
  'In Progress': 'blue',
  'On Hold': 'amber',
  'Completed': 'green',
  'Cancelled': 'red',
  // Client
  'Active': 'green',
  'Churned': 'red',
  // Task-specific
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
