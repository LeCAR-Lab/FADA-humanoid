import { lazy, Suspense, useState } from 'react'
import { Section } from '../components/layout/Section'
import './phase2.css'

/**
 * PHASE 2 — Interactive, fully-simulated arm reach viewer.
 *
 * The heavy demo (three.js + the in-browser physics simulator + learned controllers,
 * ~13 MB of WASM and models) is code-split and only fetched when the visitor clicks
 * "Launch" — the main bundle is unaffected.
 */
const ReachDemo = lazy(() => import('./reach/ReachDemo'))

export default function MujocoViewerSection() {
  const [launched, setLaunched] = useState(false)

  return (
    <Section
      id="interactive"
      eyebrow="See the mechanism"
      title="Why splitting the policy works"
      intro="A controlled, fully-simulated arm task you can drive yourself — the paper's cleanest test of the Planner–IDM split, running live in your browser."
      tone="dark"
      width="wide"
    >
      <div className="viewer-explainer">
        <p>
          FADA splits the controller into a <b>planner</b> (command → motion intent: <i>what pose
          reaches the target</i>) and an <b>inverse-dynamics model (IDM)</b> (intent → joint actions
          under the current dynamics: <i>how to get there</i>). The claim: a dynamics shift moves the
          second part, not the first.
        </p>
        <p>
          This arm isolates that. Only the wrist <b>payload</b> (0–5&nbsp;kg) changes — same target, same
          reaching pose, but added posture-dependent gravity torque, so the required <i>action</i> grows
          with mass. The faint <b>planner</b> arm barely moves across payloads (≈7% pose shift, even
          beyond its training range). Before adaptation,{' '}
          <span className="explainer-zs">FADA-zs</span> under-compensates and drifts off target; finetuning{' '}
          <i>only</i> the IDM on ~2&nbsp;min of rollouts (<span className="explainer-fada">FADA</span>)
          cuts error ≈24% — a structured, plan-conditioned correction, not a constant offset. That's how
          FADA adapts from minutes of data without touching the planner.
        </p>
      </div>

      {launched ? (
        <Suspense fallback={<ViewerLoading />}>
          <ReachDemo />
        </Suspense>
      ) : (
        <div className="viewer-placeholder">
          <div className="viewer-placeholder__pulse" aria-hidden="true" />
          <p className="viewer-placeholder__label">Live physics simulation</p>
          <p className="viewer-placeholder__text">
            Side-by-side simulation of the G1 left-arm reach task — before vs. after adaptation. Runs the
            actual learned controllers inside a physics simulator; loads ~13&nbsp;MB the first time, best on
            a desktop browser.
          </p>
          <button className="viewer-placeholder__launch" onClick={() => setLaunched(true)}>
            ▶ Launch interactive demo
          </button>
        </div>
      )}
    </Section>
  )
}

function ViewerLoading() {
  return (
    <div className="viewer-placeholder">
      <div className="viewer-placeholder__pulse" aria-hidden="true" />
      <p className="viewer-placeholder__label">Loading…</p>
      <p className="viewer-placeholder__text">Starting the simulator, loading the arm and the controllers.</p>
    </div>
  )
}
