// Orchestrator Tier-2 verification: P4C.3 view expansion + rule editor (US-082/083),
// P4C.5 task overlay + quick-create (US-084/085). Drives the real /calendar UI on :3001.
//
// Real create path: there is no "New event" toolbar button. Events are created from
// the DAY view time grid ("Create event at <time>" slots). Editing (scope dialog) is
// only offered from the day/agenda surfaces by design (week/month are read-only).
import { chromium } from 'playwright';

import { login } from './lib.mjs';

const BASE = 'http://localhost:3001';
const RUN = Date.now().toString(36).slice(-5);
const SERIES = `P4C series ${RUN}`;
const TASK = `P4C task ${RUN}`;
const START_DAY = '2026-09-21'; // Monday, current month

const results = [];
const note = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
};
const check = async (id, fn) => {
  try {
    await fn();
  } catch (error) {
    note(id, false, String(error).split('\n')[0].slice(0, 260));
  }
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(20000);

// The task due overlay is the only calendar query filtering on `dueAt`.
const dueAtQueries = [];
page.on('request', (request) => {
  if (
    request.method() === 'POST' &&
    (request.postData() ?? '').includes('dueAt')
  ) {
    dueAtQueries.push(Date.now());
  }
});

const composer = page.getByTestId('calendar-event-composer');
const setView = async (mode) => {
  await page.getByTestId(`calendar-view-mode-${mode}`).click();
  await page.waitForTimeout(1200);
};
const countText = (text) => page.getByText(text, { exact: false }).count();

try {
  await login(page);
  note('login', true, page.url());

  await page.goto(`${BASE}/calendar`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // ---------- US-082/083: create a weekly Mon+Wed series, 6 occurrences, via the composer
  await setView('day');
  await page.getByTestId('calendar-slot-0').click();
  await composer.waitFor({ state: 'visible' });

  await composer.getByLabel('Title', { exact: true }).fill(SERIES);
  await composer.getByLabel('Start', { exact: true }).fill(START_DAY);
  await composer.getByLabel('End', { exact: true }).fill(START_DAY);

  await composer
    .getByRole('combobox', { name: 'Repeat', exact: true })
    .selectOption('weekly');
  await composer
    .getByRole('button', { name: 'Wednesday', exact: true })
    .click();
  await composer
    .getByRole('combobox', { name: 'Ends', exact: true })
    .selectOption('count');
  await composer
    .getByRole('spinbutton', { name: 'Number of occurrences', exact: true })
    .fill('6');

  await composer.getByTestId('calendar-event-composer-save').click();
  await composer.waitFor({ state: 'detached', timeout: 15000 });
  await page.waitForTimeout(2500);

  // Month view: Sep 21,23,28,30 (4 occurrences), then October 5,7 (2 more).
  await setView('month');
  const septemberCount = await countText(SERIES);
  note(
    'us082-expand',
    septemberCount === 4,
    `September month view renders ${septemberCount} of 6 occurrences (expect 4)`,
  );

  await page.getByRole('button', { name: 'Next period' }).click();
  await page.waitForTimeout(1500);
  // The October grid spills two late-September days (Sep 28/30) plus Oct 5/7.
  const octoberCount = await countText(SERIES);
  note(
    'us082-cross-month',
    octoberCount === 4,
    `October grid renders ${octoberCount} occurrences (2 fresh Oct 5/7 + 2 Sep spill, expect 4)`,
  );

  await page.getByRole('button', { name: 'Next period' }).click();
  await page.waitForTimeout(1500);
  const novemberCount = await countText(SERIES);
  note(
    'us082-series-end',
    novemberCount === 0,
    `series ends after 6 occurrences; November renders ${novemberCount} (expect 0)`,
  );

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForTimeout(1500);
  await setView('month');
  const reloadCount = await countText(SERIES);
  note(
    'us082-reload',
    reloadCount === 4,
    `after reload September still renders ${reloadCount} occurrences (expect 4, stored series expansion)`,
  );

  // ---------- US-083: whole-series edit shows the same rule back
  await page.getByRole('button', { name: 'Today' }).click();
  await page.waitForTimeout(1200);
  await setView('day');
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Previous period' }).click();
    await page.waitForTimeout(500);
  }
  const headerOk = await page
    .getByText(/September 21, 2026/)
    .first()
    .isVisible()
    .catch(() => false);
  note(
    'us083-day-navigation',
    headerOk,
    `day view anchor reached the series start (${START_DAY})`,
  );

  await page.getByText(SERIES, { exact: false }).first().click();
  await page.getByTestId('calendar-event-details').waitFor({ state: 'visible' });
  await page.getByTestId('calendar-event-edit').click();
  const scopeDialog = page.getByTestId('calendar-series-scope-dialog');
  await scopeDialog.waitFor({ state: 'visible' });
  note('us083-scope-dialog', true, 'scope dialog offers occurrence vs series');
  await page.getByTestId('calendar-series-scope-whole-series').click();
  await composer.waitFor({ state: 'visible' });

  const repeatValue = await composer
    .getByRole('combobox', { name: 'Repeat', exact: true })
    .inputValue();
  const endsValue = await composer
    .getByRole('combobox', { name: 'Ends', exact: true })
    .inputValue();
  const countValue = await composer
    .getByRole('spinbutton', { name: 'Number of occurrences', exact: true })
    .inputValue();
  const mondayPressed = await composer
    .getByRole('button', { name: 'Monday', exact: true })
    .getAttribute('aria-pressed');
  const wednesdayPressed = await composer
    .getByRole('button', { name: 'Wednesday', exact: true })
    .getAttribute('aria-pressed');
  const ruleRoundTrip =
    repeatValue === 'weekly' &&
    endsValue === 'count' &&
    countValue === '6' &&
    mondayPressed === 'true' &&
    wednesdayPressed === 'true';
  note(
    'us083-rule-roundtrip',
    ruleRoundTrip,
    `editor reopened the stored rule (repeat=${repeatValue}, ends=${endsValue}, count=${countValue}, Mon=${mondayPressed}, Wed=${wednesdayPressed})`,
  );
  await composer.getByRole('button', { name: /^Cancel/ }).click();
  await composer.waitFor({ state: 'detached' });

  // ---------- US-084/085: quick-create a standard task from a day, then overlay
  await page.getByTestId('calendar-day-add-task').click();
  const quickCreate = page.getByTestId('calendar-task-quick-create');
  await quickCreate.waitFor({ state: 'visible' });
  await page.getByTestId('calendar-task-quick-create-title').fill(TASK);
  await page.getByTestId('calendar-task-quick-create-submit').click();
  await quickCreate.waitFor({ state: 'detached', timeout: 15000 });
  await page.waitForTimeout(2000);
  const dayTaskCount = await countText(TASK);
  note(
    'us085-quick-create',
    dayTaskCount >= 1,
    `quick-created task appears on the chosen day (${dayTaskCount} chip)`,
  );

  await setView('month');
  const monthTaskCount = await countText(TASK);
  note(
    'us084-overlay',
    monthTaskCount >= 1,
    `task due-date overlay renders the deadline chip in month view (${monthTaskCount})`,
  );

  const beforeOpen = await countText(TASK);
  await page
    .getByTestId('calendar-task-due-toggle')
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await page.getByText(TASK, { exact: false }).first().click();
  await page.waitForTimeout(3000);
  const afterOpen = await countText(TASK);
  note(
    'us084-open-task',
    afterOpen > beforeOpen,
    `clicking the deadline opened the task record (title occurrences ${beforeOpen} -> ${afterOpen})`,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);

  const queriesBeforeToggle = dueAtQueries.length;
  await page.getByTestId('calendar-task-due-toggle').click();
  await page.waitForTimeout(2000);
  const queriesWhileHidden = dueAtQueries.length - queriesBeforeToggle;
  const chipGone = (await countText(TASK)) === 0;
  note(
    'us084-toggle-off',
    chipGone && queriesWhileHidden === 0,
    `overlay off hides the deadline chip (hidden=${chipGone}) and issued ${queriesWhileHidden} overdueAt task queries`,
  );
} catch (error) {
  note('fatal', false, String(error).slice(0, 300));
  await page
    .screenshot({ path: 'tasks/live-verify/p4c-fail.png', fullPage: true })
    .catch(() => {});
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
