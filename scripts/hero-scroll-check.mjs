/**
 * hero-scroll-check.mjs — measures how the hero reacts to steady wheel scrolling.
 *
 * Usage:  node scripts/hero-scroll-check.mjs
 * Env:    BASE_URL (default http://localhost:5173)
 *         OUT_TAG  (default "after")  -> writes reference/after/hero/<tag>.csv, <tag>-mobile.csv, <tag>-summary.json
 *
 * For each viewport (1920x1080 desktop, 390x844 touch-emulated) it:
 *   1. loads the app, waits for loader gone + hero title fully visible
 *   2. dumps the chapter layout (start/end px and in viewport heights) from window.__entangled (DEV hook)
 *   3. wheel-scrolls 100px every 50ms for up to 8s, sampling every step
 *   4. computes 4 milestones and (for OUT_TAG != "before") asserts the hero exit is a smooth transition
 *   5. scrolls back up and checks the hero is fully restored at scrollY = 0
 *
 * Effective opacity treats visibility:hidden as 0 (hidden text is not visible).
 */
import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TAG = process.env.OUT_TAG || 'after';
const OUT_DIR = path.resolve('reference/after/hero');
const STEP_PX = 100;
const STEP_MS = 50;
const MAX_MS = 8000;

const VIEWPORTS = [
  { name: 'desktop', suffix: '', options: { viewport: { width: 1920, height: 1080 } } },
  {
    name: 'mobile',
    suffix: '-mobile',
    options: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  },
];

/** Runs in the page: one sample of every value we care about. */
function sampleInPage() {
  const eff = (el) => {
    const cs = getComputedStyle(el);
    return {
      opacity: cs.visibility === 'hidden' ? 0 : parseFloat(cs.opacity),
      transform: cs.transform,
      visibility: cs.visibility,
    };
  };
  const identity = (t) => {
    if (t === 'none') return true;
    const m = t.match(/^matrix\(([^)]+)\)$/);
    if (!m) return false;
    const v = m[1].split(',').map(parseFloat);
    return Math.abs(v[0] - 1) < 1e-3 && Math.abs(v[3] - 1) < 1e-3 && Math.abs(v[4]) < 0.01 && Math.abs(v[5]) < 0.01;
  };
  // The hero text = every animated element inside the hero text container
  // (eyebrow, title, subtitle, cue — or title words once split) plus intro wrappers.
  const heroBox = document.getElementById('hero-title')?.closest('div.absolute');
  const heroEls = heroBox ? Array.from(heroBox.querySelectorAll('.anim-target')) : [];
  const heroSlots = heroBox ? Array.from(heroBox.querySelectorAll('[data-intro]')) : [];
  const heroEff = heroEls.map(eff);
  const slotEff = heroSlots.map(eff);
  const noiseEl = document.getElementById('noise-title');
  const noise = noiseEl ? eff(noiseEl) : null;
  const videos = Array.from(document.querySelectorAll('video'));
  let active = videos[0];
  let best = -1;
  for (const v of videos) {
    const o = parseFloat(getComputedStyle(v).opacity);
    if (o > best + 1e-6) { best = o; active = v; }
  }
  const current = document.querySelector('nav[aria-label="Chapter navigation"] a[aria-current="page"]');
  return {
    scrollY: window.scrollY,
    // most visible hero element: "is any hero text still visible?"
    heroOpacity: heroEff.length ? Math.max(...heroEff.map((e) => e.opacity)) : null,
    // least visible hero element: "has the exit started?"
    heroOpacityMin: heroEff.length ? Math.min(...heroEff.map((e) => e.opacity)) : null,
    heroTransform: heroEff.length ? heroEff[0].transform : null,
    heroOpacitiesAll: heroEff.map((e) => e.opacity),
    heroMaxAbsY: heroEff.length ? Math.max(...heroEff.map((e) => { const m = e.transform.match(/^matrix\(([^)]+)\)$/); return m ? Math.abs(parseFloat(m[1].split(',')[5])) : 0; })) : null,
    heroDirty: heroEff.length ? !heroEff.concat(slotEff).every((e) => identity(e.transform)) : null,
    introSlotsOpacityMin: slotEff.length ? Math.min(...slotEff.map((e) => e.opacity)) : 1,
    heroVisibility: heroEff.length ? (heroEff.every((e) => e.visibility === 'hidden') ? 'hidden' : 'visible') : null,
    videoTime: active ? active.currentTime : null,
    videoIndex: videos.indexOf(active),
    activeChapter: current ? current.getAttribute('href').slice(1) : null,
    noiseOpacity: noise ? noise.opacity : null,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady(page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[role="status"]')) return false;
    const box = document.getElementById('hero-title')?.closest('div.absolute');
    if (!box) return false;
    const els = Array.from(box.querySelectorAll('.anim-target'));
    if (!els.length) return false;
    // scrubbed text visible AND the intro (slots) finished
    return els.concat(Array.from(box.querySelectorAll('[data-intro]'))).every((el) => {
      const cs = getComputedStyle(el);
      return cs.visibility === 'visible' && parseFloat(cs.opacity) >= 0.99;
    });
  }, null, { timeout: 20000 });
  await sleep(600);
}

function firstWhere(rows, pred) {
  const r = rows.find(pred);
  return r ? { scrollY: Math.round(r.scrollY), elapsedMs: r.t, scrollVh: +(r.scrollY / r.vh).toFixed(3) } : null;
}

function computeMilestones(rows) {
  const v0 = rows[0].videoTime ?? 0;
  const frame = 1 / 30;
  return {
    // first hero element drops below 0.95 (first visible reaction)
    heroOpacityBelow095: firstWhere(rows, (r) => r.heroOpacityMin !== null && r.heroOpacityMin < 0.95),
    // ALL hero elements gone
    heroOpacityZero: firstWhere(rows, (r) => r.heroOpacity !== null && r.heroOpacity <= 0.001),
    // any hero element translated by more than 0.5 px (the other half of the 'first visible change' target)
    heroTransformChanged: firstWhere(rows, (r) => r.heroMaxAbsY > 0.5),
    videoMovedMoreThan1Frame: firstWhere(rows, (r) => r.videoTime !== null && Math.abs(r.videoTime - v0) > frame),
    noiseHeadlineOpacityAtLeast05: firstWhere(rows, (r) => r.noiseOpacity !== null && r.noiseOpacity >= 0.5),
  };
}

const restored = (s) => s.scrollY < 1 && s.heroOpacityMin >= 0.99 && s.heroOpacity >= 0.99 && s.introSlotsOpacityMin >= 0.99 && s.heroDirty === false;

function assertions(rows, afterReset) {
  const out = [];
  const exitRows = [];
  for (const r of rows) {
    exitRows.push(r);
    if (r.heroOpacity !== null && r.heroOpacity <= 0.001) break;
  }
  const inter = new Set();
  for (const r of exitRows) {
    for (const o of r.heroOpacitiesAll ?? [r.heroOpacityMin, r.heroOpacity]) {
      if (o > 0.05 && o < 0.95) inter.add(o.toFixed(3));
    }
  }
  const samplesInExit = exitRows.filter((r) => r.heroOpacityMin < 0.999).length;
  out.push({
    name: 'exit has >= 6 distinct intermediate opacities (0.05..0.95) across hero text elements',
    pass: inter.size >= 6,
    detail: `${inter.size} distinct values over ${samplesInExit} wheel samples inside the exit`,
  });

  // monotonic non-increasing (tolerance 0.005) until all text is gone, for both the first- and last-leaving element
  let mono = true;
  let worst = 0;
  for (const key of ['heroOpacity', 'heroOpacityMin']) {
    for (let i = 1; i < exitRows.length; i++) {
      const d = exitRows[i][key] - exitRows[i - 1][key];
      if (d > 0.005) { mono = false; worst = Math.max(worst, d); }
    }
  }
  out.push({ name: 'opacity monotonic non-increasing while scrolling down', pass: mono, detail: mono ? 'ok' : `max rise ${worst.toFixed(3)}` });

  out.push({
    name: 'scroll back to top restores hero (opacity 1, scrollY 0, no leftover transform)',
    pass: restored(afterReset),
    detail: JSON.stringify({ y: afterReset.scrollY, oMax: afterReset.heroOpacity, oMin: afterReset.heroOpacityMin, dirty: afterReset.heroDirty }),
  });
  return out;
}

async function runViewport(browser, vp) {
  const context = await browser.newContext(vp.options);
  const page = await context.newPage();
  const t00 = Date.now();
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.warn(`[${vp.name}] navigation at +${Date.now() - t00}ms -> ${f.url()}`); });
  page.on('pageerror', (e) => console.warn(`[${vp.name}] pageerror: ${e.message.slice(0, 160)}`));
  await page.goto(BASE_URL);
  await waitReady(page);

  const layout = await page.evaluate(() => {
    const h = window.innerHeight;
    const hook = window.__entangled;
    const chapters = hook
      ? hook.chapters.map((c) => ({
          id: c.id,
          startPx: Math.round(c.startY),
          endPx: Math.round(c.endY),
          startVh: +(c.startY / h).toFixed(3),
          endVh: +(c.endY / h).toFixed(3),
        }))
      : null;
    return { viewportHeight: h, docHeight: document.documentElement.scrollHeight, chapters };
  });

  await page.mouse.move(vp.options.viewport.width / 2, vp.options.viewport.height / 2);
  const rows = [];
  const t0 = Date.now();
  const vh = vp.options.viewport.height;
  while (Date.now() - t0 <= MAX_MS) {
    const stepStart = Date.now();
    await page.mouse.wheel(0, STEP_PX);
    const s = await page.evaluate(sampleInPage);
    rows.push({ t: Date.now() - t0, vh, ...s });
    const wait = STEP_MS - (Date.now() - stepStart);
    if (wait > 0) await sleep(wait);
  }

  const csv = [
    't_ms,scrollY,heroOpacityMax,heroOpacityMin,heroTransform,heroDirty,heroVisibility,videoTime,videoIndex,activeChapter,noiseOpacity',
    ...rows.map((r) => [r.t, r.scrollY.toFixed(1), r.heroOpacity?.toFixed(4), r.heroOpacityMin?.toFixed(4), JSON.stringify(r.heroTransform), r.heroDirty, r.heroVisibility, r.videoTime?.toFixed(4), r.videoIndex, r.activeChapter, r.noiseOpacity].join(',')),
  ].join('\n');

  // Scroll back to the top (fast), then verify restoration.
  for (let i = 0; i < 400; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y < 1) break;
    await page.mouse.wheel(0, -Math.max(400, y / 4));
    await sleep(40);
  }
  await sleep(1500);
  const afterReset = await page.evaluate(sampleInPage);

  // Fast flicks down/up, then return to top: no stuck state.
  for (let k = 0; k < 4; k++) {
    await page.mouse.wheel(0, 1200); await sleep(60);
    await page.mouse.wheel(0, -1500); await sleep(60);
  }
  for (let i = 0; i < 200; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y < 1) break;
    await page.mouse.wheel(0, -Math.max(400, y / 4));
    await sleep(40);
  }
  await sleep(1500);
  const afterFlicks = await page.evaluate(sampleInPage);

  await context.close();

  const asserts = assertions(rows, afterReset);
  asserts.push({
    name: 'after fast flicks + return to top: opacity 1, no transform',
    pass: restored(afterFlicks),
    detail: JSON.stringify({ y: afterFlicks.scrollY, oMax: afterFlicks.heroOpacity, oMin: afterFlicks.heroOpacityMin, dirty: afterFlicks.heroDirty }),
  });
  return { csv, layout, milestones: computeMilestones(rows), samples: rows.length, finalScrollY: rows.at(-1).scrollY, assertions: asserts };
}

async function main() {
  const browser = await chromium.launch();
  const summary = { tag: TAG, baseUrl: BASE_URL, step: { px: STEP_PX, ms: STEP_MS, maxMs: MAX_MS } };
  let failed = false;
  for (const vp of VIEWPORTS) {
    try {
      summary[vp.name] = await runViewport(browser, vp);
    } catch (e) {
      console.error(`[${vp.name}] failed:`, e.stack);
      process.exit(1);
    }
    const s = summary[vp.name];
    console.log(`\n== ${vp.name} ${vp.options.viewport.width}x${vp.options.viewport.height} (${TAG}) ==`);
    console.table(s.layout.chapters);
    console.table(s.milestones);
    for (const a of s.assertions) {
      console.log(`${a.pass ? 'PASS' : 'FAIL'}  ${a.name}  [${a.detail}]`);
      if (!a.pass) failed = true;
    }
  }
  await browser.close();
  // Write outputs only now: Vite's file watcher full-reloads the page when files inside the
  // project change, so writing CSVs mid-run would reload the page under test.
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const vp of VIEWPORTS) {
    await fs.writeFile(path.join(OUT_DIR, `${TAG}${vp.suffix}.csv`), summary[vp.name].csv);
    delete summary[vp.name].csv;
  }
  await fs.writeFile(path.join(OUT_DIR, `${TAG}-summary.json`), JSON.stringify(summary, null, 2));
  if (failed && TAG !== 'before') process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
