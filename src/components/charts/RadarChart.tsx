import { useState } from 'react'
import type { BarDataset } from '../../data/types'
import { useChartReveal } from './useChartReveal'
import './charts.css'

interface Props {
  dataset: BarDataset
  active?: boolean
}

const SIZE = 480
const CX = SIZE / 2
const CY = SIZE / 2 + 4
const R = 168 // outer radius

/**
 * Radar / spider chart. Each task is an axis; each method is a polygon. For
 * normalized error (lower is better), a method whose polygon sits *inside* the
 * others is uniformly better — which is exactly FADA's story across all tasks.
 */
export function RadarChart({ dataset, active }: Props) {
  const { ref, revealed } = useChartReveal<HTMLDivElement>({ active })
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [hoverAxis, setHoverAxis] = useState<number | null>(null)

  const axes = dataset.groups
  const n = axes.length
  // shared radial scale across all values, 0 at center
  const maxVal = Math.max(
    ...axes.flatMap((g) => dataset.series.map((s) => g.values[s.id] ?? 0)),
  )
  const rMax = Math.ceil(maxVal * 10) / 10 // nice-ish bound

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n
  const point = (i: number, value: number) => {
    const rr = (value / rMax) * R * (revealed ? 1 : 0.001)
    const a = angleFor(i)
    return [CX + rr * Math.cos(a), CY + rr * Math.sin(a)] as const
  }
  const axisEnd = (i: number, frac = 1) => {
    const a = angleFor(i)
    return [CX + R * frac * Math.cos(a), CY + R * frac * Math.sin(a)] as const
  }

  const rings = [0.5, 1]
  const activeSeries = dataset.series.filter((s) => !hidden.has(s.id))

  function toggle(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < dataset.series.length - 1) next.add(id)
      return next
    })
  }

  return (
    <div className="chart" ref={ref}>
      <div className="chart__legend" role="group" aria-label="Toggle methods">
        {dataset.series.map((s) => {
          const off = hidden.has(s.id)
          return (
            <button
              key={s.id}
              type="button"
              className={`chart__legend-item ${off ? 'is-off' : ''} ${s.highlight ? 'is-highlight' : ''}`}
              style={{ ['--series' as string]: s.colorVar }}
              onClick={() => toggle(s.id)}
              aria-pressed={!off}
            >
              <span className="chart__swatch" />
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="chart__plot-wrap radar__wrap">
        <svg
          className={`chart__svg radar ${revealed ? 'is-revealed' : ''}`}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${dataset.title}. ${dataset.note}`}
        >
          {/* concentric rings */}
          {rings.map((f) => (
            <polygon
              key={f}
              className="radar__ring"
              points={axes.map((_, i) => axisEnd(i, f).join(',')).join(' ')}
            />
          ))}
          {/* ring value labels along the top spoke */}
          {rings.map((f) => (
            <text key={`rl-${f}`} className="radar__ring-label" x={CX + 6} y={CY - R * f + 14}>
              {(rMax * f).toFixed(1)}
            </text>
          ))}

          {/* spokes + axis labels */}
          {axes.map((g, i) => {
            const [ex, ey] = axisEnd(i)
            const [lx, ly] = axisEnd(i, 1.16)
            const anchor = Math.abs(lx - CX) < 8 ? 'middle' : lx > CX ? 'start' : 'end'
            return (
              <g key={g.groupId}>
                <line className="radar__spoke" x1={CX} y1={CY} x2={ex} y2={ey} />
                <text
                  className={`radar__axis-label ${hoverAxis === i ? 'is-hover' : ''}`}
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                >
                  {g.groupLabel}
                </text>
              </g>
            )
          })}

          {/* method polygons (reverse so highlight draws last / on top) */}
          {[...activeSeries].reverse().map((s) => {
            const pts = axes.map((g, i) => point(i, g.values[s.id] ?? 0))
            const poly = pts.map((p) => p.join(',')).join(' ')
            return (
              <g key={s.id} className={`radar__series ${s.highlight ? 'is-hl' : ''}`}>
                <polygon
                  className="radar__poly"
                  points={poly}
                  style={{ stroke: s.colorVar, fill: s.colorVar }}
                />
                {s.highlight &&
                  pts.map((p, i) => <circle key={i} className="radar__vertex" cx={p[0]} cy={p[1]} r={4} style={{ fill: s.colorVar }} />)}
              </g>
            )
          })}

          {/* invisible hover targets per axis */}
          {axes.map((_, i) => {
            const [ex, ey] = axisEnd(i, 1.1)
            return (
              <circle
                key={`h-${i}`}
                cx={ex}
                cy={ey}
                r={26}
                fill="transparent"
                onMouseEnter={() => setHoverAxis(i)}
                onMouseLeave={() => setHoverAxis(null)}
              />
            )
          })}
        </svg>

        {/* hovered-axis readout table */}
        {hoverAxis != null && (
          <div className="radar__readout">
            <p className="radar__readout-title">{axes[hoverAxis].groupLabel}</p>
            <ul>
              {dataset.series
                .filter((s) => !hidden.has(s.id))
                .map((s) => (
                  <li key={s.id} style={{ ['--series' as string]: s.colorVar }}>
                    <span className="radar__readout-dot" />
                    <span className="radar__readout-name">{s.label}</span>
                    <span className="radar__readout-val">
                      {(axes[hoverAxis].values[s.id] ?? 0).toFixed(3)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
