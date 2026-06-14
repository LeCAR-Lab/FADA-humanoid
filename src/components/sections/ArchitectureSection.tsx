import { Section } from '../layout/Section'
import { FigureImage } from '../figure/FigureImage'
import { assetUrl } from '../../lib/assetUrl'
import { ARCHITECTURE_BODY } from '../../data/content'

export function ArchitectureSection() {
  return (
    <Section
      id="architecture"
      eyebrow="Model"
      title="Planner–IDM Architecture"
      intro={ARCHITECTURE_BODY}
      width="default"
    >
      <FigureImage
        src={assetUrl('figures/architecture.png')}
        alt="Planner–IDM architecture: the planner predicts a short-horizon proprioceptive future from command and history; the IDM maps that future plus recent execution history to an action chunk."
        width={1934}
        height={1042}
        maxWidth="980px"
        label="Architecture"
        caption={
          <>
            <b>Planner–IDM student.</b> The planner forecasts a short proprioceptive horizon; the IDM
            converts it, with recent execution history, into an action chunk. Only the first action
            is executed in a receding-horizon loop. Adaptation updates the IDM alone.
          </>
        }
      />
    </Section>
  )
}
