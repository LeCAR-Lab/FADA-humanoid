import type { HeroStat, MethodStage } from './types'

export const SITE = {
  acronym: 'FADA',
  title: 'Few-Shot Domain Adaptation via Dynamics Alignment for Humanoid Control',
  venue: 'CoRL 2026',
  tagline:
    'A Planner–Inverse Dynamics Model framework that adapts humanoid robots to new dynamics from about two minutes of target-domain rollouts — no rewards, no accurate prior model.',
}

/**
 * The real paper abstract (verbatim from arxiv_body/abstract.tex, with LaTeX
 * markup resolved). NOT the anonymous site's paraphrase.
 */
export const ABSTRACT = `High-precision humanoid control is limited by target-domain dynamics mismatch, where the same control objective can induce different realized motions under changes in terrain, payload, or actuator response. Existing methods either pursue zero-shot transfer through domain randomization or in-context adaptation without target-domain specialization, or require heavy adaptation pipelines that leverage target-domain data, such as model calibration, residual learning, or policy retraining. We present FADA (Few-Shot Domain Adaptation via Dynamics Alignment), a three-stage Planner–Inverse Dynamics Model (Planner–IDM) framework for few-shot adaptation in humanoid control. FADA first trains an oracle policy with privileged information and then distills the oracle behavior into a deployable Planner–IDM student through DAgger. At deployment, FADA freezes the planner and finetunes only the IDM using approximately 2 minutes of target-domain rollouts with standard supervised learning. Rather than requiring optimal demonstrations or rewards, FADA uses the paired actions and observations observed during these rollouts as supervision, aligning the IDM's action generation with target-domain dynamics. Experiments show that FADA outperforms both in-context and end-to-end adaptation baselines, improving task performance under dynamics shifts and enabling real humanoid robots to execute diverse high-precision whole-body tasks.`

export const HERO_STATS: HeroStat[] = [
  { value: '~2 min', label: 'of target-domain data to adapt', tone: 'neutral' },
  { value: '−24.7%', label: 'normalized error vs. zero-shot (sim-to-sim)', tone: 'adapted' },
  { value: '0 → 100%', label: 'T1 basket-pulling success after adaptation', tone: 'adapted' },
]

/** The motivating question FADA poses (used as the Abstract's editorial headline). */
export const RESEARCH_QUESTION =
  'Can a humanoid adapt to new dynamics from a few minutes of data — without rewards or an accurate prior model?'

export const METHOD_INTRO =
  'FADA keeps the same task-command semantics before and after transfer, and adapts only how intended motion is converted into actions under the target dynamics. Three stages take it from simulation to a specialized real-world controller.'

export const METHOD_STAGES: MethodStage[] = [
  {
    index: 1,
    key: 'oracle',
    title: 'Oracle Training',
    body: 'Train a privileged oracle policy in the source simulator with task rewards and full privileged state — an expert that sees everything.',
  },
  {
    index: 2,
    key: 'distill',
    title: 'Planner–IDM Distillation',
    body: 'Distill the oracle into a deployable student via DAgger: a planner predicts short-horizon proprioceptive intent; an inverse dynamics model turns that intent into actions.',
  },
  {
    index: 3,
    key: 'adapt',
    title: 'Few-Shot IDM Adaptation',
    body: 'At deployment, collect ~2 minutes of target rollouts, freeze the planner, and finetune only the IDM with supervised learning — aligning action generation to the real dynamics.',
  },
]

export const ARCHITECTURE_BODY =
  'The planner predicts a short-horizon proprioceptive future from the task command and observation history. The IDM maps that future, together with recent execution history, to an action chunk; deployment executes only the first action in a receding-horizon loop. Only the IDM is adapted at deployment.'

export const DATA_COLLECTION_BODY =
  'FADA adapts from ordinary target-domain rollouts collected by executing the source-trained policy. Supervision is just the paired proprioceptive observations and executed actions from the same rollout windows — no reward, labeling, privileged state, or off-policy dataset is required.'

// TODO: replace with the final arXiv BibTeX entry once the paper is public.
export const BIBTEX = `@inproceedings{xie2026fada,
  title     = {FADA: Few-Shot Domain Adaptation via Dynamics Alignment for Humanoid Control},
  author    = {Xie, Angchen and Sobanbabu, Nikhil and Shikhare, Ishayu and Wang, Alan and Simchowitz, Max and Shi, Guanya},
  booktitle = {Conference on Robot Learning (CoRL)},
  year      = {2026},
  note      = {arXiv preprint — link coming soon},
}`
