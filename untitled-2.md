Before any UI work, view every file in ./reference/ (PNGs and the HTML) and follow PRD section 5A. Read [AGENTS.md](http://AGENTS.md) and [PRD.md](http://PRD.md) (sections 5 and 6). The scroll/video engine from step 2 already works; do not change its logic except where noted.

STEP 3 GOAL: build the real minimalist UI on top of the engine. Use the Clarity City font and the design tokens from index.css.

Design direction: minimal, calm, generous whitespace, huge confident type, one accent. A reference mockup exists (a centered giant "LOREM IPSUM" title over the figure) but DO NOT copy it: our improvement is that text never sits on top of the busy face; it lives in the clear space beside the figure. Make it feel editorial and premium rather than a template.

1. Nav (fixed): wordmark left (uppercase, weight 800, tight tracking); links right of center: Mind, Noise, Heat, Still (weight 500, 0.875rem). Links jump to chapters via lenis.scrollTo. Active link gets a thin cobalt underline that animates in. On dark chapters (3 and 4) the nav text color inverts smoothly to ice. Mobile (&lt;768px): replace links with a small "Menu" text button opening a simple full-screen overlay with the same 4 links, focus trapped, closes on Escape.

2. Hero (chapter 0): display title (clamp(3rem, 9vw, 9rem), weight 700-800, uppercase, tracking -0.03em) left-aligned in the clear area, one-line subtitle in weight 500, and a "Scroll" cue with a thin line that slowly pulses. Use placeholder English copy from the PRD ("Entangled", etc.).

3. Chapters 1-4: each has an eyebrow label (e.g. "01 — Noise", 0.75rem, uppercase, tracking 0.18em), a display headline, and body text (max-width 38ch). Position text bottom-left on desktop, bottom-center on mobile, alternating sides if it improves composition with the figure position. Final chapter: a single text button "Start over" (scrolls to top) plus a small contact/social links row (placeholder URLs).

4. ProgressRail: fixed on the right edge on desktop (hidden or reduced on mobile): 5 small dots plus a thin vertical line whose fill follows overall scroll progress; current chapter dot is cobalt (or ice on dark).

5. Theme: when entering chapters 3-4 switch text to ice and page background to var(--color-void), scrubbed or transitioned with the scroll so it matches the video background without a visible edge. Implement via ScrollTrigger + CSS variables on the root.

6. Semantic HTML: header/nav/main/section with aria-labelledby, a skip link, visible focus rings, contrast &gt;= 4.5:1 (check both themes and report).

Do not add text-reveal animations yet (step 4). Run `npm run build`, view at 390px, 768px and 1440px widths, and report layout problems you found and fixed. Stop for review.