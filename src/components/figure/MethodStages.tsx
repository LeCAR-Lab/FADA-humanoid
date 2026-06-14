import type { MethodStage } from '../../data/types'
import './figure.css'

// Three stages, colored to echo the journey: source-red → distill-amber → adapted-green.
const STAGE_COLORS = ['var(--c-baseline)', 'var(--c-zeroshot)', 'var(--c-adapted)']

function Arrow() {
  return (
    <svg className="stage__arrow" width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="12" fill="var(--paper)" stroke="var(--rule-strong)" />
      <path d="M10 7l6 6-6 6" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MethodStages({ stages }: { stages: MethodStage[] }) {
  return (
    <ol className="method-stages" aria-label="FADA pipeline stages">
      {stages.map((s, i) => (
        <li
          key={s.key}
          className="stage"
          style={{ ['--stage-color' as string]: STAGE_COLORS[i] ?? 'var(--cmu-red)' }}
        >
          <span className="stage__num" aria-hidden="true">
            {s.index}
          </span>
          <span className="stage__kicker">Stage {s.index}</span>
          <h3 className="stage__title">{s.title}</h3>
          <p className="stage__body">{s.body}</p>
          {i < stages.length - 1 && <Arrow />}
        </li>
      ))}
    </ol>
  )
}
