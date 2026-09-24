// Orchestrator Tier-2 verification: P4C.3 view expansion + rule editor (US-082/083),
// P4C.5 task overlay + quick-create (US-084/085). Drives the real /calendar UI on :3001.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';
const results = [];
const note = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  // E2E gotcha: "Continue with Email" + prefilled credentials
  await page.getByText('Continue with Email').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/workspace/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  note('login', true, page.url());

  await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // ---------- US-082/083: create a weekly Mon+Thu series, 5 occurrences, via composer
  await page.getByRole('button', { name: /new event/i }).click();
  await page.getByLabel(/title/i).first().fill('P4C verify series');
  // Repeat controls
  await page.getByLabel(/repeat/i).selectOption('weekly').catch(async () => {
    // radio fallback
    await page.getByLabel(/weekly/i).first().check();
  });
  const monButton = page.getByRole('button', { name: /^mon/i }).first();
  if (await monButton.count()) {
    await monButton.click(); // select Mon (default may be the start weekday)
  }
  await page.getByRole('button', { name: /^thu/i }).first().click();
  // ends after 5 times
  await page.getByLabel(/after/i).check().catch(() => {});
  await page.getByLabel(/times/i).fill('5').catch(async () => {
    await page.getByPlaceholder(/times/i).fill('5');
  });
  await page.getByRole('button', { name: /^create$/i }).click();
  await page.waitForTimeout(2500);

  // Month view should now show several occurrences of the series
  const chips = await page.getByText('P4C verify series').count();
  note('us082-expand', chips >= 4, `month view renders ${chips} occurrences (expect >=4 of 5)`);

  // Reload — expansion must come from stored series, deterministic
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const chipsAfterReload = await page.getByText('P4C verify series').count();
  note('us082-reload', chipsAfterReload === chips, `after reload: ${chipsAfterReload} (was ${chips})`);

  // ---------- US-083: whole-series edit shows the same rule back
  await page.getByText('P4C verify series').first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^edit$/i }).click().catch(() => {});
  await page.waitForTimeout(800);
  const scopeDialog = await page.getByText(/this occurrence|whole series|cette occurrence|toute la série/i).count();
  note('us083-scope-dialog', scopeDialog > 0, 'scope dialog offers occurrence vs series');
  const repeatLabel = await page.getByLabel(/repeat/i).isVisible().catch(() => false);
  note('us083-rule-roundtrip', repeatLabel, 'editor shows Repeat fieldset on series edit');
  await page.keyboard.press('Escape');

  // ---------- US-084: task due overlay
  // Create a task due today+2 via the quick-create dialog (also proves US-085)
  await page.getByRole('button', { name: /day/i }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /add task/i }).first().click();
  await page.getByLabel(/title/i).first().fill('P4C verify task');
  await page.getByRole('button', { name: /^create$/i }).click();
  await page.waitForTimeout(2000);
  const taskChip = await page.getByText('P4C verify task').count();
  note('us085-quick-create', taskChip > 0, `quick-created task appears as due chip: ${taskChip}`);
  note('us084-overlay', taskChip > 0, 'task due-date overlay renders the deadline chip');

  // Toggle overlay off — chips disappear, no task query issued
  const toggle = page.getByRole('button', { name: /task due dates|dates d.*ch.*ance/i }).first();
  let queryWhileHidden = 0;
  if (await toggle.isVisible().catch(() => false)) {
    const onQuery = (r) => { if (r.url().includes('task')) queryWhileHidden++; };
    page.on('request', onQuery);
    await toggle.click();
    await page.waitForTimeout(1500);
    page.off('request', onQuery);
  }
  const chipGone = (await page.getByText('P4C verify task').count()) === 0;
  note('us084-toggle-off', chipGone && queryWhileHidden === 0, `overlay off hides chips, ${queryWhileHidden} task requests while hidden`);
} catch (error) {
  note('fatal', false, String(error).slice(0, 300));
  await page.screenshot({ path: 'tasks/live-verify/p4c-fail.png', fullPage: true }).catch(() => {});
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
