/**
 * hero-regression-check.mjs — guards everything derived from chapter positions.
 *
 * Usage:  OUT_TAG=before node scripts/hero-regression-check.mjs      (writes reference/after/hero/regression-before.json)
 *         OUT_TAG=after  node scripts/hero-regression-check.mjs      (writes regression-after.json, compares with before)
 *
 * Collects, at 1920x1080:
 *  1. textParity   — title/eyebrow/body opacity+transform+colour of chapters 1-4 at 21 points of THEIR OWN scrub progress
 *                    (proves the chapter text transitions are unchanged by the hero work)
 *  2. agreement    — for each chapter at section progress 0.1/0.5/0.9: nav active link, counter, dot rail, visible eyebrow number
 *  3. deepLinks    — fresh load of /#hero,#noise,#unravel,#heat,#stillness: active chapter, scrollY, clip time ratio
 *  4. thread       — --scroll-progress at top and bottom
 *  5. theme        — html background + title colour around the heat theme switch
 */
import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const TAG = process.env.OUT_TAG || 'after';
const OUT_DIR = path.resolve('reference/after/hero');
const IDS = ['hero', 'noise', 'unravel', 'heat', 'stillness'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ready(page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[role="status"]')) return false;
    const t = document.getElementById('hero-title');
    return !!t && !!window.__entangled;
  }, null, { timeout: 20000 });
  await sleep(2500); // intro + ScrollTrigger setup (100ms timer) + video metadata
}

const readState = () => {
  const eff = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { o: cs.visibility === 'hidden' ? 0 : +parseFloat(cs.opacity).toFixed(3), t: cs.transform, c: cs.color };
  };
  const out = {};
  for (const id of ['hero', 'noise', 'unravel', 'heat', 'stillness']) {
    const title = document.getElementById(`${id}-title`);
    const box = title?.closest('div.absolute');
    out[id] = {
      title: eff(title),
      eyebrow: eff(box?.querySelector('.eyebrow-accent')),
      eyebrowText: box?.querySelector('.eyebrow-accent')?.textContent ?? null,
    };
  }
  return out;
};

async function scrollTo(page, fn, args) {
  await page.evaluate(({ fn, args }) => window.__entangled[fn](...args), { fn, args });
  await sleep(650);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(BASE_URL);
  await ready(page);

  const hasScrub = await page.evaluate(() => typeof window.__entangled.scrollToScrubProgress === 'function');
  const scrubFn = hasScrub ? 'scrollToScrubProgress' : 'scrollToProgress';

  // 1. text parity at own scrub progress (chapters 1-4)
  const textParity = {};
  for (let c = 1; c < 5; c++) {
    textParity[IDS[c]] = {};
    for (let i = 0; i <= 20; i++) {
      const p = i / 20;
      await scrollTo(page, scrubFn, [c, p]);
      const s = await page.evaluate(readState);
      textParity[IDS[c]][p.toFixed(2)] = s[IDS[c]];
    }
  }

  // 2. agreement at section progress
  const agreement = [];
  for (let c = 0; c < 5; c++) {
    for (const p of [0.1, 0.5, 0.9]) {
      await scrollTo(page, 'scrollToProgress', [c, p]);
      const r = await page.evaluate((ids) => {
        const nav = document.querySelector('nav[aria-label="Chapter navigation"] a[aria-current="page"]')?.getAttribute('href')?.slice(1) ?? null;
        const counter = [...document.querySelectorAll('p')].map((e) => e.textContent).find((t) => /^\d\d \/ \d\d$/.test(t ?? '')) ?? null;
        const dot = document.querySelector('ol[aria-label="Chapter dots"] a[aria-current="step"]')?.getAttribute('href')?.slice(1) ?? null;
        const visibleEyebrows = ids.map((id) => {
          const el = document.getElementById(`${id}-title`)?.closest('div.absolute')?.querySelector('.eyebrow-accent');
          if (!el) return null;
          const cs = getComputedStyle(el);
          return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 ? el.textContent : null;
        }).filter(Boolean);
        return { nav, counter, dot, visibleEyebrows };
      }, IDS);
      const expectedNum = String(c + 1).padStart(2, '0');
      const eyebrowNums = r.visibleEyebrows.map((t) => t.slice(0, 2));
      agreement.push({
        chapter: IDS[c], p, ...r,
        agrees: r.nav === IDS[c] && r.dot === IDS[c] && r.counter === `${expectedNum} / 05` && eyebrowNums.every((n) => n === expectedNum),
      });
    }
  }

  // 4. thread
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await sleep(1500);
  const threadTop = await page.evaluate(() => document.querySelector('[style*="--scroll-progress"]')?.style.getPropertyValue('--scroll-progress') ?? null);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await sleep(2500);
  const threadBottom = await page.evaluate(() => document.querySelector('[style*="--scroll-progress"]')?.style.getPropertyValue('--scroll-progress') ?? null);

  // 5. theme around heat switch (chapter-relative scrub progress)
  const theme = {};
  for (const p of [0.02, 0.1, 0.15, 0.18, 0.22, 0.3, 0.5]) {
    await scrollTo(page, scrubFn, [3, p]);
    theme[p] = await page.evaluate(() => ({
      bg: getComputedStyle(document.documentElement).backgroundColor,
      titleColor: getComputedStyle(document.getElementById('heat-title')).color,
    }));
  }
  await ctx.close();

  // 3. deep links on fresh loads
  const deepLinks = {};
  for (const id of IDS) {
    const c2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const p2 = await c2.newPage();
    await p2.goto(`${BASE_URL}/#${id}`);
    await ready(p2);
    await sleep(2500);
    deepLinks[id] = await p2.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Chapter navigation"] a[aria-current="page"]')?.getAttribute('href')?.slice(1) ?? null;
      let active = null;
      let best = -1;
      for (const v of document.querySelectorAll('video')) {
        const o = parseFloat(getComputedStyle(v).opacity);
        if (o > best) { best = o; active = v; }
      }
      return {
        activeChapter: nav,
        scrollY: Math.round(window.scrollY),
        sectionTop: Math.round(document.getElementById(location.hash.slice(1))?.offsetTop ?? -1),
        clipRatio: active && active.duration ? +(active.currentTime / active.duration).toFixed(3) : null,
      };
    });
    await c2.close();
  }
  await browser.close();

  const result = { tag: TAG, scrubFn, textParity, agreement, thread: { top: threadTop, bottom: threadBottom }, theme, deepLinks };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, `regression-${TAG}.json`), JSON.stringify(result, null, 2));

  console.log('\nagreement (nav / dot / counter / eyebrow numbers):');
  for (const a of agreement) console.log(`${a.agrees ? 'PASS' : 'FAIL'}  ${a.chapter} p=${a.p}  nav=${a.nav} dot=${a.dot} counter=${a.counter} eyebrows=${JSON.stringify(a.visibleEyebrows)}`);
  console.log('\nthread:', result.thread);
  console.log('theme:', JSON.stringify(theme));
  console.log('deepLinks:', JSON.stringify(deepLinks));

  let fail = agreement.some((a) => !a.agrees);
  if (TAG !== 'before') {
    try {
      const before = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'regression-before.json'), 'utf8'));
      let diffs = 0;
      let maxDelta = 0;
      for (const id of IDS.slice(1)) {
        for (const p of Object.keys(before.textParity[id])) {
          for (const part of ['title', 'eyebrow']) {
            const a = before.textParity[id][p][part];
            const b = textParity[id][p][part];
            const d = Math.abs(a.o - b.o);
            maxDelta = Math.max(maxDelta, d);
            const ty = (t) => (t === 'none' ? 0 : parseFloat(t.split(',')[5]));
            if (d > 0.02 || Math.abs(ty(a.t) - ty(b.t)) > 0.5 || a.c !== b.c) {
              diffs++;
              console.log(`PARITY DIFF ${id} p=${p} ${part}: before=${JSON.stringify(a)} after=${JSON.stringify(b)}`);
            }
          }
        }
      }
      console.log(`\ntext parity chapters 1-4: ${diffs === 0 ? 'PASS' : 'FAIL'} (${diffs} diffs, max |d opacity| = ${maxDelta.toFixed(4)})`);
      if (diffs) fail = true;
      const themeSame = JSON.stringify(before.theme) === JSON.stringify(theme);
      console.log(`theme switch identical to before: ${themeSame ? 'PASS' : 'FAIL'}`);
      if (!themeSame) fail = true;
    } catch (e) {
      console.log('no before file to compare:', e.message);
    }
  }
  if (fail && TAG !== 'before') process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
