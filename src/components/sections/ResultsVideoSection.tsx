import { useState } from 'react'
import { Section } from '../layout/Section'
import { TASKS, TASK_BY_ID } from '../../data/videos'
import { TaskSwitcher } from '../media/TaskSwitcher'
import { SyncedVideoTrio } from '../media/SyncedVideoTrio'
import { ConditionLegend } from '../media/ConditionLegend'

export function ResultsVideoSection() {
  const [activeId, setActiveId] = useState(TASKS[0].id)
  const task = TASK_BY_ID[activeId]

  return (
    <Section
      id="results"
      eyebrow="Hardware"
      title="Real-World Results"
      intro="The same three policies, deployed on the same task. Baseline and zero-shot stumble under the target dynamics; after about two minutes of IDM finetuning, FADA succeeds. Videos play in sync — scrub any one and all three move together."
      tone="dark"
      width="wide"
    >
      <TaskSwitcher tasks={TASKS} activeId={activeId} onChange={setActiveId} />

      <div className="results__head">
        <p className="results__scenario">{task.scenario}</p>
        <ConditionLegend />
      </div>

      <SyncedVideoTrio task={task} />
    </Section>
  )
}
