/**
 * Interactive reach demo — default export, lazy-loaded behind the Launch gate.
 *
 * Two MuJoCo viewports share one draggable EE target and one payload setting:
 *   left  = Before adaptation (base policy, red arm)
 *   right = After adaptation  (payload-specific finetuned policy, green arm)
 * Each shows a faint ghost arm = the planner's predicted next pose. A side panel
 * lists the legend + a live per-joint readout and the IDM correction magnitude.
 */
import { useEffect, useRef, useState } from 'react'
import { useInView } from '../../lib/useInView'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import { ReachController, type ReachMetrics, type ArmReadout } from './ReachController'
import {
  PAYLOADS,
  RECORDED_RMS,
  ARM_JOINT_LABELS,
  TARGET_RANGE,
  DEFAULT_TARGET,
  type PayloadKey,
} from './reachData'
import './reach.css'

type Status = 'loading' | 'ready' | 'error'

const EMPTY: ArmReadout = { err: 0, jointAngles: [], plannerAngles: [], idmCorrection: 0 }
const EMPTY_METRICS: ReachMetrics = { before: EMPTY, after: EMPTY }
const PANEL_FPS = 15 // throttle the live readout re-renders
const AXES = [
  { key: 0, label: 'X', hint: 'fwd', range: TARGET_RANGE.x },
  { key: 1, label: 'Y', hint: 'left', range: TARGET_RANGE.y },
  { key: 2, label: 'Z', hint: 'up', range: TARGET_RANGE.z },
] as const

export default function ReachDemo() {
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null)
  const afterCanvasRef = useRef<HTMLCanvasElement>(null)
  const controllerRef = useRef<ReachController | null>(null)
  const [wrapRef, inView] = useInView<HTMLDivElement>({ threshold: 0.15 })
  const reducedMotion = usePrefersReducedMotion()

  const [status, setStatus] = useState<Status>('loading')
  const [payload, setPayload] = useState<PayloadKey>('0')
  const [playing, setPlaying] = useState(false)
  const [autoTour, setAutoTour] = useState(false)
  const [metrics, setMetrics] = useState<ReachMetrics>(EMPTY_METRICS)
  // Slider positions track the live target (drag / tour / reset keep them in sync).
  const [target, setTarget] = useState<[number, number, number]>([...DEFAULT_TARGET])

  // Build the controller once. Metrics fire every render frame; throttle the React
  // state update so the panel refreshes at ~PANEL_FPS instead of 60 fps.
  useEffect(() => {
    if (!beforeCanvasRef.current || !afterCanvasRef.current) return
    let lastPanel = 0
    let lastTarget = 0
    const ctrl = new ReachController({
      beforeCanvas: beforeCanvasRef.current,
      afterCanvas: afterCanvasRef.current,
      onMetrics: (m) => {
        const now = performance.now()
        if (now - lastPanel >= 1000 / PANEL_FPS) {
          lastPanel = now
          setMetrics(m)
        }
      },
      onTarget: (t) => {
        const now = performance.now()
        if (now - lastTarget >= 1000 / PANEL_FPS) {
          lastTarget = now
          setTarget([t[0], t[1], t[2]])
        }
      },
    })
    controllerRef.current = ctrl
    let cancelled = false
    ctrl
      .init()
      .then(() => {
        if (cancelled) return
        setStatus('ready')
        if (!reducedMotion) {
          ctrl.setAutoTour(true)
          setAutoTour(true)
          ctrl.setPlaying(true)
          setPlaying(true)
        }
      })
      .catch((err) => {
        console.error('[ReachDemo] init failed:', err)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
      ctrl.dispose()
      controllerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pause when scrolled offscreen; resume when back (only if user had it playing).
  const wasPlayingRef = useRef(false)
  useEffect(() => {
    const ctrl = controllerRef.current
    if (!ctrl || status !== 'ready') return
    if (!inView) {
      wasPlayingRef.current = playing
      ctrl.setPlaying(false)
    } else if (wasPlayingRef.current) {
      ctrl.setPlaying(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, status])

  // Resize on container changes.
  useEffect(() => {
    const ctrl = controllerRef.current
    const el = wrapRef.current
    if (!ctrl || !el) return
    const ro = new ResizeObserver(() => ctrl.resize())
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const togglePlay = () => {
    const ctrl = controllerRef.current
    if (!ctrl) return
    const next = !playing
    setPlaying(next)
    ctrl.setPlaying(next)
  }

  const toggleTour = () => {
    const ctrl = controllerRef.current
    if (!ctrl) return
    const next = !autoTour
    setAutoTour(next)
    ctrl.setAutoTour(next)
    if (next && !playing) {
      setPlaying(true)
      ctrl.setPlaying(true)
    }
  }

  const onPayload = (key: PayloadKey) => {
    setPayload(key)
    void controllerRef.current?.setPayload(key)
  }

  const onReset = () => {
    controllerRef.current?.reset()
    setAutoTour(false)
    setTarget([...DEFAULT_TARGET])
  }

  // Slider drag → set one axis of the target (stops the auto-tour, like dragging).
  const onSlider = (axis: number, value: number) => {
    const next: [number, number, number] = [...target]
    next[axis] = value
    setTarget(next)
    setAutoTour(false)
    controllerRef.current?.setTarget(next)
  }

  const rec = RECORDED_RMS[payload]
  const mm = (m: number) => `${(m * 1000).toFixed(0)} mm`

  return (
    <div className="reach" ref={wrapRef}>
      {status === 'error' && (
        <div className="reach__fallback">
          <p>This interactive demo needs WebGL2 and WebAssembly. It runs best on a desktop browser.</p>
        </div>
      )}

      <div className="reach__layout" data-hidden={status === 'error'}>
        <div className="reach__panes">
          <Pane label="Before adaptation · FADA-zs" tone="baseline" canvasRef={beforeCanvasRef} err={metrics.before.err} mm={mm} />
          <Pane label="After adaptation · FADA" tone="adapted" canvasRef={afterCanvasRef} err={metrics.after.err} mm={mm} />
          {status === 'loading' && (
            <div className="reach__loading">
              <span className="reach__spinner" aria-hidden="true" />
              Loading MuJoCo + policies…
            </div>
          )}
        </div>

        <SidePanel before={metrics.before} after={metrics.after} />
      </div>

      <div className="reach__controls" aria-label="Demo controls">
        <div className="reach__ctl-group">
          <span className="reach__ctl-label">Wrist payload</span>
          <div className="reach__payloads" role="group" aria-label="Wrist payload">
            {PAYLOADS.map((p) => (
              <button
                key={p.key}
                className={`reach__chip ${payload === p.key ? 'is-active' : ''}`}
                onClick={() => onPayload(p.key)}
                disabled={status !== 'ready'}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="reach__ctl-group reach__sliders">
          <span className="reach__ctl-label">EE target</span>
          <div className="reach__slider-rows">
            {AXES.map((ax) => (
              <label key={ax.label} className="reach__slider-row">
                <span className="reach__slider-ax">{ax.label}</span>
                <input
                  type="range"
                  className="reach__slider"
                  min={ax.range[0]}
                  max={ax.range[1]}
                  step={0.005}
                  value={target[ax.key]}
                  onChange={(e) => onSlider(ax.key, parseFloat(e.target.value))}
                  disabled={status !== 'ready'}
                  aria-label={`End-effector ${ax.label} (${ax.hint})`}
                />
                <span className="reach__slider-val">{target[ax.key].toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="reach__ctl-group">
          <button className="reach__btn" onClick={togglePlay} disabled={status !== 'ready'}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button className={`reach__btn ${autoTour ? 'is-active' : ''}`} onClick={toggleTour} disabled={status !== 'ready'}>
            ↻ Auto-tour
          </button>
          <button className="reach__btn" onClick={onReset} disabled={status !== 'ready'}>
            ⟲ Reset
          </button>
        </div>

        <div className="reach__ctl-group reach__recorded">
          <span className="reach__ctl-label">Reported RMS error ({PAYLOADS.find((p) => p.key === payload)?.label})</span>
          <span className="reach__recorded-val">
            <b className="reach__tone-baseline">{mm(rec.before)}</b> → <b className="reach__tone-adapted">{mm(rec.after)}</b>
          </span>
        </div>
      </div>

      <p className="reach__hint">
        Drag the amber target in either view — or use the X / Y / Z sliders — to set the hand's goal
        (kept within the arm's reachable workspace). The faint arm is the planner's predicted next pose;
        Reset returns to the home target.
      </p>
    </div>
  )
}

interface PaneProps {
  label: string
  tone: 'baseline' | 'adapted'
  canvasRef: React.RefObject<HTMLCanvasElement>
  err: number
  mm: (m: number) => string
}

function Pane({ label, tone, canvasRef, err, mm }: PaneProps) {
  const hit = err > 0 && err < 0.05
  return (
    <div className="reach__pane">
      <div className={`reach__pane-title reach__pane-title--${tone}`}>
        <span>{label}</span>
        <span className={`reach__err ${hit ? 'is-hit' : ''}`}>{err > 0 ? mm(err) : '—'}</span>
      </div>
      <div className="reach__canvas-wrap">
        <canvas ref={canvasRef} className="reach__canvas" />
      </div>
    </div>
  )
}

/** Legend + live per-joint angles and IDM correction. */
function SidePanel({ before, after }: { before: ArmReadout; after: ArmReadout }) {
  const MAX_CORR = 1.5 // rad, bar full-scale
  const corrPct = (v: number) => `${Math.min(100, (v / MAX_CORR) * 100)}%`
  return (
    <aside className="reach__panel" aria-label="Live readout and legend">
      <section className="reach__panel-sec">
        <h4 className="reach__panel-title">Legend</h4>
        <ul className="reach__legend">
          <li><span className="reach__dot reach__dot--baseline" /> Solid arm (red) — FADA-zs</li>
          <li><span className="reach__dot reach__dot--adapted" /> Solid arm (green) — FADA</li>
          <li><span className="reach__dot reach__dot--ghost" /> Faint arm — planner's prediction</li>
          <li><span className="reach__dot reach__dot--target" /> Sphere — end-effector target</li>
        </ul>
      </section>

      <section className="reach__panel-sec">
        <h4 className="reach__panel-title">
          Joint angles <small>rad · <span className="reach__tone-baseline">before</span> / <span className="reach__tone-adapted">after</span></small>
        </h4>
        <div className="reach__joints">
          {ARM_JOINT_LABELS.map((label, i) => (
            <div className="reach__joint-row" key={label}>
              <span className="reach__joint-label">{label}</span>
              <span className="reach__joint-val reach__tone-baseline">{fmt(before.jointAngles[i])}</span>
              <span className="reach__joint-val reach__tone-adapted">{fmt(after.jointAngles[i])}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="reach__panel-sec">
        <h4 className="reach__panel-title">IDM correction <small>‖q<sub>idm</sub> − q<sub>planner</sub>‖</small></h4>
        <div className="reach__corr-row">
          <span className="reach__corr-label reach__tone-baseline">Before</span>
          <span className="reach__corr-track"><span className="reach__corr-fill reach__corr-fill--baseline" style={{ width: corrPct(before.idmCorrection) }} /></span>
          <span className="reach__corr-val">{before.idmCorrection.toFixed(2)}</span>
        </div>
        <div className="reach__corr-row">
          <span className="reach__corr-label reach__tone-adapted">After</span>
          <span className="reach__corr-track"><span className="reach__corr-fill reach__corr-fill--adapted" style={{ width: corrPct(after.idmCorrection) }} /></span>
          <span className="reach__corr-val">{after.idmCorrection.toFixed(2)}</span>
        </div>
      </section>
    </aside>
  )
}

function fmt(v: number | undefined): string {
  if (v === undefined) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}
