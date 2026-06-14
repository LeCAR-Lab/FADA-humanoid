import type { ReactNode } from 'react'
import { Container } from './Container'
import { useInView } from '../../lib/useInView'
import './layout.css'

interface Props {
  id: string
  eyebrow?: string
  title?: ReactNode
  intro?: ReactNode
  children: ReactNode
  /** 'dark' renders a showcase band; 'light' is the editorial default. */
  tone?: 'light' | 'dark'
  width?: 'default' | 'wide' | 'text'
  /** Center the header block (title/intro). */
  centered?: boolean
  className?: string
}

/**
 * A semantic page section with a consistent header rhythm and an in-view
 * reveal on its header. `tone="dark"` flips to the showcase palette.
 */
export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  tone = 'light',
  width = 'default',
  centered = false,
  className = '',
}: Props) {
  const [ref, inView] = useInView<HTMLElement>({ once: true, threshold: 0.08 })
  const hasHeader = eyebrow || title || intro

  return (
    <section
      id={id}
      ref={ref}
      aria-labelledby={title ? `${id}-title` : undefined}
      data-tone={tone}
      className={`section ${tone === 'dark' ? 'dark section--dark' : ''} ${
        inView ? 'is-inview' : ''
      } ${className}`}
    >
      <Container width={width}>
        {hasHeader && (
          <header className={`section__head ${centered ? 'section__head--center' : ''}`}>
            {eyebrow && <p className="eyebrow section__eyebrow">{eyebrow}</p>}
            {title && (
              <h2 id={`${id}-title`} className="section__title">
                {title}
              </h2>
            )}
            {intro && <p className="section__intro">{intro}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  )
}
