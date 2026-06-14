/**
 * Resolve a path inside /public against the deployment base.
 *
 * Vite's BASE_URL is '/FADA-humanoid/' in production and '/' in dev — and it
 * ALWAYS ends in a slash, so the argument must NOT start with one.
 *
 *   assetUrl('videos/g1_slope-FADA.mp4')
 *     dev  -> '/videos/g1_slope-FADA.mp4'
 *     prod -> '/FADA-humanoid/videos/g1_slope-FADA.mp4'
 */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${clean}`
}
