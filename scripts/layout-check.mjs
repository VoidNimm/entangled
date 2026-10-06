import { chromium } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const viewports = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1366, height: 640 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
];

const chapters = ['hero', 'noise', 'unravel', 'heat', 'stillness'];
const progresses = [0.1, 0.25, 0.5, 0.75, 0.9];

const OUTPUT_DIR = path.resolve('reference/after/5A');

async function run() {
  const browser = await chromium.launch();
  let anyFails = false;
  const report = [];

  for (const vp of viewports) {
    const vpName = `${vp.width}x${vp.height}`;
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    try {
      await page.goto(BASE_URL);
    } catch (e) {
      console.error(`Failed to navigate to ${BASE_URL}. Is the dev server running?`);
      process.exit(1);
    }
    await page.waitForLoadState('networkidle');

    for (let c = 0; c < chapters.length; c++) {
      for (const p of progresses) {
        // scroll with the hook
        await page.evaluate(({ c, p }) => {
          if (window.__entangled) {
            window.__entangled.scrollToProgress(c, p);
          } else {
            console.error('__entangled hook missing');
          }
        }, { c, p });

        // wait for 2 rAF + 300 ms
        await page.evaluate(() => new Promise(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 300)));
        }));

        const id = `${chapters[c]}-${p}`;
        const dir = path.join(OUTPUT_DIR, vpName);
        await fs.mkdir(dir, { recursive: true });
        await page.screenshot({ path: path.join(dir, `${id}.png`) });

        // assertions
        const fails = [];
        
        const checkResult = await page.evaluate(() => {
          const failures = [];
          // we shouldn't strictly require 14px on .eyebrow since the design ref says 11-12px.
          // PRD says body >= 14px, buttons/links >= 14px.
          const bodyText = Array.from(document.querySelectorAll('p, li, dd, dt'));
          const buttonsLinks = Array.from(document.querySelectorAll('button, a'));
          
          const textEls = Array.from(document.querySelectorAll('h1, h2, p, button, a, nav, .eyebrow, .dot-rail, .thread'));
          
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          
          textEls.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return; // invisible
            
            // Allow 1px tolerance
            if (Math.round(rect.left) < -1 || Math.round(rect.top) < -1 || Math.round(rect.right) > winW + 1 || Math.round(rect.bottom) > winH + 1) {
              failures.push(`Out of bounds: ${el.tagName}.${el.className} (${rect.left}, ${rect.top}, ${rect.right}, ${rect.bottom})`);
            }
          });

          bodyText.forEach(el => {
            const style = window.getComputedStyle(el);
            const size = parseFloat(style.fontSize);
            if (size < 14) failures.push(`Body font too small: ${size}px`);
          });

          buttonsLinks.forEach(el => {
            const style = window.getComputedStyle(el);
            const size = parseFloat(style.fontSize);
            if (size < 14) failures.push(`Button/link font too small: ${size}px`);
          });
          
          if (document.documentElement.scrollWidth > window.innerWidth) {
            failures.push(`Horizontal overflow: scrollWidth=${document.documentElement.scrollWidth} > innerWidth=${window.innerWidth}`);
          }
          
          return failures;
        });

        if (checkResult.length > 0) {
          fails.push(...checkResult);
        }

        report.push({ viewport: vpName, chapter: chapters[c], progress: p, fails });
        if (fails.length > 0) anyFails = true;
      }
    }
    await context.close();
  }
  await browser.close();

  await fs.writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  
  if (anyFails) {
    console.error('Layout checks failed. See reference/after/5A/report.json');
    process.exit(1);
  }
  console.log('Layout checks passed!');
}

run().catch(console.error);
