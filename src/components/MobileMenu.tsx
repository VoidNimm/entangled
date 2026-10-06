import type { Chapter } from '../types';

interface MobileMenuProps {
  dark: boolean;
  navChapters: readonly Chapter[];
  handleNav: (e: React.MouseEvent<HTMLAnchorElement>, id: Chapter['id']) => void;
  setMenuOpen: (val: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}

export default function MobileMenu({ dark, navChapters, handleNav, setMenuOpen, menuRef }: MobileMenuProps) {
  return (
    <div
      id="mobile-nav-dialog"
      ref={menuRef}
      className="fixed inset-0 z-[60] flex flex-col justify-center items-center"
      style={{
        height: '100dvh',
        backgroundColor: dark ? 'var(--color-void)' : 'var(--color-mint)',
        color: dark ? 'var(--color-ice)' : 'var(--color-ink)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <button
        type="button"
        className="absolute right-6 text-sm font-medium tracking-[0.1em] uppercase cursor-pointer flex items-center justify-center"
        style={{ top: 'calc(1.25rem + env(safe-area-inset-top))', minHeight: '44px', minWidth: '44px' }}
        aria-label="Close navigation menu"
        onClick={() => setMenuOpen(false)}
      >
        Close
      </button>

      <nav aria-label="Mobile navigation">
        <ul className="flex flex-col gap-8 text-center m-0 p-0">
          {navChapters.map((chapter) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                onClick={(e) => handleNav(e, chapter.id)}
                className="text-2xl font-semibold tracking-widest uppercase no-underline flex items-center justify-center"
                style={{ color: 'inherit', minHeight: '44px', minWidth: '44px' }}
              >
                {chapter.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
