/**
 * GrainOverlay — very subtle film-grain effect for the Heat chapter.
 *
 * Implemented in pure CSS + SVG filter (no images). Uses an SVG
 * feTurbulence filter for procedural noise, animated by toggling
 * the baseFrequency seed. Opacity capped at 0.08 per spec.
 *
 * Behind a constant flag: set ENABLE_GRAIN = false to remove entirely.
 * The overlay is pointer-events-none and aria-hidden.
 */

/** Master kill switch — set to false to remove grain entirely */
const ENABLE_GRAIN = false;

interface GrainOverlayProps {
  /** Whether the grain should be visible (true when Heat chapter is active) */
  visible: boolean;
}

export function GrainOverlay({ visible }: GrainOverlayProps) {
  if (!ENABLE_GRAIN) return null;

  return (
    <>
      {/* SVG filter definition — sits in the DOM but isn't rendered visually */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="grain-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
        </defs>
      </svg>

      {/* Grain layer */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          zIndex: 5, // Above video (0), below text (10)
          opacity: visible ? 0.08 : 0,
          transition: 'opacity 0.8s ease',
          filter: 'url(#grain-filter)',
          // Cover the entire viewport with the noise texture
          width: '100%',
          height: '100svh',
          mixBlendMode: 'overlay',
        }}
      />
    </>
  );
}
