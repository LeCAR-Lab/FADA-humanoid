import { Section } from '../layout/Section'
import { CopyButton } from '../common/CopyButton'
import { BIBTEX } from '../../data/content'
import './sections.css'

export function CitationSection() {
  return (
    <Section
      id="citation"
      eyebrow="Cite"
      title="Citation"
      intro="If you find FADA useful, please cite our work. (arXiv entry coming soon.)"
      width="text"
    >
      <div className="citation__block">
        <CopyButton text={BIBTEX} label="Copy BibTeX" className="citation__copy" />
        <pre className="citation__pre">
          <code>{BIBTEX}</code>
        </pre>
      </div>
    </Section>
  )
}
