export type CalendarRecurrenceWeekday =
  | 'MO'
  | 'TU'
  | 'WE'
  | 'TH'
  | 'FR'
  | 'SA'
  | 'SU';

// ISO order (Monday first) so serialized BYDAY lists and weekly expansion are
// deterministic regardless of the order the caller supplied them in.
export const CALENDAR_RECURRENCE_WEEKDAYS: CalendarRecurrenceWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

// `Temporal.PlainDate.dayOfWeek` is ISO: 1=Monday .. 7=Sunday.
export const CALENDAR_RECURRENCE_WEEKDAY_TO_DAY_OF_WEEK: Record<
  CalendarRecurrenceWeekday,
  number
> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};
