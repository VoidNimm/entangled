/**
 * DebugOverlay — toggle with the "d" key.
 * Shows: active chapter, per-chapter progress, video currentTime vs target,
 * and the rAF loop fps.
 *
 * Removable: set ENABLE_DEBUG = false or delete this file + its import.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter } from '../types';

/** Master kill switch — set to false to remove all debug rendering */
const ENABLE_DEBUG = true;

interface DebugOverlayProps {
  activeChapterId: Chapter['id'];
  chapterProgress: Record<Chapter['id'], number>;
}

export function DebugOverlay({ activeChapterId, chapterProgress }: DebugOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [fps, setFps] = useState(0);

  // FPS counter using rAF timestamps
  const frameTimesRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const measureFps = useCallback(function measureFps(now: number) {
    const frames = frameTimesRef.current;
    frames.push(now);
    // Keep only the last 60 timestamps (≈1 second at 60fps)
    while (frames.length > 60) frames.shift();
    if (frames.length > 1) {
      const elapsed = frames[frames.length - 1] - frames[0];
      if (elapsed > 0) {
        setFps(Math.round(((frames.length - 1) / elapsed) * 1000));
      }
    }
    rafRef.current = requestAnimationFrame(measureFps);
  }, []);

  useEffect(() => {
    if (!ENABLE_DEBUG) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Don't toggle when typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Start/stop FPS measurement when overlay visibility changes
  useEffect(() => {
    if (visible) {
      rafRef.current = requestAnimationFrame(measureFps);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, measureFps]);

  if (!ENABLE_DEBUG || !visible) return null;

  const chapterIds: Chapter['id'][] = ['hero', 'noise', 'unravel', 'heat', 'stillness'];

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.85)',
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '12px 16px',
        borderRadius: 8,
        lineHeight: 1.6,
        pointerEvents: 'none',
        minWidth: 260,
      }}
    >
      <div style={{ color: '#ff0', fontWeight: 'bold', marginBottom: 4 }}>
        DEBUG (press &apos;d&apos; to hide)
      </div>
      <div>Active: <span style={{ color: '#0ff' }}>{activeChapterId}</span></div>
      <div>FPS: <span style={{ color: fps < 30 ? '#f00' : '#0f0' }}>{fps}</span></div>
      <div style={{ marginTop: 6, borderTop: '1px solid #333', paddingTop: 6 }}>
        {chapterIds.map((id) => {
          const p = chapterProgress[id] ?? 0;
          const isActive = id === activeChapterId;
          return (
            <div key={id} style={{ opacity: isActive ? 1 : 0.5 }}>
              {isActive ? '▸' : ' '} {id.padEnd(10)} {(p * 100).toFixed(1).padStart(5)}%
            </div>
          );
        })}
      </div>
    </div>
  );
}
