# Executor brief — P4C.4 reminders: apply the workspace fields + live delivery proof

One pending brief. Report to `docs/plan/phases/phase-04-report.md`. The
orchestrator ticks P4C.4 after verifying your evidence; never tick PLAN.md.

## Task

- ID / title: `P4C.4-reminder-live` — make the reminder fields exist on the dev
  workspace and prove idempotent reminder delivery end to end.
- Phase file: `docs/plan/phases/phase-04-report.md`
- Goal in one sentence: on the running dev stack, apply the P4C.4 reminder
  workspace command to the `Apple` workspace and prove that a due event yields
  exactly one `CALENDAR_REMINDER` notification with `reminderDeliveredAt` set.
- In scope: apply the field metadata + column; confirm the composer round-trips
  `reminderMinutes`; run a worker from HEAD; observe one idempotent delivery.
- Explicitly out of scope: attendee/team invite rights, quiet-hours/timezone
  policy (D05), provider-synced events, the reminder UI itself (already shipped).

## Read first — only these

- `AGENTS.md` (upgrade-command rules, i18n catalog rule)
- `packages/twenty-server/src/database/commands/upgrade-version-command/2-39/2-39-workspace-command-1790502600000-add-calendar-event-reminder-fields.command.ts`
- `packages/twenty-server/src/engine/core-modules/calendar/services/calendar-reminder.service.ts`
- `docs/plan/phases/phase-04-report.md` — the 2026-09-27 orchestrator entry
- Orchestrator state found this session (already true):
  - `core."fieldMetadata"` for `calendarEvent` on the Apple workspace
    (`20202020-1c25-4d02-bf25-6aeccf7ea419`) has **no** `reminderMinutes` /
    `reminderDeliveredAt` rows, and the workspace table has no matching columns —
    the 2-39 workspace command has **not** been applied.
  - `dist/main` (11:40) already compiles the reminder module/cron, but the
    `dist/queue-worker` processes are from 2026-09-13 (stale) and cannot process
    the `workspaceQueue` reminder job.

## Do

1. From repo root, dry-run then run the workspace upgrade for the Apple
   workspace only:
   `npx nx run twenty-server:command -- upgrade --dry-run --workspace-id 20202020-1c25-4d02-bf25-6aeccf7ea419`
   then the same without `--dry-run`. The `upgrade` command takes
   `-w, --workspace-id` and `-d, --dry-run` (`upgrade.command.ts`); it runs every
   pending step, so confirm the log only adds the reminder fields for this
   workspace and does not destructively re-run other 2-39 commands.
2. Confirm the field metadata rows and the `_calendarEvent.reminderMinutes` /
   `reminderDeliveredAt` columns now exist (query `core."fieldMetadata"` +
   `information_schema.columns` for the Apple workspace schema).
3. Start a worker from HEAD: `npx nx run twenty-server:worker` (reuse the running
   server/Postgres/Redis; do not restart the front).
4. Create a standard local event via GraphQL/`tasks/live-verify/gql.mjs` with
   `startsAt` ~10 min ahead and `reminderMinutes=5`, owned by a member whose
   notifications you can read. Wait one cron tick (`* * * * *`).
5. Re-read the event: `reminderDeliveredAt` set; exactly one notification of
   type `CALENDAR_REMINDER` for the creator (no duplicate on the next tick).
6. Also round-trip the composer control: create an event through
   `/calendar` with `Reminder = 15 minutes before`, reopen it, and confirm the
   select reopens on `15`.

## Verify — run exactly these, nothing more

- Field presence query (metadata rows + columns) → both present.
- The GraphQL/notification read after one tick → `reminderDeliveredAt` non-null,
  one `CALENDAR_REMINDER`, no duplicate after a second tick.
- Composer reopen → `[data-testid="calendar-event-composer-reminder"]` value `15`.
- `npx tsgo -p tsconfig.json --noEmit` in `packages/twenty-server` → exit 0.

## Then

- Append the executor report (PROMPT.md format) to `phase-04-report.md` with the
  raw command output for each check.
- Stop. Do not tick PLAN.md.

## Stop conditions — report BLOCKED instead of thrashing

- The upgrade invocation would mutate other workspaces or re-run already-applied
  commands → report the exact command and stop.
- No notification channel is observable in this environment → report what you
  could read (`reminderDeliveredAt` alone is not delivery) and stop.
- Session ~2/3 consumed → write the report now.

## Console / safety

- Do not commit i18n catalogs or the `core`/workspace DB dumps.
- Never edit a committed upgrade command's logic; the reminder command is already
  slotted at `1790502600000`.
