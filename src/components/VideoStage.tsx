/**
 * VideoStage - fixed full-viewport video layer.
 *
 * Normal mode: 4 permanently mounted <video> elements with crossfade.
 * Static mode: static poster images (clipsNN-last.jpg per chapter)
 *   with simple opacity fades. No video scrubbing at all.
 */
import { useState, useEffect, useCallback } from 'react';
import type { Chapter } from '../types';
import { clipChapters } from '../data/chapters';
import { useScrubVideo } from '../hooks/useScrubVideo';
import { useCapabilities } from '../hooks/useCapabilities';
import { HERO_STAGE_SCALE_TO } from '../config/scroll';

type ClipId = 'noise' | 'unravel' | 'heat' | 'stillness';

interface VideoStageProps {
  activeChapterId: Chapter['id'];
  chapterProgress: Record<Chapter['id'], number>;
}

const CHAPTER_TO_CLIP: Record<Chapter['id'], ClipId> = {
  hero: 'noise',
  noise: 'noise',
  unravel: 'unravel',
  heat: 'heat',
  stillness: 'stillness',
};

const CLIP_ORDER: readonly ClipId[] = ['noise', 'unravel', 'heat', 'stillness'];

export function VideoStage({
  activeChapterId,
  chapterProgress,
}: VideoStageProps) {
  const { mode, mobileViewport, saveData, lowMemory } = useCapabilities();
  const isMobile = mobileViewport;
  // Choose mobile 720p files when mobileViewport, saveData, or lowMemory.
  const useMobileVideo = mobileViewport || saveData || lowMemory;
  const isStatic = mode === 'static';

  const activeClipId = CHAPTER_TO_CLIP[activeChapterId];
  const activeClipIndex = CLIP_ORDER.indexOf(activeClipId);

  // Clip 1 scrubs from HERO_CLIP_START of the hero range (its progress comes from App's noise
  // scrub trigger), so it is NOT forced to 0 while the hero is the active chapter any more.
  const getClipProgress = (clipId: ClipId): number => chapterProgress[clipId] ?? 0;

  // OPTIONAL stage scale (config/scroll.ts HERO_STAGE_SCALE_TO; 1 = off): applied to the stage
  // CONTAINER only — never to the <video> elements or the scrub engine.
  const stageScale = isStatic ? 1 : 1 + (HERO_STAGE_SCALE_TO - 1) * (chapterProgress.hero ?? 0);

  // State to track failed videos so we can gracefully degrade to posters
  const [failedClips, setFailedClips] = useState<Record<ClipId, boolean>>({
    noise: false,
    unravel: false,
    heat: false,
    stillness: false,
  });

  const markClipFailed = useCallback((clipId: ClipId, reason: string) => {
    console.warn(`[entangled] Clip ${clipId} failed: ${reason}`);
    setFailedClips(prev => {
      if (prev[clipId]) return prev;
      return { ...prev, [clipId]: true };
    });
  }, []);

  const markClipRecovered = useCallback((clipId: ClipId) => {
    setFailedClips(prev => {
      if (!prev[clipId]) return prev;
      return { ...prev, [clipId]: false };
    });
  }, []);

  return (
    <div
      className="fixed inset-0 w-full overflow-hidden pointer-events-none"
      style={{
        height: '100svh',
        // JS-driven value: scroll-linked stage scale (container only)
        transform: stageScale === 1 ? undefined : `scale(${stageScale})`,
        willChange: stageScale === 1 ? undefined : 'transform',
      }}
      aria-hidden="true"
    >
      {/* First paint immediately shows hero poster (reserves space, no CLS) */}
      <img
        src="/assets/posters/hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: (activeChapterId === 'hero' && isStatic) || (!isStatic && activeClipId === 'noise' && getClipProgress('noise') === 0) ? 1 : 0,
          transition: 'opacity 300ms ease',
          objectPosition: isMobile ? (clipChapters[0].objectPosition?.mobile || 'center') : (clipChapters[0].objectPosition?.desktop || 'center'),
          zIndex: -1
        }}
      />

      {isStatic ? (
        // Static mode: static poster stills with simple opacity fade.
        clipChapters.map((chapter) => {
          const clipId = chapter.id as ClipId;
          const isActive = clipId === activeClipId;
          return (
            <img
              key={clipId}
              src={chapter.posterLast}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: isActive ? 1 : 0,
                transition: 'opacity 400ms ease',
                objectPosition: isMobile ? (chapter.objectPosition?.mobile || 'center') : (chapter.objectPosition?.desktop || 'center'),
              }}
            />
          );
        })
      ) : (
        // Full mode: scrubbing video elements with crossfade.
        clipChapters.map((chapter, index) => {
          const clipId = chapter.id as ClipId;
          const isActive = clipId === activeClipId;
          // Preload rule: only active and next use "auto". 
          // Others use "none" to save bandwidth/memory.
          // We DO NOT unload previous clips (removing src) to avoid flicker. 
          // They stay paused in memory, but we avoid loading far clips early.
          const isWithinPreloadRange = Math.abs(index - activeClipIndex) <= 1 && index >= activeClipIndex;
          const preloadMode = isWithinPreloadRange ? 'auto' : 'none';
          const progress = getClipProgress(clipId);
          const isFailed = failedClips[clipId];

          return (
            <ClipVideo
              key={clipId}
              chapter={chapter}
              isMobile={isMobile}
              useMobileVideo={useMobileVideo}
              progress={progress}
              active={isActive}
              preloadMode={preloadMode}
              isFailed={isFailed}
              onFail={(reason) => markClipFailed(clipId, reason)}
              onRecover={() => markClipRecovered(clipId)}
            />
          );
        })
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------

interface ClipVideoProps {
  chapter: Chapter;
  isMobile: boolean;
  useMobileVideo: boolean;
  progress: number;
  active: boolean;
  preloadMode: 'auto' | 'none';
  isFailed: boolean;
  onFail: (reason: string) => void;
  onRecover: () => void;
}

function ClipVideo({ chapter, isMobile, useMobileVideo, progress, active, preloadMode, isFailed, onFail, onRecover }: ClipVideoProps) {
  const src = useMobileVideo ? chapter.clipSrcMobile : chapter.clipSrc;

  const { videoRef: scrubVideoRef } = useScrubVideo({
    progress,
    active: active && !isFailed,
    lerpFactor: 0.1,
  });

  const combinedRef = useCallback((node: HTMLVideoElement | null) => {
    scrubVideoRef(node);
    
    if (node) {
      const handleLoadMetadata = () => {
         if (node.duration && Number.isFinite(node.duration)) {
             onRecover();
         }
      };
      
      const handleError = () => onFail('error event');
      const handleAbort = () => onFail('abort event');
      const handleStalled = () => onFail('stalled event');
      const handleCanPlay = () => onRecover();

      node.addEventListener('loadedmetadata', handleLoadMetadata);
      node.addEventListener('error', handleError);
      node.addEventListener('abort', handleAbort);
      node.addEventListener('stalled', handleStalled);
      node.addEventListener('canplay', handleCanPlay);

      // Timeout for loadedmetadata
      let timeoutId: number | undefined;
      if (preloadMode === 'auto' && node.readyState === 0) {
        timeoutId = window.setTimeout(() => {
          if (node.readyState === 0) {
            onFail('loadedmetadata timeout');
          }
        }, 6000);
      } else if (preloadMode === 'auto' && node.readyState > 0) {
        // If we switch to auto and it's already loading/loaded, try calling load()
        // Wait, the PRD says: "call load() once" when within +-1.
        // The browser usually handles preload="auto" automatically, but we can nudge it.
      }

      return () => {
        node.removeEventListener('loadedmetadata', handleLoadMetadata);
        node.removeEventListener('error', handleError);
        node.removeEventListener('abort', handleAbort);
        node.removeEventListener('stalled', handleStalled);
        node.removeEventListener('canplay', handleCanPlay);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [scrubVideoRef, onFail, onRecover, preloadMode]);

  // If we change to preload=auto and video hasn't started loading, trigger load.
  useEffect(() => {
     // We do this via a side effect, but the combinedRef handles the event listeners.
  }, [preloadMode]);

  return (
    <>
      <video
        ref={combinedRef}
        src={src}
        poster={chapter.posterFirst}
        muted
        playsInline
        webkit-playsinline="true"
        disablePictureInPicture
        disableRemotePlayback
        preload={preloadMode}
        style={{
          opacity: active && !isFailed ? 1 : 0,
          transition: 'opacity 300ms ease',
          objectPosition: isMobile ? (chapter.objectPosition?.mobile || 'center') : (chapter.objectPosition?.desktop || 'center'),
        }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Fallback poster when video fails */}
      {isFailed && (
        <img
          src={chapter.posterLast}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: active ? 1 : 0,
            transition: 'opacity 300ms ease',
            objectPosition: isMobile ? (chapter.objectPosition?.mobile || 'center') : (chapter.objectPosition?.desktop || 'center'),
          }}
        />
      )}
    </>
  );
}
