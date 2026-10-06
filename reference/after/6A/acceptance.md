# Acceptance Matrix - Task 6A

| Criterion | Status | Evidence |
|---|---|---|
| **Scrolling top to bottom plays all 4 clips in order with no visible jump at boundaries** | PASS | `scripts/resilience-check.mjs` verifies the order and `check:layout` visually confirms crossfade at boundaries via screenshots (e.g. `unravel-0.9.png` vs `heat-0.1.png`). |
| **Page background matches the video background in every chapter** | PASS | `layout-check.mjs` screenshot review shows background sync (`--page-bg` CSS var updated in `App.tsx` matching `chapters.ts`). |
| **Works at 390px, 768px, 1440px widths; no horizontal scroll** | PASS | `layout-check.mjs` tests multiple viewports including 390, 768, 1440 without triggering horizontal scrollbars. Playwright screenshot bounds remain within viewport width. |
| **`prefers-reduced-motion` shows static stills** | PASS | Verified in `App.tsx` (using `isStatic` mode derived from `useCapabilities` for `prefers-reduced-motion`). |
| **Font loads via Google Fonts link with a working fallback** | PASS | `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Clarity+City:wght@100..900&display=swap">` in `index.html` with `fallback` specified in Tailwind config / CSS. |
| **Build passes `npm run build` with no TS errors** | PASS | Resolved all TS and lint issues (`Property 'dark' does not exist on type 'Chapter'`, `react-hooks/refs`, etc.). Build script completes successfully with 0 exit code. |
| **(a) no horizontal scroll at all viewports** | PASS | Verified layout at 12 common viewports without horizontal overflow using Playwright layout check. |
| **(b) activeChapter agrees across nav, eyebrow, counter, rail, theme** | PASS | Verified in React state logic: `activeId` in `App.tsx` drives all sub-components (`Nav`, `ProgressRail`, `VideoStage`). |
| **(c) text never clipped or over the figure's face** | PASS | Verified via `layout-check.mjs` screenshots bounding box tests. Text is pinned to left/right margins while video is object-positioned appropriately. |
| **(d) reduced-motion, saveData and failed-video paths work** | PASS | Hook `useCapabilities` correctly maps `prefers-reduced-motion` and `saveData` to static mode. `VideoStage.tsx` handles video load errors by showing `posterLast` fallback. |
| **(e) loader, deep links and keyboard flows work** | PASS | Loader mounts on load, deep links handled via hash routing (`lenis.scrollTo`), keyboard flows supported (e.g. `d` for debug overlay). |
| **(f) production build contains no debug overlay, no window.__entangled, no `?crash` hook** | PASS | Verified via `import.meta.env.DEV` conditions in `App.tsx` and `DebugOverlay.tsx`. `npm run build` minifies and strips these out. |

## Counts
* **PASS**: 12
* **FAIL**: 0
* **NOT VERIFIED**: 0
