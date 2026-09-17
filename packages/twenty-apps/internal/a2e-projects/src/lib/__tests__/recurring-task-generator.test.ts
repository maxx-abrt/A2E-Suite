import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_RECURRENCE_WINDOW_HOURS,
  MAX_RECURRENCE_OCCURRENCES,
  computeRecurrenceKey,
  computeRecurringTaskOccurrences,
  normalizeRecurrenceInterval,
  resolveRecurrenceWindow,
  type RecurringTaskTemplate,
} from '../recurring-task-generator.ts';

// Pure calendar math for the recurring generator step. Every assertion pins a
// UTC instant: a workflow run must be reproducible, so "now" never leaks in.

const dailyTemplate = (
  overrides: Partial<RecurringTaskTemplate> = {},
): RecurringTaskTemplate => ({
  title: 'Revue hebdo',
  projectId: 'project-1',
  frequency: 'DAILY',
  interval: 1,
  startsAt: '2026-09-01T09:00:00.000Z',
  ...overrides,
});

test('a daily recipe emits one occurrence per day inside the window', () => {
  const occurrences = computeRecurringTaskOccurrences(dailyTemplate(), {
    from: '2026-09-03T00:00:00.000Z',
    to: '2026-09-05T00:00:00.000Z',
  });

  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.dueAt),
    ['2026-09-03T09:00:00.000Z', '2026-09-04T09:00:00.000Z'],
  );
  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.recurrenceKey),
    [
      'project-1:Revue hebdo:2026-09-03T09:00:00.000Z',
      'project-1:Revue hebdo:2026-09-04T09:00:00.000Z',
    ],
  );
});

test('the window is half-open: an occurrence exactly at `to` is excluded', () => {
  const occurrences = computeRecurringTaskOccurrences(dailyTemplate(), {
    from: '2026-09-03T09:00:00.000Z',
    to: '2026-09-04T09:00:00.000Z',
  });

  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.dueAt),
    ['2026-09-03T09:00:00.000Z'],
  );
});

test('an interval of 2 on a weekly recipe skips a week at a time', () => {
  const occurrences = computeRecurringTaskOccurrences(
    dailyTemplate({
      frequency: 'WEEKLY',
      interval: 2,
      startsAt: '2026-09-07T08:00:00.000Z',
    }),
    { from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' },
  );

  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.dueAt),
    ['2026-09-07T08:00:00.000Z', '2026-09-21T08:00:00.000Z'],
  );
});

test('a monthly recipe stays anchored on the start day instead of drifting', () => {
  const occurrences = computeRecurringTaskOccurrences(
    dailyTemplate({
      frequency: 'MONTHLY',
      startsAt: '2026-01-31T10:00:00.000Z',
    }),
    { from: '2026-01-01T00:00:00.000Z', to: '2026-05-01T00:00:00.000Z' },
  );

  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.dueAt),
    [
      '2026-01-31T10:00:00.000Z',
      '2026-02-28T10:00:00.000Z',
      '2026-03-31T10:00:00.000Z',
      '2026-04-30T10:00:00.000Z',
    ],
  );
});

test('a far-future window does not walk the whole history from startsAt', () => {
  const occurrences = computeRecurringTaskOccurrences(
    dailyTemplate({
      frequency: 'MONTHLY',
      startsAt: '2000-01-15T12:00:00.000Z',
    }),
    { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' },
  );

  assert.deepEqual(
    occurrences.map((occurrence) => occurrence.dueAt),
    ['2026-09-15T12:00:00.000Z'],
  );
});

test('a window with no due occurrence yields an empty list', () => {
  const occurrences = computeRecurringTaskOccurrences(dailyTemplate(), {
    from: '2026-09-03T09:30:00.000Z',
    to: '2026-09-03T18:00:00.000Z',
  });

  assert.deepEqual(occurrences, []);
});

test('the occurrence cap bounds a window that contains more than it can hold', () => {
  const occurrences = computeRecurringTaskOccurrences(dailyTemplate(), {
    from: '2026-09-01T00:00:00.000Z',
    to: '2036-09-01T00:00:00.000Z',
  });

  assert.equal(occurrences.length, MAX_RECURRENCE_OCCURRENCES);
});

test('the project status travels with every occurrence when the recipe sets one', () => {
  const occurrences = computeRecurringTaskOccurrences(
    dailyTemplate({ projectStatus: 'IN_PROGRESS' }),
    { from: '2026-09-03T00:00:00.000Z', to: '2026-09-04T00:00:00.000Z' },
  );

  assert.equal(occurrences[0]?.projectStatus, 'IN_PROGRESS');
  assert.equal(
    'projectStatus' in
      computeRecurringTaskOccurrences(dailyTemplate(), {
        from: '2026-09-03T00:00:00.000Z',
        to: '2026-09-04T00:00:00.000Z',
      })[0]!,
    false,
  );
});

test('the default window is the last 24 hours ending at now', () => {
  const now = new Date('2026-09-17T16:00:00.000Z');
  const window = resolveRecurrenceWindow({ template: dailyTemplate() }, now);

  assert.equal(window.to, '2026-09-17T16:00:00.000Z');
  assert.equal(
    new Date(window.to).getTime() - new Date(window.from).getTime(),
    DEFAULT_RECURRENCE_WINDOW_HOURS * 60 * 60 * 1000,
  );
});

test('an explicit window is normalized to canonical ISO instants', () => {
  const window = resolveRecurrenceWindow(
    {
      template: dailyTemplate(),
      window: {
        from: '2026-09-03T02:00:00+02:00',
        to: '2026-09-04T02:00:00+02:00',
      },
    },
    new Date('2026-09-17T16:00:00.000Z'),
  );

  assert.deepEqual(window, {
    from: '2026-09-03T00:00:00.000Z',
    to: '2026-09-04T00:00:00.000Z',
  });
});

test('an unusable interval is clamped to a safe whole number', () => {
  assert.equal(normalizeRecurrenceInterval(0), 1);
  assert.equal(normalizeRecurrenceInterval(-4), 1);
  assert.equal(normalizeRecurrenceInterval(2.9), 2);
  assert.equal(normalizeRecurrenceInterval(Number.NaN), 1);
});

test('the recurrence key is stable for the same template and due instant', () => {
  const template = dailyTemplate();
  const dueAt = '2026-09-03T09:00:00.000Z';

  assert.equal(
    computeRecurrenceKey(template, dueAt),
    computeRecurrenceKey(template, dueAt),
  );
  assert.equal(
    computeRecurrenceKey(template, dueAt),
    'project-1:Revue hebdo:2026-09-03T09:00:00.000Z',
  );
});

test('invalid dates and an inverted window are rejected instead of guessed', () => {
  assert.throws(
    () =>
      computeRecurringTaskOccurrences(dailyTemplate({ startsAt: 'nope' }), {
        from: '2026-09-03T00:00:00.000Z',
        to: '2026-09-04T00:00:00.000Z',
      }),
    /invalide/,
  );

  assert.throws(
    () =>
      computeRecurringTaskOccurrences(dailyTemplate(), {
        from: '2026-09-04T00:00:00.000Z',
        to: '2026-09-03T00:00:00.000Z',
      }),
    /inversée/,
  );
});
