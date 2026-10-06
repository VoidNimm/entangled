import { test, chromium } from '@playwright/test';
import * as fs from 'fs';

async function runLeakTest() {
  const browser = await chromium.launch({ headless: true });
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    console.log(`\nTesting ${size.width}x${size.height}`);
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    async function getStats() {
      return await page.evaluate(() => {
        const memory = performance.memory;
        const ent = window.__entangled || {};
        return {
          scrollTriggers: ent.ScrollTrigger?.getAll().length || 0,
          tickers: ent.gsap?.ticker?.getListeners?.() || 0,
          domNodes: document.querySelectorAll('*').length,
          jsHeap: memory ? memory.usedJSHeapSize : null,
        };
      });
    }

    console.log('Initial stats:', await getStats());

    for (let pass = 1; pass <= 3; pass++) {
      // scroll to bottom
      await page.evaluate(async () => {
        return new Promise((resolve) => {
          let y = 0;
          const scroll = setInterval(() => {
            window.scrollBy(0, 500);
            y += 500;
            if (y >= document.body.scrollHeight) {
              clearInterval(scroll);
              resolve();
            }
          }, 16);
        });
      });
      await page.waitForTimeout(1000);
      
      // scroll to top
      await page.evaluate(async () => {
        return new Promise((resolve) => {
          let y = document.body.scrollHeight;
          const scroll = setInterval(() => {
            window.scrollBy(0, -500);
            y -= 500;
            if (y <= 0) {
              clearInterval(scroll);
              resolve();
            }
          }, 16);
        });
      });
      await page.waitForTimeout(1000);
      console.log(`Stats after pass ${pass}:`, await getStats());
    }
    await context.close();
  }
  await browser.close();
}

runLeakTest().catch(console.error);
