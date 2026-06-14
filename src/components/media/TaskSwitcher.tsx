import type { TaskMeta } from '../../data/types'
import './media.css'

interface Props {
  tasks: TaskMeta[]
  activeId: string
  onChange: (id: string) => void
}

/**
 * Task selector rendered as a scrollable row of cards. Each card names the
 * robot, the task, and the scenario. Built as an ARIA radiogroup.
 */
export function TaskSwitcher({ tasks, activeId, onChange }: Props) {
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % tasks.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tasks.length) % tasks.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tasks.length - 1
    else return
    e.preventDefault()
    onChange(tasks[next].id)
  }

  return (
    <div className="taskswitch" role="radiogroup" aria-label="Choose a task">
      {tasks.map((t, i) => {
        const active = t.id === activeId
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`taskcard ${active ? 'taskcard--active' : ''}`}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            <span className="taskcard__robot">{t.robot}</span>
            <span className="taskcard__label">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
