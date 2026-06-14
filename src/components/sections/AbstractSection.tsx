import { Container } from '../layout/Container'
import { useInView } from '../../lib/useInView'
import { ABSTRACT, RESEARCH_QUESTION } from '../../data/content'
import './sections.css'

export function AbstractSection() {
  const [ref, inView] = useInView<HTMLElement>({ once: true, threshold: 0.1 })

  return (
    <section id="abstract" className={`abstract ${inView ? 'is-inview' : ''}`} ref={ref} aria-labelledby="abstract-q">
      <Container width="default">
        <div className="abstract__layout">
          <aside className="abstract__aside">
            <p className="eyebrow">Abstract</p>
            <h2 id="abstract-q" className="abstract__question">
              {RESEARCH_QUESTION}
            </h2>
            <p className="abstract__answer">
              We answer in the affirmative with <strong>FADA</strong>.
            </p>
          </aside>

          <div className="abstract__body-wrap">
            <p className="abstract__body">{ABSTRACT}</p>
          </div>
        </div>
      </Container>
    </section>
  )
}
