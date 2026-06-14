import type { ImportanceDataset } from '../../data/types'
import { bandScale, linearScale, niceMax, niceTicks } from './chartScales'
import { useChartReveal } from './useChartReveal'
import './charts.css'

const W = 760
const H = 360
const M = { top: 24, right: 20, bottom: 48, left: 56 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

/**
 * Lollipop chart for per-step importance (leave-one-out). Stems + heads read
 * cleaner than bars for an "importance ranking" story; the two key steps glow.
 */
export function LollipopChart({ dataset, active }: { dataset: ImportanceDataset; active?: boolean }) {
  const { ref, revealed } = useChartReveal<HTMLDivElement>({ active })

  const yMax = niceMax(Math.max(...dataset.bars.map((b) => b.value)))
  const y = linearScale([0, yMax], [M.top + PLOT_H, M.top])
  const band = bandScale(dataset.bars.length, PLOT_W, 0.5)
  const ticks = niceTicks(yMax, 5)

  return (
    <div className="chart" ref={ref}>
      <div className="chart__plot-wrap">
        <svg
          className="chart__svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${dataset.title}. ${dataset.note}`}
        >
          <text className="chart__axis-title" x={-(M.top + PLOT_H / 2)} y={14} transform="rotate(-90)" textAnchor="middle">
            {dataset.yLabel}
          </text>

          {ticks.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={M.left - 8} y={y(t) + 3.5} textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {dataset.bars.map((b, i) => {
            const cx = M.left + band.start(i) + band.bandwidth / 2
            const color = b.highlight ? 'var(--c-adapted)' : 'var(--chalk-faint)'
            const cy = revealed ? y(b.value) : y(0)
            return (
              <g key={b.label} className="lolli" style={{ transitionDelay: `${i * 80}ms` }}>
                <line className="lolli__stem" x1={cx} x2={cx} y1={y(0)} y2={cy} stroke={color} />
                <circle className={`lolli__head ${b.highlight ? 'is-hl' : ''}`} cx={cx} cy={cy} r={b.highlight ? 9 : 6} fill={color}>
                  <title>{`${b.label}: ${b.value}`}</title>
                </circle>
                {revealed && (
                  <text className="lolli__val" x={cx} y={cy - 16} textAnchor="middle" style={{ fill: color }}>
                    {b.value}
                  </text>
                )}
                <text className="chart__group-label" x={cx} y={M.top + PLOT_H + 20} textAnchor="middle">
                  {b.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
