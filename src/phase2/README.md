# Phase 2 — Interactive MuJoCo Viewer (notes for the future implementer)

Phase 1 ships an inert placeholder (`MujocoViewerSection.tsx`). Phase 2 turns it
into a live in-browser viewer of the reach task before/after IDM finetuning.

## Plan

- **Physics:** official `@mujoco/mujoco` (Google DeepMind, Apache-2.0). Start with the
  **single-threaded** build — it needs **no special headers** and works on plain
  GitHub Pages.
- **Inference:** `onnxruntime-web` runs the two exported ONNX policies (before/after
  finetuning) in the browser, feeding actions into the MuJoCo sim.
- **Rendering:** `three.js` via **react-three-fiber + drei** (declarative lifecycle &
  automatic disposal, which matters because MuJoCo holds WASM/GPU memory). Set
  `camera.up.set(0,0,1)` — MuJoCo is Z-up, three.js is Y-up. The quaternion mapping
  is NOT a simple reorder when also swizzling axes; copy a proven conversion from a
  working demo (e.g. zalo/mujoco_wasm).
- Source reach-task analysis (Python): `DeLA/run_scripts/analysis/reach/`.

## Wiring it in (one-line change)

In `App.tsx`, swap the static import for a lazy boundary:

```tsx
const MujocoViewerSection = React.lazy(() => import('./phase2/MujocoViewerSection'))
// ...
<Suspense fallback={<ViewerFallback />}>
  <MujocoViewerSection />
</Suspense>
```

This keeps `three` / `@mujoco/mujoco` / `onnxruntime-web` out of the main bundle —
they load only when the section mounts.

## Headers / cross-origin isolation

- The **single-threaded** WASM build does **not** require COOP/COEP — prefer it.
- If you later need the **multithreaded** build (SharedArrayBuffer), GitHub Pages
  **cannot send COOP/COEP response headers**. Workaround: drop
  `public/coi-serviceworker.min.js` and register it in `index.html` (it reloads once
  and injects the isolation headers client-side). `vite.config.ts` already sets these
  headers for `dev`/`preview` so local behavior matches.

## Gotchas (verified)

- Manually `.delete()` every Embind handle (MjModel, MjData, MjvScene, buffers) — no
  JS↔WASM GC.
- `data.xpos` / `data.xquat` are live views into the WASM heap; never cache across
  frames (they detach on heap growth) — copy if you need to retain.
- Use a fixed-timestep accumulator (`while (data.time - start < 1/60) mj_step(...)`)
  and interpolate, or the sim runs ~2× fast on a 120 Hz display.
