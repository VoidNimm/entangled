/**
 * ProgressRail — fixed right-edge progress indicator with:
 *   - Lerped fill line that tracks overall scroll progress
 *   - Dots that scale up slightly when active (transform only)
 *   - Counter showing current/total chapter
 *
 * All animations use transform/opacity only for compositing perf.
 */
import { useEffect, useRef } from 'react';
import type { Chapter } from '../types';
import type Lenis from 'lenis';

interface ProgressRailProps {
  chapters: readonly Chapter[];
  activeId: Chapter['id'];
  dark: boolean;
  lenis: Lenis | null;
}

export function ProgressRail({ chapters, activeId, dark, lenis }: ProgressRailProps) {
  const activeChapter = chapters.find((c) => c.id === activeId);
  const totalCount = chapters.length;
  const activeIndex = (activeChapter?.index ?? 0) + 1;

  const fillRef = useRef<HTMLDivElement>(null);
  // Lerp state for smooth fill — ref so it doesn't trigger re-renders.
  const currentFill = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!lenis) return;

    let targetFill = 0;

    const handleScroll = (e: { progress: number }) => {
      targetFill = e.progress;
    };
    lenis.on('scroll', handleScroll);

    // Lerp loop: smoothly interpolate fill toward target.
    const tick = () => {
      const diff = Math.abs(targetFill - currentFill.current);
      if (diff > 0.001) {
        currentFill.current += (targetFill - currentFill.current) * 0.12;
        if (fillRef.current) {
          fillRef.current.style.transform = `scaleY(${currentFill.current})`;
          // provide variable to the thread SVG
          fillRef.current.parentElement?.parentElement?.style.setProperty('--scroll-progress', currentFill.current.toString());
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      lenis.off('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [lenis]);

  const dotColor = dark ? 'var(--color-orange)' : 'var(--color-cobalt)';
  const dotEmpty = dark ? 'rgba(230,244,241,0.3)' : 'rgba(10,10,10,0.2)';
  const textColor = dark ? 'var(--color-ice)' : 'var(--color-ink)';

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(`#${id}`);
    } else {
      document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="fixed right-6 md:right-14 bottom-8 z-50 flex-col items-center gap-5 transition-colors duration-500 hidden md:flex"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
      aria-hidden="true"
    >
      {/* Dot rail */}
      <div className="relative flex flex-col items-center short:hidden">
        {/* Background line */}
        <div
          className="absolute top-0 bottom-0 w-[1px]"
          style={{ backgroundColor: dotEmpty }}
        />

        {/* Fill line — lerped via rAF */}
        <div
          ref={fillRef}
          className="absolute top-0 bottom-0 w-[1px] origin-top"
          style={{ backgroundColor: dotColor, transform: 'scaleY(0)' }}
        />

        <ol className="relative z-10 flex flex-col items-center gap-8 py-2" aria-label="Chapter dots">
          {chapters.map((chapter) => {
            const isActive = chapter.id === activeId;
            return (
              <li key={chapter.id}>
                <a
                  href={`#${chapter.id}`}
                  onClick={(e) => handleNav(e, chapter.id)}
                  aria-label={`Go to chapter: ${chapter.label}`}
                  aria-current={isActive ? 'step' : undefined}
                  tabIndex={-1}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: isActive ? dotColor : (dark ? 'var(--color-void)' : 'var(--color-mint)'),
                      border: `1.5px solid ${isActive ? dotColor : dotEmpty}`,
                      // Scale up slightly when active (transform only — no layout)
                      transform: isActive ? 'scale(1.3)' : 'scale(1)',
                      transition: 'transform 300ms ease, background 300ms ease, border-color 300ms ease',
                    }}
                  />
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Counter and Thread */}
      <div className="flex items-center gap-3">
        {/* Thread indicator */}
        <div className="relative w-[16px] h-[32px] overflow-hidden short:scale-75 origin-right" aria-hidden="true">
          {/* Tangled path (fades out as we scroll) */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 16 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ 
              color: dotColor,
              opacity: `max(0, 1 - var(--scroll-progress, 0) * 1.5)`,
              transition: 'opacity 0.1s'
            }}
          >
            <path d="M8 0 C 16 8, 0 16, 8 24 C 16 28, 8 32, 8 32" />
          </svg>
          {/* Straight path (fades in as we scroll) */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 16 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ 
              color: dotColor,
              opacity: `min(1, var(--scroll-progress, 0) * 1.5)`,
              transition: 'opacity 0.1s'
            }}
          >
            <path d="M8 0 L8 32" />
          </svg>
        </div>

        <p
          className="text-[0.6875rem] font-semibold tracking-[0.12em] tabular-nums transition-colors duration-500"
          style={{ color: textColor, opacity: 0.6, writingMode: 'horizontal-tb' }}
        >
          {String(activeIndex).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
