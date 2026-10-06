import { test, expect, chromium, webkit, firefox } from '@playwright/test';

// We'll write this script as a standalone Playwright script that launches the browser and runs the checks.
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const url = 'http://localhost:5173';
  let server = null;
  const isUp = await fetch(url).then(() => true).catch(() => false);
  if (!isUp) {
    console.log('Starting dev server...');
    server = exec('npm run dev -- --port 5173');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await fetch(url).then(() => true).catch(() => false)) break;
    }
  }

  for (const browserType of [chromium, webkit, firefox]) {
    console.log(`\n--- Running tests on ${browserType.name()} ---`);
    const browser = await browserType.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. CLS and Loader
    console.log('Testing loader and CLS...');
    let clsValue = 0;
    await page.exposeFunction('reportCLS', (val) => { clsValue = val; });
    await page.addInitScript(() => {
      let cls = 0;
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            cls += entry.value;
            window.reportCLS(cls);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    await page.goto(url);
    const appRoot = page.locator('#root > div').first(); // wrapper with aria-busy
    await expect(appRoot).toHaveAttribute('aria-busy', 'true', { timeout: 1000 });
    
    // check scroll lock
    const body = page.locator('body');
    await expect(body).toHaveCSS('overflow', 'hidden');

    // wait for loader to finish
    await expect(appRoot).toHaveAttribute('aria-busy', 'false', { timeout: 8000 });
    await expect(body).not.toHaveCSS('overflow', 'hidden');

    console.log(`CLS: ${clsValue}`);
    if (clsValue > 0.05) console.warn(`CLS > 0.05! (${clsValue})`);

    // 2. Deep link
    console.log('Testing deep link...');
    await page.goto(`${url}/#heat`);
    await expect(appRoot).toHaveAttribute('aria-busy', 'false', { timeout: 8000 });
    // Wait a bit for Lenis to scroll
    await page.waitForTimeout(1000);
    const scrollY = await page.evaluate(() => window.scrollY);
    console.log(`Deep link scrollY: ${scrollY}`);
    if (scrollY === 0) console.error('Deep link failed to scroll!');

    // 3. Keyboard navigation & live region
    console.log('Testing keyboard navigation...');
    await page.goto(url);
    await expect(appRoot).toHaveAttribute('aria-busy', 'false', { timeout: 8000 });
    
    // Tab to skip link
    await page.keyboard.press('Tab');
    const focused1 = await page.evaluate(() => document.activeElement.textContent);
    console.log(`First focus: ${focused1}`);

    // Space to scroll
    await page.evaluate(() => window.scrollTo(0, 0)); // reset
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    const newScrollY = await page.evaluate(() => window.scrollY);
    console.log(`ScrollY after space: ${newScrollY}`);

    // Live region
    const liveRegion = page.locator('.sr-only[aria-live="polite"]');
    const text = await liveRegion.textContent();
    console.log(`Live region text: ${text}`);

    // 4. Error Boundary
    console.log('Testing Error Boundary...');
    await page.goto(`${url}/?crash=1`);
    const errorText = page.locator('text="Something went wrong while loading the experience."');
    await expect(errorText).toBeVisible();

    await browser.close();
  }

  // Noscript
  console.log('\n--- Testing Noscript ---');
  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(url);
  await page.screenshot({ path: path.join(__dirname, '../reference/after/5C/noscript.png') });
  await browser.close();

  if (server) server.kill();
  console.log('Done.');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
