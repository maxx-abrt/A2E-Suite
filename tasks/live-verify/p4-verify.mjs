// Orchestrator Tier-2 harness: P4.1 project-object layout proof and P4.2
// board / my-tasks render proofs on the installed a2e-projects app, plus the
// known task-calendar defect. Creates its own fixtures (NULL/DONE
// projectStatus) and removes them afterwards.
//
// Usage: node tasks/live-verify/p4-verify.mjs
import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';

import { login } from './lib.mjs';

const BASE = 'http://localhost:3001';
const GRAPHQL = 'http://localhost:3000/graphql';
const API_KEY = readFileSync(
  new URL('./.apikey', import.meta.url),
  'utf8',
).trim();
const PROJECT = '955f2587-c97d-4065-aebb-1c9bdd0d071c'; // Livraison de projet (LIV)
const VIEW = {
  assigned: '71f99783-a361-40ee-956c-1555f8211b2e',
  created: '23ab2fb6-24eb-4a9a-8adf-b9d623fdbaf8',
  overdue: '621097ec-981e-401b-a655-5c0bada37cf6',
  calendar: '33718ddf-7834-4435-8972-31424b16788c',
};
const RUN = Date.now().toString(36).slice(-5);
const NULL_TITLE = `P4 probe null ${RUN}`;
const DONE_TITLE = `P4 probe done ${RUN}`;

const results = [];
const note = (id, ok, detail) => {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
};

const gql = async (query, variables) => {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  return json.data;
};

let nullId = null;
let doneId = null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
page.setDefaultTimeout(15000);
const body = () => page.locator('body').innerText();
const countText = (t) => page.getByText(t, { exact: false }).count();
const tab = (name) =>
  page
    .locator('[data-testid^="tab-"]')
    .filter({ hasText: new RegExp(`^${name}$`) })
    .first();

try {
  // Fixtures: one NULL projectStatus overdue, one DONE overdue, same project.
  const created = await gql(
    `mutation($t:String!,$p:String!){ createTask(data:{title:$t,dueAt:"2026-09-15T12:00:00.000Z",projectId:$p}){id} }`,
    { t: NULL_TITLE, p: PROJECT },
  );
  nullId = created.createTask.id;
  await gql(`mutation($id:UUID!){ updateTask(id:$id,data:{projectStatus:null}){id} }`, {
    id: nullId,
  });
  const done = await gql(
    `mutation($t:String!,$p:String!){ createTask(data:{title:$t,dueAt:"2026-09-16T12:00:00.000Z",projectId:$p,projectStatus:DONE}){id} }`,
    { t: DONE_TITLE, p: PROJECT },
  );
  doneId = done.createTask.id;

  await login(page);

  // --- P4.2 my-tasks folder: three smart lists render
  for (const [viewId, label] of [
    [VIEW.assigned, 'Assignées à moi'],
    [VIEW.created, 'Créées par moi'],
    [VIEW.overdue, 'En retard'],
  ]) {
    await page.goto(`${BASE}/objects/tasks?viewId=${viewId}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3500);
    const text = await body();
    note(
      `p4.2-my-tasks-${label}`,
      text.includes(label),
      `smart list "${label}" renders`,
    );
  }

  // --- P4.2 overdue: NULL projectStatus included, DONE excluded
  const nullInOverdue = await countText(NULL_TITLE);
  const doneInOverdue = await countText(DONE_TITLE);
  note(
    'p4.2-overdue-null-included',
    nullInOverdue >= 1 && doneInOverdue === 0,
    `En retard: NULL-projectStatus task ${nullInOverdue >= 1 ? 'shown' : 'MISSING'}, DONE ${doneInOverdue === 0 ? 'excluded' : 'WRONGLY SHOWN'}`,
  );

  // --- P4.2 calendar view: KNOWN DEFECT (GroupByTasks complexity > cap)
  await page.goto(`${BASE}/objects/tasks?viewId=${VIEW.calendar}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(6000);
  const nullInCalendar = await countText(NULL_TITLE);
  note(
    'p4.2-calendar-renders',
    nullInCalendar >= 1,
    `task-calendar view shows the due task (${nullInCalendar}) — known defect when 0: GroupByTasks exceeds the server complexity cap (2001>2000)`,
  );

  // --- P4.1 + P4.2 project page: tabs, board, relations
  await page.goto(`${BASE}/object/project/${PROJECT}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(6000);
  let text = await body();
  const tabs = ['Timeline', 'Tâches', 'Tableau', 'Fichiers', 'Documents'];
  const missing = tabs.filter((t) => !text.includes(t));
  note(
    'p4.1-project-layout-tabs',
    missing.length === 0,
    `project record page renders layout tabs (missing: ${missing.join(',') || 'none'})`,
  );

  await tab('Tableau').click();
  await page.waitForTimeout(3500);
  text = await body();
  const columns = ['À faire', 'En cours', 'Terminé'];
  const missingCols = columns.filter((c) => !text.includes(c));
  note(
    'p4.2-board-visible',
    missingCols.length === 0,
    `kanban renders the Statut columns (missing: ${missingCols.join(',') || 'none'})`,
  );

  await tab('Tâches').click();
  await page.waitForTimeout(3500);
  text = await body();
  note(
    'p4.1-project-relations',
    text.includes(NULL_TITLE) || text.includes(DONE_TITLE),
    `project Tâches tab renders related task rows`,
  );
} catch (error) {
  note('fatal', false, String(error).slice(0, 300));
} finally {
  if (nullId) {
    await gql(`mutation($id:UUID!){ deleteTask(id:$id){id} }`, { id: nullId }).catch(
      () => {},
    );
  }
  if (doneId) {
    await gql(`mutation($id:UUID!){ deleteTask(id:$id){id} }`, { id: doneId }).catch(
      () => {},
    );
  }
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
