import type {
  BarDataset,
  HorizonDataset,
  ImportanceDataset,
  LineDataset,
} from './types'

/*
 * All numbers below are transcribed directly from the FADA paper tables.
 *  - sim2real  -> tables/sim2real_main.tex
 *  - sim2sim   -> tables/sim2sim_main.tex   (normalized error, MuJoCo column)
 *  - horizonK  -> tables/horizon_ablation_minipage.tex
 * Lower normalized error is better; higher success % is better.
 */

const C_BASELINE = 'var(--c-baseline)'
const C_ZEROSHOT = 'var(--c-zeroshot)'
const C_ADAPTED = 'var(--c-adapted)'

/** Sim-to-real hardware results: TF-DAgger / FADA-zs / FADA across five tasks. */
export const SIM2REAL: BarDataset = {
  id: 'sim2real',
  title: 'Sim-to-Real Hardware',
  subtitle: 'TF-DAgger vs. FADA zero-shot vs. FADA adapted, on Unitree G1 and Booster T1.',
  note: 'Success tasks: higher is better. Normalized-error tasks: lower is better.',
  series: [
    { id: 'tfdagger', label: 'TF-DAgger', colorVar: C_BASELINE },
    { id: 'fada_zs', label: 'FADA-zs', colorVar: C_ZEROSHOT },
    { id: 'fada', label: 'FADA', colorVar: C_ADAPTED, highlight: true },
  ],
  groups: [
    {
      groupId: 'g1_slope',
      groupLabel: 'G1 Slope Traversal',
      robot: 'G1',
      metric: 'success',
      values: { tfdagger: 0, fada_zs: 20, fada: 80 },
    },
    {
      groupId: 't1_basket',
      groupLabel: 'T1 Basket Pulling',
      robot: 'T1',
      metric: 'success',
      values: { tfdagger: 0, fada_zs: 20, fada: 100 },
    },
    {
      groupId: 'g1_payload',
      groupLabel: 'G1 Loco. + Payload',
      robot: 'G1',
      metric: 'normErr',
      values: { tfdagger: 1.0, fada_zs: 1.289, fada: 0.797 },
    },
    {
      groupId: 'g1_kungfu_soft',
      groupLabel: 'G1 Kung Fu + Soft Terrain',
      robot: 'G1',
      metric: 'normErr',
      values: { tfdagger: 1.0, fada_zs: 1.18, fada: 0.86 },
    },
    {
      groupId: 't1_payload',
      groupLabel: 'T1 Loco. + Payload',
      robot: 'T1',
      metric: 'normErr',
      values: { tfdagger: 1.0, fada_zs: 1.043, fada: 0.866 },
    },
  ],
}

/**
 * Sim-to-sim transfer (IsaacSim -> MuJoCo), normalized error on the held-out
 * MuJoCo simulator. Five methods across five tasks; lower is better.
 */
export const SIM2SIM: BarDataset = {
  id: 'sim2sim',
  title: 'Sim-to-Sim Transfer (MuJoCo)',
  subtitle: 'Normalized task error on a held-out MuJoCo simulator across five transfer tasks.',
  note: 'Normalized error — lower is better. FADA is the only method that finetunes the IDM.',
  series: [
    { id: 'tfdagger', label: 'TF-DAgger', colorVar: C_BASELINE },
    { id: 'copred_zs', label: 'CoPred-zs', colorVar: 'var(--c-zeroshot-dim)' },
    { id: 'copred_ft', label: 'CoPred-ft', colorVar: 'var(--c-baseline-dim)' },
    { id: 'fada_zs', label: 'FADA-zs', colorVar: C_ZEROSHOT },
    { id: 'fada', label: 'FADA', colorVar: C_ADAPTED, highlight: true },
  ],
  groups: [
    {
      groupId: 'g1_slope',
      groupLabel: 'G1 Slope',
      robot: 'G1',
      metric: 'normErr',
      values: { tfdagger: 1.0, copred_zs: 0.973, copred_ft: 1.611, fada_zs: 0.946, fada: 0.8 },
    },
    {
      groupId: 'g1_kungfu',
      groupLabel: 'G1 Kung Fu',
      robot: 'G1',
      metric: 'normErr',
      values: { tfdagger: 1.0, copred_zs: 1.031, copred_ft: 1.421, fada_zs: 0.961, fada: 0.714 },
    },
    {
      groupId: 't1_payload',
      groupLabel: 'T1 Loco. + Payload',
      robot: 'T1',
      metric: 'normErr',
      values: { tfdagger: 1.0, copred_zs: 1.029, copred_ft: 1.737, fada_zs: 1.042, fada: 0.885 },
    },
    {
      groupId: 't1_slope',
      groupLabel: 'T1 Slope',
      robot: 'T1',
      metric: 'normErr',
      values: { tfdagger: 1.0, copred_zs: 1.08, copred_ft: 1.193, fada_zs: 1.034, fada: 0.914 },
    },
    {
      groupId: 't1_falcon',
      groupLabel: 'T1 Falcon',
      robot: 'T1',
      metric: 'normErr',
      values: { tfdagger: 1.0, copred_zs: 0.943, copred_ft: 1.054, fada_zs: 0.88, fada: 0.347 },
    },
  ],
}

/** Planner horizon K ablation (post-adaptation). Lower normalized error is better. */
export const HORIZON_K: HorizonDataset = {
  kValues: [1, 6, 10, 15],
  bestK: 6,
  note: 'Normalized error after few-shot adaptation. Performance saturates beyond K = 6.',
  series: [
    {
      id: 'g1_wbt',
      label: 'G1 Whole-Body Tracking',
      robot: 'G1',
      colorVar: C_ADAPTED,
      values: [1.0, 0.83, 0.852, 0.858],
    },
    {
      id: 't1_loco',
      label: 'T1 Payload Locomotion',
      robot: 'T1',
      colorVar: C_ZEROSHOT,
      values: [1.0, 0.813, 0.931, 0.926],
    },
  ],
}

export const BAR_DATASETS: BarDataset[] = [SIM2REAL, SIM2SIM]

/**
 * Visible-prefix attribution (K=6): episode return as the IDM is shown the first
 * k predicted future steps. Saturating curve — most gain by step 3–4.
 * (Section 5.3, arxiv.)
 */
export const VISIBLE_PREFIX: LineDataset = {
  id: 'visible_prefix',
  title: 'Visible-Prefix Attribution',
  subtitle:
    'Episode return as the IDM is given only the first k of 6 predicted future steps. Most of the benefit arrives by the third step.',
  xLabel: 'Predicted steps visible to the IDM',
  yLabel: 'Episode return',
  colorVar: 'var(--c-adapted)',
  markerX: 3,
  markerLabel: 'most gain by step 3',
  note: 'Return rises sharply over the first three steps, then saturates near the full-window value (144). The useful signal is concentrated in a compact future window.',
  points: [
    { x: 1, y: 12.3, tag: '12.3' },
    { x: 2, y: 60 },
    { x: 3, y: 105, tag: '105' },
    { x: 4, y: 134, tag: '134' },
    { x: 5, y: 140 },
    { x: 6, y: 144, tag: '144' },
  ],
}

/**
 * Leave-one-out attribution (K=6): drop in return when each predicted step is
 * masked individually. Steps 1 and 3 matter most. (Section 5.3.)
 */
export const LEAVE_ONE_OUT: ImportanceDataset = {
  id: 'leave_one_out',
  title: 'Leave-One-Out Importance',
  subtitle: 'Return drop when a single predicted step is masked. The immediate and third steps dominate.',
  yLabel: 'Return drop when masked',
  note: 'Masking the first (5.54) or third (5.41) predicted step hurts most; the IDM learns a higher-order plan-to-action map, not a one-step inverse model.',
  bars: [
    { label: 'Step 1', value: 5.54, highlight: true },
    { label: 'Step 2', value: 1.9 },
    { label: 'Step 3', value: 5.41, highlight: true },
    { label: 'Step 4', value: 2.3 },
    { label: 'Step 5', value: 1.4 },
    { label: 'Step 6', value: 1.1 },
  ],
}

/**
 * Target rollout budget vs. normalized error on T1 Loco. + Payload, normalized
 * by the 100-step setting (Figure 9, Section 5.5). Exact values read from the
 * paper figure. The x-axis is categorical/evenly spaced (100, 500, 1k, 6k, 10k,
 * 20k, 30k). Error drops to a MINIMUM at 6k (~2 min budget), then slightly rises
 * and plateaus — more data does not help and marginally hurts.
 */
export const DATA_SIZE: LineDataset = {
  id: 'data_size',
  title: 'Target Data-Size Ablation',
  subtitle:
    'Normalized error vs. amount of target rollout data (T1 Loco. + Payload). Error bottoms out at the ~2-minute budget; collecting more does not help.',
  xLabel: 'Target adaptation data size (control steps)',
  yLabel: 'Normalized error (Ē_v ↓)',
  colorVar: 'var(--c-zeroshot)',
  markerX: 6000,
  markerLabel: '2 min budget',
  note: 'Performance improves sharply up to the 6000-step (~2 min) budget used in the main experiments, where error is lowest (0.758). Beyond that it plateaus and even ticks up slightly — more target data brings no further gain.',
  points: [
    { x: 100, y: 1.0, tag: '1.000' },
    { x: 500, y: 0.9873 },
    { x: 1000, y: 0.866, tag: '0.866' },
    { x: 6000, y: 0.7579, tag: '0.758' },
    { x: 10000, y: 0.7929 },
    { x: 20000, y: 0.7935 },
    { x: 30000, y: 0.7774, tag: '0.777' },
  ],
}

/** LoRA vs full IDM finetuning — diverging from the zero-shot baseline (1.0). */
export const LORA_VS_FULL: BarDataset = {
  id: 'lora_full',
  title: 'LoRA vs. Full IDM Finetuning',
  subtitle: 'Normalized error on three MuJoCo targets. Full finetuning overfits the few-shot budget; LoRA adapts cleanly.',
  note: 'Normalized error — lower is better. Full IDM finetuning rises above the zero-shot baseline (overfitting); low-rank adaptation is consistently best.',
  series: [
    { id: 'zs', label: 'FADA-zs', colorVar: C_ZEROSHOT },
    { id: 'full', label: 'Full IDM FT', colorVar: 'var(--c-baseline)' },
    { id: 'lora', label: 'LoRA IDM', colorVar: C_ADAPTED, highlight: true },
  ],
  groups: [
    {
      groupId: 'g1_slope',
      groupLabel: 'G1 Slope Traversal',
      robot: 'G1',
      metric: 'normErr',
      values: { zs: 1.0, full: 1.1, lora: 0.846 },
    },
    {
      groupId: 't1_payload',
      groupLabel: 'T1 Loco. + Payload',
      robot: 'T1',
      metric: 'normErr',
      values: { zs: 1.0, full: 1.116, lora: 0.849 },
    },
    {
      groupId: 't1_slope',
      groupLabel: 'T1 Slope Traversal',
      robot: 'T1',
      metric: 'normErr',
      values: { zs: 1.0, full: 1.292, lora: 0.885 },
    },
  ],
}
