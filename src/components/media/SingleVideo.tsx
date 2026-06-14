import { useEffect, useRef } from 'react'
import { useInView } from '../../lib/useInView'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import './media.css'

interface Props {
  src: string
  ariaLabel: string
}

/**
 * A single muted video that autoplays (looping) when scrolled into view and
 * pauses when out. Falls back to showing native controls under reduced motion.
 */
export function SingleVideo({ src, ariaLabel }: Props) {
  const reducedMotion = usePrefersReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [containerRef, inView] = useInView<HTMLElement>({ threshold: 0.3 })

  useEffect(() => {
    const v = videoRef.current
    if (!v || reducedMotion) return
    if (inView) {
      const p = v.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } else {
      v.pause()
    }
  }, [inView, reducedMotion])

  return (
    <figure className="singlevid" ref={containerRef}>
      <div className="singlevid__frame">
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          controls={reducedMotion}
          aria-label={ariaLabel}
          className="singlevid__video"
        />
      </div>
    </figure>
  )
}
