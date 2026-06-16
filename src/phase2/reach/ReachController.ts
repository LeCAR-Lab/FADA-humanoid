/**
 * Owns the two simulations (Before / After adaptation) + their renderers and the
 * fixed-step animation loop. Kept outside React so the 50 Hz physics + 60 fps
 * render never trigger re-renders; the component subscribes to a lightweight
 * metrics callback instead.
 */
import { loadMujocoModule, type MainModule } from './mujocoLoader'
import { ReachArm } from './ReachArm'
import { ReachScene } from './ReachScene'
import {
  POLICY_DT,
  BEFORE_MODEL_URL,
  PAYLOADS,
  AUTO_TOUR,
  TOUR_HOLD_STEPS,
  DEFAULT_TARGET,
  clampTarget,
  type PayloadKey,
} from './reachData'

export interface ArmReadout {
  err: number
  jointAngles: number[]
  plannerAngles: number[]
  idmCorrection: number
}

export interface ReachMetrics {
  before: ArmReadout
  after: ArmReadout
}

export interface ReachControllerOpts {
  beforeCanvas: HTMLCanvasElement
  afterCanvas: HTMLCanvasElement
  onMetrics: (m: ReachMetrics) => void
  /** Fired whenever the (clamped) target changes — drag, slider, tour, or reset. */
  onTarget?: (t: [number, number, number]) => void
}

const MAX_FRAME_DT = 0.1 // clamp tab-switch gaps

export class ReachController {
  private mj: MainModule | null = null
  private beforeArm: ReachArm | null = null
  private afterArm: ReachArm | null = null
  private beforeScene: ReachScene | null = null
  private afterScene: ReachScene | null = null

  private target: [number, number, number] = [...DEFAULT_TARGET]
  private payload: PayloadKey = '0'
  private playing = false
  private autoTour = false
  private tourIdx = 0
  private tourHold = 0

  private raf = 0
  private acc = 0
  private lastT = 0
  private stepping = false // guards against overlapping async steps
  private disposed = false

  constructor(private readonly opts: ReachControllerOpts) {}

  async init(): Promise<void> {
    this.mj = await loadMujocoModule()
    if (this.disposed) return

    this.beforeScene = new ReachScene(this.opts.beforeCanvas, {
      solidColorVar: '--c-baseline',
      solidColorFallback: '#e5484d',
      onTargetDrag: (t) => this.setTarget(t),
    })
    this.afterScene = new ReachScene(this.opts.afterCanvas, {
      solidColorVar: '--c-adapted',
      solidColorFallback: '#30a46c',
      onTargetDrag: (t) => this.setTarget(t),
    })

    const payloadOpt = PAYLOADS.find((p) => p.key === this.payload)!
    this.beforeArm = new ReachArm(this.mj, payloadOpt.kg)
    this.afterArm = new ReachArm(this.mj, payloadOpt.kg)

    await Promise.all([
      this.beforeArm.init(BEFORE_MODEL_URL),
      this.afterArm.init(payloadOpt.afterModel),
      this.beforeScene.loadArm(),
      this.afterScene.loadArm(),
    ])
    if (this.disposed) return

    this.syncTargetToScenes()
    this.renderOnce()
  }

  // ── Public controls ──────────────────────────────────────────────────────
  /** Set the EE target (clamped to the calm reachable workspace). */
  setTarget(t: [number, number, number]): void {
    this.target = clampTarget(t)
    this.autoTour = false
    this.syncTargetToScenes() // re-syncs the (clamped) target back onto the spheres
  }

  getTarget(): [number, number, number] {
    return this.target
  }

  async setPayload(key: PayloadKey): Promise<void> {
    if (key === this.payload) return
    this.payload = key
    const opt = PAYLOADS.find((p) => p.key === key)!
    this.beforeArm?.setPayload(opt.kg)
    this.afterArm?.setPayload(opt.kg)
    // Before = base policy (unchanged); After = payload-specific finetuned policy.
    await this.afterArm?.setPolicy(opt.afterModel)
    await this.beforeArm?.setPolicy(BEFORE_MODEL_URL)
    this.renderOnce()
  }

  setPlaying(on: boolean): void {
    this.playing = on
    if (on && !this.raf) {
      this.lastT = performance.now()
      this.acc = 0
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  setAutoTour(on: boolean): void {
    this.autoTour = on
    if (on) {
      this.tourIdx = 0
      this.tourHold = 0
    }
  }

  /** Reset arms to the default pose AND return the target to the fixed home pose. */
  reset(): void {
    this.autoTour = false
    this.target = [...DEFAULT_TARGET]
    this.beforeArm?.reset()
    this.afterArm?.reset()
    this.syncTargetToScenes()
    this.renderOnce()
  }

  // ── Loop ─────────────────────────────────────────────────────────────────
  private loop = (now: number): void => {
    if (this.disposed) return
    this.raf = this.playing ? requestAnimationFrame(this.loop) : 0
    const dt = Math.min((now - this.lastT) / 1000, MAX_FRAME_DT)
    this.lastT = now
    this.acc += dt

    // Fixed-step: run whole policy steps so 50 Hz decouples from display refresh.
    if (this.acc >= POLICY_DT && !this.stepping) {
      const steps = Math.min(Math.floor(this.acc / POLICY_DT), 4) // cap catch-up
      this.acc -= steps * POLICY_DT
      void this.advance(steps)
    }
    this.renderOnce()
  }

  private async advance(steps: number): Promise<void> {
    if (!this.beforeArm || !this.afterArm) return
    this.stepping = true
    try {
      for (let i = 0; i < steps; i++) {
        if (this.autoTour) this.advanceTour()
        // Step both sims with the shared target.
        await this.beforeArm.step(this.target)
        await this.afterArm.step(this.target)
      }
    } finally {
      this.stepping = false
    }
  }

  private advanceTour(): void {
    if (this.tourHold <= 0) {
      const wp = AUTO_TOUR[this.tourIdx % AUTO_TOUR.length]
      this.target = [wp.x, wp.y, wp.z]
      this.syncTargetToScenes()
      this.tourIdx = (this.tourIdx + 1) % AUTO_TOUR.length
      this.tourHold = TOUR_HOLD_STEPS
    }
    this.tourHold--
  }

  private syncTargetToScenes(): void {
    this.beforeScene?.setTarget(this.target)
    this.afterScene?.setTarget(this.target)
    this.opts.onTarget?.(this.target)
  }

  private renderOnce(): void {
    if (!this.beforeArm || !this.afterArm || !this.beforeScene || !this.afterScene) return
    const bf = this.beforeArm.frame(this.target)
    const af = this.afterArm.frame(this.target)
    this.beforeScene.update(bf)
    this.afterScene.update(af)
    this.beforeScene.render()
    this.afterScene.render()
    this.opts.onMetrics({
      before: { err: bf.eeErr, jointAngles: bf.jointAngles, plannerAngles: bf.plannerAngles, idmCorrection: bf.idmCorrection },
      after: { err: af.eeErr, jointAngles: af.jointAngles, plannerAngles: af.plannerAngles, idmCorrection: af.idmCorrection },
    })
  }

  resize(): void {
    this.beforeScene?.resize()
    this.afterScene?.resize()
    this.renderOnce()
  }

  dispose(): void {
    this.disposed = true
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.beforeArm?.dispose()
    this.afterArm?.dispose()
    this.beforeScene?.dispose()
    this.afterScene?.dispose()
  }
}
