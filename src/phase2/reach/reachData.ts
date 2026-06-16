/**
 * Constants and recorded data for the reach demo. Values are transcribed from the
 * exported ONNX metadata and the validated Python viewers
 * (`DeLA/run_scripts/analysis/reach/`). See [[reach-demo-assets]] in memory.
 */
import { assetUrl } from '../../lib/assetUrl'

// ── Policy / control constants (from ONNX metadata + deploy scripts) ──────────
export const HISTORY_LEN = 5
export const OBS_DIM = 14 // [arm_dof_pos(7)*1.0, arm_dof_vel(7)*0.05]
export const ACT_DIM = 7
export const CMD_DIM = 3
export const POS_SCALE = 1.0
export const VEL_SCALE = 0.05
export const ACTION_SCALE = 0.25 // q_target = DEF_Q + action * ACTION_SCALE
export const POLICY_DT = 0.02 // 50 Hz policy
export const SIM_DT = 0.002 // MuJoCo timestep
export const SUBSTEPS = Math.round(POLICY_DT / SIM_DT) // 10 sim steps per policy step

/** Per-arm-joint PD gains (ONNX metadata kp/kd, indices 15:22). */
export const KP = [14.250623, 14.250623, 14.250623, 14.250623, 14.250623, 16.778327, 16.778327]
export const KD = [0.907223, 0.907223, 0.907223, 0.907223, 0.907223, 1.068142, 1.068142]

/** Arm motor ctrl ranges (Nm) — clamp PD torque, matching the MJCF actuators. */
export const CTRL_RANGE = [25, 25, 25, 25, 25, 5, 5]

/** EE within this distance (m) of the target counts as a "hit" (green sphere). */
export const HIT_RADIUS = 0.05

// ── Conditions ───────────────────────────────────────────────────────────────
export type PayloadKey = '0' | '2.5' | '5.0'

export interface PayloadOption {
  key: PayloadKey
  kg: number
  label: string
  /** "After-adaptation" ONNX for this payload (the matching finetuned model). */
  afterModel: string
}

/**
 * "Before" is always the single base (source-domain) policy. "After" is the
 * payload-specific finetuned policy. (vanilla_sim = 0 kg same-dynamics control.)
 */
export const BEFORE_MODEL_URL = assetUrl('models/reach/base.onnx')

export const PAYLOADS: PayloadOption[] = [
  { key: '0', kg: 0, label: '0 kg', afterModel: assetUrl('models/reach/vanilla_sim.onnx') },
  { key: '2.5', kg: 2.5, label: '2.5 kg', afterModel: assetUrl('models/reach/payload_2.5.onnx') },
  { key: '5.0', kg: 5.0, label: '5 kg', afterModel: assetUrl('models/reach/payload_5.0.onnx') },
]

/**
 * Recorded benchmark RMS reach error (m) per payload, before vs after adaptation
 * — from the pipeline summaries. Shown as a HUD reference badge.
 */
export const RECORDED_RMS: Record<PayloadKey, { before: number; after: number }> = {
  '0': { before: 0.08784, after: 0.05135 },
  '2.5': { before: 0.09203, after: 0.05447 },
  '5.0': { before: 0.09583, after: 0.05671 },
}

// ── EE target workspace (base-relative metres) ────────────────────────────────
// Tightened to the policy's *calm* reachable envelope. Outside this box the
// Planner–IDM was never trained and limit-cycles (the arm visibly "shakes" —
// ~15–22 mm/step at the +x / low-z / extreme-y / high-z corners). Both dragging
// and the sliders are clamped to this box so the user can't command those
// unstable poses. A workspace jitter scan (both models @ 5 kg, EMA 0.85) keeps
// the worst displayed motion inside the box to ≈2 mm/step (imperceptible).
export const TARGET_RANGE = {
  x: [-0.28, 0.1] as [number, number],
  y: [0.12, 0.28] as [number, number],
  z: [0.16, 0.28] as [number, number],
}
/** Calm, central reset/home target — Reset always returns here (≈0.07 mm/step). */
export const DEFAULT_TARGET: [number, number, number] = [-0.18, 0.22, 0.24]

/** Clamp a base-relative EE target into the calm reachable workspace. */
export function clampTarget(t: ArrayLike<number>): [number, number, number] {
  const c = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v))
  return [c(t[0], TARGET_RANGE.x), c(t[1], TARGET_RANGE.y), c(t[2], TARGET_RANGE.z)]
}

/** Display-only EMA smoothing factor for rendered joint angles (0 = none). */
export const DISPLAY_SMOOTH = 0.85

// ── Auto-tour: predefined EE-target sequences (from commands/*.json) ───────────
export interface Waypoint {
  x: number
  y: number
  z: number
}

/**
 * Auto-tour waypoints, all inside the calm TARGET_RANGE box so the arm never
 * gets clamped or pushed into a jittery pose mid-tour. A short, varied loop —
 * the arm fully settles at each before advancing.
 */
const TOUR_A: Waypoint[] = [
  { x: -0.18, y: 0.22, z: 0.24 }, // home
  { x: -0.05, y: 0.2, z: 0.22 },
  { x: 0.08, y: 0.18, z: 0.24 },
  { x: 0.08, y: 0.26, z: 0.2 },
  { x: -0.1, y: 0.26, z: 0.26 },
  { x: -0.26, y: 0.18, z: 0.26 },
  { x: -0.24, y: 0.14, z: 0.2 },
  { x: -0.12, y: 0.2, z: 0.18 },
]

export const AUTO_TOUR: Waypoint[] = TOUR_A

/**
 * Policy steps to dwell on each auto-tour waypoint (50 Hz → ~2.8 s). Long enough
 * for the arm to fully reach and hold before the target moves.
 */
export const TOUR_HOLD_STEPS = 140

export const ARM_JOINT_LABELS = ['sho·P', 'sho·R', 'sho·Y', 'elbow', 'wri·R', 'wri·P', 'wri·Y']
