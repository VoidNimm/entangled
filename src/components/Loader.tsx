import { useEffect, useState, useRef } from 'react';
import { useCapabilities } from '../hooks/useCapabilities';

interface LoaderProps {
  onComplete: () => void;
}

export function Loader({ onComplete }: LoaderProps) {
  const { mode } = useCapabilities();
  const isStatic = mode === 'static';
  
  const [displayProgress, setDisplayProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);
  
  const targetProgress = useRef(0);
  const hasFinished = useRef(false);

  useEffect(() => {
    // If bfcache restore, don't show loader (pageshow persisted is handled in App, 
    // but here we can just quickly exit if we somehow detect it, though normally Loader won't remount on bfcache).
    
    let fontScore = 0;
    let imgScore = 0;
    let metaScore = 0;
    let frameScore = 0;
    
    const update = () => {
      if (hasFinished.current) return;
      const newTotal = fontScore + imgScore + metaScore + frameScore;
      if (newTotal > targetProgress.current) {
        targetProgress.current = newTotal;
      }
    };

    // 1. Fonts (20%)
    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontScore = 20;
        update();
      });
    } else {
      fontScore = 20;
      update();
    }

    // 2. Hero Image (30%)
    const img = new Image();
    img.src = '/assets/posters/hero.webp';
    img.decode().then(() => {
      imgScore = 30;
      update();
    }).catch(() => {
      imgScore = 30; // Count it anyway on error
      update();
    });

    // 3. Video metadata (30%) & frame ready (20%)
    if (!isStatic) {
      const vid = document.createElement('video');
      const isMobile = window.innerWidth <= 768; // basic guess, or just load desktop
      vid.src = isMobile ? '/assets/clips/clips01-m.mp4' : '/assets/clips/clips01.mp4';
      vid.preload = 'auto';
      
      vid.addEventListener('loadedmetadata', () => {
        metaScore = 30;
        frameScore = 20; // Skip canplay requirement to improve LCP
        update();
      });
      vid.addEventListener('error', () => {
        metaScore = 30; frameScore = 20; update();
      });
    } else {
      metaScore = 30;
      frameScore = 20;
      update();
    }

    // Hard cap 4s (or 1.5s in static)
    const capTime = isStatic ? 1500 : 4000;
    const timeout = setTimeout(() => {
      targetProgress.current = 100;
    }, capTime);

    return () => clearTimeout(timeout);
  }, [isStatic]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      setDisplayProgress(prev => {
        const next = prev + (targetProgress.current - prev) * 0.1;
        if (next >= 99.9 && targetProgress.current === 100 && !hasFinished.current) {
           hasFinished.current = true;
           setFading(true);
           setTimeout(() => {
             setDone(true);
             onComplete();
           }, isStatic ? 150 : 600);
        }
        return next;
      });
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [onComplete, isStatic]);

  if (done) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity"
      style={{ 
        backgroundColor: 'var(--color-mint)',
        opacity: fading ? 0 : 1,
        transitionDuration: isStatic ? '150ms' : '600ms'
      }}
      role="status"
    >
      <span className="sr-only">Loading</span>
      <div className="flex flex-col items-center">
        <h1 
          className="text-sm font-extrabold uppercase mb-2" 
          style={{ 
             color: 'var(--color-ink)', 
             letterSpacing: '0.06em', 
             fontWeight: 800 
          }}
        >
          Entangled
        </h1>
        <div className="w-32 h-[1px] bg-black/10 overflow-hidden">
          <div 
            className="h-full bg-[var(--color-cobalt)] origin-left"
            style={{ transform: `scaleX(${displayProgress / 100})`, transition: 'transform 0.1s linear' }}
          />
        </div>
      </div>
    </div>
  );
}
