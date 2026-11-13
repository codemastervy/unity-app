import { formatShort } from '../lib/dates'

export interface Point {
  date: string
  value: number | null
}

/** Lightweight SVG line chart with an accessible text summary. */
export function LineChart({ points, min, max, title, yLabels, color = 'var(--accent-ink)' }: { points: Point[]; min: number; max: number; title: string; yLabels: [number, string][]; color?: string }) {
  const W = 320
  const H = 140
  const P = { l: 34, r: 22, t: 10, b: 22 }
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, points.length - 1)
  const y = (v: number) => P.t + ((max - v) * (H - P.t - P.b)) / (max - min)

  // Break the line at gaps (days with no entry).
  const segments: string[] = []
  let cur = ''
  points.forEach((p, i) => {
    if (p.value == null) {
      if (cur) segments.push(cur)
      cur = ''
    } else cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`
  })
  if (cur) segments.push(cur)

  const logged = points.filter((p) => p.value != null)
  const labelEvery = Math.ceil(points.length / 6)
  const summary = logged.length
    ? `${title}: ${logged.length} of ${points.length} days logged. ${logged.map((p) => `${formatShort(p.date)} ${p.value!.toFixed(1)}`).join(', ')}.`
    : `${title}: no entries in this period.`

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={summary}>
        {yLabels.map(([v, label]) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="3 3" />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
              {label}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.date} x={x(i)} y={H - 6} textAnchor={i === points.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize="10" fill="var(--ink-2)">
              {formatShort(p.date)}
            </text>
          ) : null,
        )}
        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) => (p.value != null ? <circle key={i} cx={x(i)} cy={y(p.value)} r="3.5" fill={color} /> : null))}
      </svg>
    </figure>
  )
}
