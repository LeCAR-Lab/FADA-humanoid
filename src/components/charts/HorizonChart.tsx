import { useState } from 'react'
import type { HorizonDataset } from '../../data/types'
import { bandScale, linearScale, niceMax, niceTicks } from './chartScales'
import { useChartReveal } from './useChartReveal'
import './charts.css'

const W = 760
const H = 360
const M = { top: 24, right: 16, bottom: 52, left: 52 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

/**
 * Horizon-K ablation: grouped bars per K value, one series per task, with a
 * connecting trend line. The best K is highlighted.
 */
export function HorizonChart({ dataset, active }: { dataset: HorizonDataset; active?: boolean }) {
  const { ref, revealed } = useChartReveal<HTMLDivElement>({ active })
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: string } | null>(
    null,
  )

  const allValues = dataset.series.flatMap((s) => s.values)
  const maxValue = niceMax(Math.max(...allValues))
  const y = linearScale([0, maxValue], [M.top + PLOT_H, M.top])
  const kBand = bandScale(dataset.kValues.length, PLOT_W, 0.32)
  const ticks = niceTicks(maxValue, 5)

  return (
    <div className="chart" ref={ref}>
      <div className="chart__legend" aria-label="Tasks">
        {dataset.series.map((s) => (
          <span key={s.id} className="chart__legend-item is-static" style={{ ['--series' as string]: s.colorVar }}>
            <span className="chart__swatch" />
            {s.label}
          </span>
        ))}
      </div>

      <div className="chart__plot-wrap">
        <svg
          className="chart__svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Planner horizon K ablation. ${dataset.note}`}
        >
          <text className="chart__axis-title" x={-(M.top + PLOT_H / 2)} y={14} transform="rotate(-90)" textAnchor="middle">
            Normalized error
          </text>

          {ticks.map((t) => {
            const yy = y(t)
            return (
              <g key={t}>
                <line className="chart__grid" x1={M.left} x2={W - M.right} y1={yy} y2={yy} />
                <text className="chart__tick" x={M.left - 8} y={yy + 3.5} textAnchor="end">
                  {t}
                </text>
              </g>
            )
          })}

          {/* Best-K highlight band */}
          {(() => {
            const bestIdx = dataset.kValues.indexOf(dataset.bestK)
            if (bestIdx < 0) return null
            const gx = M.left + kBand.start(bestIdx)
            return (
              <g>
                <rect
                  className="chart__best-band"
                  x={gx - 6}
                  y={M.top}
                  width={kBand.bandwidth + 12}
                  height={PLOT_H}
                  rx={6}
                />
                <text className="chart__best-label" x={gx + kBand.bandwidth / 2} y={M.top - 8} textAnchor="middle">
                  best K
                </text>
              </g>
            )
          })()}

          {/* Bars per K, grouped by series */}
          {dataset.kValues.map((k, ki) => {
            const gx = M.left + kBand.start(ki)
            const inner = bandScale(dataset.series.length, kBand.bandwidth, 0.18)
            return (
              <g key={k}>
                {dataset.series.map((s, si) => {
                  const v = s.values[ki]
                  const bx = gx + inner.start(si)
                  const bw = inner.bandwidth
                  const fullH = y(0) - y(v)
                  const bh = revealed ? fullH : 0
                  const by = y(0) - bh
                  return (
                    <g key={s.id}>
                      <rect
                        className="chart__bar"
                        x={bx}
                        y={by}
                        width={bw}
                        height={Math.max(0, bh)}
                        rx={3}
                        fill={s.colorVar}
                        style={{ transitionDelay: `${ki * 70 + si * 35}ms` }}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                          const ctm = e.currentTarget.getBoundingClientRect()
                          setHover({
                            x: ctm.left - rect.left + ctm.width / 2,
                            y: ctm.top - rect.top,
                            label: `${s.label} · K=${k}`,
                            value: v.toFixed(3),
                          })
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <title>{`${s.label}, K=${k}: ${v.toFixed(3)}`}</title>
                      </rect>
                    </g>
                  )
                })}
                <text className="chart__group-label" x={gx + kBand.bandwidth / 2} y={M.top + PLOT_H + 20} textAnchor="middle">
                  K = {k}
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
    </div>
  )
}
