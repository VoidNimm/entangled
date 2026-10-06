/**
 * Scroll-distance and hero-motion tunables — the ONE place to change the feel of the hero.
 *
 * Units: "vh" values are multiples of the viewport height (1 = 100svh); "progress"
 * values are fractions (0-1) of the hero scroll range, i.e. of HERO_SCROLL_VH.
 */

/** Extra scroll distance of the hero (the stage is fixed, so the hero is visually pinned for this long). */
export const HERO_SCROLL_VH = 0.8;

/** Scroll distance of each of chapters 1-4 (unchanged from the original 200svh). */
export const CHAPTER_SCROLL_VH = 2;

/**
 * Hero text exit, scrubbed by scroll. By this hero progress the LAST element
 * (the SCROLL cue) has finished fading, so all text is gone and `visibility:hidden`.
 */
export const HERO_EXIT_END = 0.55;

/** Cascade between eyebrow / title lines / subtitle / cue, in hero progress (0.04 of 0.8vh at 1080p ≈ 35 px ≈ 60 ms of steady wheel input). */
export const HERO_EXIT_STAGGER = 0.04;

/**
 * Hero progress at which the Noise chapter becomes the ACTIVE one (nav, counter, dots, clip handoff).
 * Sits after the hero text is gone (HERO_EXIT_END) and before the Noise text first shows up.
 */
export const HERO_HANDOFF = 0.65;

/** Hero progress at which clip 1 starts scrubbing (figure starts moving while the text is still leaving). */
export const HERO_CLIP_START = 0.35;

/**
 * OPTIONAL: scroll-linked scale of the stage CONTAINER (not the <video>s, not the engine)
 * from 1 to this value over the hero range. Set to 1 to disable.
 */
export const HERO_STAGE_SCALE_TO = 1.03;

/** Hero intro on load (time-based, plays once per load). */
export const HERO_INTRO = {
  /** seconds per element: 0.86 + 4 gaps x 0.06 = 1.1 s total for 5 slots (eyebrow, 2 title lines, subtitle, cue) */
  duration: 0.86,
  /** seconds between elements (eyebrow, title lines, subtitle, cue) */
  stagger: 0.06,
  /** px the text rises from */
  rise: 24,
  ease: 'power3.out',
} as const;
