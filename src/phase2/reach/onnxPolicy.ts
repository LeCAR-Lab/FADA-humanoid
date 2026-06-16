/**
 * In-browser Planner–IDM policy: runs an exported reach ONNX with onnxruntime-web.
 *
 * Mirrors the rolling-history inference in
 * `DeLA/run_scripts/analysis/reach/meshcat_reach_viewer.py::_onnx_step`:
 *   obs   = [arm_pos * POS_SCALE, arm_vel * VEL_SCALE]   (14)
 *   inputs: history_obs[1,H,14], history_act[1,H,7], current_command_tokens[1,H,3],
 *           history_valid_mask[1,H] (bool), teacher_future_obs[1,1,14] (zeros)
 *   outputs: actions[1,_,7] (IDM action), pred_future_obs (planner next obs;
 *            take [:7] / POS_SCALE -> predicted next joint angles in rad)
 * The just-produced action is written back into the last history_act slot, matching
 * the Python reference.
 */
// WASM-only entry (no WebGL/WebGPU/jsep) — keeps the bundle from pulling the 26 MB
// jsep binary. We self-host the single SIMD wasm, URL resolved by Vite (?url) so it
// is fingerprinted and base-path-correct on GitHub Pages.
import * as ort from 'onnxruntime-web/wasm'
// The package only exports the binary at this specifier (see its package.json
// "exports"); ?url lets Vite fingerprint + base-path it.
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import {
  HISTORY_LEN as H,
  OBS_DIM,
  ACT_DIM,
  CMD_DIM,
  POS_SCALE,
  VEL_SCALE,
} from './reachData'

// Single-threaded WASM EP — no SharedArrayBuffer, works on plain GitHub Pages.
let envConfigured = false
function configureOrtEnv() {
  if (envConfigured) return
  ort.env.wasm.numThreads = 1
  ort.env.wasm.simd = true
  // onnxruntime-web 1.26 ships one SIMD+threaded binary; with numThreads=1 it runs
  // single-threaded. Point it at the exact (Vite-fingerprinted) wasm URL.
  ort.env.wasm.wasmPaths = { wasm: ortWasmUrl as string }
  envConfigured = true
}

export interface PolicyStepOut {
  action: Float32Array // [7] IDM action (pre-scale)
  plannerPred: Float32Array // [7] planner predicted next joint angles (rad)
}

export class ReachPolicy {
  private session: ort.InferenceSession | null = null
  private readonly histObs = new Float32Array(H * OBS_DIM)
  private readonly histAct = new Float32Array(H * ACT_DIM)
  private readonly histCmd = new Float32Array(H * CMD_DIM)
  private readonly histValid = new Uint8Array(H)
  private readonly teacherZeros = new Float32Array(OBS_DIM)
  private inputNames = new Set<string>()

  constructor() {
    configureOrtEnv()
  }

  async load(modelUrl: string): Promise<void> {
    const buf = await (await fetch(modelUrl)).arrayBuffer()
    const session = await ort.InferenceSession.create(buf, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    this.session?.release?.()
    this.session = session
    this.inputNames = new Set(session.inputNames)
    this.reset()
  }

  /** Clear rolling history (call on model swap / payload change / reset). */
  reset(): void {
    this.histObs.fill(0)
    this.histAct.fill(0)
    this.histCmd.fill(0)
    this.histValid.fill(0)
  }

  /**
   * Rotate the [H, width] history one step toward the past, matching NumPy's
   * `np.roll(arr, -1, axis=1)`: the oldest row WRAPS to the last slot (it is NOT
   * zeroed). The caller then overwrites the last slot with the current frame.
   *
   * This wrap-vs-zero distinction is load-bearing: the autoregressive IDM was
   * deployed with np.roll, and zero-filling the vacated slot instead collapses
   * tracking (reach error ~460 mm vs the correct ~90 mm). Verified against the
   * Python reference (replay_probe.py / meshcat_reach_viewer.py).
   */
  private static rollBack(arr: Float32Array, width: number): void {
    const first = arr.slice(0, width) // copy the oldest row before it's overwritten
    arr.copyWithin(0, width)
    arr.set(first, (H - 1) * width) // wrap it into the last slot
  }

  /**
   * One policy inference. `armPos`/`armVel` are the current 7 joint angles/vels;
   * `eeTarget` is the base-relative xyz command.
   */
  async step(armPos: Float32Array, armVel: Float32Array, eeTarget: ArrayLike<number>): Promise<PolicyStepOut> {
    if (!this.session) {
      return { action: new Float32Array(ACT_DIM), plannerPred: armPos.slice() }
    }

    // Roll obs/act/cmd histories back by one (np.roll wrap — the oldest row wraps
    // into the last slot, NOT zero-filled), then append the current frame below.
    ReachPolicy.rollBack(this.histObs, OBS_DIM)
    ReachPolicy.rollBack(this.histAct, ACT_DIM)
    ReachPolicy.rollBack(this.histCmd, CMD_DIM)
    // The valid mask shifts and the newest slot is always valid (=1). It must NOT
    // wrap its oldest value in — the current frame is always present/valid.
    this.histValid.copyWithin(0, 1)
    this.histValid[H - 1] = 1

    const obsOff = (H - 1) * OBS_DIM
    for (let i = 0; i < ACT_DIM; i++) {
      this.histObs[obsOff + i] = armPos[i] * POS_SCALE
      this.histObs[obsOff + ACT_DIM + i] = armVel[i] * VEL_SCALE
    }
    const cmdOff = (H - 1) * CMD_DIM
    for (let i = 0; i < CMD_DIM; i++) this.histCmd[cmdOff + i] = eeTarget[i]

    const feeds: Record<string, ort.Tensor> = {
      history_obs: new ort.Tensor('float32', this.histObs, [1, H, OBS_DIM]),
      history_act: new ort.Tensor('float32', this.histAct, [1, H, ACT_DIM]),
      current_command_tokens: new ort.Tensor('float32', this.histCmd, [1, H, CMD_DIM]),
      history_valid_mask: new ort.Tensor('bool', this.histValid, [1, H]),
    }
    if (this.inputNames.has('teacher_future_obs')) {
      feeds.teacher_future_obs = new ort.Tensor('float32', this.teacherZeros, [1, 1, OBS_DIM])
    }

    const res = await this.session.run(feeds)
    const actData = res['actions'].data as Float32Array
    const predData = res['pred_future_obs'].data as Float32Array

    const action = new Float32Array(ACT_DIM)
    const plannerPred = new Float32Array(ACT_DIM)
    for (let i = 0; i < ACT_DIM; i++) {
      action[i] = actData[i]
      plannerPred[i] = predData[i] / POS_SCALE
    }

    // Write the produced action into the last history slot (matches reference).
    const actOff = (H - 1) * ACT_DIM
    for (let i = 0; i < ACT_DIM; i++) this.histAct[actOff + i] = action[i]

    return { action, plannerPred }
  }

  dispose(): void {
    this.session?.release?.()
    this.session = null
  }
}
