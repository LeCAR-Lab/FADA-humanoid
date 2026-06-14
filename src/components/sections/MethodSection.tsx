import { Section } from '../layout/Section'
import { MethodStages } from '../figure/MethodStages'
import { FigureImage } from '../figure/FigureImage'
import { assetUrl } from '../../lib/assetUrl'
import { METHOD_STAGES, METHOD_INTRO } from '../../data/content'

export function MethodSection() {
  return (
    <Section id="method" eyebrow="Approach" title="Method Overview" intro={METHOD_INTRO} width="wide">
      <MethodStages stages={METHOD_STAGES} />
      <FigureImage
        src={assetUrl('figures/framework.png')}
        alt="FADA framework: an oracle policy is distilled into a Planner–IDM student via DAgger, then only the IDM is finetuned on a few target-domain rollouts."
        width={5191}
        height={2500}
        maxWidth="1180px"
        label="Framework"
        caption={
          <>
            <b>Overview of FADA.</b> A privileged oracle is distilled into a deployable Planner–IDM
            student through DAgger-style supervision. The planner predicts short-horizon
            proprioception from the task command and observation history; the IDM maps that future
            to actions. During adaptation, FADA freezes the planner and finetunes only the IDM on a
            few target-domain rollouts.
          </>
        }
      />
    </Section>
  )
}
