import React from 'react'

// Compute per-module progress from its activities (mirrors backend roll-up rules).
export function moduleProgress(module) {
  const activities = (module.activities || []).filter((a) => a.status !== 'Cancelled')
  if (activities.length === 0) return 0
  const sum = activities.reduce((acc, a) => acc + (a.status === 'Completed' ? 100 : a.progress || 0), 0)
  return Math.round((sum / activities.length) * 100) / 100
}

// Segmented bar: one segment per module, width = module completion %.
export function ModuleTimeline({ modules }) {
  if (!modules || modules.length === 0) return null
  const segments = modules
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((module) => ({ module, pct: moduleProgress(module) }))

  return (
    <div className="phase-timeline">
      <div className="phase-timeline-bar">
        {segments.map(({ module, pct }) => (
          <div
            key={module.id}
            className={`phase-timeline-segment ${pct >= 50 ? 'filled' : ''}`}
            title={`${module.module?.name}: ${pct}%`}
          >
            <div className="phase-timeline-fill" style={{ height: `${pct}%` }} />
            <span className="phase-timeline-label">{module.module?.name}</span>
            <span className="phase-timeline-pct">{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Simple Gantt: one row per module, bars positioned by activity start/due dates.
export function GanttTimeline({ modules, phaseStart, phaseEnd }) {
  // Collect dated activities across all modules.
  const rows = []
  for (const module of modules || []) {
    const activities = (module.activities || []).filter((a) => a.start_date || a.due_date)
    if (activities.length === 0) continue
    rows.push({
      key: module.id,
      label: module.module?.name || 'Module',
      activities,
    })
  }

  if (rows.length === 0) {
    return <p className="muted">No dated activities yet. Add start/due dates to activities to see the timeline.</p>
  }

  // Determine the date range.
  let dates = []
  for (const row of rows) {
    for (const a of row.activities) {
      if (a.start_date) dates.push(a.start_date)
      if (a.due_date) dates.push(a.due_date)
    }
  }
  const minDate = phaseStart && phaseStart < dates[0] ? phaseStart : dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = phaseEnd && phaseEnd > dates[dates.length - 1] ? phaseEnd : dates.reduce((a, b) => (a > b ? a : b))

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
            {row.activities.map((a) => {
              const start = a.start_date || a.due_date
              const end = a.due_date || a.start_date
              return (
                <div
                  key={a.id}
                  className={`gantt-bar gantt-bar-${(a.status || 'Not Started').toLowerCase().replace(/ /g, '-')}`}
                  style={{ left: left(start), width: width(start, end) }}
                  title={`${a.title} · ${start} → ${end} · ${a.status}`}
                >
                  {a.title}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
