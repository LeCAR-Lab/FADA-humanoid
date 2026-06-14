import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// FADA project page. Deployed to GitHub Pages under the project path
// https://lecar-lab.github.io/FADA-humanoid/ — hence the base below.
//
// The COOP/COEP headers are not strictly needed for Phase 1, but we set them in
// dev/preview so the future Phase-2 MuJoCo-WASM viewer (SharedArrayBuffer) behaves
// identically locally. GitHub Pages cannot send these headers; Phase 2 is planned
// around the single-threaded WASM build (or a coi-serviceworker shim).
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  base: '/FADA-humanoid/',
  plugins: [react()],
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
})
