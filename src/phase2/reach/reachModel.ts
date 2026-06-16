/**
 * Model constants for the G1 left-arm reach task.
 *
 * IMPORTANT (hard-won): the demo ships the FULL G1 29-DOF model and reproduces the
 * deployment sim by HARD-PINNING the base + every non-arm joint to its default on
 * EVERY physics substep (see `meshcat_reach_viewer.py::_lock_base` and the verified
 * loop in ReachArm). A stripped/welded arm-only model has correct kinematics but
 * subtly different dynamics, and the few-shot-adapted (After) policies — finetuned
 * against this exact locked full-body sim — only show their advantage here.
 *
 * The model XML (`public/models/reach/g1_arm_reach.xml`) is the full g1_29dof with
 * visual meshes stripped (three.js renders the STLs) but inertials + collision
 * capsules kept, plus an <option timestep=0.002> and a ground plane.
 */
import { assetUrl } from '../../lib/assetUrl'

/** URL of the mesh-free full-G1 MJCF served from public/. */
export const REACH_MODEL_URL = assetUrl('models/reach/g1_arm_reach.xml')

// ── Full-model addressing (verified against the compiled model) ───────────────
// Free joint occupies qpos[0:7], qvel[0:6]. Left arm = DOF 15..21.
export const NQ = 36
export const NV = 35
export const NU = 29
/** qpos indices of the 7 arm joints (shoulder pitch → wrist yaw). */
export const ARM_QPOS_START = 22 // qpos[22:29]
/** qvel / actuator-force indices of the 7 arm joints. */
export const ARM_QVEL_START = 21 // qvel[21:28]
/** Actuator (ctrl) indices of the 7 arm motors. */
export const ARM_ACT_START = 15 // ctrl[15:22]
export const ARM_DOF = 7

/** Body world-transform ids for the 7 arm links, root→tip (for three.js render). */
export const ARM_BODY_NAMES = [
  'left_shoulder_pitch_link',
  'left_shoulder_roll_link',
  'left_shoulder_yaw_link',
  'left_elbow_link',
  'left_wrist_roll_link',
  'left_wrist_pitch_link',
  'left_wrist_yaw_link',
] as const

/** Site that defines the end-effector (palm) — read `data.site_xpos`. */
export const EE_SITE = 'left_palm'
/** Wrist body that carries the payload mass. */
export const EE_BODY = 'left_wrist_yaw_link'
/** Pelvis (base) body; EE error is measured relative to its world position. */
export const BASE_BODY = 'pelvis'

/** Fixed base height the deployment sim pins the pelvis to. */
export const BASE_HEIGHT = 1.5

/** Default left-arm joint angles (rad), matching training `default_joint_angles`. */
export const DEFAULT_ARM_POS = [0.2, 0.2, 0.0, 0.6, 0.0, 0.0, 0.0] as const

/**
 * Mesh attachments for rendering: which STL goes on which arm body, with the local
 * offset (body frame) from `g1_29dof.xml`. All link meshes sit at the body origin
 * (identity); only the rubber hand has an offset/sits on the wrist-yaw body.
 */
export interface MeshAttach {
  mesh: string
  bodyIndex: number // index into ARM_BODY_NAMES
  pos: [number, number, number]
  quat: [number, number, number, number] // (w, x, y, z) MuJoCo order
}

export const MESH_ATTACH: MeshAttach[] = [
  { mesh: 'left_shoulder_pitch_link', bodyIndex: 0, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_shoulder_roll_link', bodyIndex: 1, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_shoulder_yaw_link', bodyIndex: 2, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_elbow_link', bodyIndex: 3, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_wrist_roll_link', bodyIndex: 4, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_wrist_pitch_link', bodyIndex: 5, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_wrist_yaw_link', bodyIndex: 6, pos: [0, 0, 0], quat: [1, 0, 0, 0] },
  { mesh: 'left_rubber_hand', bodyIndex: 6, pos: [0.0415, 0.003, 0], quat: [1, 0, 0, 0] },
]

export const MESH_URL = (mesh: string) => assetUrl(`meshes/g1-arm/${mesh}.STL`)
