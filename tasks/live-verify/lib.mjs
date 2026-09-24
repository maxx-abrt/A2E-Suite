import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
export async function login(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const continueBtn = page.getByRole('button', { name: /^continue$/i });
  if (await continueBtn.count()) { await continueBtn.first().click(); await page.waitForTimeout(2500); }
  const signInBtn = page.getByRole('button', { name: /^sign in$/i });
  if (await signInBtn.count()) await signInBtn.first().click();
  await page.waitForURL((url) => !url.pathname.includes('/welcome'), { timeout: 30000 });
  await page.waitForTimeout(3000);
}

if (process.argv[1]?.endsWith('lib.mjs')) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(15000);
  await login(page);
  await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());
  console.log('BODY:\n', (await page.locator('body').innerText().catch(() => '')).slice(0, 3000));
  const buttons = await page.getByRole('button').allInnerTexts().catch(() => []);
  console.log('BUTTONS:', JSON.stringify(buttons));
  await page.screenshot({ path: 'tasks/live-verify/probe-calendar.png', fullPage: true });
  await browser.close();
}
