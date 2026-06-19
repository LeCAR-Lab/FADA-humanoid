/**
 * One reach-task simulation instance: the full G1 driven by a Planner–IDM ONNX
 * policy, with the base + every non-arm joint HARD-PINNED to default each substep.
 *
 * This faithfully reproduces the deployment sim (`run_sim.py robot:g1-29dof
 * --lock-base-height 1.5` + `meshcat_reach_viewer.py::_lock_base`). Verified: After
 * (adapted) policies beat Before at every payload, settled error ~90 mm — matching
 * the paper. A stripped/welded model does NOT reproduce the adaptation gap.
 *
 * Control loop (one policy step = SUBSTEPS sim steps):
 *   action, plannerPred = onnx(armPos, armVel, eeTarget)
 *   q_target = DEFAULT_ARM_POS + action * ACTION_SCALE
 *   repeat SUBSTEPS:  lock();  ctrl[arm] = clip(KP*(q_target-q) - KD*qvel);  mj_step
 *   EE error = ||(wrist_world - base_world) - eeTarget||   (left_wrist_yaw_link body
 *              — the EE definition used by the training reach manager and the
 *              deployment metric, NOT the rubber-hand palm site)
 *   ghost    = FK(plannerPred): set arm qpos, mj_kinematics, read, restore
 */
import type { MainModule } from './mujocoLoader'
import { ReachPolicy } from './onnxPolicy'
import {
  REACH_MODEL_URL,
  ARM_QPOS_START,
  ARM_QVEL_START,
  ARM_ACT_START,
  ARM_DOF,
  ARM_BODY_NAMES,
  EE_BODY,
  BASE_BODY,
  BASE_HEIGHT,
  DEFAULT_ARM_POS,
} from './reachModel'
import { ACTION_SCALE, KP, KD, CTRL_RANGE, SUBSTEPS, DISPLAY_SMOOTH } from './reachData'
import { fetchAsset } from './diagnostics'

export interface BodyXform {
  pos: [number, number, number]
  quat: [number, number, number, number] // (w, x, y, z), MuJoCo order
}

export interface ArmFrame {
  solid: BodyXform[]
  ghost: BodyXform[]
  eePos: [number, number, number]
  eeRel: [number, number, number]
  eeErr: number
  /** Current arm joint angles (rad), display-smoothed, for the live readout. */
  jointAngles: number[]
  /** Planner-predicted next joint angles (rad). */
  plannerAngles: number[]
  /** IDM correction magnitude ‖q_idm_target − q_planner‖ (rad). */
  idmCorrection: number
}

type MjModel = ReturnType<MainModule['MjModel']['from_xml_string']>
type MjData = InstanceType<MainModule['MjData']>

export class ReachArm {
  private model: MjModel | null = null
  private data: MjData | null = null
  private modelXml = ''
  private baseBodyId = -1
  private wristBodyId = -1
  private armBodyIds: number[] = []
  private qpos0: Float64Array | null = null
  private readonly policy: ReachPolicy
  private payloadKg: number
  private readonly armPos = new Float32Array(ARM_DOF)
  private readonly armVel = new Float32Array(ARM_DOF)
  private readonly qTarget = new Float32Array(ARM_DOF)
  private lastPlannerPred: Float32Array = new Float32Array(DEFAULT_ARM_POS)
  private lastIdmCorrection = 0
  // Display-only EMA-smoothed joint angles (render the arm from these so residual
  // policy buzz near workspace edges doesn't read as a shaking robot). Never fed
  // back into the sim or the policy.
  private displayQ: Float64Array | null = null

  constructor(
    private readonly mj: MainModule,
    initialPayloadKg = 0,
  ) {
    this.policy = new ReachPolicy()
    this.payloadKg = initialPayloadKg
  }

  /** Fetch the MJCF, build the model + data, and load the policy ONNX. */
  async init(modelUrl: string): Promise<void> {
    this.modelXml = await (await fetchAsset(REACH_MODEL_URL)).text()
    this.buildModel()
    await this.policy.load(modelUrl)
  }

  private buildModel(): void {
    const { mj } = this
    this.data?.delete()
    this.model?.delete()

    this.model = mj.MjModel.from_xml_string(this.modelXml)
    // Inject payload by bumping the wrist link mass, then recompute derived
    // quantities — exactly what the deployment sim does (sim_utils.py).
    this.wristBodyId = mj.mj_name2id(this.model, mj.mjtObj.mjOBJ_BODY.value, EE_BODY)
    if (this.payloadKg > 0) {
      const bm = this.model.body_mass
      bm[this.wristBodyId] = bm[this.wristBodyId] + this.payloadKg
    }
    this.data = new mj.MjData(this.model)
    if (this.payloadKg > 0) mj.mj_setConst(this.model, this.data)

    this.baseBodyId = mj.mj_name2id(this.model, mj.mjtObj.mjOBJ_BODY.value, BASE_BODY)
    this.armBodyIds = ARM_BODY_NAMES.map((b) => mj.mj_name2id(this.model!, mj.mjtObj.mjOBJ_BODY.value, b))
    this.qpos0 = Float64Array.from(this.model.qpos0 as ArrayLike<number>)

    this.resetState()
  }

  /** Reset arm to default + pin base, clear policy history. */
  private resetState(): void {
    const { mj, model, data } = this
    if (!model || !data) return
    mj.mj_resetData(model, data)
    const qpos = data.qpos
    for (let i = 0; i < ARM_DOF; i++) qpos[ARM_QPOS_START + i] = DEFAULT_ARM_POS[i]
    this.lockBase()
    mj.mj_forward(model, data)
    this.lastPlannerPred = new Float32Array(DEFAULT_ARM_POS)
    this.lastIdmCorrection = 0
    this.displayQ = Float64Array.from(DEFAULT_ARM_POS) // re-seed display smoothing
    this.policy.reset()
  }

  /** Hard-pin the base (freejoint) + every non-arm joint to default. */
  private lockBase(): void {
    const { data, qpos0 } = this
    if (!data || !qpos0) return
    const qpos = data.qpos
    const qvel = data.qvel
    // Free joint: position (0,0,h) + identity quat, zero root velocity.
    qpos[0] = 0
    qpos[1] = 0
    qpos[2] = BASE_HEIGHT
    qpos[3] = 1
    qpos[4] = 0
    qpos[5] = 0
    qpos[6] = 0
    for (let i = 0; i < 6; i++) qvel[i] = 0
    // Non-arm joints (qpos 7..ARM_QPOS_START and after the arm) → default (qpos0).
    for (let i = 7; i < ARM_QPOS_START; i++) {
      qpos[i] = qpos0[i]
    }
    for (let i = ARM_QPOS_START + ARM_DOF; i < qpos0.length; i++) {
      qpos[i] = qpos0[i]
    }
    // Zero their velocities (qvel 6..ARM_QVEL_START and after the arm).
    for (let i = 6; i < ARM_QVEL_START; i++) qvel[i] = 0
    for (let i = ARM_QVEL_START + ARM_DOF; i < this.model!.nv; i++) qvel[i] = 0
  }

  setPayload(kg: number): void {
    this.payloadKg = kg
    this.buildModel()
  }

  async setPolicy(modelUrl: string): Promise<void> {
    await this.policy.load(modelUrl)
  }

  reset(): void {
    this.resetState()
  }

  private readArmState(): void {
    const { qpos, qvel } = this.data!
    for (let i = 0; i < ARM_DOF; i++) {
      this.armPos[i] = qpos[ARM_QPOS_START + i]
      this.armVel[i] = qvel[ARM_QVEL_START + i]
    }
  }

  /** Advance one policy step (SUBSTEPS sim steps) toward `eeTarget`. */
  async step(eeTarget: ArrayLike<number>): Promise<void> {
    if (!this.model || !this.data) return
    const { mj, model, data } = this

    this.readArmState()
    const { action, plannerPred } = await this.policy.step(this.armPos, this.armVel, eeTarget)
    this.lastPlannerPred = plannerPred

    let corrSq = 0
    for (let i = 0; i < ARM_DOF; i++) {
      this.qTarget[i] = DEFAULT_ARM_POS[i] + action[i] * ACTION_SCALE
      const d = this.qTarget[i] - plannerPred[i]
      corrSq += d * d
    }
    this.lastIdmCorrection = Math.sqrt(corrSq)

    for (let s = 0; s < SUBSTEPS; s++) {
      this.lockBase()
      const qpos = data.qpos
      const qvel = data.qvel
      const ctrl = data.ctrl
      for (let i = 0; i < ARM_DOF; i++) {
        let tau = KP[i] * (this.qTarget[i] - qpos[ARM_QPOS_START + i]) - KD[i] * qvel[ARM_QVEL_START + i]
        const lim = CTRL_RANGE[i]
        if (tau > lim) tau = lim
        else if (tau < -lim) tau = -lim
        ctrl[ARM_ACT_START + i] = tau
      }
      mj.mj_step(model, data)
    }

    // Advance display-only EMA toward the new (true) arm pose.
    const qpos = data.qpos
    if (!this.displayQ) this.displayQ = new Float64Array(ARM_DOF)
    for (let i = 0; i < ARM_DOF; i++) {
      const q = qpos[ARM_QPOS_START + i]
      this.displayQ[i] = DISPLAY_SMOOTH * this.displayQ[i] + (1 - DISPLAY_SMOOTH) * q
    }
  }

  /** Snapshot solid + ghost body transforms and EE error for rendering. */
  frame(eeTarget: ArrayLike<number>): ArmFrame {
    const { mj, model, data } = this
    if (!model || !data) {
      return {
        solid: [], ghost: [], eePos: [0, 0, 0], eeRel: [0, 0, 0], eeErr: 0,
        jointAngles: [], plannerAngles: [], idmCorrection: 0,
      }
    }

    const qpos = data.qpos
    const display = this.displayQ ?? Float64Array.from(DEFAULT_ARM_POS)

    // Save the true arm pose; everything below renders from the SMOOTHED pose so
    // the visible arm (and the reported EE error) don't jitter at workspace edges.
    const saved = new Float64Array(ARM_DOF)
    for (let i = 0; i < ARM_DOF; i++) {
      saved[i] = qpos[ARM_QPOS_START + i]
      qpos[ARM_QPOS_START + i] = display[i]
    }
    mj.mj_kinematics(model, data)

    const solid = this.readBodyXforms()
    // EE = left_wrist_yaw_link body origin (training/deploy EE definition), NOT the
    // rubber-hand palm site. This is what the recorded RMS numbers are measured at.
    const bx = data.xpos
    const ee: [number, number, number] = [bx[this.wristBodyId * 3], bx[this.wristBodyId * 3 + 1], bx[this.wristBodyId * 3 + 2]]
    const base: [number, number, number] = [bx[this.baseBodyId * 3], bx[this.baseBodyId * 3 + 1], bx[this.baseBodyId * 3 + 2]]
    const eeRel: [number, number, number] = [ee[0] - base[0], ee[1] - base[1], ee[2] - base[2]]
    const dx = eeRel[0] - eeTarget[0]
    const dy = eeRel[1] - eeTarget[1]
    const dz = eeRel[2] - eeTarget[2]
    const eeErr = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // Ghost = FK of the planner-predicted joint angles.
    for (let i = 0; i < ARM_DOF; i++) qpos[ARM_QPOS_START + i] = this.lastPlannerPred[i]
    mj.mj_kinematics(model, data)
    const ghost = this.readBodyXforms()

    // Restore the true arm pose so the next physics step is unaffected.
    for (let i = 0; i < ARM_DOF; i++) qpos[ARM_QPOS_START + i] = saved[i]
    mj.mj_kinematics(model, data)

    return {
      solid,
      ghost,
      eePos: ee,
      eeRel,
      eeErr,
      jointAngles: Array.from(display),
      plannerAngles: Array.from(this.lastPlannerPred),
      idmCorrection: this.lastIdmCorrection,
    }
  }

  private readBodyXforms(): BodyXform[] {
    const { data, armBodyIds } = this
    const xpos = data!.xpos
    const xquat = data!.xquat
    return armBodyIds.map((id) => ({
      pos: [xpos[id * 3], xpos[id * 3 + 1], xpos[id * 3 + 2]],
      quat: [xquat[id * 4], xquat[id * 4 + 1], xquat[id * 4 + 2], xquat[id * 4 + 3]],
    }))
  }

  dispose(): void {
    this.policy.dispose()
    this.data?.delete()
    this.model?.delete()
    this.data = null
    this.model = null
  }
}
