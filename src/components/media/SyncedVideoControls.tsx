import type { SyncedVideosApi } from '../../lib/useSyncedVideos'
import './media.css'

function formatTime(progress: number, duration: number): string {
  if (!duration || !isFinite(duration)) return '0:00'
  const t = progress * duration
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SyncedVideoControls({ api }: { api: SyncedVideosApi }) {
  const { state, playPause, seekToFraction, restart, toggleMute } = api

  return (
    <div className="vcontrols" role="group" aria-label="Synchronized video controls">
      <button
        type="button"
        className="vcontrols__btn vcontrols__btn--primary"
        onClick={playPause}
        aria-pressed={state.playing}
        aria-label={state.playing ? 'Pause all videos' : 'Play all videos'}
      >
        {state.playing ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 5l12 7-12 7z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        className="vcontrols__btn"
        onClick={restart}
        aria-label="Restart all videos"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <input
        type="range"
        className="vcontrols__scrub"
        min={0}
        max={1000}
        value={Math.round(state.progress * 1000)}
        onChange={(e) => seekToFraction(Number(e.target.value) / 1000)}
        aria-label="Seek"
        aria-valuetext={formatTime(state.progress, state.duration)}
      />

      <span className="vcontrols__time">
        {formatTime(state.progress, state.duration)} / {formatTime(1, state.duration)}
      </span>

      <button
        type="button"
        className="vcontrols__btn"
        onClick={toggleMute}
        aria-pressed={!state.muted}
        aria-label={state.muted ? 'Unmute' : 'Mute'}
      >
        {state.muted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  )
}
