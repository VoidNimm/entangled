/**
 * Shared type definitions for Entangled.
 * All types are strict — no `any`.
 */

/** A single chapter in the scroll experience */
export interface Chapter {
  /** Unique string identifier */
  id: 'hero' | 'noise' | 'unravel' | 'heat' | 'stillness';
  /** Number shown in nav and progress counter (1-based; hero = 1) */
  index: number;
  /** Short label used in nav links and eyebrow */
  label: string;
  /** Eyebrow text: "01 — THE MIND" style */
  eyebrow: string;
  /** Display headline — uppercase, huge type */
  title: string;
  /** Short body copy — ≤ 2 sentences */
  body: string;
  /** Desktop clip path (1080p), relative to /public */
  clipSrc: string;
  /** Mobile clip path (720p), relative to /public */
  clipSrcMobile: string;
  /** First-frame poster — used as video poster attr and preload */
  posterFirst: string;
  /** Last-frame poster — fallback / next-chapter placeholder */
  posterLast: string;
  /** CSS color value for the page background in this chapter */
  bg: string;
  /** Light or dark palette — controls nav text, accent color, etc. */
  theme: 'light' | 'dark';
  /** Horizontal alignment block area for the text overlay */
  textZone?: 'left' | 'right' | 'bottom';
  /** Progress (0 to 1) at which the theme switches (useful for clips fading from light to dark) */
  themeSwitchAt?: number;
  /** Art direction for framing the video (CSS object-position) */
  objectPosition?: {
    desktop: string;
    mobile: string;
  };
}

/** Scroll progress — 0 to 1 within the active chapter */
export type ScrollProgress = number;
