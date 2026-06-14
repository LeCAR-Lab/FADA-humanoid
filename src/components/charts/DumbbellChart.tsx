import { useMemo, useState } from 'react'
import type { BarDataset } from '../../data/types'
import { formatMetric, metricAxisLabel, metricDirection } from '../../lib/format'
import { bandScale, linearScale, niceMax, niceTicks } from './chartScales'
import { useChartReveal } from './useChartReveal'
import './charts.css'

interface Props {
  dataset: BarDataset
  metricFilter?: 'all' | 'success' | 'normErr'
  active?: boolean
}

const W = 760
const H = 360
const M = { top: 24, right: 60, bottom: 52, left: 190 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

/**
 * Horizontal dumbbell / connected-dot chart. Each task is a row; the ordered
 * series (baseline -> zero-shot -> adapted) are dots joined by a line, so the
 * eye reads the *progression* rather than three isolated magnitudes.
 */
export function DumbbellChart({ dataset, metricFilter = 'all', active }: Props) {
  const { ref, revealed } = useChartReveal<HTMLDivElement>({ active })
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: string } | null>(
    null,
  )

  const groups = useMemo(
    () => dataset.groups.filter((g) => metricFilter === 'all' || g.metric === metricFilter),
    [dataset.groups, metricFilter],
  )
  const metric = groups.every((g) => g.metric === 'success') ? 'success' : 'normErr'

  const maxValue = useMemo(() => {
    if (metric === 'success') return 100
    let m = 0
    groups.forEach((g) => dataset.series.forEach((s) => (m = Math.max(m, g.values[s.id] ?? 0))))
    return niceMax(m)
  }, [groups, dataset.series, metric])

  const x = linearScale([0, maxValue], [M.left, M.left + PLOT_W])
  const rowBand = bandScale(groups.length, PLOT_H, 0.42)
  const ticks = metric === 'success' ? [0, 25, 50, 75, 100] : niceTicks(maxValue, 5)

  return (
    <div className="chart" ref={ref}>
      <div className="chart__legend" aria-label="Conditions">
        {dataset.series.map((s) => (
          <span key={s.id} className="chart__legend-item is-static" style={{ ['--series' as string]: s.colorVar }}>
            <span className="chart__swatch chart__swatch--dot" />
            {s.label}
          </span>
        ))}
      </div>

      <div className="chart__plot-wrap">
        <svg
          className={`chart__svg dumbbell ${revealed ? 'is-revealed' : ''}`}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${dataset.title}. ${dataset.note}`}
        >
          {/* vertical gridlines + x ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={x(t)} x2={x(t)} y1={M.top} y2={M.top + PLOT_H} />
              <text className="chart__tick" x={x(t)} y={M.top + PLOT_H + 20} textAnchor="middle">
                {metric === 'success' ? `${t}` : t}
              </text>
            </g>
          ))}
          <text className="chart__axis-title" x={M.left + PLOT_W / 2} y={H - 6} textAnchor="middle">
            {metricAxisLabel(metric)} · {metricDirection(metric)}
          </text>

          {/* baseline reference at 1.0 for normalized error */}
          {metric === 'normErr' && maxValue >= 1 && (
            <line className="chart__baseline-ref" x1={x(1)} x2={x(1)} y1={M.top} y2={M.top + PLOT_H} />
          )}

          {groups.map((g, gi) => {
            const cy = M.top + rowBand.start(gi) + rowBand.bandwidth / 2
            const vals = dataset.series.map((s) => g.values[s.id] ?? 0)
            const lineX1 = x(Math.min(...vals))
            const lineX2revealed = x(Math.max(...vals))
            const lineX2 = revealed ? lineX2revealed : lineX1
            return (
              <g key={g.groupId} className="dumbbell__row" style={{ transitionDelay: `${gi * 90}ms` }}>
                {/* row label */}
                <text className="dumbbell__label" x={M.left - 14} y={cy + 4} textAnchor="end">
                  {g.groupLabel}
                </text>
                {/* connecting track */}
                <line className="dumbbell__track" x1={lineX1} x2={lineX2} y1={cy} y2={cy} />
                {/* dots */}
                {dataset.series.map((s) => {
                  const v = g.values[s.id]
                  if (typeof v !== 'number') return null
                  const cx = revealed ? x(v) : x(Math.min(...vals))
                  return (
                    <g key={s.id}>
                      <circle
                        className={`dumbbell__dot ${s.highlight ? 'is-hl' : ''}`}
                        cx={cx}
                        cy={cy}
                        r={s.highlight ? 9 : 7}
                        fill={s.colorVar}
                        onMouseEnter={(e) => {
                          const svg = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                          const d = e.currentTarget.getBoundingClientRect()
                          setHover({
                            x: d.left - svg.left + d.width / 2,
                            y: d.top - svg.top,
                            label: `${s.label} — ${g.groupLabel}`,
                            value: formatMetric(v, g.metric),
                          })
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <title>{`${s.label} — ${g.groupLabel}: ${formatMetric(v, g.metric)}`}</title>
                      </circle>
                    </g>
                  )
                })}
                {/* value label on the highlighted (adapted) dot */}
                {revealed &&
                  (() => {
                    const hs = dataset.series.find((s) => s.highlight)
                    if (!hs) return null
                    const v = g.values[hs.id]
                    if (typeof v !== 'number') return null
                    return (
                      <text className="dumbbell__val" x={x(v)} y={cy - 16} textAnchor="middle">
                        {formatMetric(v, g.metric)}
                      </text>
                    )
                  })()}
              </g>
            )
          })}
        </svg>

        {hover && (
          <div className="chart__tooltip" style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}>
            <span className="chart__tooltip-val">{hover.value}</span>
            <span className="chart__tooltip-label">{hover.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
