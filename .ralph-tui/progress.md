# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Testing an onboarding page without Apollo/Jotai:** mock the data hook module (`jest.mock('@/marketplace/hooks/useMarketplaceApps')` + `jest.mocked(...).mockReturnValue(... as unknown as ReturnType<typeof hook>)`), mock the heavy child (`A2eWorkspaceTemplatePicker`) to a testid div, mock the mutation hook factory, and wrap the render in `I18nProvider i18n={i18n}` + `await dynamicActivate(SOURCE_LOCALE)` in `beforeAll`. Use `~/pages/...` (not `@/pages/...` — `@/` maps to `src/modules` only). See `src/pages/onboarding/__tests__/InstallApps.test.tsx`.
- **Testing a search provider's caller scoping + ILIKE rendering:** run the provider's mock `executeInWorkspaceContext` inside a real `withWorkspaceContext({ authContext, userWorkspaceRoleMap, apiKeyRoleMap })` so `resolveRolePermissionConfig` reads an ambient caller role; assert `getRepository(object, { intersectionOf: [roleId] })` (never `shouldBypassPermissionChecks`). To prove the where clause actually renders as ILIKE (US-008: a plain `{ ilike }` object binds as equality and silently matches nothing), capture the `find` options and render them through the REAL query builder: `applyFindOptionsToQueryBuilder(new WorkspaceSelectQueryBuilder(name, { tableShape, executor, objectRecordsPermissions, tableShapeByObjectMetadataId, onBeforeExecute, formatResult }), { where }).getQueryAndParameters()[0]`. See `search/services/__tests__/document-search-provider.service.spec.ts` and `a2e-projects-search-provider.service.spec.ts`.
- **Search-provider install gate:** `AppSearchService.searchInstalledAppRecords` filters `SearchProviderRegistryService.getAllSearchProviders()` by `installedAppUniversalIdentifiers` (the `flatApplicationMaps.idByUniversalIdentifier` keys). To prove an uninstalled app contributes nothing, give its provider items and assert both `result` lacks them AND `provider.search` was never called; the provider classes are decorated `@RegisteredSearchProvider({ appUniversalIdentifier })`, so the registry itself is keyed by app id.
- **Pure calendar recurrence expansion (DST-safe):** anchor on wall-clock, not instants. Take the series-start instant → `toZonedDateTimeISO(timeZone)`, keep `{hour,minute,second,millisecond}` + `toPlainDate()`, iterate candidate `PlainDate`s, then rebuild each with `Temporal.ZonedDateTime.from({timeZone, ...date, ...wallClock}, {disambiguation:'compatible'})` (same contract as `buildCalendarEventInstant`). `count` counts from the series start (not the window); `until` is inclusive; the range window is half-open `[rangeStart, rangeEnd)`. Weekly steps ISO Monday weeks (`date.subtract({days: date.dayOfWeek - 1})`) so locale week-start cannot change the selection, and drops BYDAY days named before DTSTART. Keep the model (`parse`/`serialize` as compact `FREQ=…;INTERVAL=…;BYDAY=…` RFC 5545 tokens) in `twenty-front/src/modules/calendar`, not `twenty-shared`, until a server consumer exists. See `modules/calendar/utils/{parseCalendarRecurrenceRule,serializeCalendarRecurrenceRule,expandCalendarRecurrence}.ts`.

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
