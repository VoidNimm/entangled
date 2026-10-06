/**
 * textMotion — the ONE place that defines how chapter text moves.
 *
 * Every chapter (hero included) builds its scroll-scrubbed text timeline with
 * `buildTextTimeline`, and the hero's load intro uses `playTextIntro`. To change the
 * feel of text for all chapters, change the numbers/ease here (or the HERO_* tunables
 * in config/scroll.ts for the hero's own windows).
 *
 * Timeline units are scroll PROGRESS (0-1 of the chapter's scroll range) because the
 * timeline is paused and driven with `tl.progress(p)`.
 */
import { gsap } from 'gsap';
import {
  HERO_EXIT_END,
  HERO_EXIT_STAGGER,
  HERO_INTRO,
} from '../config/scroll';

/** One element, or several elements that should move together (e.g. the words of one title line). */
export type TextSlot = gsap.TweenTarget;

export interface TextWindow {
  /** Progress where the first slot starts. */
  start: number;
  /**
   * Progress where a slot's tween ends. If `endIncludesStagger` is true this is instead
   * the progress where the LAST slot finishes (so the whole cascade ends exactly there).
   */
  end: number;
  /** Progress between consecutive slots. */
  stagger: number;
  ease: string;
  endIncludesStagger?: boolean;
}

export interface TextMotion {
  enter?: TextWindow;
  exit?: TextWindow;
  /**
   * Use `autoAlpha` (opacity + visibility:hidden at 0) for the exit so hidden text cannot
   * be focused / read, and is restored when scrolling back.
   */
  hideAtZero?: boolean;
  /** Extend the timeline to exactly this length so `tl.progress(p)` maps 1:1 to scroll progress. */
  padTo?: number;
}

/** Rise / fall distance in px, shared by every chapter. */
export const TEXT_RISE_PX = 24;

/** Chapters 1-4 — values are the original ones; unchanged on purpose. */
export const CHAPTER_ENTER: TextWindow = { start: 0.12, end: 0.28, stagger: 0.02, ease: 'power2.out' };
export const CHAPTER_EXIT: TextWindow = { start: 0.78, end: 0.92, stagger: 0.01, ease: 'power2.in' };
export const CHAPTER_TEXT_MOTION: TextMotion = { enter: CHAPTER_ENTER, exit: CHAPTER_EXIT };

/** Hero: no scroll-in (the intro plays on load); scrubbed exit over [0, HERO_EXIT_END]. */
export const HERO_TEXT_MOTION: TextMotion = {
  exit: {
    start: 0,
    end: HERO_EXIT_END,
    stagger: HERO_EXIT_STAGGER,
    // power1.in: starts reacting within the first ~20 px (power2.in is too flat at the very start)
    ease: 'power1.in',
    endIncludesStagger: true,
  },
  hideAtZero: true,
  padTo: 1,
};

/**
 * Adds the scrubbed enter/exit tweens for `slots` to a paused timeline.
 * `backdrop` (optional) is something that sits behind the text (e.g. the hero's mobile scrim):
 * it fades during the last ~55% of the exit so text keeps its contrast until it is gone.
 */
export function buildTextTimeline(
  tl: gsap.core.Timeline,
  slots: TextSlot[],
  motion: TextMotion,
  backdrop?: TextSlot,
): void {
  const { enter, exit, hideAtZero = false, padTo } = motion;
  const lastIndex = Math.max(0, slots.length - 1);

  if (enter) {
    slots.forEach((slot, i) => {
      tl.fromTo(
        slot,
        { opacity: 0, y: TEXT_RISE_PX },
        { opacity: 1, y: 0, duration: enter.end - enter.start, ease: enter.ease },
        enter.start + i * enter.stagger,
      );
    });
  }

  if (exit) {
    const duration = exit.endIncludesStagger
      ? exit.end - exit.start - lastIndex * exit.stagger
      : exit.end - exit.start;
    slots.forEach((slot, i) => {
      tl.to(
        slot,
        {
          [hideAtZero ? 'autoAlpha' : 'opacity']: 0,
          y: -TEXT_RISE_PX,
          duration,
          ease: exit.ease,
        },
        exit.start + i * exit.stagger,
      );
    });
    if (backdrop) {
      tl.to(backdrop, { autoAlpha: 0, duration: exit.end * 0.55, ease: 'power1.in' }, exit.end * 0.45);
    }
  }

  if (padTo !== undefined) {
    // zero-length marker: stretches the timeline so progress(p) === time p
    tl.to({}, { duration: 0 }, padTo);
  }
}

/**
 * Groups elements that sit on the same visual line (by layout offsetTop, which ignores
 * transforms) so a split headline animates line by line while single-line items
 * (eyebrow, subtitle, cue) each get their own slot. Input must be in DOM order.
 */
export function groupByLine(elements: HTMLElement[], tolerancePx = 4): HTMLElement[][] {
  const groups: HTMLElement[][] = [];
  let lastTop = Number.NEGATIVE_INFINITY;
  for (const el of elements) {
    const top = el.offsetTop;
    if (groups.length === 0 || Math.abs(top - lastTop) > tolerancePx) {
      groups.push([el]);
      lastTop = top;
    } else {
      groups[groups.length - 1].push(el);
    }
  }
  return groups;
}

/**
 * Time-based reveal for the hero on load: each slot rises 24 px and fades in, staggered.
 * Runs on dedicated intro wrapper elements, never on the scrubbed elements, so it can
 * not fight the scroll timeline. `clearProps` leaves no inline style behind.
 */
export function playTextIntro(slots: TextSlot[], onComplete: () => void): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete });
  slots.forEach((slot, i) => {
    tl.fromTo(
      slot,
      { opacity: 0, y: HERO_INTRO.rise },
      {
        opacity: 1,
        y: 0,
        duration: HERO_INTRO.duration,
        ease: HERO_INTRO.ease,
        clearProps: 'opacity,transform',
      },
      i * HERO_INTRO.stagger,
    );
  });
  return tl;
}
