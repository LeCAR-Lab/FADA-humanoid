import type { Metric } from '../data/types'

/** Format a value for display given the metric type. */
export function formatMetric(value: number, metric: Metric): string {
  if (metric === 'success') return `${Math.round(value)}%`
  // normalized error — show 2–3 sig figs cleanly
  return value.toFixed(value < 1 ? 3 : 2).replace(/0+$/, '').replace(/\.$/, '')
}

/** Short axis label per metric. */
export function metricAxisLabel(metric: Metric): string {
  return metric === 'success' ? 'Success rate (%)' : 'Normalized error'
}

/** "higher is better" / "lower is better" hint. */
export function metricDirection(metric: Metric): string {
  return metric === 'success' ? 'higher is better' : 'lower is better'
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
