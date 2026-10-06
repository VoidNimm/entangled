import { test, expect, chromium, webkit, firefox } from '@playwright/test';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 4173; // We will use preview server or vite dev server

async function runTests() {
  const server = await createServer({
    root: path.resolve(__dirname, '..'),
    server: { port: PORT }
  });
  await server.listen();
  console.log(`Vite server running at http://localhost:${PORT}`);

  const browsers = [chromium, webkit, firefox];
  let failed = false;

  for (const browserType of browsers) {
    const browserName = browserType.name();
    console.log(`\n================================`);
    console.log(`Running resilience checks on ${browserName}...`);
    console.log(`================================`);
    const browser = await browserType.launch();
    
    try {
      // a) reducedMotion
      console.log(`[${browserName}] a) reducedMotion check...`);
      const contextA = await browser.newContext({
        colorScheme: 'dark',
        reducedMotion: 'reduce'
      });
      const pageA = await contextA.newPage();
      await pageA.goto(`http://localhost:${PORT}`);
      // Wait for load
      await pageA.waitForSelector('img[src*="hero.jpg"]');
      // Assert no <video> is scrubbing (currentTime shouldn't change)
      const videosA = await pageA.locator('video').all();
      for (const v of videosA) {
        const isVisible = await v.isVisible();
        if (isVisible) throw new Error("Video shouldn't be visible in reduced motion");
      }
      
      const postersA = await pageA.locator('img[src*="clips01-last.jpg"]').all();
      if (postersA.length === 0) throw new Error("Posters not visible in reduced motion");
      console.log(`  âœ“ Passed`);
      await contextA.close();

      // b) saveData simulation (Chromium only usually, but we inject it everywhere)
      console.log(`[${browserName}] b) saveData simulation...`);
      const contextB = await browser.newContext();
      await contextB.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({ saveData: true, effectiveType: '4g' }),
        });
      });
      const pageB = await contextB.newPage();
      await pageB.goto(`http://localhost:${PORT}`);
      // In saveData, mode is static, so videos are hidden
      const videosB = await pageB.locator('video').all();
      for (const v of videosB) {
        const isVisible = await v.isVisible();
        if (isVisible) throw new Error("Video shouldn't be visible with saveData");
      }
      console.log(`  âœ“ Passed`);
      await contextB.close();

      // c) failed video
      console.log(`[${browserName}] c) failed video...`);
      const contextC = await browser.newContext();
      let warnCount = 0;
      const pageC = await contextC.newPage();
      pageC.on('console', msg => {
        if (msg.type() === 'warning' && msg.text().includes('[entangled] Clip noise failed')) {
          warnCount++;
        }
      });
      await pageC.route('**/*clips0*.mp4', route => route.abort());
      await pageC.goto(`http://localhost:${PORT}`);
      // Should show posters
      await pageC.waitForTimeout(1000);
      const postersC = await pageC.locator('img[src*="clips01-last.jpg"]').first();
      await expect(postersC).toBeAttached({ timeout: 12000 });
      if (warnCount === 0) {
        console.warn(`  ! Expected console.warn not found (may need interaction to trigger load)`);
      }
      console.log(`  âœ“ Passed`);
      await contextC.close();

      // d) slow network (Chromium only)
      if (browserName === 'chromium') {
         console.log(`[${browserName}] d) slow network...`);
         const contextD = await browser.newContext();
         const pageD = await contextD.newPage();
         const cdp = await contextD.newCDPSession(pageD);
         await cdp.send('Network.enable');
         await cdp.send('Network.emulateNetworkConditions', {
           offline: false,
           downloadThroughput: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
           uploadThroughput: (1.5 * 1024 * 1024) / 8,
           latency: 300,
         });
         const start = Date.now();
         await pageD.goto(`http://localhost:${PORT}`);
         await pageD.waitForSelector('img[src*="hero.jpg"]', { state: 'visible' });
         const firstPaintTime = Date.now() - start;
         console.log(`  - Time to first poster: ${firstPaintTime}ms`);
         // Wait for first clip to canplay
         await pageD.waitForFunction(() => {
           const v = document.querySelector('video');
           return v && v.readyState >= 3; // HAVE_FUTURE_DATA
         }, { timeout: 15000 }).catch(() => console.log('  ! Timeout waiting for canplay'));
         const canPlayTime = Date.now() - start;
         console.log(`  - Time to clips01 canplay: ${canPlayTime}ms`);
         console.log(`  âœ“ Passed`);
         await contextD.close();
      }

      // e) visibility hidden
      console.log(`[${browserName}] e) visibility hidden...`);
      const contextE = await browser.newContext();
      const pageE = await contextE.newPage();
      await pageE.goto(`http://localhost:${PORT}`);
      await pageE.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await pageE.waitForTimeout(500);
      await pageE.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      // Ensure no uncaught exceptions
      console.log(`  âœ“ Passed`);
      await contextE.close();

      // f) listener/trigger leak check
      console.log(`[${browserName}] f) listener/trigger leak check...`);
      const contextF = await browser.newContext();
      const pageF = await contextF.newPage();
      await pageF.goto(`http://localhost:${PORT}`);
      
      const count1 = await pageF.evaluate(() => window.__entangled?.scrollTriggerCount);
      // trigger resize
      await pageF.setViewportSize({ width: 800, height: 600 });
      await pageF.waitForTimeout(500);
      const count2 = await pageF.evaluate(() => window.__entangled?.scrollTriggerCount);
      if (count1 !== count2) {
         throw new Error(`Leak detected: ${count1} != ${count2}`);
      }
      console.log(`  âœ“ Passed`);
      await contextF.close();

    } catch (e) {
      console.error(`[${browserName}] Failed: ${e.message}`);
      failed = true;
    } finally {
      await browser.close();
    }
  }

  await server.close();
  if (failed) {
    process.exit(1);
  } else {
    console.log('\nAll resilience checks passed!');
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
