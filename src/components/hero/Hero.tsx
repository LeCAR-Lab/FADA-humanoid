import { AUTHORS, AFFILIATIONS, PROJECT_LINKS, LAB } from '../../data/authors'
import { SITE, HERO_STATS } from '../../data/content'
import { Container } from '../layout/Container'
import { AuthorList } from './AuthorList'
import { LinkButtons } from './LinkButtons'
import './hero.css'

const TONE_VAR: Record<NonNullable<(typeof HERO_STATS)[number]['tone']>, string> = {
  baseline: 'var(--c-baseline)',
  zeroshot: 'var(--c-zeroshot)',
  adapted: 'var(--c-adapted)',
  neutral: 'var(--chalk-soft)',
}

/**
 * The hero is a dark "showcase" band: it sets the FADA identity, expands the
 * acronym, states the one-line thesis, lists authors + links, and shows three
 * headline stats. Robot footage colors (red/amber/green) recur as accents.
 */
export function Hero() {
  return (
    <header className="hero dark" id="top">
      <div className="hero__grid" aria-hidden="true" />
      <div className="hero__glow" aria-hidden="true" />

      <Container width="wide">
        <p className="eyebrow hero__venue">{LAB.institution}</p>

        <h1 className="hero__title">
          <span className="hero__acronym">FADA</span>
          <span className="hero__subtitle">{SITE.title}</span>
        </h1>

        <p className="hero__expand">
          <span><b>F</b>ew-Shot</span>
          <span><b>D</b>omain</span>
          <span><b>A</b>daptation via</span>
          <span><b>D</b>ynamics</span>
          <span><b>A</b>lignment</span>
        </p>

        <p className="hero__tagline">{SITE.tagline}</p>

        <AuthorList authors={AUTHORS} affiliations={AFFILIATIONS} />

        <LinkButtons links={PROJECT_LINKS} />

        <dl className="hero__stats">
          {HERO_STATS.map((s) => (
            <div key={s.label} className="hero__stat" style={{ ['--stat-color' as string]: TONE_VAR[s.tone ?? 'neutral'] }}>
              <dt className="hero__stat-value">{s.value}</dt>
              <dd className="hero__stat-label">{s.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </header>
  )
}
