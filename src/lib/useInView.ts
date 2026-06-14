import { useEffect, useRef, useState } from 'react'

interface Options {
  /** Fraction of the element visible before it counts as "in view". */
  threshold?: number
  /** Expand/shrink the viewport rect used for intersection. */
  rootMargin?: string
  /** Once true, stay true (useful for one-shot reveal animations). */
  once?: boolean
}

/**
 * Observe whether an element is in the viewport.
 * Returns a ref to attach and the current in-view boolean.
 */
export function useInView<T extends Element = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px',
  once = false,
}: Options = {}): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true) // graceful fallback: assume visible
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once])

  return [ref, inView]
}
