import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:5173/');
  await page.goto('http://localhost:5173/');
  
  // Wait for the loader to finish
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15000 });
  await page.waitForTimeout(1000); // Wait a bit for the intro animation
  
  const dest = path.join(__dirname, '../reference/after/5C/browser_snapshot.png');
  await page.screenshot({ path: dest, fullPage: true });
  console.log(`Saved screenshot to ${dest}`);
  
  await browser.close();
}

run().catch(console.error);
