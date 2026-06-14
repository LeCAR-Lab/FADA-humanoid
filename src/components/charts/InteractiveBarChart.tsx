import { useMemo, useState } from 'react'
import type { BarDataset, GroupedDatum } from '../../data/types'
import { formatMetric, metricAxisLabel, metricDirection } from '../../lib/format'
import { bandScale, linearScale, niceMax, niceTicks } from './chartScales'
import { useChartReveal } from './useChartReveal'
import './charts.css'

interface Props {
  dataset: BarDataset
  /** Which metric's groups to show (datasets may mix success/normErr). */
  metricFilter?: 'all' | 'success' | 'normErr'
  /** Draw the dashed "baseline = 1.0" reference line (normalized-error charts). */
  showBaseline?: boolean
  /** Carousel: whether this chart's slide is currently active (drives re-reveal). */
  active?: boolean
  /** Slightly smaller in-chart text (for dense many-series charts like sim2sim). */
  compact?: boolean
}

// viewBox geometry (fluid via preserveAspectRatio)
const W = 760
const H = 420
const M = { top: 28, right: 16, bottom: 70, left: 52 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

export function InteractiveBarChart({
  dataset,
  metricFilter = 'all',
  showBaseline = true,
  active,
  compact = false,
}: Props) {
  const { ref, revealed } = useChartReveal<HTMLDivElement>({ active })
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: string } | null>(
    null,
  )

  const groups = useMemo(
    () => dataset.groups.filter((g) => metricFilter === 'all' || g.metric === metricFilter),
    [dataset.groups, metricFilter],
  )

  const activeSeries = dataset.series.filter((s) => !hidden.has(s.id))

  // Determine the metric for the visible groups. If mixed and "all", we
  // normalize the y-axis to the dominant metric but still label per the note.
  const metric = groups.every((g) => g.metric === 'success')
    ? 'success'
    : groups.every((g) => g.metric === 'normErr')
      ? 'normErr'
      : 'normErr'

  const maxValue = useMemo(() => {
    let m = 0
    groups.forEach((g) =>
      activeSeries.forEach((s) => {
        const v = g.values[s.id]
        if (typeof v === 'number') m = Math.max(m, v)
      }),
    )
    return metric === 'success' ? 100 : niceMax(m)
  }, [groups, activeSeries, metric])

  const y = linearScale([0, maxValue], [M.top + PLOT_H, M.top])
  const groupBand = bandScale(groups.length, PLOT_W, 0.28)
  const ticks = metric === 'success' ? [0, 25, 50, 75, 100] : niceTicks(maxValue, 5)

  function toggleSeries(id: string) {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < dataset.series.length - 1) next.add(id) // keep at least one
      return next
    })
  }

  return (
    <div className={`chart ${compact ? 'chart--compact' : ''}`} ref={ref}>
      {/* Legend / series toggles */}
      <div className="chart__legend" role="group" aria-label="Toggle methods">
        {dataset.series.map((s) => {
          const off = hidden.has(s.id)
          return (
            <button
              key={s.id}
              type="button"
              className={`chart__legend-item ${off ? 'is-off' : ''} ${s.highlight ? 'is-highlight' : ''}`}
              style={{ ['--series' as string]: s.colorVar }}
              onClick={() => toggleSeries(s.id)}
              aria-pressed={!off}
            >
              <span className="chart__swatch" />
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="chart__plot-wrap">
        <svg
          className="chart__svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${dataset.title}. ${dataset.note}`}
        >
          {/* Y axis title */}
          <text className="chart__axis-title" x={-(M.top + PLOT_H / 2)} y={14} transform="rotate(-90)" textAnchor="middle">
            {metricAxisLabel(metric)}
          </text>

          {/* Gridlines + y ticks */}
          {ticks.map((t) => {
            const yy = y(t)
            return (
              <g key={t}>
                <line className="chart__grid" x1={M.left} x2={W - M.right} y1={yy} y2={yy} />
                <text className="chart__tick" x={M.left - 8} y={yy + 3.5} textAnchor="end">
                  {metric === 'success' ? `${t}` : t}
                </text>
              </g>
            )
          })}

          {/* Reference line at 1.0 for normalized error (the baseline level) */}
          {showBaseline && metric === 'normErr' && maxValue >= 1 && (
            <g>
              <line
                className="chart__baseline-ref"
                x1={M.left}
                x2={W - M.right}
                y1={y(1)}
                y2={y(1)}
              />
              <text className="chart__ref-label" x={W - M.right} y={y(1) - 5} textAnchor="end">
                baseline = 1.0
              </text>
            </g>
          )}

          {/* Bars */}
          {groups.map((g, gi) => {
            const gx = M.left + groupBand.start(gi)
            const inner = bandScale(activeSeries.length, groupBand.bandwidth, 0.16)
            return (
              <g key={g.groupId}>
                {activeSeries.map((s, si) => {
                  const v = g.values[s.id]
                  if (typeof v !== 'number') return null
                  const bx = gx + inner.start(si)
                  const bw = inner.bandwidth
                  const fullH = y(0) - y(v)
                  const bh = revealed ? fullH : 0
                  const by = y(0) - bh
                  return (
                    <g key={s.id}>
                      <rect
                        className={`chart__bar ${s.highlight ? 'chart__bar--highlight' : ''}`}
                        x={bx}
                        y={by}
                        width={bw}
                        height={Math.max(0, bh)}
                        rx={3}
                        fill={s.colorVar}
                        style={{ transitionDelay: `${gi * 60 + si * 30}ms` }}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                          const ctm = e.currentTarget.getBoundingClientRect()
                          setHover({
                            x: ctm.left - rect.left + ctm.width / 2,
                            y: ctm.top - rect.top,
                            label: `${s.label} — ${g.groupLabel}`,
                            value: formatMetric(v, g.metric),
                          })
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <title>{`${s.label} — ${g.groupLabel}: ${formatMetric(v, g.metric)}`}</title>
                      </rect>
                      {/* value label atop bar */}
                      {revealed && bw > 16 && (
                        <text className="chart__value" x={bx + bw / 2} y={by - 4} textAnchor="middle">
                          {formatMetric(v, g.metric)}
                        </text>
                      )}
                    </g>
                  )
                })}
                {/* group label */}
                <text
                  className="chart__group-label"
                  x={gx + groupBand.bandwidth / 2}
                  y={M.top + PLOT_H + 18}
                  textAnchor="middle"
                >
                  {g.groupLabel.split(' ').reduce<string[][]>(
                    (lines, word) => {
                      const last = lines[lines.length - 1]
                      if (last.join(' ').length + word.length > 14) lines.push([word])
                      else last.push(word)
                      return lines
                    },
                    [[]],
                  ).map((line, li) => (
                    <tspan key={li} x={gx + groupBand.bandwidth / 2} dy={li === 0 ? 0 : 12}>
                      {line.join(' ')}
                    </tspan>
                  ))}
                </text>
                {/* per-group metric direction hint */}
                <text
                  className="chart__group-hint"
                  x={gx + groupBand.bandwidth / 2}
                  y={M.top + PLOT_H + 46}
                  textAnchor="middle"
                >
                  {metricDirection(g.metric)}
                </text>
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

      {/* Visually-hidden data table for screen readers */}
      <table className="sr-only">
        <caption>{dataset.title}</caption>
        <thead>
          <tr>
            <th>Task</th>
            {dataset.series.map((s) => (
              <th key={s.id}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g: GroupedDatum) => (
            <tr key={g.groupId}>
              <th>{g.groupLabel}</th>
              {dataset.series.map((s) => (
                <td key={s.id}>
                  {typeof g.values[s.id] === 'number' ? formatMetric(g.values[s.id], g.metric) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
