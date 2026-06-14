import { useInView } from '../../lib/useInView'
import './figure.css'

interface Props {
  src: string
  alt: string
  width: number
  height: number
  caption?: React.ReactNode
  /** Small label shown in the plate's top bar (e.g. "Figure 1"). */
  label?: string
  /** Constrain rendered width (e.g. '900px' or '100%'). */
  maxWidth?: string
  /**
   * 'plate' = white matted card with a label bar (best for white-bg PNGs);
   * 'framed' = thin bordered card; 'bare' = no chrome.
   */
  variant?: 'plate' | 'framed' | 'bare'
}

/**
 * Responsive figure with intrinsic dimensions (no CLS), lazy decoding, and a
 * gentle reveal when scrolled into view. The 'plate' variant mats white-bg
 * diagrams on an intentional white card so they don't float on the warm paper.
 */
export function FigureImage({
  src,
  alt,
  width,
  height,
  caption,
  label,
  maxWidth = '100%',
  variant = 'plate',
}: Props) {
  const [ref, inView] = useInView<HTMLElement>({ once: true, threshold: 0.05 })

  return (
    <figure
      ref={ref}
      className={`figure figure--${variant} ${inView ? 'is-inview' : ''}`}
      style={{ maxWidth }}
    >
      {label && (
        <div className="figure__bar">
          <span className="figure__bar-rule" aria-hidden="true" />
          <span className="figure__bar-label">{label}</span>
        </div>
      )}
      <div className="figure__plate">
        <div className="figure__grid" aria-hidden="true" />
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="figure__img"
        />
      </div>
      {caption && <figcaption className="figure__caption">{caption}</figcaption>}
    </figure>
  )
}
