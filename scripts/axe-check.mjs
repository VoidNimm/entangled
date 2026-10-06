import { test, expect, chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { exec } from 'child_process';

async function run() {
  const server = exec('npm run preview -- --port 4174');
  await new Promise(r => setTimeout(r, 3000));
  const url = 'http://localhost:4174';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const analyze = async (name) => {
    console.log(`Analyzing ${name}...`);
    // Need to wait for loaders etc if any, wait for app to be ready
    await page.waitForSelector('#main-content', { state: 'attached' });
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(v => ['serious', 'critical'].includes(v.impact));
    if (violations.length === 0) {
      console.log(`  âœ“ ${name} passed`);
    } else {
      console.log(`  âœ— ${name} failed:`);
      for (const v of violations) {
        console.log(`    - ${v.id} (${v.impact}): ${v.description}`);
        console.log(`      Nodes: ${v.nodes.map(n => n.html).join(', ')}`);
      }
    }
  };

  await page.goto(url);
  // Wait for loader to disappear
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 10000 });
  await page.waitForTimeout(1000);
  await analyze('Hero');

  await page.goto(`${url}/#noise`);
  await page.waitForTimeout(1000);
  await analyze('Light mid-chapter (Noise)');

  await page.goto(`${url}/#heat`);
  await page.waitForTimeout(1000);
  await analyze('Dark chapter (Heat)');

  await page.goto(`${url}/#stillness`);
  await page.waitForTimeout(1000);
  await analyze('Final chapter (Stillness)');

  // Mobile menu
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mobileContext.newPage();
  await mPage.goto(url);
  await mPage.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 10000 });
  await mPage.click('#mobile-menu-btn');
  await mPage.waitForTimeout(500);
  
  console.log(`Analyzing Mobile Menu...`);
  const results = await new AxeBuilder({ page: mPage }).analyze();
  const violations = results.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  if (violations.length === 0) {
    console.log(`  âœ“ Mobile Menu passed`);
  } else {
    console.log(`  âœ— Mobile Menu failed:`);
    for (const v of violations) {
      console.log(`    - ${v.id} (${v.impact}): ${v.description}`);
      console.log(`      Nodes: ${v.nodes.map(n => n.html).join(', ')}`);
    }
  }

  await browser.close();
  server.kill();
  console.log('Done.');
}

run().catch(console.error);
