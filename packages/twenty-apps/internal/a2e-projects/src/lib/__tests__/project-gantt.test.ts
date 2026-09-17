import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildGanttBars,
  buildGanttDependencyLinks,
  buildGanttModel,
  collectGanttRange,
  computeGanttDayWindow,
  computeGanttRowWindow,
  getGanttStatusColor,
  parseGanttTimestamp,
  resolveGanttTaskBounds,
} from '../project-gantt.ts';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const DUE_AT = '2026-01-11T00:00:00.000Z';

test('an invalid, empty or missing date parses to null', () => {
  assert.equal(parseGanttTimestamp(DUE_AT), Date.parse(DUE_AT));
  assert.equal(parseGanttTimestamp(null), null);
  assert.equal(parseGanttTimestamp(undefined), null);
  assert.equal(parseGanttTimestamp(''), null);
  assert.equal(parseGanttTimestamp('not-a-date'), null);
});

test('the bar spans createdAt to dueAt, whichever order they arrive in', () => {
  assert.deepEqual(
    resolveGanttTaskBounds({ id: 't1', createdAt: CREATED_AT, dueAt: DUE_AT }),
    {
      startMs: Date.parse(CREATED_AT),
      endMs: Date.parse(DUE_AT),
      isMilestone: false,
    },
  );
  assert.deepEqual(
    resolveGanttTaskBounds({ id: 't1', createdAt: DUE_AT, dueAt: CREATED_AT }),
    {
      startMs: Date.parse(CREATED_AT),
      endMs: Date.parse(DUE_AT),
      isMilestone: false,
    },
  );
});

test('a single known date collapses to a milestone marker', () => {
  assert.deepEqual(resolveGanttTaskBounds({ id: 't1', dueAt: DUE_AT }), {
    startMs: Date.parse(DUE_AT),
    endMs: Date.parse(DUE_AT),
    isMilestone: true,
  });
  assert.equal(resolveGanttTaskBounds({ id: 't1' }), null);
  assert.equal(
    resolveGanttTaskBounds({ id: 't1', createdAt: '', dueAt: 'nope' }),
    null,
  );
});

test('the range pads the placed tasks and keeps a minimum span', () => {
  const range = collectGanttRange(
    [{ id: 't1', createdAt: CREATED_AT, dueAt: DUE_AT }],
    { nowMs: Date.parse(DUE_AT) },
  );

  // 2025-12-30 (two padding days) + the 14-day minimum pushes the end to
  // 2026-01-13, one day past the last due date.
  assert.equal(
    new Date(range.startMs).toISOString(),
    '2025-12-30T00:00:00.000Z',
  );
  assert.equal(range.dayCount, 14);
  assert.equal(new Date(range.endMs).toISOString(), '2026-01-13T00:00:00.000Z');
});

test('an empty or undated project falls back to a centred now window', () => {
  const nowMs = Date.parse('2026-06-15T12:00:00.000Z');
  const range = collectGanttRange([{ id: 't1' }], { nowMs });

  assert.equal(
    new Date(range.startMs).toISOString(),
    '2026-06-13T00:00:00.000Z',
  );
  assert.equal(range.dayCount, 14);
});

test('a wide project stretches the range instead of the minimum window', () => {
  const range = collectGanttRange([
    {
      id: 't1',
      createdAt: '2026-01-01T00:00:00.000Z',
      dueAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 't2',
      createdAt: '2026-03-01T00:00:00.000Z',
      dueAt: '2026-03-05T00:00:00.000Z',
    },
  ]);

  assert.equal(range.dayCount, 66);
  assert.equal(
    new Date(range.startMs).toISOString(),
    '2025-12-30T00:00:00.000Z',
  );
});

test('bars carry relative day offsets, span and status, ready to render', () => {
  const tasks = [
    {
      id: 'b',
      title: 'B',
      createdAt: CREATED_AT,
      dueAt: DUE_AT,
      projectStatus: 'DONE',
    },
    {
      id: 'a',
      title: 'A',
      dueAt: '2026-01-02T00:00:00.000Z',
      projectStatus: 'TODO',
    },
    { id: 'c', title: 'C' },
  ];
  const range = collectGanttRange(tasks, { nowMs: Date.parse(DUE_AT) });
  const bars = buildGanttBars(tasks, range);

  // C has no parsable date and is dropped; B (created Jan 1) precedes A
  // (milestone on Jan 2) by bar start.
  assert.deepEqual(
    bars.map((bar) => bar.taskId),
    ['b', 'a'],
  );
  assert.deepEqual(
    {
      startDay: bars[0].startDay,
      daySpan: bars[0].daySpan,
      status: bars[0].status,
    },
    { startDay: 2, daySpan: 10, status: 'DONE' },
  );
  assert.equal(bars[1].isMilestone, true);
  assert.equal(bars[1].title, 'A');
});

test('a missing title falls back to the task id and a blank one is trimmed', () => {
  const range = collectGanttRange([
    { id: 't1', dueAt: DUE_AT },
    { id: 't2', title: '  ', dueAt: DUE_AT },
  ]);
  const bars = buildGanttBars(
    [
      { id: 't1', dueAt: DUE_AT },
      { id: 't2', title: '  ', dueAt: DUE_AT },
    ],
    range,
  );

  assert.deepEqual(
    bars.map((bar) => bar.title),
    ['t1', 't2'],
  );
});

test('dependency links follow the parentTask edge and need both endpoints', () => {
  const tasks = [
    { id: 'parent', dueAt: DUE_AT },
    { id: 'child', dueAt: DUE_AT, parentTask: { id: 'parent' } },
    { id: 'orphan', dueAt: DUE_AT, parentTask: { id: 'missing' } },
    { id: 'undated', parentTask: { id: 'parent' } },
  ];
  const placedTaskIds = new Set(['parent', 'child', 'orphan']);

  assert.deepEqual(buildGanttDependencyLinks(tasks, placedTaskIds), [
    { fromTaskId: 'parent', toTaskId: 'child' },
  ]);
});

test('the row window renders only the viewport plus overscan', () => {
  const window = computeGanttRowWindow({
    scrollTop: 0,
    viewportHeight: 640,
    rowHeight: 32,
    rowCount: 1000,
    overscan: 4,
  });

  // 20 visible rows + 4 overscan above/below — 1k tasks never mount 1k rows.
  assert.deepEqual(window, {
    startIndex: 0,
    endIndex: 24,
    offsetY: 0,
    totalHeight: 32000,
  });
});

test('scrolling shifts the row window and preserves the spacer offset', () => {
  const window = computeGanttRowWindow({
    scrollTop: 32 * 500,
    viewportHeight: 640,
    rowHeight: 32,
    rowCount: 1000,
    overscan: 4,
  });

  assert.equal(window.startIndex, 496);
  assert.equal(window.endIndex, 524);
  assert.equal(window.offsetY, 496 * 32);
});

test('the row window clamps past both ends of the list', () => {
  const atTop = computeGanttRowWindow({
    scrollTop: -100,
    viewportHeight: 96,
    rowHeight: 32,
    rowCount: 10,
    overscan: 2,
  });
  const atBottom = computeGanttRowWindow({
    scrollTop: 99999,
    viewportHeight: 96,
    rowHeight: 32,
    rowCount: 10,
    overscan: 2,
  });

  assert.equal(atTop.startIndex, 0);
  assert.equal(atBottom.startIndex, 5);
  assert.equal(atBottom.endIndex, 10);
  assert.equal(atBottom.offsetY, 160);
});

test('the day window virtualizes the horizontal axis too', () => {
  const atStart = computeGanttDayWindow({
    scrollLeft: 0,
    viewportWidth: 720,
    dayWidth: 36,
    dayCount: 100,
    overscan: 4,
  });
  const scrolled = computeGanttDayWindow({
    scrollLeft: 36 * 50,
    viewportWidth: 720,
    dayWidth: 36,
    dayCount: 100,
    overscan: 4,
  });

  assert.deepEqual(
    {
      startDay: atStart.startDay,
      endDay: atStart.endDay,
      offsetX: atStart.offsetX,
    },
    { startDay: 0, endDay: 24, offsetX: 0 },
  );
  assert.deepEqual(
    {
      startDay: scrolled.startDay,
      endDay: scrolled.endDay,
      offsetX: scrolled.offsetX,
    },
    { startDay: 46, endDay: 74, offsetX: 46 * 36 },
  );
  assert.equal(atStart.totalWidth, 3600);
});

test('the assembled model mounts a bounded slice of a 1k-task project', () => {
  const tasks = Array.from({ length: 1000 }, (_, index) => ({
    id: `task-${index}`,
    title: `Tâche ${index}`,
    createdAt: new Date(
      Date.parse(CREATED_AT) + index * 60 * 60 * 1000,
    ).toISOString(),
    dueAt: new Date(Date.parse(DUE_AT) + index * 60 * 60 * 1000).toISOString(),
    projectStatus: 'IN_PROGRESS',
    parentTask: index === 0 ? null : { id: `task-${index - 1}` },
  }));
  const model = buildGanttModel(tasks, {
    viewportHeight: 640,
    viewportWidth: 720,
    scrollTop: 0,
    scrollLeft: 0,
    nowMs: Date.parse(DUE_AT),
  });

  assert.equal(model.bars.length, 1000);
  assert.equal(model.rows.length, 24);
  assert.equal(model.totalHeight, 32000);
  assert.equal(model.rows[0].rowIndex, 0);
  assert.equal(model.rows[23].rowIndex, 23);
  assert.equal(model.dayTicks.length, 24);
  assert.equal(model.links.length, 999);
  assert.deepEqual(
    model.rows.map((row) => row.taskId),
    model.bars.slice(0, 24).map((bar) => bar.taskId),
  );
});

test('the status colour maps the pipeline and falls back to gray', () => {
  assert.equal(getGanttStatusColor('DONE'), 'var(--t-color-green)');
  assert.equal(getGanttStatusColor('TODO'), 'var(--t-color-gray)');
  assert.equal(getGanttStatusColor(null), 'var(--t-color-gray)');
  assert.equal(getGanttStatusColor('UNKNOWN'), 'var(--t-color-gray)');
});
