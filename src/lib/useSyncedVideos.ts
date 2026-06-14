import { useCallback, useEffect, useRef, useState } from 'react'

const DRIFT_TOLERANCE = 0.08 // seconds before a follower is snapped to the leader
const DRIFT_INTERVAL = 500 // ms between drift checks
const PROGRESS_INTERVAL = 80 // ms between progress UI updates

export interface SyncedVideosState {
  playing: boolean
  muted: boolean
  /** 0..1 progress of the leader. */
  progress: number
  duration: number
  ready: boolean
}

export interface SyncedVideosApi {
  refs: React.RefObject<HTMLVideoElement>[]
  containerRef: React.RefObject<HTMLDivElement>
  state: SyncedVideosState
  playPause: () => void
  play: () => void
  pause: () => void
  seekToFraction: (f: number) => void
  restart: () => void
  toggleMute: () => void
  /** Call after the source set changes (e.g. task switch). */
  resync: () => void
}

interface Options {
  loop?: boolean
  /** Autoplay (muted) when scrolled into view; pause when out. */
  autoplayInView?: boolean
  reducedMotion?: boolean
}

/**
 * Drive N <video> elements as one synchronized group.
 *
 * Index 0 is the timeline "leader": the scrubber and progress reflect it, and
 * looping is driven off its `ended` event. Followers are imperatively snapped
 * back to the leader's currentTime whenever they drift past a small tolerance,
 * which keeps three independent decoders frame-aligned without per-frame work.
 */
export function useSyncedVideos(count: number, options: Options = {}): SyncedVideosApi {
  const { loop = true, autoplayInView = true, reducedMotion = false } = options

  // Stable refs array (count is constant for a given trio).
  const refsRef = useRef<React.RefObject<HTMLVideoElement>[]>([])
  if (refsRef.current.length !== count) {
    refsRef.current = Array.from({ length: count }, () => ({ current: null }))
  }
  const refs = refsRef.current
  const containerRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<SyncedVideosState>({
    playing: false,
    muted: true,
    progress: 0,
    duration: 0,
    ready: false,
  })

  // Track intent across scroll in/out so we only auto-resume what was playing.
  const wasPlayingRef = useRef(false)
  const intersectingRef = useRef(false)

  const leader = useCallback(() => refs[0]?.current ?? null, [refs])
  const eachVideo = useCallback(
    (fn: (v: HTMLVideoElement, i: number) => void) => {
      refs.forEach((r, i) => {
        if (r.current) fn(r.current, i)
      })
    },
    [refs],
  )

  const play = useCallback(() => {
    eachVideo((v) => {
      const p = v.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    })
    wasPlayingRef.current = true
    setState((s) => ({ ...s, playing: true }))
  }, [eachVideo])

  const pause = useCallback(() => {
    eachVideo((v) => v.pause())
    wasPlayingRef.current = false
    setState((s) => ({ ...s, playing: false }))
  }, [eachVideo])

  const playPause = useCallback(() => {
    if (state.playing) pause()
    else play()
  }, [state.playing, play, pause])

  const seekToFraction = useCallback(
    (f: number) => {
      const l = leader()
      if (!l || !l.duration) return
      const t = Math.max(0, Math.min(1, f)) * l.duration
      eachVideo((v) => {
        v.currentTime = Math.min(t, v.duration || t)
      })
      setState((s) => ({ ...s, progress: f }))
    },
    [eachVideo, leader],
  )

  const restart = useCallback(() => {
    eachVideo((v) => {
      v.currentTime = 0
    })
    setState((s) => ({ ...s, progress: 0 }))
    play()
  }, [eachVideo, play])

  const toggleMute = useCallback(() => {
    setState((s) => {
      const muted = !s.muted
      eachVideo((v) => {
        v.muted = muted
      })
      return { ...s, muted }
    })
  }, [eachVideo])

  const resync = useCallback(() => {
    eachVideo((v) => {
      v.currentTime = 0
      v.load()
    })
    setState((s) => ({ ...s, progress: 0, ready: false }))
    if (wasPlayingRef.current && intersectingRef.current) {
      // small delay to let metadata reload
      window.setTimeout(() => play(), 60)
    }
  }, [eachVideo, play])

  // ---- Leader-driven progress + loop + metadata ----
  useEffect(() => {
    const l = leader()
    if (!l) return

    let lastProgressUpdate = 0
    const onTimeUpdate = () => {
      const now = performance.now()
      if (now - lastProgressUpdate < PROGRESS_INTERVAL) return
      lastProgressUpdate = now
      if (l.duration) setState((s) => ({ ...s, progress: l.currentTime / l.duration }))
    }
    const onLoadedMeta = () => {
      setState((s) => ({ ...s, duration: l.duration, ready: true }))
    }
    const onEnded = () => {
      if (loop) {
        eachVideo((v) => {
          v.currentTime = 0
        })
        if (wasPlayingRef.current) play()
      } else {
        setState((s) => ({ ...s, playing: false }))
      }
    }

    l.addEventListener('timeupdate', onTimeUpdate)
    l.addEventListener('loadedmetadata', onLoadedMeta)
    l.addEventListener('ended', onEnded)
    if (l.readyState >= 1) onLoadedMeta()

    return () => {
      l.removeEventListener('timeupdate', onTimeUpdate)
      l.removeEventListener('loadedmetadata', onLoadedMeta)
      l.removeEventListener('ended', onEnded)
    }
  }, [leader, loop, eachVideo, play])

  // ---- Drift correction ----
  useEffect(() => {
    if (!state.playing) return
    const id = window.setInterval(() => {
      const l = leader()
      if (!l) return
      refs.forEach((r, i) => {
        if (i === 0 || !r.current) return
        if (Math.abs(r.current.currentTime - l.currentTime) > DRIFT_TOLERANCE) {
          r.current.currentTime = l.currentTime
        }
      })
    }, DRIFT_INTERVAL)
    return () => window.clearInterval(id)
  }, [state.playing, leader, refs])

  // ---- IntersectionObserver: autoplay in view, pause out of view ----
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          if (autoplayInView && !reducedMotion && !wasPlayingRef.current) {
            play()
          } else if (wasPlayingRef.current) {
            play()
          }
        } else {
          // pause without clearing intent, so we can resume on return
          const intent = wasPlayingRef.current
          eachVideo((v) => v.pause())
          setState((s) => ({ ...s, playing: false }))
          wasPlayingRef.current = intent
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [autoplayInView, reducedMotion, play, eachVideo])

  return {
    refs,
    containerRef,
    state,
    playPause,
    play,
    pause,
    seekToFraction,
    restart,
    toggleMute,
    resync,
  }
}
