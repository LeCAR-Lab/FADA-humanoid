/**
 * Capability detection + init-error classification for the reach demo.
 *
 * The demo can fail to start for genuinely different reasons (no WebGL2, no
 * WebAssembly/SIMD, or an asset download that 404'd or was blocked). Rather than
 * show one hardcoded "needs WebGL2 and WebAssembly" message for every failure —
 * which is just a guess — we probe the real capabilities up front and classify
 * whatever error `init()` throws, so the UI can state the actual cause.
 */

export type ReachFailureKind = 'webgl' | 'wasm' | 'network' | 'unknown'

export interface CapabilityReport {
  webgl2: boolean
  wasm: boolean
}

/** Probe for the two hard requirements without mounting the full demo. */
export function detectCapabilities(): CapabilityReport {
  let webgl2 = false
  try {
    const c = document.createElement('canvas')
    webgl2 = c.getContext('webgl2') != null
  } catch {
    webgl2 = false
  }
  const wasm =
    typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function'
  return { webgl2, wasm }
}

export interface ReachError {
  kind: ReachFailureKind
  /** The underlying error text, surfaced verbatim so users can report it. */
  detail: string
}

const NETWORK_RE = /failed to (fetch|load)|networkerror|load failed|http \d|\b404\b|err_/i
const WEBGL_RE = /webgl|webglrenderer|creating .*context|context.*creat/i
const WASM_RE = /webassembly|\bwasm\b|emscripten|magic word|abort\(|memory access/i

/**
 * Pick the most likely cause for an init failure. Capability gaps (which we
 * probed directly) win; otherwise we infer from the error text. Classification
 * only chooses the headline — the raw detail is always shown too, so a
 * misclassification is never fatal.
 */
export function classifyInitError(err: unknown, caps: CapabilityReport): ReachError {
  const detail = err instanceof Error ? err.message || err.name : String(err)
  if (!caps.webgl2) return { kind: 'webgl', detail }
  if (!caps.wasm) return { kind: 'wasm', detail }
  if (NETWORK_RE.test(detail)) return { kind: 'network', detail }
  if (WEBGL_RE.test(detail)) return { kind: 'webgl', detail }
  if (WASM_RE.test(detail)) return { kind: 'wasm', detail }
  return { kind: 'unknown', detail }
}

/** User-facing headline for each failure kind. */
export function failureHeadline(kind: ReachFailureKind): string {
  switch (kind) {
    case 'webgl':
      return 'This demo needs WebGL2, which your browser or GPU isn’t providing.'
    case 'wasm':
      return 'This demo needs WebAssembly (with SIMD), which your browser blocked or doesn’t support.'
    case 'network':
      return 'Couldn’t download the simulator assets (physics model / policy files).'
    default:
      return 'The live simulation failed to start.'
  }
}

/**
 * `fetch` that throws a network-classified Error on a non-2xx response, so a
 * 404 / blocked asset surfaces as a clear "failed to load …" instead of a
 * downstream WASM/parse error that misattributes the cause.
 */
export async function fetchAsset(url: string): Promise<Response> {
  let res: Response
  try {
    res = await fetch(url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`Failed to fetch ${url}: ${msg}`)
  }
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`)
  return res
}

/** Short, actionable hint for each failure kind. */
export function failureHint(kind: ReachFailureKind): string {
  switch (kind) {
    case 'webgl':
      return 'Enable hardware acceleration (chrome://gpu should report “WebGL2: Hardware accelerated”), or try an up-to-date desktop Chrome, Edge, or Firefox, then retry.'
    case 'wasm':
      return 'Disable any script/WASM-blocking extension, or try an up-to-date desktop browser, then retry.'
    case 'network':
      return 'Check your connection and any content blocker, then retry.'
    default:
      return 'See the details below; reloading or retrying often clears transient failures.'
  }
}
