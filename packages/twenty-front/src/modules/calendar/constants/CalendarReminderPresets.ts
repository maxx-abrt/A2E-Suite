// Reminder lead-time presets (minutes before the event start) offered in the
// composer, in ascending order. `null` — "no reminder" — is rendered as a
// separate empty option, and `0` means "at time of event". These map directly
// to the standard `calendarEvent.reminderMinutes` NUMBER field (P4C.4).
export const CALENDAR_REMINDER_MINUTE_PRESETS = [
  0, 5, 10, 15, 30, 60, 1440,
] as const;
