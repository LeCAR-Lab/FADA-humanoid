import { forwardRef, useState } from 'react'
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
 *
 * The frame adopts the video's real aspect ratio once metadata loads, so
 * portrait clips (e.g. G1 payload locomotion, 9:16) are shown in full with
 * object-fit: contain rather than being cropped to a fixed landscape box.
 */
export const VideoPane = forwardRef<HTMLVideoElement, Props>(function VideoPane(
  { src, condition, taskLabel, emphasize = false },
  ref,
) {
  const color = `var(${condition.colorVar})`
  const [ratio, setRatio] = useState<number | null>(null)

  return (
    <figure
      className={`vpane ${emphasize ? 'vpane--emph' : ''} ${
        ratio != null && ratio < 1 ? 'vpane--portrait' : ''
      }`}
      style={{ ['--pane-color' as string]: color }}
    >
      <div className="vpane__frame" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
        <video
          ref={ref}
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-label={`${condition.label} — ${taskLabel}`}
          className="vpane__video"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget
            if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
          }}
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
