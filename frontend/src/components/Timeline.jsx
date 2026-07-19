import React from 'react'

// Compute per-phase progress from its tasks (mirrors backend roll-up rules).
export function phaseProgress(phase) {
  const tasks = (phase.tasks || []).filter((t) => t.status !== 'Cancelled')
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((acc, t) => acc + (t.status === 'Completed' ? 100 : t.progress || 0), 0)
  return Math.round((sum / tasks.length) * 100) / 100
}

// Segmented bar: one segment per phase, width = phase completion %.
export function PhaseTimeline({ phases }) {
  if (!phases || phases.length === 0) return null
  const segments = phases
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((phase) => ({ phase, pct: phaseProgress(phase) }))

  return (
    <div className="phase-timeline">
      <div className="phase-timeline-bar">
        {segments.map(({ phase, pct }) => (
          <div
            key={phase.id}
            className={`phase-timeline-segment ${pct >= 50 ? 'filled' : ''}`}
            title={`${phase.name}: ${pct}%`}
          >
            <div className="phase-timeline-fill" style={{ height: `${pct}%` }} />
            <span className="phase-timeline-label">{phase.name}</span>
            <span className="phase-timeline-pct">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple Gantt: one row per phase, bars positioned by task start/due dates.
export function GanttTimeline({ projectModules, projectStart, projectEnd }) {
  // Collect dated tasks across all modules/phases.
  const rows = []
  for (const pm of projectModules || []) {
    for (const phase of pm.phases || []) {
      const tasks = (phase.tasks || []).filter((t) => t.start_date || t.due_date)
      if (tasks.length === 0) continue
      rows.push({
        key: `${pm.id}-${phase.id}`,
        label: `${pm.module?.name || 'Module'} — ${phase.name}`,
        tasks,
      })
    }
  }

  if (rows.length === 0) {
    return <p className="muted">No dated tasks yet. Add start/due dates to tasks to see the timeline.</p>
  }

  // Determine the date range.
  let dates = []
  for (const row of rows) {
    for (const t of row.tasks) {
      if (t.start_date) dates.push(t.start_date)
      if (t.due_date) dates.push(t.due_date)
    }
  }
  const minDate = projectStart && projectStart < dates[0] ? projectStart : dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = projectEnd && projectEnd > dates[dates.length - 1] ? projectEnd : dates.reduce((a, b) => (a > b ? a : b))

  const toTime = (d) => new Date(d + 'T00:00:00').getTime()
  const min = toTime(minDate)
  const max = toTime(maxDate)
  const span = Math.max(max - min, 1)
  const dayMs = 24 * 60 * 60 * 1000

  const left = (d) => `${(((toTime(d) - min) / span) * 100).toFixed(2)}%`
  const width = (start, end) => `${(Math.max((toTime(end) - toTime(start)) / span, 0.5) * 100).toFixed(2)}%`

  const totalDays = Math.round(span / dayMs)
  const monthMarkers = []
  const cursor = new Date(min)
  cursor.setDate(1)
  while (toTime(cursor.toISOString().slice(0, 10)) <= max) {
    const t = toTime(cursor.toISOString().slice(0, 10))
    if (t >= min) {
      monthMarkers.push({
        left: `${(((t - min) / span) * 100).toFixed(2)}%`,
        label: cursor.toLocaleString('default', { month: 'short', year: totalDays > 400 ? 'numeric' : undefined }),
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <div className="gantt">
      <div className="gantt-header">
        <div className="gantt-row-label" />
        <div className="gantt-row-track">
          {monthMarkers.map((m, i) => (
            <span key={i} className="gantt-month" style={{ left: m.left }}>{m.label}</span>
          ))}
        </div>
      </div>
      {rows.map((row) => (
        <div className="gantt-row" key={row.key}>
          <div className="gantt-row-label" title={row.label}>{row.label}</div>
          <div className="gantt-row-track">
            {row.tasks.map((t) => {
              const start = t.start_date || t.due_date
              const end = t.due_date || t.start_date
              return (
                <div
                  key={t.id}
                  className={`gantt-bar gantt-bar-${(t.status || 'Not Started').toLowerCase().replace(/ /g, '-')}`}
                  style={{ left: left(start), width: width(start, end) }}
                  title={`${t.title} · ${start} → ${end} · ${t.status}`}
                >
                  {t.title}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
