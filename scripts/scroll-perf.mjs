import { test, chromium } from '@playwright/test';
import * as fs from 'fs';

async function measurePerf(width, height, isMobile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  const client = await page.context().newCDPSession(page);
  
  if (isMobile) {
    // 4x CPU throttle
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // wait for videos to load and loader to disappear

  await browser.startTracing(page, { path: `trace-${isMobile ? 'mobile' : 'desktop'}.json` });

  await page.evaluate(async () => {
    return new Promise((resolve) => {
      let y = 0;
      const scroll = setInterval(() => {
        window.scrollBy(0, 50); // smoother scroll for perf
        y += 50;
        if (y >= document.body.scrollHeight) {
          clearInterval(scroll);
          resolve();
        }
      }, 16);
    });
  });

  await browser.stopTracing();
  await browser.close();
  console.log(`Trace saved for ${isMobile ? 'mobile' : 'desktop'}`);
}

async function run() {
  console.log('Measuring desktop...');
  await measurePerf(1440, 900, false);
  console.log('Measuring mobile...');
  await measurePerf(390, 844, true);
}

run().catch(console.error);
