import React, { useMemo, useState } from 'react'
import { INDIA_MAP_VIEWBOX, INDIA_STATE_PATHS } from '../data/indiaStatePaths'

// Current, correct display names for every state/UT in the map. This is the
// single source of truth for the client forms' State dropdown.
export const STATE_NAMES = [
  'Andaman and Nicobar',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli',
  'Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]

// A couple of states in the source map data still use pre-rename ids.
const SVG_ID_ALIASES = {
  Odisha: 'Orissa',
  Uttarakhand: 'Uttaranchal',
}

// 13-step sequential ramp (dataviz skill, references/palette.md "Sequential
// hue", steps 100-700, light->dark). CSS vars --seq-0..--seq-12 hold these in
// index.css, reversed for body.dark so low values still recede toward the
// (dark) surface and high values still pop - same hex values, no new color
// invented per mode.
const RAMP_STEPS = 13

export default function IndiaMap({ counts = {} }) {
  const [hover, setHover] = useState(null) // { name, count, x, y }
  const [showTable, setShowTable] = useState(false)

  const maxCount = useMemo(
    () => Math.max(0, ...Object.values(counts)),
    [counts]
  )

  const countFor = (svgId) => {
    const displayName = STATE_NAMES.find((name) => (SVG_ID_ALIASES[name] || name) === svgId)
    return counts[displayName] || 0
  }

  const stepFor = (count) => {
    if (maxCount <= 0) return 0
    return Math.round((count / maxCount) * (RAMP_STEPS - 1))
  }

  const onMove = (e, svgId, count) => {
    const rect = e.currentTarget.ownerSVGElement.parentElement.getBoundingClientRect()
    setHover({
      name: displayNameFor(svgId),
      count,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const displayNameFor = (svgId) =>
    STATE_NAMES.find((name) => (SVG_ID_ALIASES[name] || name) === svgId) || svgId

  const rows = STATE_NAMES
    .map((name) => ({ name, count: counts[name] || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div className="india-map-wrap">
      <div className="india-map-canvas">
        <svg viewBox={INDIA_MAP_VIEWBOX} className="india-map" onMouseLeave={() => setHover(null)}>
          {INDIA_STATE_PATHS.map((p) => {
            const count = countFor(p.id)
            const step = stepFor(count)
            return (
              <path
                key={p.id}
                d={p.d}
                className="india-map-state"
                style={{ fill: `var(--seq-${step})` }}
                onMouseMove={(e) => onMove(e, p.id, count)}
                onMouseEnter={(e) => onMove(e, p.id, count)}
              >
                <title>{displayNameFor(p.id)}: {count}</title>
              </path>
            )
          })}
        </svg>
        {hover && (
          <div className="india-map-tooltip" style={{ left: hover.x, top: hover.y }}>
            <strong>{hover.name}</strong>
            <span>{hover.count} client{hover.count === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      <div className="india-map-footer">
        {maxCount > 0 ? (
          <div className="india-map-legend">
            <span className="muted">0</span>
            {Array.from({ length: RAMP_STEPS }, (_, i) => (
              <span key={i} className="india-map-swatch" style={{ background: `var(--seq-${i})` }} />
            ))}
            <span className="muted">{maxCount}</span>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>No client state data yet.</p>
        )}
        <button type="button" className="btn btn-light btn-sm" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Hide table' : 'View as table'}
        </button>
      </div>

      {showTable && (
        <table className="table india-map-table">
          <thead>
            <tr><th>State</th><th>Clients</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}><td>{r.name}</td><td>{r.count}</td></tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2} className="muted" style={{ textAlign: 'center' }}>No states assigned yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
