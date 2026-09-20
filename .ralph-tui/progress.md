# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Testing an onboarding page without Apollo/Jotai:** mock the data hook module (`jest.mock('@/marketplace/hooks/useMarketplaceApps')` + `jest.mocked(...).mockReturnValue(... as unknown as ReturnType<typeof hook>)`), mock the heavy child (`A2eWorkspaceTemplatePicker`) to a testid div, mock the mutation hook factory, and wrap the render in `I18nProvider i18n={i18n}` + `await dynamicActivate(SOURCE_LOCALE)` in `beforeAll`. Use `~/pages/...` (not `@/pages/...` — `@/` maps to `src/modules` only). See `src/pages/onboarding/__tests__/InstallApps.test.tsx`.
- **Testing a search provider's caller scoping + ILIKE rendering:** run the provider's mock `executeInWorkspaceContext` inside a real `withWorkspaceContext({ authContext, userWorkspaceRoleMap, apiKeyRoleMap })` so `resolveRolePermissionConfig` reads an ambient caller role; assert `getRepository(object, { intersectionOf: [roleId] })` (never `shouldBypassPermissionChecks`). To prove the where clause actually renders as ILIKE (US-008: a plain `{ ilike }` object binds as equality and silently matches nothing), capture the `find` options and render them through the REAL query builder: `applyFindOptionsToQueryBuilder(new WorkspaceSelectQueryBuilder(name, { tableShape, executor, objectRecordsPermissions, tableShapeByObjectMetadataId, onBeforeExecute, formatResult }), { where }).getQueryAndParameters()[0]`. See `search/services/__tests__/document-search-provider.service.spec.ts` and `a2e-projects-search-provider.service.spec.ts`.
- **Search-provider install gate:** `AppSearchService.searchInstalledAppRecords` filters `SearchProviderRegistryService.getAllSearchProviders()` by `installedAppUniversalIdentifiers` (the `flatApplicationMaps.idByUniversalIdentifier` keys). To prove an uninstalled app contributes nothing, give its provider items and assert both `result` lacks them AND `provider.search` was never called; the provider classes are decorated `@RegisteredSearchProvider({ appUniversalIdentifier })`, so the registry itself is keyed by app id.
- **Pure calendar recurrence expansion (DST-safe):** anchor on wall-clock, not instants. Take the series-start instant → `toZonedDateTimeISO(timeZone)`, keep `{hour,minute,second,millisecond}` + `toPlainDate()`, iterate candidate `PlainDate`s, then rebuild each with `Temporal.ZonedDateTime.from({timeZone, ...date, ...wallClock}, {disambiguation:'compatible'})` (same contract as `buildCalendarEventInstant`). `count` counts from the series start (not the window); `until` is inclusive; the range window is half-open `[rangeStart, rangeEnd)`. Weekly steps ISO Monday weeks (`date.subtract({days: date.dayOfWeek - 1})`) so locale week-start cannot change the selection, and drops BYDAY days named before DTSTART. Keep the model (`parse`/`serialize` as compact `FREQ=…;INTERVAL=…;BYDAY=…` RFC 5545 tokens) in `twenty-front/src/modules/calendar`, not `twenty-shared`, until a server consumer exists. See `modules/calendar/utils/{parseCalendarRecurrenceRule,serializeCalendarRecurrenceRule,expandCalendarRecurrence}.ts`.
- **Pure recurrence exception model (occurrence identity + detach):** key an occurrence id on the STABLE series id + the occurrence's wall-clock `day`, never its resolved instant — the instant shifts across DST while the day does not, so retries after a DST change still hit the same id. A "this occurrence" delete appends the id to `skippedOccurrenceIds`; a "this occurrence" edit upserts `{occurrenceId, occurrenceDay, event}` into `detachedOccurrences` (filter-then-concat-then-sort by id = idempotent retries, no duplicate detached events; re-editing an already-detached occurrence replaces it; each operation clears the other list so an id is never both). Dispatch the explicit `this-occurrence` vs `whole-series` scope with a discriminated union so narrowing works; whole-series edit keeps `seriesId` and preserves exceptions; whole-series delete returns `null`. Reuse `CalendarEventInput` as the detached payload. See `modules/calendar/utils/{buildCalendarOccurrenceId,skipCalendarOccurrence,detachCalendarOccurrence,applyCalendarEventEdit,applyCalendarEventDelete}.ts`.

---

## 2026-09-20 - US-056
- Added a distinct catalogue load-failure subtitle to the onboarding InstallApps list, separate from the zero-apps-available empty state.
- Files changed: `packages/twenty-front/src/pages/onboarding/InstallAppsContent.tsx` (new optional `catalogueLoadFailed` prop + `catalogueEmptyStateSubtitle`), `packages/twenty-front/src/pages/onboarding/InstallApps.tsx` (passes `!hasLoadedAvailabilitySuccessfully`), new `packages/twenty-front/src/pages/onboarding/__tests__/InstallApps.test.tsx` (3 cases), `packages/twenty-front/src/pages/onboarding/__stories__/InstallApps.stories.tsx` (MarketplaceUnavailable now expects failure copy), `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - `@/` alias maps only to `src/modules`; pages must be imported through `~/pages/...`.
  - Onboarding pages (InstallApps) render in jest with just `I18nProvider` + `dynamicActivate(SOURCE_LOCALE)` — no Jotai/Theme/Apollo provider needed once data hooks are mocked.
  - The template picker element is always passed by InstallApps, so `shouldAutoSkipInstallAppsStep` never auto-skips in any catalogue state; the picker is retained during loading/empty/failure.
---

## 2026-09-20 - US-057
- Landed the executor-tier caller-scoped search validation specs for P2.5 bullet 1 (no production change — the P0.2 caller seam and US-008 ILIKE fix were already correct).
- Files changed: `packages/twenty-server/src/engine/core-modules/search/services/__tests__/app-search.service.spec.ts` (uninstalled app's provider with items contributes no group and is never queried), `.../document-search-provider.service.spec.ts` (foreign `workspaceId` inert → single ambient repository read, ambient label returned, rendered SQL has no `workspaceId` predicate; lone `%`/trailing backslash escaping), `docs/plan/phases/phase-02-report.md`.
- **Learnings:**
  - The records caller-scoping proof is a Tier-1 integration slice (`test/integration/graphql/suites/search/search-caller-permissions.integration-spec.ts`) driving the real `search` resolver with seeded restricted-member / foreign-workspace legacy HS256 tokens; the document provider leg stays query-builder-level because a2e-documents is not installed at Tier 1.
  - `escapeForIlike` escapes `\`, `%`, `_` each with a leading backslash; the provider wraps the escaped term in `%…%`, so a lone `%` becomes `%\%%` (literal, not match-all) and `50%\` becomes `%50\%\\%`.
  - The pre-existing integration spec logs ClickHouse `ECONNREFUSED :8123` noise; it is unrelated and the suite passes.
---


## 2026-09-20 - US-058
- Verified the P2.4 dock/tab unit suites are green on current HEAD 831210bb with no code change — the unit half of the P2.4 bullet. Browser E2E stays Tier 2.
- Files changed: `docs/plan/phases/phase-02-report.md` only (claim + report). No production/test file touched.
- **Learnings:**
  - The dock/tab unit surface is exactly two directories: `src/modules/workbench-dock` (3 suites) and `src/modules/side-panel/tabs` (8 suites) = 11 suites / 85 tests. Run `npx jest src/modules/workbench-dock src/modules/side-panel/tabs --config=jest.config.mjs` from `packages/twenty-front`.
  - Persisted keys: `a2e-widgets-mode/-active/-width` (workbench-dock) and `a2e-side-panel-tabs` / `a2e-side-panel-active-tab` (tabs). Reload-restore and URL-precedence are covered by `sidePanelTabsEdgeCases` + `isValidSidePanelTabsSession`.
  - `side-panel/routing` suites do NOT reference tabs (only `useOpenRecordInSidePanel` does) — no need to include them in the dock/tab gate.
---

## 2026-09-20 - US-059
- Fixed the P4.2 NULL-pipeline residual: task-calendar + overdue-tasks dropped rows with `projectStatus = NULL` because the single `IS_NOT 'DONE'` filter compiles to SQL `NOT (col IN ('DONE'))`. Both views now attach that filter to an OR `filterGroup` whose second operand is `projectStatus IS_EMPTY`, so `(NULL) OR (not DONE)` keeps NULL rows and still excludes DONE.
- Files changed: `src/constants/universal-identifiers.ts` (new `VIEW_FILTER_GROUP_IDS` + `SELECT_FILTER_VALUE_DONE`), `src/views/task-calendar.view.ts`, `src/views/overdue-tasks.view.ts`, new `src/lib/__tests__/null-project-status-filter.test.ts`, `src/lib/__tests__/{task-calendar,my-tasks}.test.ts`, `docs/plan/phases/phase-04-report.md`.
- **Learnings:**
  - The a2e-projects view schema already supports OR groups: `ViewManifest.filterGroups?: ViewFilterGroupManifest[]` (`packages/twenty-shared/src/application/viewManifestType.ts:43,94`), surfaced by `defineView` (`twenty-sdk/src/sdk/define/views/define-view.ts:44`). The group has NO field id — attach filters to it via `viewFilterGroupUniversalIdentifier` + `positionInViewFilterGroup`; both operands must read the same field so the OR doesn't widen.
  - A SELECT view-filter value MUST be the JSON-encoded array (`JSON.stringify(['DONE'])`); a bare `'DONE'` fails the query-builder array parse at query time.
  - To unit-test a view's real GraphQL filter, replicate the frontend mapping (`mapViewFiltersToFilters.ts` → `recordFilterGroupId: viewFilterGroupUniversalIdentifier`) and run `computeRecordGqlOperationFilter` from `twenty-shared/utils`; assert an `{ is: 'NULL' }` arm exists and a `{ not: { projectStatus: { in: ['DONE'] } } }` arm exists. The guard-rail test proving the plain `IS_NOT` lacks the NULL arm is what pins the whole fix.
  - The board (`task-board.view.ts`) has no completion filter and groups TODO/IN_PROGRESS/DONE, so it already shows NULL rows ungrouped — no board change needed. `current-tasks.view.ts` and the native record tasks tab are out of scope on purpose.
---

## 2026-09-20 - US-060
- Built the P4C.3a recurrence foundation: pure rule model (freq daily/weekly/monthly, interval, byWeekdays, monthlyPosition, count/until) + RFC 5545-flavoured parse/serialize + deterministic daily/weekly expansion over a bounded window. Monthly is modelled but expansion yields `[]` (P4C.3b). No UI, persistence, detached-occurrence or future-series-split work.
- Files changed: new `packages/twenty-front/src/modules/calendar/types/{CalendarRecurrenceFrequency,CalendarRecurrenceWeekday,CalendarRecurrenceMonthlyPosition,CalendarRecurrenceRule,CalendarRecurrenceOccurrence}.ts`, new `.../calendar/utils/{parseCalendarRecurrenceRule,serializeCalendarRecurrenceRule,expandCalendarRecurrence}.ts`, new `.../calendar/utils/__tests__/{calendarRecurrenceRule,expandCalendarRecurrence}.test.ts`, `docs/plan/phases/phase-04-report.md`.
- **Learnings:**
  - `temporal-polyfill` is already a twenty-front dependency — no new dep needed; `Temporal.ZonedDateTime.from({...}, {disambiguation:'compatible'})` is the repo's DST contract (spring-forward gap shifts forward, fall-back keeps the earlier offset).
  - Front package gates: `npx jest <specs> --config=packages/twenty-front/jest.config.mjs` from repo root; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit`; `npx oxlint --type-aware -c .oxlintrc.json <files>`; `npx oxfmt --check <files>` (oxfmt rewrites import formatting — run it, then re-check). Jest sets `TZ=GMT`, so every timezone assertion must pass an explicit IANA zone.
  - The server's only recurrence code is the CalDAV `RECURRENCE-ID` importer (external occurrence ids), unrelated to a locally-authored rule — hence front-only placement is correct until the persistence/sync slice.
---

## 2026-09-20 - US-061
- Extended `expandCalendarRecurrence` with monthly-by-date, monthly-by-position (nth/last weekday of month), monthly plain-BYDAY, count/until termination and locale-week-start anchoring, reusing the US-060 generator (no second engine).
- Files changed: `packages/twenty-front/src/modules/calendar/utils/expandCalendarRecurrence.ts`, `.../utils/__tests__/expandCalendarRecurrence.test.ts`, `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - `Temporal.PlainDate.add({ months })` constrain-clips the day (Jan 31 → Feb 28) AND anchors on the source date, so month-end clipping never drifts across steps; `start.with({day})` onto a 31-day value throws, so always add months rather than re-apply the day.
  - `Temporal.PlainDate.with({ day: 31 })` is a RangeError when the target month is short — never use it for clipping.
  - Ordinal weekday: first occurrence = `firstOfMonth.add({days: (isoDay - firstOfMonth.dayOfWeek + 7) % 7})`; last = that + `7*floor((daysInMonth - day)/7)`.
  - The repo's oxlint config lives at `packages/twenty-front/.oxlintrc.json`, not root; run `npm exec --prefix packages/twenty-front -- oxlint --type-aware -c packages/twenty-front/.oxlintrc.json <files>`.
  - `npx nx lint:diff-with-main <pkg>` compares `main...HEAD` and reports "No changed files" on an uncommitted tree — use direct oxlint/oxfmt on the touched files as the substitute gate.
---

## 2026-09-20 - US-062
- Built the P4C.3c pure series/occurrence identity + exception state machine: stable series id from the anchor event id, deterministic occurrence id from series id + wall-clock day, and a scope-dispatched state machine for "this occurrence" vs "whole series" edit/delete (skipped exclusions, detached overrides, retry idempotence). No UI, no persistence, no future-series split.
- Files changed: new `packages/twenty-front/src/modules/calendar/types/{CalendarSeriesEditScope,CalendarRecurrenceSeries,CalendarDetachedOccurrence,CalendarRecurrenceSeriesState}.ts`, new `.../calendar/utils/{buildCalendarSeriesId,buildCalendarOccurrenceId,compareCalendarOccurrenceIds,skipCalendarOccurrence,detachCalendarOccurrence,applyCalendarEventEdit,applyCalendarEventDelete}.ts`, new `.../calendar/utils/__tests__/{calendarOccurrenceIdentity,calendarRecurrenceSeriesState}.test.ts`, `docs/plan/phases/phase-04-report.md`.
- **Learnings:**
  - Occurrence identity must be keyed on `CalendarRecurrenceOccurrence.day` (a `PlainDate` string), NOT `startsAt` — the resolved instant shifts under DST while the day holds, so day-keyed ids are the only ones stable across a DST transition. This is exactly why `expandCalendarRecurrence` already exposes `day`.
  - Retry idempotence is a data-shape property: filter the existing entry by `occurrenceId`, concat the new one, then sort by id. That makes delete a no-op on repeat (early return) and detach an upsert, so the same series+occurrence can never produce two events.
  - Keep skipped ids and detached entries mutually exclusive (each op clears the other) so materialization never has to resolve a conflict; and keep both sorted with a shared `compareCalendarOccurrenceIds` so state equality is order-independent.
  - Scope dispatch uses a discriminated union (`{state} & ({scope:'this-occurrence'; ...} | {scope:'whole-series'; ...})`) — required to keep TypeScript narrowing; a shared `CalendarSeriesEditScope` type alone would erase the discriminant.
  - Reused US-052's `CalendarEventInput` as the detached payload rather than inventing a parallel override shape.
---
