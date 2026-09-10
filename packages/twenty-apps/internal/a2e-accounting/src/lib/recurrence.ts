export type Recurrence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const addMonthsClamped = (date: Date, months: number): Date => {
  const targetMonth = date.getUTCMonth() + months;
  const candidate = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      targetMonth,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ),
  );

  // 31 January + 1 month must land on 28/29 February, not drift into March.
  if (candidate.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    return new Date(Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0));
  }

  return candidate;
};

export const nextOccurrence = (from: Date, recurrence: Recurrence): Date => {
  switch (recurrence) {
    case 'WEEKLY':
      return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'MONTHLY':
      return addMonthsClamped(from, 1);
    case 'QUARTERLY':
      return addMonthsClamped(from, 3);
    case 'YEARLY':
    default:
      return addMonthsClamped(from, 12);
  }
};

// A generator that was offline for weeks must catch up without firing a storm of
// duplicates: return every due date up to `until`, capped.
export const dueOccurrences = (
  nextAt: Date,
  recurrence: Recurrence,
  until: Date,
  maxOccurrences = 12,
): Date[] => {
  const occurrences: Date[] = [];
  let cursor = nextAt;

  while (cursor.getTime() <= until.getTime() && occurrences.length < maxOccurrences) {
    occurrences.push(cursor);
    cursor = nextOccurrence(cursor, recurrence);
  }

  return occurrences;
};

export const isOverdue = (dueDate: string, reference: Date = new Date()): boolean =>
  dueDate.slice(0, 10) < reference.toISOString().slice(0, 10);

export const daysUntil = (date: string, reference: Date = new Date()): number => {
  const target = Date.parse(date.slice(0, 10));
  const from = Date.parse(reference.toISOString().slice(0, 10));

  return Math.round((target - from) / (24 * 60 * 60 * 1000));
};
