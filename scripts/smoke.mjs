import { chromium, firefox, webkit } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function runBrowser(browserType, name) {
  const browser = await browserType.launch({ headless: true });
  
  for (const view of [{ w: 1440, h: 900, mobile: false }, { w: 390, h: 844, mobile: true }]) {
    const context = await browser.newContext({ viewport: { width: view.w, height: view.h }, isMobile: view.mobile });
    const page = await context.newPage();
    const dir = `reference/after/6A/${name}/${view.w}x${view.h}`;
    fs.mkdirSync(dir, { recursive: true });

    let errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    console.log(`\nTesting ${name} at ${view.w}x${view.h}`);
    await page.goto('http://localhost:4173');
    
    // Wait for loader to finish
    await page.waitForSelector('div[role="status"]', { state: 'detached', timeout: 15000 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: path.join(dir, '01-hero.jpg') });
    
    // Scroll down slowly and check active chapter
    const chapters = ['hero', 'noise', 'unravel', 'heat', 'stillness'];
    const seenChapters = new Set();
    
    let activeChapter = 'hero';
    seenChapters.add('hero');
    
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(500);
      
      const current = await page.evaluate(() => {
        // Find active chapter by looking at the nav links
        const activeLink = document.querySelector('nav ul li a[aria-current="page"]');
        return activeLink ? activeLink.getAttribute('href').replace('#', '') : null;
      });
      
      if (current && current !== activeChapter) {
        activeChapter = current;
        seenChapters.add(current);
        await page.screenshot({ path: path.join(dir, `02-${current}.jpg`) });
      }
      
      if (current === 'stillness') break;
    }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, '03-bottom.jpg') });
    
    // Click start over
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start over'));
      if (btn) btn.click();
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(dir, '04-start-over.jpg') });
    
    const scrolledUp = await page.evaluate(() => window.scrollY < 100);
    
    console.log(`Errors: ${errors.length}`);
    if (errors.length) console.log(errors.slice(0, 3));
    console.log(`Seen chapters: ${Array.from(seenChapters).join(', ')}`);
    console.log(`Scrolled back up: ${scrolledUp}`);
    
    await context.close();
  }
  await browser.close();
}

async function run() {
  await runBrowser(chromium, 'chromium');
  await runBrowser(firefox, 'firefox');
  await runBrowser(webkit, 'webkit');
}

run().catch(console.error);
