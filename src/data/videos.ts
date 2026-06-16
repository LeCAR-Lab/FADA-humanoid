import { assetUrl } from '../lib/assetUrl'
import type { ConditionId, ConditionMeta, TaskMeta } from './types'

/**
 * The three deployment conditions, ordered baseline -> zero-shot -> adapted.
 * This module is the ONLY place that knows the exact on-disk file casing.
 */
export const CONDITIONS: ConditionMeta[] = [
  {
    id: 'tfdagger',
    fileToken: 'tfdagger',
    label: 'TF-DAgger',
    shortLabel: 'TF-DAgger',
    blurb: 'Transformer teacher–student baseline, no target-domain adaptation.',
    colorVar: '--c-baseline',
  },
  {
    id: 'fada_zs',
    fileToken: 'FADA-ZS',
    label: 'FADA — zero-shot',
    shortLabel: 'FADA-zs',
    blurb: 'Our Planner–IDM student deployed without adaptation.',
    colorVar: '--c-zeroshot',
  },
  {
    id: 'fada',
    fileToken: 'FADA',
    label: 'FADA — adapted',
    shortLabel: 'FADA',
    blurb: 'After ~2 min of target-domain IDM finetuning.',
    colorVar: '--c-adapted',
  },
]

export const CONDITION_BY_ID: Record<ConditionId, ConditionMeta> = Object.fromEntries(
  CONDITIONS.map((c) => [c.id, c]),
) as Record<ConditionId, ConditionMeta>

const ALL: ConditionId[] = ['tfdagger', 'fada_zs', 'fada']

/**
 * Real-world hardware tasks. `id` matches the video file prefix exactly.
 */
export const TASKS: TaskMeta[] = [
  {
    id: 'g1_slope',
    robot: 'G1',
    label: 'Slope Traversal',
    scenario: 'Tracking a straight line while walking up an incline.',
    conditions: ALL,
  },
  {
    id: 'g1_grocery_carrying',
    robot: 'G1',
    label: 'Payload Locomotion',
    scenario: 'Weaving through poles with an asymmetric 2 kg load.',
    conditions: ALL,
  },
  {
    id: 'g1_kungfu_mat',
    robot: 'G1',
    label: 'Kung Fu on Soft Mats',
    scenario: 'Whole-body Kung Fu tracking on compliant terrain.',
    conditions: ALL,
  },
  {
    id: 'g1_kungfu_sand',
    robot: 'G1',
    label: 'Kung Fu on Sand',
    scenario: 'Whole-body tracking on shifting, energy-absorbing sand.',
    conditions: ALL,
  },
  {
    id: 'g1_dancing',
    robot: 'G1',
    label: 'Dancing with Payload',
    scenario: 'Dynamic dance motion carrying a 3.2 kg front payload.',
    conditions: ALL,
  },
  {
    id: 't1_basket_pulling',
    robot: 'T1',
    label: 'Basket Pulling',
    scenario: 'Dragging a 6 kg laundry basket across the finish line.',
    conditions: ALL,
  },
  {
    id: 't1_circle',
    robot: 'T1',
    label: 'Circular Tracking',
    scenario: 'Following a circular path with a 1 kg asymmetric arm payload.',
    conditions: ALL,
  },
]

export const TASK_BY_ID: Record<string, TaskMeta> = Object.fromEntries(
  TASKS.map((t) => [t.id, t]),
)

/** Resolve the video URL for a given task + condition. */
export function videoPath(taskId: string, condition: ConditionMeta): string {
  return assetUrl(`videos/${taskId}-${condition.fileToken}.mp4`)
}

export const DATA_COLLECTION_VIDEO = assetUrl('videos/data_collection.mp4')

/** Narrated ~1.5 min overview/summary video (has audio — play with sound). */
export const OVERVIEW_VIDEO = assetUrl('videos/fada-overview.mp4')
