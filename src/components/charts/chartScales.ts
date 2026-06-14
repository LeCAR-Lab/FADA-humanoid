/* Pure layout/scale math for the custom SVG charts. Framework-free + testable. */

export interface BandScale {
  /** Left edge of a band by index. */
  start: (i: number) => number
  bandwidth: number
  step: number
}

/** Evenly spaced bands across [0, width] with inner padding (0..1). */
export function bandScale(count: number, width: number, padding = 0.2): BandScale {
  const step = width / count
  const bandwidth = step * (1 - padding)
  const offset = (step - bandwidth) / 2
  return {
    step,
    bandwidth,
    start: (i: number) => i * step + offset,
  }
}

export interface LinearScale {
  /** Map a value to a pixel position. */
  (v: number): number
  domain: [number, number]
  range: [number, number]
}

export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  const fn = ((v: number) => r0 + ((v - d0) / span) * (r1 - r0)) as LinearScale
  fn.domain = domain
  fn.range = range
  return fn
}

/** "Nice" tick values across [0, max] given a desired count. */
export function niceTicks(max: number, count = 5): number[] {
  if (max <= 0) return [0]
  const rawStep = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  let step: number
  if (norm < 1.5) step = 1
  else if (norm < 3) step = 2
  else if (norm < 7) step = 5
  else step = 10
  step *= mag
  const ticks: number[] = []
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(6)))
  return ticks
}

/** Round a max up to a clean axis bound. */
export function niceMax(max: number): number {
  if (max <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(max)))
  const norm = max / mag
  let nice: number
  if (norm <= 1) nice = 1
  else if (norm <= 2) nice = 2
  else if (norm <= 2.5) nice = 2.5
  else if (norm <= 5) nice = 5
  else nice = 10
  return nice * mag
}
