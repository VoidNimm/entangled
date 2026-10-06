import { useCallback, useEffect, useRef, useState, Component, lazy, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapters } from './data/chapters';
import { Nav } from './components/Nav';
import { VideoStage } from './components/VideoStage';
import { Chapter } from './components/Chapter';
import { ProgressRail } from './components/ProgressRail';
// Lazy load DebugOverlay
const DebugOverlay = lazy(() => import('./components/DebugOverlay').then(m => ({ default: m.DebugOverlay })));
import { GrainOverlay } from './components/GrainOverlay';
import { Loader } from './components/Loader';
import { useLenis } from './hooks/useLenis';
import { useCapabilities } from './hooks/useCapabilities';
import type { Chapter as ChapterData } from './types';
import { CHAPTER_SCROLL_VH, HERO_CLIP_START, HERO_HANDOFF, HERO_SCROLL_VH } from './config/scroll';

gsap.registerPlugin(ScrollTrigger);

// ignoreMobileResize prevents ScrollTrigger from recalculating positions every time the 
// URL bar shows/hides on mobile scroll, which would cause jumping during video scrub.
ScrollTrigger.config({ ignoreMobileResize: true });

if (typeof history !== 'undefined') {
  history.scrollRestoration = 'manual';
}

const CHAPTER_IDS: readonly ChapterData['id'][] = [
  'hero', 'noise', 'unravel', 'heat', 'stillness',
];

function makeInitialProgress(): Record<ChapterData['id'], number> {
  return { hero: 0, noise: 0, unravel: 0, heat: 0, stillness: 0 };
}

interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

const LazyErrorFallback = lazy(() => import('./components/ErrorFallback'));

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[entangled] Crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Suspense fallback={<div style={{backgroundColor: '#DCEBE3', width: '100vw', height: '100vh'}} />}>
          <LazyErrorFallback />
        </Suspense>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const { mode } = useCapabilities();
  const isStatic = mode === 'static';
  const { lenis } = useLenis();

  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<ChapterData['id']>('hero');
  const [progresses, setProgresses] = useState<Record<ChapterData['id'], number>>(makeInitialProgress());

  // Error boundary test
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('crash') === '1') {
    throw new Error('Test crash');
  }

  const handleLoaderComplete = useCallback(() => {
    setLoading(false);
    // Deep link scroll
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      if ((CHAPTER_IDS as readonly string[]).includes(id)) {
        setTimeout(() => {
          if (lenis) {
            lenis.scrollTo(`#${id}`, { immediate: true });
          } else {
            document.querySelector(`#${id}`)?.scrollIntoView();
          }
        }, 50); // slight delay to let layout settle
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [lenis]);

  useEffect(() => {
    if (loading) {
      if (lenis) lenis.stop();
      document.body.style.overflow = 'hidden';
    } else {
      if (lenis) lenis.start();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    }
  }, [loading, lenis]);

  const mainRef = useRef<HTMLElement>(null);
  const sectionRefs = useRef<Map<ChapterData['id'], HTMLElement>>(new Map());
  // The trigger whose progress drives each chapter's text + clip (for noise: the extended range)
  const scrubTriggers = useRef<Map<ChapterData['id'], ScrollTrigger>>(new Map());
  const setSectionRef = useCallback(
    (id: ChapterData['id']) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(id, el);
      else sectionRefs.current.delete(id);
    },
    [],
  );

  // iOS Safari priming: browsers sometimes block programmatic decoding/playback until
  // a user gesture occurs. On first interaction, we "prime" all videos.
  useEffect(() => {
    let primed = false;
    const primeVideos = () => {
      if (primed || isStatic) return;
      primed = true;
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        try {
          const promise = v.play();
          if (promise !== undefined) {
             promise.then(() => v.pause()).catch(() => {});
          }
        } catch {
          // Ignore
        }
      });
      ['touchstart', 'pointerdown', 'keydown'].forEach(evt => 
         window.removeEventListener(evt, primeVideos)
      );
    };

    ['touchstart', 'pointerdown', 'keydown'].forEach(evt => 
      window.addEventListener(evt, primeVideos, { passive: true, once: true })
    );

    return () => {
       ['touchstart', 'pointerdown', 'keydown'].forEach(evt => 
         window.removeEventListener(evt, primeVideos)
       );
    };
  }, [isStatic]);

  // Handle pageshow (bfcache)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        ScrollTrigger.refresh();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // ScrollTrigger setup inside gsap.context
  useEffect(() => {
    if (!mainRef.current) return;

    // In static mode we might still want ScrollTrigger to track active chapter,
    // but the scrub animations inside Chapter might be disabled. 
    // We set up ScrollTrigger regardless so `activeId` is maintained.
    const ctx = gsap.context(() => {}, mainRef);

    const timer = setTimeout(() => {
      for (const id of CHAPTER_IDS) {
        const section = sectionRefs.current.get(id);
        if (!section) continue;

        // 1) Section trigger: activation (nav / counter / dots / theme / clip handoff) + scrub
        //    progress. `top top+=1` makes a chapter active when scrolling lands EXACTLY on its
        //    top (hash deep links, nav clicks) — a trigger is not active at progress 0, which
        //    used to leave the previous chapter active there. The hero has nothing before it.
        ctx.add(() => {
          const st = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true, // we still track scrub for the progress values used by other things
            onUpdate: id === 'noise' ? undefined : (self) => {
              setProgresses((prev) => ({ ...prev, [id]: self.progress }));
            },
          });
          scrubTriggers.current.set(id, st);
        });

        // 2) Noise only: clip 1 + the Noise text scrub from inside the hero range
        //    (at HERO_CLIP_START of it) to the original end (= start of Unravel), so the
        //    figure starts moving while the hero text is still leaving. The activation
        //    above is unchanged, so crossfades and chapter switches happen at the same
        //    relative moments as before.
        if (id === 'noise') {
          ctx.add(() => {
            const st = ScrollTrigger.create({
              trigger: section,
              start: () => {
                const hero = sectionRefs.current.get('hero');
                return hero ? hero.offsetTop + hero.offsetHeight * HERO_CLIP_START : 0;
              },
              end: 'bottom top',
              scrub: true,
              onUpdate: (self) => {
                setProgresses((prev) => ({ ...prev, noise: self.progress }));
              },
            });
            scrubTriggers.current.set('noise', st);
          });
        }
      }

      // 3) Chapter activation (nav / counter / dots / theme / clip handoff) from scroll position.
      //    Boundaries are the section tops, except hero->noise which switches at HERO_HANDOFF of
      //    the (short) hero range so the active chapter matches what is visible. Inclusive at
      //    the top, so landing exactly on a section top (hash links, nav clicks) is correct.
      ctx.add(() => {
        const activeAt = (y: number): ChapterData['id'] => {
          let current: ChapterData['id'] = 'hero';
          for (const id of CHAPTER_IDS) {
            const el = sectionRefs.current.get(id);
            if (!el || id === 'hero') continue;
            const boundary = id === 'noise'
              ? (sectionRefs.current.get('hero')?.offsetHeight ?? 0) * HERO_HANDOFF
              : el.offsetTop;
            if (y >= boundary - 0.5) current = id;
          }
          return current;
        };
        const sync = () => setActiveId(activeAt(window.scrollY));
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: sync,
          onRefresh: sync,
        });
      });

      ScrollTrigger.refresh();
    }, 100);

    let refreshTimeout: number;
    const handleRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(() => {
        requestAnimationFrame(() => ScrollTrigger.refresh());
      }, 200);
    };

    window.addEventListener('resize', handleRefresh);
    window.addEventListener('orientationchange', handleRefresh);

    return () => {
      clearTimeout(timer);
      clearTimeout(refreshTimeout);
      window.removeEventListener('resize', handleRefresh);
      window.removeEventListener('orientationchange', handleRefresh);
      ctx.revert();
      scrubTriggers.current.clear();
    };
  }, [isStatic]); // re-run if mode toggles between static/scrub

  const activeChapter = chapters.find((c) => c.id === activeId) ?? chapters[0];
  const isDark = activeChapter.theme === 'dark';

  // Sync <html> background to active chapter
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty('--page-bg', activeChapter.bg);
    html.style.setProperty('--page-text', isDark ? 'var(--color-ice)' : 'var(--color-ink)');
    html.style.backgroundColor = 'var(--page-bg)';
    html.style.color = 'var(--page-text)';
    html.style.transition = 'background-color 0.6s ease, color 0.6s ease';
  }, [activeChapter.bg, isDark]);

  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      const idx = chapters.findIndex(c => c.id === activeId) + 1;
      setAnnouncement(`Chapter ${idx} of ${chapters.length}: ${activeChapter.title}`);
    }, 400);
    return () => clearTimeout(t);
  }, [activeId, activeChapter.title]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Section bounds = the chapter's activation range = what nav anchors / hash links scroll to.
      // Activation range of each chapter (hero->noise switches at HERO_HANDOFF, see above).
      const sectionBounds = (id: ChapterData['id']) => {
        const el = sectionRefs.current.get(id);
        const hero = sectionRefs.current.get('hero');
        const handoff = (hero?.offsetHeight ?? 0) * HERO_HANDOFF;
        const top = el ? el.offsetTop : 0;
        const bottom = el ? top + el.offsetHeight : 0;
        if (id === 'hero') return { startY: 0, endY: handoff };
        if (id === 'noise') return { startY: handoff, endY: bottom };
        return { startY: top, endY: bottom };
      };
      const jumpTo = (scrollY: number) => {
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        // Let ScrollTrigger know we jumped
        ScrollTrigger.update();
      };
      (window as unknown as Record<string, unknown>).__entangled = {
        gsap,
        ScrollTrigger,
        get chapters() {
          return CHAPTER_IDS.map((id) => {
            const { startY, endY } = sectionBounds(id);
            const scrub = scrubTriggers.current.get(id);
            return {
              id,
              startY,
              endY,
              // scrub range (clip + text progress) — equals the section range except for noise,
              // whose range starts inside the hero range
              scrubStartY: scrub?.start ?? startY,
              scrubEndY: scrub?.end ?? endY,
            };
          });
        },
        get scrollTriggerCount() {
           return ScrollTrigger.getAll().length;
        },
        /** progress p (0-1) within the chapter's section (nav-anchor) range */
        scrollToProgress(chapterIndex: number, p: number) {
          const { startY, endY } = sectionBounds(CHAPTER_IDS[chapterIndex]);
          jumpTo(startY + (endY - startY) * p);
        },
        /** progress p (0-1) of the chapter's own scrub range (what drives its clip and text) */
        scrollToScrubProgress(chapterIndex: number, p: number) {
          const id = CHAPTER_IDS[chapterIndex];
          const st = scrubTriggers.current.get(id);
          if (st) jumpTo(st.start + (st.end - st.start) * p);
        },
      };
    }
  }, []);

  return (
    <div aria-busy={loading}>
      {loading && <Loader onComplete={handleLoaderComplete} />}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[var(--color-cobalt)] focus:text-white focus:rounded focus:font-medium">Skip to main content</a>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Fixed video stage always behind everything */}
      <VideoStage
        activeChapterId={activeId}
        chapterProgress={progresses}
      />

      {/* Heat chapter grain overlay */}
      <GrainOverlay visible={activeId === 'heat' && !isStatic} />

      {/* Fixed nav */}
      <Nav
        chapters={chapters}
        activeId={activeId}
        dark={isDark}
        lenis={lenis}
        reducedMotion={isStatic}
        loading={loading}
      />

      {/* Fixed progress rail */}
      <ProgressRail chapters={chapters} activeId={activeId} dark={isDark} lenis={lenis} />

      {/* Debug overlay - toggle with 'd' key */}
      <Suspense fallback={null}>
        <DebugOverlay
          activeChapterId={activeId}
          chapterProgress={progresses}
        />
      </Suspense>

      {/* Fixed text overlay layer - ONLY FOR SCRUB MODE */}
      {!isStatic && (
        <div className="fixed inset-0 z-20 pointer-events-none" style={{ height: '100svh' }}>
          {chapters.map((chapter) => (
            <Chapter
              key={chapter.id}
              chapter={chapter}
              progress={progresses[chapter.id]}
              reducedMotion={false}
              loading={loading}
            />
          ))}
        </div>
      )}

      {/* Scrollable main content */}
      <main
        ref={mainRef}
        id="main-content"
      >
        {chapters.map((chapter) => (
          <section
            key={chapter.id}
            id={chapter.id}
            ref={setSectionRef(chapter.id)}
            style={{
              height: isStatic ? '100svh' : `${(chapter.id === 'hero' ? HERO_SCROLL_VH : CHAPTER_SCROLL_VH) * 100}svh`,
              position: 'relative', // Need this for the Chapter absolute positioning inside if static
            }}
          >
            {isStatic && (
              <Chapter
                chapter={chapter}
                progress={0.5} // middle progress so text is visible fully without animation
                reducedMotion={true} // disable GSAP animations
                loading={loading}
              />
            )}
          </section>
        ))}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
