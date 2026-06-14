import { forwardRef } from 'react'
import type { ConditionMeta } from '../../data/types'
import './media.css'

interface Props {
  src: string
  condition: ConditionMeta
  taskLabel: string
  /** Show a subtle "winner" emphasis on the adapted pane. */
  emphasize?: boolean
}

/**
 * A single muted, controls-less video tied to a condition. The parent's
 * useSyncedVideos hook drives playback through the forwarded ref.
 */
export const VideoPane = forwardRef<HTMLVideoElement, Props>(function VideoPane(
  { src, condition, taskLabel, emphasize = false },
  ref,
) {
  const color = `var(${condition.colorVar})`
  return (
    <figure
      className={`vpane ${emphasize ? 'vpane--emph' : ''}`}
      style={{ ['--pane-color' as string]: color }}
    >
      <div className="vpane__frame">
        <video
          ref={ref}
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-label={`${condition.label} — ${taskLabel}`}
          className="vpane__video"
        />
        <span className="vpane__chip">
          <span className="vpane__dot" aria-hidden="true" />
          {condition.shortLabel}
        </span>
      </div>
      <figcaption className="vpane__caption">{condition.blurb}</figcaption>
    </figure>
  )
})
