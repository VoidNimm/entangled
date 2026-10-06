/**
 * Nav — fixed top navigation bar with animated underline draw-in on hover.
 *
 * Underline animation: scaleX(0) → scaleX(1) from origin-left, 250ms.
 * Active link shows full underline; hover previews it.
 * focus-visible gets the same underline treatment for keyboard navigation.
 *
 * Hero intro: nav fades in as part of the hero sequence (opacity set
 * by parent, or self-managed with a simple delay).
 */
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import type { Chapter } from '../types';
import type Lenis from 'lenis';

const LazyMobileMenu = lazy(() => import('./MobileMenu'));

interface NavProps {
  chapters: readonly Chapter[];
  activeId: Chapter['id'];
  dark: boolean;
  lenis: Lenis | null;
  /** Whether reduced-motion is active */
  reducedMotion?: boolean;
  loading: boolean;
}

const NAV_LINK_IDS = ['hero', 'noise', 'unravel', 'heat', 'stillness'] as const;

export function Nav({ chapters, activeId, dark, lenis, reducedMotion = false, loading }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Hero intro fade: nav starts invisible, fades in after loader finishes.
  const [visible, setVisible] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) { 
      queueMicrotask(() => setVisible(true));
      return; 
    }
    if (!loading) {
      // 0 ms: the nav fades in at the START of the hero intro (which also begins when loading ends)
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
  }, [reducedMotion, loading]);

  const navChapters = chapters.filter((c) =>
    (NAV_LINK_IDS as readonly string[]).includes(c.id),
  );

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
      const focusableElements = menuRef.current?.querySelectorAll('a, button');
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
      lenis?.stop();
      if (!lenis) document.body.style.overflow = 'hidden';
    } else {
      lenis?.start();
      if (!lenis) document.body.style.overflow = '';
      // Only return focus if we are closing from an open state (we can track this, but calling focus is usually fine)
      // Actually we just call it when it closes, but only if focus was inside the menu, or just return it unconditionally
      if (document.activeElement && !menuRef.current?.contains(document.activeElement)) {
         // wait, menuRef is unmounted when closed, so it won't contain it anyway.
      }
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen, lenis]);

  const previousMenuOpen = useRef(menuOpen);
  useEffect(() => {
    if (!menuOpen && previousMenuOpen.current) {
      buttonRef.current?.focus();
    }
    previousMenuOpen.current = menuOpen;
  }, [menuOpen]);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMenuOpen(false);
    if (lenis) {
      lenis.scrollTo(`#${id}`);
    } else {
      document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' });
    }
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 transition-colors duration-500"
        style={{
          paddingTop: 'calc(1.25rem + env(safe-area-inset-top))',
          paddingBottom: '1.25rem',
          paddingLeft: 'calc(1.5rem + env(safe-area-inset-left))',
          paddingRight: 'calc(1.5rem + env(safe-area-inset-right))',
          color: dark ? 'var(--color-ice)' : 'var(--color-ink)',
          // Fade-in for hero intro
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease, color 0.5s ease',
        }}
      >
        {/* Wordmark */}
        <a
          href="#"
          className="text-sm font-extrabold tracking-[0.12em] uppercase no-underline"
          style={{ color: 'inherit' }}
          aria-label="Entangled — back to top"
          onClick={(e) => handleNav(e, 'hero')}
        >
          Entangled
        </a>

        {/* Desktop nav links */}
        <nav aria-label="Chapter navigation" className="hidden md:block">
          <ul className="flex gap-10 items-center justify-end">
            {navChapters.map((chapter) => {
              const isActive = chapter.id === activeId;
              return (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    onClick={(e) => handleNav(e, chapter.id)}
                    className="nav-link text-[0.875rem] font-medium tracking-[0.04em] no-underline relative block"
                    style={{ color: 'inherit' }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {chapter.label}
                    {/* Underline: draws in from left on hover/active/focus-visible */}
                    <span
                      className="nav-underline absolute left-0 bottom-[-2px] h-[1px] w-full origin-left"
                      style={{
                        backgroundColor: dark ? 'var(--color-ice)' : 'var(--color-cobalt)',
                        transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                        transition: 'transform 250ms ease-out',
                      }}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile menu button */}
        <button
          ref={buttonRef}
          type="button"
          id="mobile-menu-btn"
          className="md:hidden text-sm font-medium tracking-[0.1em] uppercase cursor-pointer flex items-center justify-center"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-dialog"
          style={{ color: 'inherit', minHeight: '44px', minWidth: '44px' }}
          onClick={() => setMenuOpen(true)}
        >
          Menu
        </button>
      </header>

      {/* Mobile full-screen overlay */}
      {menuOpen && (
        <Suspense fallback={null}>
          <LazyMobileMenu
            dark={dark}
            navChapters={navChapters}
            handleNav={handleNav}
            setMenuOpen={setMenuOpen}
            menuRef={menuRef}
          />
        </Suspense>
      )}
    </>
  );
}
