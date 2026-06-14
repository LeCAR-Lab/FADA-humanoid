/* Shared domain types for FADA content + data. */

/** Stable, lowercase app-level condition id. */
export type ConditionId = 'tfdagger' | 'fada_zs' | 'fada'

/** The exact on-disk file token (casing matters: tfdagger / FADA-ZS / FADA). */
export type ConditionFileToken = 'tfdagger' | 'FADA-ZS' | 'FADA'

export interface ConditionMeta {
  id: ConditionId
  fileToken: ConditionFileToken
  label: string // full label, e.g. "FADA (adapted)"
  shortLabel: string // chip label, e.g. "FADA"
  blurb: string // one-line description of the condition
  /** CSS custom property name carrying this condition's color. */
  colorVar: '--c-baseline' | '--c-zeroshot' | '--c-adapted'
}

export type Robot = 'G1' | 'T1'

export interface TaskMeta {
  id: string // == video file prefix, e.g. "g1_slope"
  robot: Robot
  label: string // "Slope Traversal"
  scenario: string // short context line, e.g. "Walking a line on an incline"
  /** Whether all three conditions exist on disk (a few tasks may not). */
  conditions: ConditionId[]
}

export interface ProjectLink {
  label: string
  href: string
  icon: 'paper' | 'arxiv' | 'code' | 'video'
  disabled: boolean
}

export interface Affiliation {
  id: number
  name: string
  url?: string
}

export interface Author {
  name: string
  affiliations: number[]
  equalContrib?: boolean
  url?: string
}

export interface MethodStage {
  index: number
  key: string
  title: string
  body: string
}

/** A highlight statistic for the hero strip. */
export interface HeroStat {
  value: string
  label: string
  tone?: 'baseline' | 'zeroshot' | 'adapted' | 'neutral'
}

/* ---- Charts ---- */

export type Metric = 'success' | 'normErr'

export interface SeriesMeta {
  id: string
  label: string
  colorVar: string // CSS var or literal color
  /** Optional: this series is the "ours" highlight. */
  highlight?: boolean
}

/** A group (e.g. a task) holding one value per series id. */
export interface GroupedDatum {
  groupId: string
  groupLabel: string
  robot?: Robot
  metric: Metric
  values: Record<string, number> // seriesId -> value
}

export interface BarDataset {
  id: string
  title: string
  subtitle: string
  series: SeriesMeta[]
  groups: GroupedDatum[]
  /** Caption hint about directionality, rendered near the axis. */
  note: string
}

export interface HorizonSeries {
  id: string
  label: string
  robot: Robot
  colorVar: string
  values: number[] // aligned to kValues
}

export interface HorizonDataset {
  kValues: number[]
  bestK: number
  series: HorizonSeries[]
  note: string
}

/* ---- Line / curve plots (visible-prefix, data-size) ---- */
export interface LinePoint {
  x: number
  y: number
  /** Optional label rendered near the point. */
  tag?: string
}
export interface LineDataset {
  id: string
  title: string
  subtitle: string
  xLabel: string
  yLabel: string
  points: LinePoint[]
  colorVar: string
  /** x value to mark as the saturation/plateau point. */
  markerX?: number
  markerLabel?: string
  note: string
}

/* ---- Per-step importance (leave-one-out lollipop) ---- */
export interface ImportanceBar {
  label: string
  value: number
  highlight?: boolean
}
export interface ImportanceDataset {
  id: string
  title: string
  subtitle: string
  yLabel: string
  bars: ImportanceBar[]
  note: string
}

