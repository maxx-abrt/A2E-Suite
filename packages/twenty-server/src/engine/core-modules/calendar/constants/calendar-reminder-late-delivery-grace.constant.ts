// The dispatch pass runs once a minute (CALENDAR_REMINDER_CRON_PATTERN), so a
// reminder that fires at (or just before) the event start — "At time of event"
// is reminderMinutes = 0 in the /calendar composer — is always observed a few
// seconds after its fire time, when the event has already started. Such a
// reminder may still be delivered up to this many minutes after its fire time.
// A reminder with a longer lead time is never delivered once the event started.
export const CALENDAR_REMINDER_LATE_DELIVERY_GRACE_MINUTES = 5;
