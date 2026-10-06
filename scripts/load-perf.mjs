import { chromium } from '@playwright/test';

async function measureTransfer(width, height, isMobile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height }, isMobile });
  const page = await context.newPage();

  let totals = { document: 0, js: 0, css: 0, font: 0, image: 0, media: 0, other: 0 };
  let initialTotals = null;

  page.on('response', async (res) => {
    try {
      const type = res.request().resourceType();
      let length = 0;
      try {
        const buffer = await res.body();
        length = buffer.length;
      } catch (e) {
        length = parseFloat(res.headers()['content-length'] || '0');
      }
      let cat = 'other';
      if (type === 'document') cat = 'document';
      else if (type === 'script') cat = 'js';
      else if (type === 'stylesheet') cat = 'css';
      else if (type === 'font') cat = 'font';
      else if (type === 'image') cat = 'image';
      else if (type === 'media') cat = 'media';
      
      totals[cat] += length;
    } catch (e) {}
  });

  await page.goto('http://localhost:4173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for LCP
  
  initialTotals = { ...totals };

  // Scroll to bottom
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
      }, 50);
    });
  });

  await page.waitForTimeout(2000);

  const format = (t) => {
    const o = {};
    for (let k in t) o[k] = (t[k] / 1024).toFixed(1) + ' KB';
    return o;
  };

  console.log(`\n=== ${isMobile ? 'Mobile' : 'Desktop'} ===`);
  console.log('Initial Load:');
  console.table(format(initialTotals));
  console.log('After Scrolling:');
  console.table(format(totals));

  await browser.close();
}

async function run() {
  await measureTransfer(1440, 900, false);
  await measureTransfer(390, 844, true);
}

run().catch(console.error);
