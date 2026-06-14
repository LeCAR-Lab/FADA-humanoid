import { useEffect } from 'react'
import type { TaskMeta } from '../../data/types'
import { CONDITIONS, videoPath } from '../../data/videos'
import { useSyncedVideos } from '../../lib/useSyncedVideos'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import { VideoPane } from './VideoPane'
import { SyncedVideoControls } from './SyncedVideoControls'
import './media.css'

/**
 * Three condition videos for one task, played in frame-sync with a single
 * transport bar. Switching the task (via the `task` prop) reloads all three.
 */
export function SyncedVideoTrio({ task }: { task: TaskMeta }) {
  const reducedMotion = usePrefersReducedMotion()
  const api = useSyncedVideos(CONDITIONS.length, { loop: true, autoplayInView: true, reducedMotion })

  // On task change, the <video src> attributes update; reload + resync.
  useEffect(() => {
    api.resync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  return (
    <div className="vtrio" ref={api.containerRef}>
      <div className="vtrio__grid">
        {CONDITIONS.map((condition, i) => (
          <VideoPane
            key={condition.id}
            ref={api.refs[i]}
            src={videoPath(task.id, condition)}
            condition={condition}
            taskLabel={`${task.robot} ${task.label}`}
            emphasize={condition.id === 'fada'}
          />
        ))}
      </div>
      <SyncedVideoControls api={api} />
    </div>
  )
}
