// Recurring task generator — the pure step logic behind the
// `recurring-task-generator` workflow action. It turns a recurrence recipe
// plus a time window into the concrete task occurrences that are due, and
// mints a stable recurrence key so the handler can skip an occurrence the
// engine already created (a replayed workflow run must not duplicate work).
//
// Calendar math is UTC and anchored on `startsAt` instead of stepping from the
// previous occurrence, so monthly recipes never drift (Jan 31 → Feb 28 →
// Mar 31). The window is half-open [from, to) : consecutive windows never
// share an occurrence, which is what lets a daily cron create each occurrence
// exactly once.
//
// Kept pure and clock-injectable: node:test pins the calendar math and the
// manifest builder never has to import a live client.

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type RecurringTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type RecurringTaskTemplate = {
  title: string;
  projectId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startsAt: string;
  projectStatus?: RecurringTaskStatus;
};

export type RecurrenceWindow = {
  from: string;
  to: string;
};

export type RecurringTaskOccurrence = {
  title: string;
  projectId: string;
  dueAt: string;
  projectStatus?: RecurringTaskStatus;
  recurrenceKey: string;
};

export type RecurringTaskGeneratorInput = {
  template: RecurringTaskTemplate;
  window?: RecurrenceWindow;
};

export const DEFAULT_RECURRENCE_WINDOW_HOURS = 24;
export const MAX_RECURRENCE_OCCURRENCES = 1000;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const DAYS_PER_WEEK = 7;
const MONTHS_PER_YEAR = 12;
const MAX_RECURRENCE_INTERVAL = 1000;

const parseDate = (value: string, label: string): Date => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date ${label} invalide : « ${value} ».`);
  }

  return date;
};

// An interval of 0 would loop forever and a fraction has no calendar meaning;
// clamp instead of throwing so a bad builder default cannot wedge a run.
export const normalizeRecurrenceInterval = (interval: number): number => {
  if (!Number.isFinite(interval)) {
    return 1;
  }

  return Math.min(MAX_RECURRENCE_INTERVAL, Math.max(1, Math.trunc(interval)));
};

const daysInUtcMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const addMonthsClamped = (anchor: Date, months: number): Date => {
  const firstOfTargetMonth = new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() + months,
      1,
      anchor.getUTCHours(),
      anchor.getUTCMinutes(),
      anchor.getUTCSeconds(),
      anchor.getUTCMilliseconds(),
    ),
  );
  const day = Math.min(
    anchor.getUTCDate(),
    daysInUtcMonth(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth(),
    ),
  );

  firstOfTargetMonth.setUTCDate(day);

  return firstOfTargetMonth;
};

const computeOccurrenceAt = (
  anchor: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  index: number,
): Date => {
  if (frequency === 'MONTHLY') {
    return addMonthsClamped(anchor, index * interval);
  }

  const stepMilliseconds =
    frequency === 'WEEKLY'
      ? interval * DAYS_PER_WEEK * MILLISECONDS_PER_DAY
      : interval * MILLISECONDS_PER_DAY;

  return new Date(anchor.getTime() + index * stepMilliseconds);
};

// Skip the occurrences that ended before the window instead of walking the
// whole history from `startsAt` (a daily recipe older than ~3 years would
// otherwise blow past MAX_RECURRENCE_OCCURRENCES before reaching the window).
const firstIndexForWindow = (
  anchor: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  fromTime: number,
): number => {
  if (fromTime <= anchor.getTime()) {
    return 0;
  }

  if (frequency === 'MONTHLY') {
    const elapsedMonths =
      (new Date(fromTime).getUTCFullYear() - anchor.getUTCFullYear()) *
        MONTHS_PER_YEAR +
      (new Date(fromTime).getUTCMonth() - anchor.getUTCMonth());

    return Math.max(0, Math.floor(elapsedMonths / interval) - 1);
  }

  const stepMilliseconds =
    frequency === 'WEEKLY'
      ? interval * DAYS_PER_WEEK * MILLISECONDS_PER_DAY
      : interval * MILLISECONDS_PER_DAY;

  return Math.max(
    0,
    Math.floor((fromTime - anchor.getTime()) / stepMilliseconds) - 1,
  );
};

export const computeRecurrenceKey = (
  template: RecurringTaskTemplate,
  dueAt: string,
): string => `${template.projectId}:${template.title}:${dueAt}`;

export const resolveRecurrenceWindow = (
  input: RecurringTaskGeneratorInput,
  now: Date,
): RecurrenceWindow => {
  if (input.window !== undefined) {
    return {
      from: parseDate(input.window.from, 'de début de fenêtre').toISOString(),
      to: parseDate(input.window.to, 'de fin de fenêtre').toISOString(),
    };
  }

  return {
    from: new Date(
      now.getTime() - DEFAULT_RECURRENCE_WINDOW_HOURS * MILLISECONDS_PER_HOUR,
    ).toISOString(),
    to: now.toISOString(),
  };
};

export const computeRecurringTaskOccurrences = (
  template: RecurringTaskTemplate,
  window: RecurrenceWindow,
): RecurringTaskOccurrence[] => {
  const anchor = parseDate(template.startsAt, 'de début');
  const fromTime = parseDate(window.from, 'de début de fenêtre').getTime();
  const toTime = parseDate(window.to, 'de fin de fenêtre').getTime();

  if (toTime < fromTime) {
    throw new Error(
      'Fenêtre de récurrence inversée : la fin précède le début.',
    );
  }

  const interval = normalizeRecurrenceInterval(template.interval);
  const startIndex = firstIndexForWindow(
    anchor,
    template.frequency,
    interval,
    fromTime,
  );
  const occurrences: RecurringTaskOccurrence[] = [];
  const iterationBudget = MAX_RECURRENCE_OCCURRENCES + 2;

  for (
    let index = startIndex, iteration = 0;
    iteration < iterationBudget &&
    occurrences.length < MAX_RECURRENCE_OCCURRENCES;
    index += 1, iteration += 1
  ) {
    const dueAtDate = computeOccurrenceAt(
      anchor,
      template.frequency,
      interval,
      index,
    );
    const dueTime = dueAtDate.getTime();

    if (dueTime >= toTime) {
      break;
    }

    if (dueTime >= fromTime) {
      const dueAt = dueAtDate.toISOString();

      occurrences.push({
        title: template.title,
        projectId: template.projectId,
        dueAt,
        recurrenceKey: computeRecurrenceKey(template, dueAt),
        ...(template.projectStatus === undefined
          ? {}
          : { projectStatus: template.projectStatus }),
      });
    }
  }

  return occurrences;
};
