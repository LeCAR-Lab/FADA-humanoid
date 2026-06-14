import type { ProjectLink } from '../../data/types'
import './hero.css'

function Icon({ kind }: { kind: ProjectLink['icon'] }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  switch (kind) {
    case 'paper':
      return (
        <svg {...common}>
          <path
            d="M6 2.5h7L18 7v14.5H6z M13 2.5V7h5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'arxiv':
      return (
        <svg {...common}>
          <path
            d="M4 4l9 16M20 4l-7 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'code':
      return (
        <svg {...common}>
          <path
            d="M8.5 8.5L4 12l4.5 3.5M15.5 8.5L20 12l-4.5 3.5M13 5l-2 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'video':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 10l5-2.5v9L16 14z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
  }
}

export function LinkButtons({ links }: { links: ProjectLink[] }) {
  return (
    <nav className="linkbtns" aria-label="Paper resources">
      {links.map((l) => {
        const disabled = l.disabled
        return (
          <a
            key={l.label}
            href={l.href}
            className={`linkbtn ${disabled ? 'linkbtn--disabled' : ''}`}
            aria-disabled={disabled || undefined}
            title={disabled ? `${l.label} — coming soon` : l.label}
            onClick={disabled ? (e) => e.preventDefault() : undefined}
            tabIndex={disabled ? -1 : undefined}
            target={disabled ? undefined : '_blank'}
            rel={disabled ? undefined : 'noopener noreferrer'}
          >
            <span className="linkbtn__icon">
              <Icon kind={l.icon} />
            </span>
            <span>{l.label}</span>
            {disabled && <span className="linkbtn__soon">soon</span>}
          </a>
        )
      })}
    </nav>
  )
}
