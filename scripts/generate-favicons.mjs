import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const svgContent = fs.readFileSync('public/favicon.svg', 'utf-8');
  await page.setContent(`<div style="display:flex;width:100vw;height:100vh;margin:0;padding:0;align-items:center;justify-content:center;">
    <div style="width:180px;height:180px;">${svgContent}</div>
  </div>`);

  const svgElement = await page.$('svg');
  if (svgElement) {
    // Override width/height
    await page.evaluate(() => {
      const svg = document.querySelector('svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
    });

    await page.setViewportSize({ width: 180, height: 180 });
    await svgElement.screenshot({ path: 'public/apple-touch-icon.png', omitBackground: true });
    
    await page.setContent(`<div style="display:flex;width:100vw;height:100vh;margin:0;padding:0;align-items:center;justify-content:center;">
      <div style="width:32px;height:32px;">${svgContent}</div>
    </div>`);
    await page.evaluate(() => {
      const svg = document.querySelector('svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
    });
    await page.setViewportSize({ width: 32, height: 32 });
    const svgElement32 = await page.$('svg');
    await svgElement32.screenshot({ path: 'public/favicon-32.png', omitBackground: true });
  }

  await browser.close();
})();
