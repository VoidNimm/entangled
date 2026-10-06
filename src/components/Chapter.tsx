import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { gsap } from 'gsap';
import type { Chapter as ChapterData } from '../types';
import {
  CHAPTER_ENTER,
  CHAPTER_EXIT,
  CHAPTER_TEXT_MOTION,
  HERO_TEXT_MOTION,
  buildTextTimeline,
  groupByLine,
  playTextIntro,
} from '../animation/textMotion';

interface ChapterProps {
  chapter: ChapterData;
  progress: number;
  reducedMotion?: boolean;
  loading?: boolean;
}

// Fade windows for chapters 1-4 are defined once, in animation/textMotion.ts.
const FADE_IN_START = CHAPTER_ENTER.start;
const FADE_OUT_END = CHAPTER_EXIT.end;
const FADE_OUT_START = CHAPTER_EXIT.start;

/**
 * Hero only: wraps one text element in an "intro slot". The load intro animates the slot
 * while the scroll-scrubbed exit animates the child, so the two never write the same
 * element (which previously left stale transforms behind). Other chapters render the child as-is.
 */
function IntroSlot({ enabled, className, children }: { enabled: boolean; className?: string; children: ReactNode }) {
  return enabled ? <div data-intro className={className}>{children}</div> : <>{children}</>;
}

export function Chapter({ chapter, progress = 0, reducedMotion = false, loading = false }: ChapterProps) {
  const isDarkInitial = chapter.theme === 'dark';
  const isHero = chapter.id === 'hero';

  const containerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useRef(progress);

  // Hero title lines depend on layout: rebuild the per-line timeline when the viewport
  // resizes or the webfont arrives (both can change where lines break).
  const [layoutKey, setLayoutKey] = useState(0);
  useEffect(() => {
    if (!isHero) return;
    let timer: number | undefined;
    let cancelled = false;
    const bump = () => { if (!cancelled) setLayoutKey((k) => k + 1); };
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(bump, 150);
    };
    window.addEventListener('resize', onResize);
    void document.fonts?.ready.then(bump);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [isHero]);

  // Split headline lines logic is simplified: chapters 1-4 animate the headline as one block
  // (no SplitText in the project). The hero splits its title into words (see JSX) and
  // groupByLine() animates them line by line.

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      tlRef.current = tl;

      const els = gsap.utils.toArray<HTMLElement>('.anim-target');

      if (isHero) {
        // Hero: scroll-scrubbed exit only (the intro is time-based, see the intro effect)
        if (!reducedMotion) {
          buildTextTimeline(tl, groupByLine(els), HERO_TEXT_MOTION, gsap.utils.toArray<HTMLElement>('.hero-scrim'));
        }
      } else {
        if (!reducedMotion) {
          // Fade in (progress FADE_IN window) and out (FADE_OUT window) — shared helper
          buildTextTimeline(tl, els, CHAPTER_TEXT_MOTION);
        } else {
          // Reduced motion: just toggle opacity
          tl.set(els, { opacity: 0 }, 0);
          tl.set(els, { opacity: 1 }, FADE_IN_START);
          tl.set(els, { opacity: 0 }, FADE_OUT_START);
        }
      }

      // Theme color switch during progress
      if (chapter.themeSwitchAt) {
        const switchStart = chapter.themeSwitchAt;
        const switchEnd = switchStart + 0.06;
        
        // Text color
        tl.fromTo(containerRef.current, 
          { '--chapter-text': 'var(--color-ink)' }, 
          { '--chapter-text': 'var(--color-ice)', duration: switchEnd - switchStart },
          switchStart
        );
        
        // Eyebrow accent
        tl.fromTo('.eyebrow-accent', 
          { color: '#1F5A9E' }, // cobalt-dark
          { color: '#FF8A3D', duration: switchEnd - switchStart }, // orange
          switchStart
        );
      }

      // A rebuilt timeline (hero re-layout) must resume at the current scroll position
      tl.progress(progressRef.current);
    }, containerRef);

    return () => ctx.revert();
  }, [chapter, isHero, reducedMotion, layoutKey]);

  useEffect(() => {
    progressRef.current = progress;
    if (tlRef.current) {
      // scrub timeline based on 0-1 progress
      tlRef.current.progress(progress);
    }
  }, [progress]);

  // Hero intro: plays ONCE per load, after the loader is gone and fonts are ready.
  // `data-hero-intro` is "pending" (CSS hides the intro slots, no flash) -> "playing" -> "done".
  // Returning to the top never replays it because the state stays "done".
  useEffect(() => {
    const box = containerRef.current;
    if (!isHero || loading || reducedMotion || !box) return;
    if (box.dataset.heroIntro === 'done') return;

    let cancelled = false;
    let intro: gsap.core.Timeline | undefined;
    let capTimer: number | undefined;

    const start = () => {
      if (cancelled) return;
      const slots = Array.from(box.querySelectorAll<HTMLElement>('[data-intro]'));
      intro = playTextIntro(groupByLine(slots), () => { box.dataset.heroIntro = 'done'; });
      // The timeline has already applied its start state inline, so removing the CSS hide is flash-free.
      box.dataset.heroIntro = 'playing';
    };

    // Wait for fonts (no layout shift mid-reveal) but never hang: cap at 1.5 s.
    const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    const cap = new Promise<void>((resolve) => { capTimer = window.setTimeout(resolve, 1500); });
    void Promise.race([fontsReady, cap]).then(start);

    return () => {
      cancelled = true;
      window.clearTimeout(capTimer);
      intro?.revert();
    };
  }, [isHero, loading, reducedMotion]);

  const zone = chapter.textZone || 'left';
  
  // Safe sizing rules
  // width: min(34rem, 38vw) desktop. mobile: auto.
  // safe margin: clamp(1.5rem, 4vw, 4rem)
  const isRight = zone === 'right';
  
  // Scrim for mobile
  const scrimBg = chapter.bg;

  // Accessibility visibility (Task 3). The hero is NOT thresholded here: its elements hide
  // themselves (autoAlpha) exactly when their scrubbed opacity reaches 0, so there is no hard cut.
  const isVisible = reducedMotion || isHero || (progress > FADE_IN_START - 0.05 && progress < FADE_OUT_END + 0.05);

  const TitleTag = isHero ? 'h1' : 'h2';

  return (
    <div
      ref={containerRef}
      data-hero-intro={isHero ? (reducedMotion ? 'done' : 'pending') : undefined}
      className={`absolute inset-0 flex flex-col justify-end md:justify-center transition-opacity duration-300`}
      style={{
        pointerEvents: progress > 0.05 && progress < 0.95 ? 'auto' : 'none',
        // default text color unless overridden by GSAP
        '--chapter-text': isDarkInitial && !chapter.themeSwitchAt ? 'var(--color-ice)' : 'var(--color-ink)',
        visibility: isVisible ? 'visible' : 'hidden',
      } as React.CSSProperties}
    >
      <div 
        className={`
          relative w-full md:w-[min(30rem,48vw)] lg:w-[min(34rem,38vw)] max-w-[calc(100vw-2*clamp(1.5rem,4vw,4rem))]
          mx-auto md:mx-0 
          px-[clamp(1.5rem,4vw,4rem)] md:px-0
          pb-[env(safe-area-inset-bottom,2rem)] md:pb-0
          ${isRight ? 'md:ml-auto md:mr-[clamp(1.5rem,4vw,4rem)] lg:mr-[max(4rem,calc((100vw-1600px)/2+4rem))]' : 'md:ml-[clamp(1.5rem,4vw,4rem)] lg:ml-[max(4rem,calc((100vw-1600px)/2+4rem))]'}
          flex flex-col
          md:items-start md:text-left
          items-center text-center
        `}
      >
        {/* Mobile scrim behind text */}
        <div 
          className={`${isHero ? 'hero-scrim ' : ''}absolute inset-0 md:hidden -z-10 pointer-events-none opacity-80`}
          style={{
            background: `linear-gradient(to top, ${scrimBg} 60%, transparent 100%)`,
            margin: '0 -2rem -4rem -2rem',
          }}
        />
        
        {/* Desktop scrim behind text to guarantee contrast on dark chapters (Heat, Stillness) */}
        {chapter.theme === 'dark' && (
          <div 
            className="hidden md:block absolute inset-0 -z-10 pointer-events-none opacity-90"
            style={{
              background: `radial-gradient(ellipse at ${isRight ? '100%' : '0%'} 50%, ${scrimBg} 0%, transparent 70%)`,
              margin: '-20vw',
              borderRadius: '50%',
            }}
          />
        )}

        {(!isHero || chapter.eyebrow) && (
          <IntroSlot enabled={isHero}>
            <p
              className="anim-target eyebrow-accent font-semibold uppercase mb-4 md:mb-6 text-[clamp(0.75rem,0.8vw,0.95rem)] tracking-[0.18em]"
              style={{
                color: isDarkInitial && !chapter.themeSwitchAt ? '#FF8A3D' : '#1F5A9E',
              }}
            >
              {chapter.eyebrow}
            </p>
          </IntroSlot>
        )}

        <TitleTag
          id={`${chapter.id}-title`}
          className={`${isHero ? '' : 'anim-target '}font-extrabold uppercase mb-6 md:mb-8 text-[clamp(2rem,9.5vw,3.25rem)] md:text-[clamp(2.25rem,4.6vw,5.5rem)] short:text-[clamp(1.5rem,5.5vh,2.5rem)] 3xl:text-[5.5rem]`}
          style={{
            lineHeight: 0.98,
            letterSpacing: '-0.035em',
            textWrap: 'balance',
            overflowWrap: 'normal',
            hyphens: 'none',
            color: 'var(--chapter-text)',
          }}
        >
          {isHero
            ? // Hero title is split into words so the intro (outer slot) and the scroll exit
              // (inner .anim-target) can animate it line by line without touching the same element.
              chapter.title.split(' ').map((word, i, words) => (
                <Fragment key={`${word}-${i}`}>
                  <span data-intro className="inline-block">
                    <span className="anim-target inline-block">{word}</span>
                  </span>
                  {i < words.length - 1 ? ' ' : null}
                </Fragment>
              ))
            : chapter.title}
        </TitleTag>

        <IntroSlot enabled={isHero}>
          <p
            className={`anim-target font-medium text-[1rem] md:text-[clamp(1rem,1.15vw,1.25rem)] ${isHero ? 'max-w-[34ch] md:max-w-[26ch]' : 'max-w-[34ch]'} short:line-clamp-2`}
            style={{
              lineHeight: 1.55,
              textWrap: isHero ? 'balance' : undefined,
              // Hero: 85% text alpha lives in the colour, because the scrubbed exit owns the element's opacity.
              color: isHero ? 'color-mix(in srgb, var(--chapter-text) 85%, transparent)' : 'var(--chapter-text)',
              opacity: isHero ? undefined : 0.85,
            }}
          >
            {chapter.body}
          </p>
        </IntroSlot>

        {isHero && (
          <IntroSlot enabled className="w-full">
            <div className="anim-target mt-16 flex items-center justify-center md:justify-start gap-3 w-full" aria-hidden="true">
              <div
                className="w-px h-10 opacity-50 animate-pulse"
                style={{ background: 'var(--color-cobalt)' }}
              />
              <span className="text-[0.6875rem] font-semibold tracking-[0.2em] uppercase opacity-60" style={{ color: 'var(--chapter-text)' }}>
                Scroll
              </span>
            </div>
          </IntroSlot>
        )}

        {chapter.id === 'stillness' && (
          <footer className="anim-target mt-10 flex flex-col items-center md:items-start gap-6 w-full pointer-events-auto">
            <button
              type="button"
              className="font-medium uppercase tracking-[0.08em] underline underline-offset-4 bg-transparent border-none cursor-pointer transition-opacity [@media(hover:hover)]:hover:opacity-100 opacity-70 flex items-center justify-center"
              style={{ 
                color: 'var(--color-ice)', 
                fontFamily: 'var(--font-sans)',
                minHeight: '44px',
                minWidth: '44px',
                fontSize: 'clamp(0.875rem, 1vw, 1rem)'
              }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Start over
            </button>
            <div className="flex gap-6 font-medium uppercase tracking-wider opacity-50">
              <a href="#" className="[@media(hover:hover)]:hover:opacity-100 transition-opacity flex items-center justify-center" style={{ color: 'var(--chapter-text)', minHeight: '44px', minWidth: '44px', fontSize: 'clamp(0.75rem, 0.8vw, 0.875rem)' }}>Email</a>
              <a href="#" className="[@media(hover:hover)]:hover:opacity-100 transition-opacity flex items-center justify-center" style={{ color: 'var(--chapter-text)', minHeight: '44px', minWidth: '44px', fontSize: 'clamp(0.75rem, 0.8vw, 0.875rem)' }}>Twitter</a>
              <a href="#" className="[@media(hover:hover)]:hover:opacity-100 transition-opacity flex items-center justify-center" style={{ color: 'var(--chapter-text)', minHeight: '44px', minWidth: '44px', fontSize: 'clamp(0.75rem, 0.8vw, 0.875rem)' }}>LinkedIn</a>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
