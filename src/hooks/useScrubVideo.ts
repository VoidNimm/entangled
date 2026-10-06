/**
 * useScrubVideo - scrubs a <video> element's currentTime to match
 * a 0->1 scroll progress value, using rAF + lerp for smooth sub-frame
 * interpolation instead of jerky direct-set on every scroll event.
 *
 * Why lerp? Setting currentTime directly on each scroll event produces
 * visible stuttering because scroll events arrive in bursts. Lerp lets
 * the visual position ease toward the target over several frames.
 *
 * Why skip small seeks? Seeking (even on all-keyframe video) has overhead.
 * If the difference is under half a frame, the eye can't see it anyway.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollProgress } from '../types';

interface UseScrubVideoOptions {
  /** Scroll progress 0-1 within the chapter */
  progress: ScrollProgress;
  /** Lerp factor for smoothing (default 0.1) */
  lerpFactor?: number;
  /** Whether this clip should be actively scrubbing (default true) */
  active?: boolean;
}

interface UseScrubVideoReturn {
  /** Attach this ref to the <video> element */
  videoRef: React.RefCallback<HTMLVideoElement>;
  /** True once loadedmetadata has fired and duration is valid */
  ready: boolean;
}

/** Linear interpolation: glide from `a` toward `b` by factor `t` */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function useScrubVideo({
  progress,
  lerpFactor = 0.1,
  active = true,
}: UseScrubVideoOptions): UseScrubVideoReturn {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);

  // Mutable refs for rAF state - never trigger re-renders.
  const rafIdRef = useRef(0);
  const currentTimeRef = useRef(0);
  const targetTimeRef = useRef(0);

  // Keep progress in a ref so the rAF loop always reads the latest
  // value without needing to restart the loop on every render.
  const progressRef = useRef(progress);
  const activeRef = useRef(active);
  const lerpRef = useRef(lerpFactor);

  useEffect(() => {
    progressRef.current = progress;
    activeRef.current = active;
    lerpRef.current = lerpFactor;
  }, [progress, active, lerpFactor]);
  // ---- metadata handler ----
  const onLoadedMetadata = useCallback(() => {
    const video = videoElRef.current;
    if (!video) return;
    const d = video.duration;
    // Guard: duration must be a real, finite number.
    if (!Number.isFinite(d) || d <= 0) return;
    setReady(true);
  }, []);

  // ---- ref callback: attaches/detaches loadedmetadata listener ----
  const videoRef: React.RefCallback<HTMLVideoElement> = useCallback(
    (node: HTMLVideoElement | null) => {
      // Detach from previous element
      if (videoElRef.current) {
        videoElRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
      }

      videoElRef.current = node;

      if (node) {
        // If metadata is already loaded (cached video), fire immediately.
        if (node.readyState >= 1 && Number.isFinite(node.duration) && node.duration > 0) {
          setReady(true);
        } else {
          setReady(false);
          node.addEventListener('loadedmetadata', onLoadedMetadata);
        }
        // Ensure the video never plays - we control currentTime manually.
        node.pause();
      } else {
        setReady(false);
      }
    },
    [onLoadedMetadata],
  );

  // ---- rAF scrub loop ----
  useEffect(() => {
    const video = videoElRef.current;
    if (!video || !ready) return;

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;

    // Assume ~30fps source - used to compute the "half-frame" skip threshold.
    const halfFrame = (1 / 30) * 0.5;

    // Initialise current position to where we are.
    currentTimeRef.current = video.currentTime;
    let isHidden = document.hidden;

    const tick = () => {
      if (isHidden) {
        // Pause rAF loop when document is hidden
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      const vid = videoElRef.current;
      if (!vid) return;

      const d = vid.duration;
      if (!Number.isFinite(d) || d <= 0) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      targetTimeRef.current = progressRef.current * d;

      if (activeRef.current) {
        const target = targetTimeRef.current;
        const current = currentTimeRef.current;
        const diff = Math.abs(target - current);

        // Skip seek if the difference is imperceptibly small - avoids
        // thrashing the decoder when the user stops scrolling.
        // Also guard against seek-pile-up: if video.seeking is true and diff is < 1 frame, skip.
        // This does not alter smoothing behavior for large diffs.
        const oneFrame = 1 / 30;
        const seekPileUp = vid.seeking && diff < oneFrame;

        if (diff > halfFrame && !seekPileUp) {
          const next = lerp(current, target, lerpRef.current);
          vid.currentTime = next;
          currentTimeRef.current = next;
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    const handleVisibilityChange = () => {
      isHidden = document.hidden;
      if (!isHidden) {
        // Force sync on return from background
        const vid = videoElRef.current;
        if (vid && activeRef.current) {
          const target = progressRef.current * vid.duration;
          if (Number.isFinite(target) && target >= 0) {
             vid.currentTime = target;
             currentTimeRef.current = target;
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ready]);

  return { videoRef, ready };
}
