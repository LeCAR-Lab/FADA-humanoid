import { Section } from '../layout/Section'
import { OVERVIEW_VIDEO } from '../../data/videos'
import './sections.css'

/**
 * Narrated overview video, placed right after the hero as the "watch this first"
 * summary. It has audio, so unlike the autoplay-muted result clips it uses native
 * controls and plays with sound on the viewer's click.
 */
export function OverviewSection() {
  return (
    <Section
      id="overview"
      eyebrow="Overview"
      title="FADA in 90 seconds"
      intro="A short narrated walkthrough of the method and the hardware results."
      tone="dark"
      width="wide"
      centered
    >
      <figure className="overview-video">
        <video
          className="overview-video__el"
          src={OVERVIEW_VIDEO}
          controls
          playsInline
          preload="metadata"
          aria-label="Narrated overview of FADA: method and hardware results."
        />
      </figure>
    </Section>
  )
}
