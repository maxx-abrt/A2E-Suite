# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Recurring calendar edits/deletes go through pure dispatchers first.** `applyCalendarEventEdit` / `applyCalendarEventDelete` in `packages/twenty-front/src/modules/calendar/utils/` own the this-occurrence/whole-series semantics; `planCalendarSeriesMutations.ts` rebuilds the series state from stored rows (`buildCalendarRecurrenceSeriesStateFromEvents`) and only serializes the dispatcher output to record writes. Never re-implement the skip/detach math — add a planner that calls the dispatcher.
- **Recurrence is stored on the standard `calendarEvent` as 5 nullable TEXT columns** (`recurrenceRule`, `recurrenceTimezone`, `recurrenceSeriesId`, `recurrenceOccurrenceDay`, `recurrenceSkippedOccurrenceDays` = JSON day array). Occurrence id = `<seriesId>@<day>`, series id = `calendar-series#<anchorId>`. Add any new field to `CalendarEventRecord` **and** the `recordGqlFields` of both `useCalendarEvents` and `useCalendarEventMutations`, and update the 4 calendar test fixtures.

---

## [2026-09-21] - US-068
- Wired the this-occurrence-vs-whole-series scope dialog into `/calendar`: new `CalendarSeriesScopeDialog`, `shouldPromptCalendarSeriesScope`/`isCalendarRecurringEvent`/`isCalendarLocalEditSurface`, and `planCalendarSeriesMutations` (4 planners) routing through the existing `applyCalendarEventEdit`/`applyCalendarEventDelete`.
- Extended `CalendarEventRecord`/`CalendarEventInput` with the 5 recurrence columns; `useCalendarEvents`/`useCalendarEventMutations` now select them; added `deleteCalendarEvents` for whole-series deletion.
- Day/agenda details + composer offer the dialog; month/week details now show a read-only hint (interpretation of "week/month stay read-only, no new edit paths").
- Files changed: calendar module types/hooks/components/utils (+9 new utils, 1 new component, 1 new spec) and `pages/calendar/CalendarPage.tsx`.
- **Learnings:**
  - The front does not render expanded occurrences yet (stored rows only) — a series shows as its anchor plus detached siblings; occurrence-level expansion is a separate slice.
  - `applyCalendarEventDelete` returns `CalendarRecurrenceSeriesState | null` for the union, so a this-occurrence call still needs a null-guard for tsgo.
  - `isNonEmptyString` comes from `@sniptt/guards`, not `twenty-shared/utils`.
---
