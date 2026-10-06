# PRD — "Entangled" (working title)

Minimalist 3D scroll-motion website about the messy human mind.

> Working title and all copy are placeholders. Replace freely.

## 1. Overview

A single-page, scroll-driven experience. One blue wire-figure is "the mind." As the visitor scrolls, it transforms through four AI-generated video clips (Veo 3.1), moving from tangled chaos to unraveling, to a dark heat-state, to cold stillness. Minimal UI, big type, lots of negative space. The video is the product; the UI stays out of its way.

**Purpose:** portfolio piece showing 3D-motion storytelling. **Language:** English only (assumption, same as previous project).

## 2. Goals / Non-goals

**Goals**

- Scroll scrubs the video smoothly (no stutter) on desktop and mobile.
- Minimal, confident typography with Clarity City.
- Emotional arc readable without reading much text.
- Lighthouse Performance ≥ 85 on mobile (target, to be measured).

**Non-goals:** CMS, auth, backend, blog, multi-page routing, i18n.

## 3. Assets


| #      | File (suggested name)                                                                                                                                                                                                 | Role                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Hero   | Free choice: the original image (paul-campbell-V_H4hG) is only a reference example, not required. Hero can be a new still, a short loop, or a video frame, as long as it matches the palette and the start of clip 1. | Hero visual / poster fallback             |
| Clip 1 | `clips01.mp4`                                                                                                                                                                                                         | Tangled head → bowed profile              |
| Clip 2 | `clips02.mp4`                                                                                                                                                                                                         | Bowed → sketch crouch                     |
| Clip 3 | `clips03.mp4`                                                                                                                                                                                                         | Sketch → thermal (dark side)              |
| Clip 4 | `clips04.mp4`                                                                                                                                                                                                         | Thermal → cold wireframe face             |
| Stills | one poster `.jpg` per clip's last frame                                                                                                                                                                               | Fallback, reduced-motion, mobile low-data |


Known issue: the figure's apparent gender differs between clips. Mitigation in design: crossfade clips over 300ms at the boundary, keep one consistent color grade overlay per chapter, and keep figures anonymous (no captions referring to "he/she").

## 4. Tech stack

The earlier project's PRD is not visible to me, so this follows what you confirmed (React + Vite) and my own recommendations for the rest. Swap anything that differs from your previous stack.

- React + Vite + TypeScript
- Tailwind CSS (v4 via `@tailwindcss/vite`)
- GSAP + ScrollTrigger (scroll-scrubbing, pinning, text reveals)
- Lenis (smooth scroll, synced to GSAP ticker)
- Font: Clarity City via Google Fonts, `<link>` in `index.html`, fallback `ui-sans-serif, system-ui, sans-serif`
- Deploy: static (Vercel / Netlify / Cloudflare Pages)

## 5. Design system

**Principles:** minimal, calm, generous whitespace, one accent. Improve on the mockup: no overlapping text on busy areas, text sits on clear space beside the figure, not across it.

**Typography (Clarity City, variable wght 100–900)**

- Display: 700–800, `clamp(3rem, 9vw, 9rem)`, tight tracking (-0.03em), uppercase
- Eyebrow / chapter label: 500, 0.75rem, tracking 0.18em, uppercase
- Body: 400, 1rem–1.125rem, line-height 1.6, max-width 38ch
- Nav: 500, 0.875rem

**Color tokens** (approximate, sample exact values from the final frames)

- `--mint`: `#DCEBE3` (chapters 0–2 background)
- `--ink`: `#0A0A0A` (text on light)
- `--cobalt`: `#2F6FB8` (accent, progress bar)
- `--void`: `#050808` (chapters 3–4 background)
- `--teal-ice`: `#BFE0DD` (text on dark) Background color transitions are scrubbed with scroll in sync with the clip, so the page color matches the video's background and the video edge is invisible (use `mix-blend-mode` or matched color; test both).



## 5A. UI/UX design reference (MANDATORY READ)

Before writing or changing ANY UI (layout, typography, color, nav, chapter text,

progress, mobile), open and study every file in ./reference/:

- reference/01 Hero — desktop 1440.png

- reference/04 Heat (dark chapter) — desktop.png

- reference/01 Hero — mobile 390.png

- reference/Entangled — UI UX Reference.html  (open it to read exact inline CSS

  values; its images may not load outside the original canvas, use the PNGs)

Rules:

- Layout/hierarchy/mood reference, NOT pixel-perfect. Improve it, but keep the

  principles below. If you deviate on purpose, explain why in your report.

- Priority: PRD text for behavior &gt; reference for visuals &gt; your own judgment.

- Boards use the original stills as stand-ins; the real visuals come from the clips.

- Only Hero (desktop+mobile) and Heat exist. Extend the same system for the

  other chapters (Noise, Unravel, Stillness).

Principles:

- Text lives in clear space beside the figure, never across the face; figure sits

  right of center with a soft mask fade on its left edge.

- Huge uppercase display type (800, tight tracking), small uppercase eyebrow with

  wide tracking, short body copy.

- Fixed minimal nav: wordmark left, 4 links, active link has thin accent underline;

  on dark chapters nav text -&gt; ice, accent -&gt; orange.

- "Thread" progress bottom-right: tangled on chapter 1, nearly straight by the dark

  chapter, plus counter "01 / 05"; driven by scroll progress.

- Right-edge 5-dot rail, active dot filled with accent.

- Dark chapter: near-black bg, "COOL to HOT" thermal scale bottom-left, orange accent.

- Mobile: wordmark + 44px "MENU" button on top, figure above, text below,

  scroll cue + thread at the bottom.

Reference values (approximate; sampled colors from the real frames win for backgrounds):

- Display title 104px desktop / 46px mobile, weight 800, line-height 0.95-0.98,

  letter-spacing -0.035em. Dark headline 72px, line-height 1.

- Eyebrow 11-12px / 600 / 0.2em. Nav 14px / 500. Body 17-18px (16px mobile), lh ~1.55.

- Light: bg gradient #D6E6DF -&gt; #E3F0EA, ink #0A0A0A, accent line #2F6FB8,

  accent text #1F5A9E.

- Dark: bg #050808, text #E6F4F1, secondary #BFE0DD, accent #FF8A3D,

  thermal #3B3FBF -&gt; #D9382B -&gt; #FFC83D.

- Margins 56px desktop / 24px mobile.

## 6. Layout and sections

Fixed layer: video stage (100svh, `object-fit: cover`, figure kept center-right on desktop). Scrolling layer: chapter text.

**Nav (fixed, minimal):** wordmark left; 4 links center-right (Mind, Noise, Heat, Still) that jump to chapters; no hamburger on desktop; tiny menu button on mobile. Active link underlined by a thin cobalt line. Nav text auto-inverts on dark chapters.

**Chapters (each 200vh of scroll)** 0. **Hero** — any visual in the same style (not tied to the reference JPG); ideally the same image as clip 1's first frame for a seamless handoff. Huge title, one-line subtitle, small "Scroll" hint with a slow-pulsing line. Text sits left-aligned in clear space, not over the face.

1. **Noise** (clip 1) — "Thoughts don't queue. They tangle." Short body copy, bottom-left.
2. **Unravel** (clip 2) — "Pull one thread, and the knot begins to loosen."
3. **Heat** (clip 3) — dark chapter. "Some of it burns where no one can see." Palette flips to void.
4. **Stillness** (clip 4) — "Quiet is not empty. It is mapped." Final CTA: one text button ("Start over" scrolls to top) plus a contact line/social links.

Right edge: vertical progress rail with 5 dots (current chapter highlighted) and a thin line fill.

## 7. Motion spec

- Video scrubbing: `video.currentTime = progress * duration`, updated inside a `requestAnimationFrame` loop with lerp (factor ≈ 0.1) for smoothness. One `<video>` element per clip, only the active and next one preloaded.
- Clip handoff: when chapter N ends, crossfade to N+1's first frame (identical image by design).
- Text: lines split and rise 24px with opacity, staggered 60ms, ease `power3.out`; exit on scroll-out.
- Lenis: `lerp: 0.08`, synced via `gsap.ticker`; disabled for `prefers-reduced-motion`.
- Cursor/hover: nav links get thin underline draw-in; no custom cursor (keep minimal).
- Reduced motion: no scrub; show the poster stills as stacked sections with simple fades.

## 8. Video encoding requirements

Scrubbing needs frequent keyframes, otherwise seeking is choppy. Encode each clip:

```
ffmpeg -i input.mp4 -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 23 -g 1 -pix_fmt yuv420p -an -movflags +faststart clip-01-noise.mp4
```

Also create a WebM (VP9) and a 720p mobile version. `-an` removes audio (the site is silent). Target ≤ 6 MB per 1080p clip.

## 9. Performance and accessibility

- `preload="auto"` for the active clip, `metadata` for the others; poster image on all.
- Mobile: 720p clips; if `navigator.connection.saveData`, use stills.
- Semantic HTML (`header`, `nav`, `main`, `section` with `aria-labelledby`), skip link, visible focus rings.
- Text contrast ≥ 4.5:1 on both light and dark chapters (verify in dev tools).
- Videos are decorative: `aria-hidden="true"`, meaningful content lives in text.

## 10. Folder structure

```
src/
  components/ Nav.tsx, VideoStage.tsx, Chapter.tsx, ProgressRail.tsx
  hooks/ useScrubVideo.ts, useLenis.ts
  data/ chapters.ts          // copy, clip src, bg color per chapter
  styles/ index.css          // Tailwind + tokens
  App.tsx, main.tsx
public/assets/ clips/, posters/
```

## 11. Acceptance criteria

- Scrolling top to bottom plays all 4 clips in order with no visible jump at boundaries.
- Page background matches the video background in every chapter.
- Works at 390px, 768px, 1440px widths; no horizontal scroll.
- `prefers-reduced-motion` shows static stills.
- Font loads via Google Fonts link with a working fallback (verify in browser that Clarity City actually renders; if not, self-host).
- Build passes `npm run build` with no TS errors.

## 12. Agent task order

1. Scaffold project and tokens, load font.
2. Build `chapters.ts` data and layout skeleton with poster stills.
3. Implement Lenis + GSAP ScrollTrigger and `useScrubVideo`.
4. Wire clips, handoff crossfades, background color scrub.
5. Nav, progress rail, text animations.
6. Reduced-motion + mobile fallbacks.
7. Performance pass, test acceptance criteria, deploy.

