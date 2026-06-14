import { Section } from '../layout/Section'
import { SingleVideo } from '../media/SingleVideo'
import { DATA_COLLECTION_VIDEO } from '../../data/videos'
import { DATA_COLLECTION_BODY } from '../../data/content'
import './sections.css'

export function DataCollectionSection() {
  return (
    <Section
      id="data"
      eyebrow="Adaptation data"
      title="Few-Shot Target Data Collection"
      width="default"
    >
      <p className="datacollect__body">{DATA_COLLECTION_BODY}</p>
      <SingleVideo
        src={DATA_COLLECTION_VIDEO}
        ariaLabel="Collecting a few minutes of target-domain rollouts on hardware for IDM adaptation."
      />
    </Section>
  )
}
