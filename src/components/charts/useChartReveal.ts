import { useEffect, useState } from 'react'
import { useInView } from '../../lib/useInView'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

interface Options {
  /**
   * Carousel mode: pass whether this chart's slide is the active one. The chart
   * re-forms (resets then animates) each time it becomes active AND is on screen,
   * so swiping to a slide visibly draws its plots.
   */
  active?: boolean
}

/**
 * Reveal helper for charts. Returns a ref to attach and a `revealed` boolean
 * that drives the grow/draw-in animation. Under reduced motion it is true
 * immediately. In carousel mode it re-triggers on each activation.
 */
export function useChartReveal<T extends Element = HTMLDivElement>({ active }: Options = {}) {
  const reducedMotion = usePrefersReducedMotion()
  const [ref, inView] = useInView<T>({ once: false, threshold: 0.2 })
  const [revealed, setRevealed] = useState(false)

  const carousel = active !== undefined
  const trigger = carousel ? active && inView : inView

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true)
      return
    }
    if (trigger) {
      // Reset to the collapsed state, then flip on the next frames so the CSS
      // transition runs from scratch every time the slide becomes active.
      setRevealed(false)
      let r2 = 0
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setRevealed(true))
      })
      return () => {
        cancelAnimationFrame(r1)
        cancelAnimationFrame(r2)
      }
    }
    setRevealed(false)
  }, [trigger, reducedMotion])

  return { ref, revealed, reducedMotion }
}
