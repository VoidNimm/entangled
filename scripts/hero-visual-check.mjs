/**
 * hero-visual-check.mjs — screenshots, text/figure overlap and 4x-CPU frame timing for the hero.
 *
 * Usage: node scripts/hero-visual-check.mjs      (BASE_URL override supported)
 * Writes (only after the browser is closed, so the dev server does not reload mid-run):
 *   reference/after/hero/shots/<WxH>-p<progress>.png      hero scroll progress 0 .. 1 at 1920x1080 and 390x844
 *   reference/after/hero/overlap/<WxH>.png                hero at scrollY 0 for 1920x1080, 1440x900, 1280x720, 390x844
 *   reference/after/hero/visual-summary.json              overlap numbers + frame timing
 *
 * Overlap method: screenshot the hero with the text hidden, then count "figure" pixels
 * (strongly blue: b - r > 50; the mint background has b - r ~ 7) inside each text rectangle.
 */
import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUT = path.resolve('reference/after/hero');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const files = []; // {file, buffer}
const summary = { overlap: {}, perf: null };

async function ready(page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[role="status"]')) return false;
    const box = document.getElementById('hero-title')?.closest('div.absolute');
    if (!box || !window.__entangled) return false;
    return Array.from(box.querySelectorAll('.anim-target, [data-intro]')).every((el) => parseFloat(getComputedStyle(el).opacity) >= 0.99);
  }, null, { timeout: 20000 });
  await sleep(800);
}

async function open(browser, options) {
  const ctx = await browser.newContext(options);
  const page = await ctx.newPage();
  await page.goto(BASE_URL);
  await ready(page);
  return { ctx, page };
}

// ---------- 1. screenshots at hero progress ----------
for (const vp of [{ w: 1920, h: 1080 }, { w: 390, h: 844, mobile: true }]) {
  var browser = browser ?? (await chromium.launch());
  const { ctx, page } = await open(browser, { viewport: { width: vp.w, height: vp.h }, ...(vp.mobile ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  for (const p of [0, 0.15, 0.3, 0.45, 0.6, 1.0]) {
    await page.evaluate((p) => window.__entangled.scrollToScrubProgress(0, p), p);
    await sleep(1200);
    const buf = await page.screenshot();
    files.push({ file: `shots/${vp.w}x${vp.h}-p${p.toFixed(2)}.png`, buffer: buf });
    files.push({ file: `${vp.w}x${vp.h}-p${p.toFixed(2)}.png`, buffer: buf });
  }
  await ctx.close();
}

// ---------- 2. overlap ----------
const analyser = await (await browser.newContext()).newPage();
for (const vp of [{ w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 1280, h: 720 }, { w: 390, h: 844, mobile: true }]) {
  const { ctx, page } = await open(browser, { viewport: { width: vp.w, height: vp.h }, ...(vp.mobile ? { hasTouch: true, isMobile: true, deviceScaleFactor: 1 } : {}) });
  const name = `${vp.w}x${vp.h}`;
  files.push({ file: `overlap/${name}.png`, buffer: await page.screenshot() });
  // text rectangles: each title word, eyebrow, each rendered subtitle line, cue
  const rects = await page.evaluate(() => {
    const box = document.getElementById('hero-title').closest('div.absolute');
    const out = [];
    const add = (label, r) => { if (r.width > 0 && r.height > 0) out.push({ label, x: r.left, y: r.top, w: r.width, h: r.height }); };
    add('eyebrow', box.querySelector('.eyebrow-accent').getBoundingClientRect());
    box.querySelectorAll('#hero-title .anim-target').forEach((el, i) => add(`title-word-${i}:${el.textContent}`, el.getBoundingClientRect()));
    const sub = box.querySelector('p.anim-target:not(.eyebrow-accent)');
    const range = document.createRange();
    range.selectNodeContents(sub);
    Array.from(range.getClientRects()).forEach((r, i) => add(`subtitle-line-${i}`, r));
    {
      const cueEl = box.querySelector('.anim-target[aria-hidden="true"]');
      const inner = cueEl.querySelector('span') ?? cueEl;
      add('cue', inner.getBoundingClientRect());
    }
    return out;
  });
  await page.evaluate(() => { document.getElementById('hero-title').closest('div.absolute').style.visibility = 'hidden'; });
  const clean = (await page.screenshot()).toString('base64');
  await ctx.close();
  const result = await analyser.evaluate(async ({ clean, rects }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${clean}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const scale = 1; // overlap screenshots use deviceScaleFactor 1
    return rects.map((r) => {
      const x0 = Math.max(0, Math.floor(r.x * scale)), y0 = Math.max(0, Math.floor(r.y * scale));
      const w = Math.min(img.width - x0, Math.ceil(r.w * scale)), h = Math.min(img.height - y0, Math.ceil(r.h * scale));
      if (w <= 0 || h <= 0) return { ...r, figurePx: 0, gapPx: null };
      const d = g.getImageData(x0, y0, w, h).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 2] - d[i] > 50) n++;
      // nearest figure pixel to the right of the rect, same rows
      const rowBand = g.getImageData(x0 + w, y0, Math.max(1, img.width - x0 - w), h).data;
      const bw = Math.max(1, img.width - x0 - w);
      let left = null;
      for (let x = 0; x < bw && left === null; x++) for (let y = 0; y < h; y++) { const i = (y * bw + x) * 4; if (rowBand[i + 2] - rowBand[i] > 50) { left = x; break; } }
      return { label: r.label, figurePx: n, gapToFigureCssPx: left === null ? null : Math.round(left / scale) };
    });
  }, { clean, rects }).catch(async () => null);
  summary.overlap[name] = result;
}
await analyser.context().close();

// ---------- 3. 4x CPU throttle, 390x844, hero exit ----------
{
  const { ctx, page } = await open(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => { window.__frames.push(t - last); last = t; window.__raf = requestAnimationFrame(loop); };
    window.__raf = requestAnimationFrame(loop);
  });
  await sleep(300);
  await page.evaluate(() => { window.__frames.length = 0; });
  await page.mouse.move(195, 420);
  const heroLen = await page.evaluate(() => document.getElementById('hero').offsetHeight);
  const steps = Math.ceil((heroLen * 0.7) / 30);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 30); await sleep(16); }
  await sleep(600);
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__frames.slice(); });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await ctx.close();
  const s = [...frames].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  summary.perf = { cpuThrottle: 4, viewport: '390x844', frames: frames.length, p50Ms: +q(0.5).toFixed(1), p95Ms: +q(0.95).toFixed(1), maxMs: +s.at(-1).toFixed(1), over33ms: frames.filter((f) => f > 33.4).length };
}
await browser.close();

for (const f of files) {
  const p = path.join(OUT, f.file);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, f.buffer);
}
await fs.writeFile(path.join(OUT, 'visual-summary.json'), JSON.stringify(summary, null, 2));
for (const [k, v] of Object.entries(summary.overlap)) {
  console.log(`\n${k}`);
  console.table((v ?? []).filter((r) => r.figurePx > 0 || r.gapToFigureCssPx !== null && r.gapToFigureCssPx < 80));
}
console.log('perf', summary.perf);
