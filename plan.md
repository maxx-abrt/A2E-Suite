# Plan — Batch 12 continuation (Tier-0 only, code-only)

## 0) Operating constraints (non-negotiable)
- **Tier-0 / offline execution only**: no live servers, no dev servers, no browser checks.
- **Commit + push directly to `main`** (user-approved).
- **Quality gates before every commit** (for touched surfaces only):
  - `packages/twenty-server`: `npx tsgo -p tsconfig.json --noEmit`
  - `packages/twenty-front`: `npx tsgo -p tsconfig.json --noEmit` (only if front touched)
  - `npx oxlint --type-aware -c .oxlintrc.json <touched_files>`
  - Targeted `jest` suites for the affected modules.
- **Disk space safety**: do not inflate `/app`; if a pod reset happens, re-establish the `/opt/nm/node_modules` symlink workaround.
- **JSON edits**: update `tasks/prd.json` with a script (python), not regex.

## 1) Current status (scan result / what’s already done)

### 1.1 Confirmed completed / not-ticketable now
- **Backend readiness/liveness split**: already implemented and unit-tested (phase-00-report, 2026-09-13):
  - `/healthz` kept as liveness-only
  - `/readyz` readiness controller + DB/Redis indicators
  - worker health server + compose healthchecks
  - **No new ticket needed**.
- **P1.6e / P1.7a / P1.7b**: executor legs already landed; remaining work is **Tier-2 browser verification** and/or **D01-gated** (P1.7a export leg). These are **deferred**.
- **findOne-by-id repairs**: already completed in **a2e-chat** and **a2e-crm** (commit `9704802a`, orchestrator-verified). No new ticket needed.

### 1.2 Newly identified executor-runnable defects (Tier-0)
Remaining code-only work discovered in P4C.4 reminder + notification integration:

- **US-091 (P1, server)** — “At time of event” reminders (reminderMinutes = 0) never deliver.
  - Root cause:
    - `computeCalendarReminderSchedule()` treats `<= 0` as `NO_REMINDER_MINUTES`.
    - Candidate query requires `startsAt > now`, so reminders due exactly at start can never be selected.
  - Fix direction:
    - Accept `reminderMinutes = 0`.
    - Add a **late grace window constant** so “at time” (and very short lead times) can be dispatched even if `startsAt <= now` within grace.
    - Move “already started” policy fully into the util (single source of truth).
    - Remove dead/misleading `resolveEventTimezoneOffset` from the reminder util.

- **US-092 (P2, front)** — `CALENDAR_REMINDER` inbox rendering is generic and not navigable.
  - Symptoms:
    - Inbox item shows fallback **“Notification”** + bell icon.
    - Item is non-actionable because deep-link resolver does not understand `calendarEventId`.
  - Fix direction:
    - Add label **“Calendar reminder”** (mirror server email label).
    - Use `IconCalendarEvent`.
    - Add deep link to **`/calendar?panel=/object/calendarEvent/<id>`** based on payload key `calendarEventId`.

## 2) Objectives (updated)
1. **Fix and unit-test P4C.4 reminder delivery for reminderMinutes=0** (US-091), maintaining idempotency and quiet-hours rules.
2. **Fix and unit-test inbox UX for CALENDAR_REMINDER** (US-092): correct label, icon, and deep link.
3. **Produce `tasks/deferred-batch11.md`** documenting:
   - Tier-2-only legs and environment-required proofs
   - D05-gated reminder policy items (attendee recipients, quiet-hours defer-vs-drop, etc.)
   - Any work that is browser/live dependent
4. **Traceability for orchestrator**:
   - Update `tasks/prd.json` with US-091/US-092 entries via python script.
   - Add phase report entries (phase-04) describing changes + Tier-0 gates.
   - Commit per story and push.

## 3) Work queue (execution order)
1. **US-091 (server, P1)**: fix reminderMinutes=0 + late grace window + util cleanup.
2. **US-092 (front, P2)**: inbox label/icon/deeplink for `CALENDAR_REMINDER`.
3. **Documentation batch output**: write `tasks/deferred-batch11.md` (exclusions + residuals), and ensure phase/prd updates are coherent.

## 4) Implementation steps (revised)

### 4.1 Step 0 — Environment preflight (fast)
- Verify disk space and node_modules layout; re-apply `/opt/nm/node_modules` symlink if needed.
- Confirm `@types/lodash.kebabcase` still exists to avoid `tsgo` flakiness.

### 4.2 US-091 — Server reminderMinutes=0 delivery correctness
**Files likely involved**
- `packages/twenty-server/src/engine/core-modules/calendar/utils/calendar-reminder.util.ts`
- `packages/twenty-server/src/engine/core-modules/calendar/services/calendar-reminder.service.ts`
- Existing calendar reminder Jest specs under `packages/twenty-server/src/engine/core-modules/calendar/__tests__/`

**Work**
- Update scheduler util:
  - Treat `reminderMinutes === 0` as valid.
  - Define a constant grace window (e.g. `CALENDAR_REMINDER_LATE_GRACE_MS`).
  - Ensure the “already started” policy is consistently applied in the util (and reflected in tests).
  - Remove `resolveEventTimezoneOffset` (dead/misleading).
- Update dispatch candidate selection to allow at-start reminders to be considered:
  - Use util-driven due logic with grace window rather than excluding `startsAt <= now` too early.
- Add/adjust Jest tests:
  - `reminderMinutes=0` delivered when `startsAt == now` and within grace.
  - Past-start beyond grace is skipped.
  - Existing idempotency behavior unaffected.

**Quality gates (US-091)**
- `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit`
- `npx oxlint --type-aware -c .oxlintrc.json <touched_files>`
- `cd packages/twenty-server && npx jest src/engine/core-modules/calendar src/engine/core-modules/notification` (or narrower if possible)

**Traceability**
- Add US-091 to `tasks/prd.json` (python update).
- Add a phase-04 report entry: intent, root cause, fix, tests, residual Tier-2 notes.
- Commit message: `US-091: deliver calendar reminders scheduled at event start (0-minute lead)`.

### 4.3 US-092 — Front inbox CALENDAR_REMINDER usability
**Files likely involved**
- `packages/twenty-front/src/modules/inbox/components/InboxNotificationItem.tsx`
- `packages/twenty-front/src/modules/inbox/utils/resolveNotificationDeepLink.ts`
- Relevant inbox Jest tests under `packages/twenty-front/src/modules/inbox/utils/__tests__/`

**Work**
- Add `CALENDAR_REMINDER` label + icon mapping in `InboxNotificationItem`.
- Extend `resolveNotificationDeepLink`:
  - If payload contains `calendarEventId`, deep link to `/calendar?panel=/object/calendarEvent/<id>`.
  - Keep the function defensive (null if missing ids).
- Add/adjust Jest tests:
  - Deep link resolves correctly for `CALENDAR_REMINDER`.
  - Inbox item uses expected label (and remains non-actionable when payload incomplete).

**Quality gates (US-092)**
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit`
- `npx oxlint --type-aware -c .oxlintrc.json <touched_files>`
- `cd packages/twenty-front && npx jest src/modules/inbox` (or narrower)

**Traceability**
- Add US-092 to `tasks/prd.json` (python update).
- Add a phase-04 report entry.
- Commit message: `US-092: show calendar reminders as actionable inbox items`.

### 4.4 Deferred-batch output — `tasks/deferred-batch11.md`
Create/refresh `tasks/deferred-batch11.md` summarizing what cannot be done in Tier-0:
- **Tier-2/browser/live proofs** remaining for:
  - P4C.4 reminder delivery proof (worker/cron runtime)
  - P1.6e/P1.7a/P1.7b remaining legs
- **D05 / policy-gated reminder requirements**:
  - quiet-hours policy: defer vs drop (currently drop)
  - all-day UTC-midnight reminders timing expectations
  - attendee recipients vs creator-only
  - per-occurrence reminders for recurring series
- Any other “Next: orchestrator” / environment-required items found during scan.

## 5) Update checklist per ticket (orchestrator-facing trace)
For each US (US-091, US-092):
1. Implement code + tests.
2. Run Tier-0 gates.
3. Update `tasks/prd.json` (python script) with:
   - id, title, description, priority, dependsOn, completionNotes, passes=false
4. Append to `docs/plan/phases/phase-04-report.md` with:
   - base commit, what changed, tests run, remaining Tier-2 proof.
5. Commit to `main` and push.

## 6) Explicit exclusions (updated)
- Do not attempt anything requiring:
  - running Postgres/Redis/worker processes
  - browser journeys / Playwright
  - live `/calendar` or `/inbox` UI verification
- P1.7a export leg remains **D01-gated** and deferred.
- P4C.4 attendee/timezone semantics remain **D05-gated** and deferred.
