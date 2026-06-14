import { useId, useState } from 'react'
import type { LineDataset } from '../../data/types'
import { linearScale, niceTicks } from './chartScales'
import { useChartReveal } from './useChartReveal'
import './charts.css'

const W = 760
const H = 360
const M = { top: 26, right: 28, bottom: 52, left: 56 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

/**
 * Smooth-ish line/area chart for saturating curves (visible-prefix, data-size).
 * Draws an area fill, the line, point markers, and an optional plateau marker.
 */
export function LineChart({
  dataset,
  categoricalX = true,
  active,
}: {
  dataset: LineDataset
  /** Evenly space points by index (matches the paper's categorical x-axis). */
  categoricalX?: boolean
  active?: boolean
}) {
  const { ref, revealed } = useChartReveal<HTMLDivElement>({ active })
  const gid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)

  const n = dataset.points.length
  const ys = dataset.points.map((p) => p.y)
  // X position: evenly spaced by index when categorical, else linear by value.
  const xValMin = Math.min(...dataset.points.map((p) => p.x))
  const xValMax = Math.max(...dataset.points.map((p) => p.x))
  const xLinear = linearScale([xValMin, xValMax], [M.left, M.left + PLOT_W])
  const xPos = (p: { x: number }, i: number) =>
    categoricalX
      ? M.left + (n === 1 ? PLOT_W / 2 : (i / (n - 1)) * PLOT_W)
      : xLinear(p.x)

  // Y zoomed to the data range (with padding) so small differences are visible.
  const yLo = Math.min(...ys)
  const yHi = Math.max(...ys)
  const pad = Math.max(0.02, (yHi - yLo) * 0.18)
  const yMin = Math.max(0, yLo - pad)
  const yMax = yHi + pad
  const y = linearScale([yMin, yMax], [M.top + PLOT_H, M.top])
  const yticks = niceTicks(yMax, 5).filter((t) => t >= yMin)

  const pts = dataset.points.map((p, i) => ({ ...p, px: xPos(p, i), py: y(p.y) }))
  const baseY = M.top + PLOT_H // area fills to the chart floor (y-domain is zoomed)
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' ')
  const areaPath = `${linePath} L ${pts[pts.length - 1].px} ${baseY} L ${pts[0].px} ${baseY} Z`

  // x position of the marker (match it to its data point when categorical)
  const markerIdx =
    dataset.markerX != null ? dataset.points.findIndex((p) => p.x === dataset.markerX) : -1
  const markerPx =
    markerIdx >= 0 ? pts[markerIdx].px : dataset.markerX != null ? xLinear(dataset.markerX) : 0

  return (
    <div className="chart" ref={ref}>
      <div className="chart__plot-wrap">
        <svg
          className={`chart__svg linechart ${revealed ? 'is-revealed' : ''}`}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${dataset.title}. ${dataset.note}`}
        >
          <defs>
            <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={dataset.colorVar} stopOpacity="0.28" />
              <stop offset="100%" stopColor={dataset.colorVar} stopOpacity="0" />
            </linearGradient>
          </defs>

          <text className="chart__axis-title" x={-(M.top + PLOT_H / 2)} y={14} transform="rotate(-90)" textAnchor="middle">
            {dataset.yLabel}
          </text>
          <text className="chart__axis-title" x={M.left + PLOT_W / 2} y={H - 6} textAnchor="middle">
            {dataset.xLabel}
          </text>

          {yticks.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={M.left - 8} y={y(t) + 3.5} textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {/* x ticks at data points */}
          {pts.map((p) => (
            <text key={`xt-${p.x}`} className="chart__tick" x={p.px} y={M.top + PLOT_H + 18} textAnchor="middle">
              {p.x >= 1000 ? `${p.x / 1000}k` : p.x}
            </text>
          ))}

          {/* plateau marker */}
          {dataset.markerX != null && (
            <g>
              <line
                className="chart__marker-line"
                x1={markerPx}
                x2={markerPx}
                y1={M.top}
                y2={M.top + PLOT_H}
              />
              <text className="chart__marker-label" x={markerPx + 6} y={M.top + 12}>
                {dataset.markerLabel}
              </text>
            </g>
          )}

          {/* area + line (drawn-on reveal) */}
          <path className="linechart__area" d={areaPath} fill={`url(#area-${gid})`} />
          <path className="linechart__line" d={linePath} stroke={dataset.colorVar} />

          {/* points */}
          {pts.map((p, i) => (
            <g key={p.x}>
              <circle
                className="linechart__dot"
                cx={p.px}
                cy={p.py}
                r={hover === i ? 6 : 4}
                fill={dataset.colorVar}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transitionDelay: `${i * 90 + 400}ms` }}
              >
                <title>{`${dataset.xLabel} ${p.x}: ${p.y}`}</title>
              </circle>
              {p.tag && (
                <text className="linechart__tag" x={p.px} y={p.py - 12} textAnchor="middle">
                  {p.tag}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
