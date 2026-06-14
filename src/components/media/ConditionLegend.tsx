import { CONDITIONS } from '../../data/videos'
import './media.css'

export function ConditionLegend() {
  return (
    <ul className="clegend" aria-label="Condition color key">
      {CONDITIONS.map((c) => (
        <li key={c.id} className="clegend__item" style={{ ['--c' as string]: `var(${c.colorVar})` }}>
          <span className="clegend__dot" aria-hidden="true" />
          <span className="clegend__label">{c.label}</span>
        </li>
      ))}
    </ul>
  )
}
