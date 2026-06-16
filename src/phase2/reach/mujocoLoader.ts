/**
 * Loads the MuJoCo WASM module (single-threaded build) exactly once and memoizes
 * the resulting Emscripten module.
 *
 * The `.wasm` binary URL is obtained via Vite's `?url` import so Vite fingerprints
 * it and rewrites it under the GitHub Pages base path automatically — one copy, no
 * manual staging. We pass it to Emscripten through `locateFile`.
 */
import loadMujoco, { type MainModule } from '@mujoco/mujoco'
import mujocoWasmUrl from '@mujoco/mujoco/mujoco.wasm?url'

let modulePromise: Promise<MainModule> | null = null

export function loadMujocoModule(): Promise<MainModule> {
  if (!modulePromise) {
    modulePromise = loadMujoco({
      locateFile: (path: string) => (path.endsWith('.wasm') ? (mujocoWasmUrl as string) : path),
    } as unknown as undefined).catch((err) => {
      modulePromise = null // allow a later retry
      throw err
    })
  }
  return modulePromise
}

export type { MainModule }
