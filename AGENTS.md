# AGENTS.md — Entangled Project Rules

## What We're Building

A single-page, scroll-driven portfolio site. One blue wire-figure transforms through 4 AI-generated video clips (Veo 3.1) as the visitor scrolls — from tangled chaos → unraveling → heat/burn → cold stillness. The video _is_ the product; UI stays minimal.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript (strict) |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` |
| Scroll | Lenis (`lerp: 0.08`, synced to GSAP ticker) |
| Animation | GSAP + ScrollTrigger |
| Font | Clarity City via Google Fonts `<link>` in `index.html` |
| Export | Static (Vercel / Netlify / Cloudflare Pages) |

---

## Folder Structure

```
src/
  components/   Nav.tsx, VideoStage.tsx, Chapter.tsx, ProgressRail.tsx
  hooks/        useScrubVideo.ts, useLenis.ts
  data/         chapters.ts        # copy, clip src, bg color per chapter
  styles/       index.css          # Tailwind + CSS custom properties/tokens
  App.tsx
  main.tsx
public/
  assets/
    clips/      clips01.mp4 … clips04.mp4   (1080p encoded)
                clips01-m.mp4 … clips04-m.mp4  (720p mobile)
    posters/    clips01-first.jpg, clips01-last.jpg … clips04-last.jpg
                hero.jpg  (= copy of clips01-first.jpg)
raw/            Original source clips — READ ONLY, never overwrite
reference/      Design reference files — READ ONLY
```

---

## Naming Conventions

- Component files: `PascalCase.tsx`
- Hook files: `camelCase.ts`, prefix `use`
- Data / util files: `camelCase.ts`
- CSS custom properties: `--kebab-case`
- Clip assets: `clipsNN.mp4` (desktop 1080p), `clipsNN-m.mp4` (mobile 720p)
- Poster assets: `clipsNN-first.jpg`, `clipsNN-last.jpg`

---

## Code Style

- **TypeScript strict** — `noImplicitAny: true`, zero `any` (use `unknown` + type guards or explicit types)
- Function components only — no class components
- Named exports — no default exports except `App.tsx` and `main.tsx`
- No barrel `index.ts` files unless explicitly added
- Tailwind utility classes preferred; custom CSS only for things Tailwind can't do (scroll scrub values, CSS variable transitions)
- No inline styles except for JS-driven dynamic values (e.g. `style={{ opacity: progress }}`)

---

## Hard Rules

1. **Never edit files in `raw/`** — treat them as original source material.
2. **Never edit files in `reference/`** — design reference only.
3. **Never add npm dependencies without asking** the user first; list the package name, reason, and version.
4. **Do not modify `vite.config.ts` or `package.json`** unless explicitly instructed.
5. **After every task, run `npm run build` and report any errors** before declaring done.
6. **Input and output of ffmpeg must never be the same path** — encode to a temp file first, then replace.

---

## Design Tokens (CSS custom properties in `src/styles/index.css`)

```css
--mint:      #DCEBE3;   /* chapters 0–2 background */
--ink:       #0A0A0A;   /* text on light */
--cobalt:    #2F6FB8;   /* accent, progress bar */
--void:      #050808;   /* chapters 3–4 background */
--teal-ice:  #BFE0DD;   /* text on dark */
```

---

## Chapter Data Shape (`src/data/chapters.ts`)

```ts
export type Chapter = {
  id: string;            // 'hero' | 'noise' | 'unravel' | 'heat' | 'stillness'
  label: string;         // eyebrow / nav label
  title: string;         // display headline
  body: string;          // short body copy (≤ 2 sentences)
  clipSrc: string;       // e.g. '/assets/clips/clips01.mp4'
  clipSrcMobile: string; // e.g. '/assets/clips/clips01-m.mp4'
  posterFirst: string;   // first-frame poster
  posterLast: string;    // last-frame poster (fallback / next chapter placeholder)
  bg: string;            // CSS color token e.g. 'var(--mint)'
  dark: boolean;         // true for Heat + Stillness chapters
};
```

---

## Motion Spec Quick-Reference

- Video scrub: `video.currentTime = lerp(current, progress * duration, 0.1)` inside rAF
- Clip handoff: crossfade 300 ms at chapter boundary
- Text: split lines, rise 24 px + opacity, stagger 60 ms, `power3.out`
- Background: CSS custom property transition synced to scroll progress
- Lenis: `lerp: 0.08`, disabled for `prefers-reduced-motion`

---

## Acceptance Criteria (from PRD §11)

- Scroll top → bottom plays all 4 clips, no visible jump at boundaries
- Page background matches video background every chapter
- Works at 390 px, 768 px, 1440 px — no horizontal scroll
- `prefers-reduced-motion` shows poster stills with simple fades
- Font renders as Clarity City (verify; self-host if Google Fonts fails)
- `npm run build` passes with zero TypeScript errors
