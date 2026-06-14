interface Props {
  /** Rendered height in px; width scales with it. */
  height?: number
  /** Override color (defaults to Carnegie Red). */
  color?: string
  className?: string
}

/**
 * A typographic Carnegie Mellon University wordmark, set in the site's display
 * serif. Built in-house (the official brand portal is auth-gated) and kept
 * faithful to the brand color, Carnegie Red (#C41230).
 */
export function CmuWordmark({ height = 34, color = 'var(--cmu-red)', className = '' }: Props) {
  return (
    <span
      role="img"
      aria-label="Carnegie Mellon University"
      className={`cmu-wordmark ${className}`}
      style={{ color, ['--cmu-h' as string]: `${height}px` }}
    >
      <span className="cmu-wordmark__line">Carnegie</span>
      <span className="cmu-wordmark__line">Mellon</span>
      <span className="cmu-wordmark__line cmu-wordmark__line--light">University</span>
    </span>
  )
}
