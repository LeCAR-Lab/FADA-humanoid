import { Section } from '../components/layout/Section'
import './phase2.css'

/**
 * PHASE 2 SEAM — inert placeholder.
 *
 * This will become an interactive in-browser MuJoCo (WASM) + ONNX viewer of the
 * reach task before/after IDM finetuning. It is default-exported so it can later
 * be swapped to `const MujocoViewerSection = React.lazy(() => import(...))` with
 * a <Suspense> boundary, pulling in three.js / @mujoco/mujoco / onnxruntime-web
 * only when this section mounts. See ./README.md for the headers + packaging notes.
 */
export default function MujocoViewerSection() {
  return (
    <Section
      id="interactive"
      eyebrow="Coming soon"
      title="Interactive Policy Viewer"
      intro="An in-browser MuJoCo simulation comparing the Planner–IDM policy before and after few-shot adaptation — drag the end-effector target and watch the IDM compensate."
      tone="dark"
      width="default"
    >
      <div className="viewer-placeholder">
        <div className="viewer-placeholder__pulse" aria-hidden="true" />
        <p className="viewer-placeholder__label">MuJoCo · WASM</p>
        <p className="viewer-placeholder__text">
          Interactive viewer in development. It will run the exported ONNX policies live in your
          browser, no install required.
        </p>
      </div>
    </Section>
  )
}
