export type CalendarRecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export const CALENDAR_RECURRENCE_FREQUENCIES: CalendarRecurrenceFrequency[] = [
  'daily',
  'weekly',
  'monthly',
];

// RFC 5545 FREQ tokens, so a rule serializes to a value a future RRULE bridge
// can reuse without inventing a second vocabulary.
export const CALENDAR_RECURRENCE_FREQUENCY_TO_TOKEN: Record<
  CalendarRecurrenceFrequency,
  string
> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};
