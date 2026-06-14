import { useCallback, useEffect, useRef, useState } from 'react'
import { Section } from '../layout/Section'
import { InteractiveBarChart } from '../charts/InteractiveBarChart'
import { HorizonChart } from '../charts/HorizonChart'
import { LineChart } from '../charts/LineChart'
import { LollipopChart } from '../charts/LollipopChart'
import { DumbbellChart } from '../charts/DumbbellChart'
import { RadarChart } from '../charts/RadarChart'
import {
  SIM2REAL,
  SIM2SIM,
  HORIZON_K,
  VISIBLE_PREFIX,
  LEAVE_ONE_OUT,
  LORA_VS_FULL,
  DATA_SIZE,
} from '../../data/results'
import '../charts/charts.css'

interface Slide {
  id: string
  tab: string
  title: string
  subtitle: string
  note: string
  render: (active: boolean) => React.ReactNode
}

const SLIDES: Slide[] = [
  {
    id: 'sim2real',
    tab: 'Sim-to-Real',
    title: SIM2REAL.title,
    subtitle: SIM2REAL.subtitle,
    note: SIM2REAL.note,
    render: (active) => (
      <div className="quant__split">
        <div className="quant__split-block">
          <p className="quant__split-label">Completion tasks · success rate</p>
          <InteractiveBarChart dataset={SIM2REAL} metricFilter="success" active={active} />
        </div>
        <div className="quant__split-block">
          <p className="quant__split-label">Tracking tasks · normalized error (baseline → zero-shot → adapted)</p>
          <DumbbellChart dataset={SIM2REAL} metricFilter="normErr" active={active} />
        </div>
      </div>
    ),
  },
  {
    id: 'sim2sim',
    tab: 'Sim-to-Sim',
    title: SIM2SIM.title,
    subtitle: SIM2SIM.subtitle,
    note: SIM2SIM.note,
    render: (active) => (
      <div className="quant__center quant__center--radar">
        <RadarChart dataset={SIM2SIM} active={active} />
      </div>
    ),
  },
  {
    id: 'horizon',
    tab: 'Prediction Horizon',
    title: 'How Much Future Does the IDM Need?',
    subtitle:
      'The planner predicts K future steps; the IDM attends over them. A compact window does the work — and a couple of steps carry it.',
    note: `${HORIZON_K.note} ${LEAVE_ONE_OUT.note}`,
    render: (active) => (
      <div className="quant__multi-grid quant__multi-grid--3">
        <div className="quant__multi-item">
          <p className="quant__split-label">Horizon sweep · K</p>
          <HorizonChart dataset={HORIZON_K} active={active} />
        </div>
        <div className="quant__multi-item">
          <p className="quant__split-label">Visible-prefix · return vs. steps</p>
          <LineChart dataset={VISIBLE_PREFIX} active={active} />
        </div>
        <div className="quant__multi-item">
          <p className="quant__split-label">Leave-one-out · per-step importance</p>
          <LollipopChart dataset={LEAVE_ONE_OUT} active={active} />
        </div>
      </div>
    ),
  },
  {
    id: 'adaptation',
    tab: 'Adaptation Recipe',
    title: 'What Makes Adaptation Work',
    subtitle:
      'Low-rank updates beat full finetuning under a tiny budget, and ~2 minutes of data already reaches the plateau.',
    note: `${LORA_VS_FULL.note} ${DATA_SIZE.note}`,
    render: (active) => (
      <div className="quant__multi-grid">
        <div className="quant__multi-item">
          <p className="quant__split-label">LoRA vs. full finetuning · normalized error</p>
          <InteractiveBarChart dataset={LORA_VS_FULL} active={active} />
        </div>
        <div className="quant__multi-item">
          <p className="quant__split-label">Target data budget · diminishing returns</p>
          <LineChart dataset={DATA_SIZE} active={active} />
        </div>
      </div>
    ),
  },
]

export function QuantitativeSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [trackH, setTrackH] = useState<number | undefined>(undefined)

  const goTo = useCallback((i: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }, [])

  // Track which slide is centered as the user swipes.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth)
        setActive((prev) => (prev === i ? prev : i))
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  // Fit the track height to the ACTIVE slide so shorter views don't leave a gap.
  useEffect(() => {
    const measure = () => {
      const el = slideRefs.current[active]
      if (el) setTrackH(el.offsetHeight)
    }
    measure()
    const el = slideRefs.current[active]
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [active])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(active + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(active - 1)
    }
  }

  return (
    <Section
      id="quantitative"
      eyebrow="Evaluation"
      title="Quantitative Summary"
      intro="Across hardware, sim-to-sim transfer, and controlled diagnostics, the same conclusion holds: target rollouts help most when they adapt the action-generation module. Swipe sideways (two fingers on a trackpad) to explore — hover any mark for exact numbers."
      tone="dark"
      width="wide"
    >
      <div className="quant">
        {/* progress / jump indicators (also keyboard + click accessible) */}
        <div className="quant__tabs" role="tablist" aria-label="Result views">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === active}
              className={`quant__tab ${i === active ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
            >
              {s.tab}
            </button>
          ))}
          <span className="quant__swipe-hint" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            swipe
          </span>
        </div>

        <div
          className="quant__track"
          ref={trackRef}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Result views — use arrow keys or swipe"
          style={trackH ? { height: trackH } : undefined}
        >
          {SLIDES.map((s, i) => (
            <article
              key={s.id}
              className="quant__slide"
              aria-hidden={i !== active}
              aria-label={s.tab}
            >
              <div
                className="quant__panel"
                ref={(el) => {
                  slideRefs.current[i] = el
                }}
              >
                <header className="quant__head">
                  <h3 className="quant__title">{s.title}</h3>
                  <p className="quant__subtitle">{s.subtitle}</p>
                </header>
                {s.render(i === active)}
                <p className="quant__note">{s.note}</p>
              </div>
            </article>
          ))}
        </div>

        {/* dot indicators */}
        <div className="quant__dots" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              className={`quant__dot ${i === active ? 'is-active' : ''}`}
              onClick={() => goTo(i)}
              tabIndex={-1}
            />
          ))}
        </div>
      </div>
    </Section>
  )
}
