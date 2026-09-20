# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Testing an onboarding page without Apollo/Jotai:** mock the data hook module (`jest.mock('@/marketplace/hooks/useMarketplaceApps')` + `jest.mocked(...).mockReturnValue(... as unknown as ReturnType<typeof hook>)`), mock the heavy child (`A2eWorkspaceTemplatePicker`) to a testid div, mock the mutation hook factory, and wrap the render in `I18nProvider i18n={i18n}` + `await dynamicActivate(SOURCE_LOCALE)` in `beforeAll`. Use `~/pages/...` (not `@/pages/...` — `@/` maps to `src/modules` only). See `src/pages/onboarding/__tests__/InstallApps.test.tsx`.
- **Testing a search provider's caller scoping + ILIKE rendering:** run the provider's mock `executeInWorkspaceContext` inside a real `withWorkspaceContext({ authContext, userWorkspaceRoleMap, apiKeyRoleMap })` so `resolveRolePermissionConfig` reads an ambient caller role; assert `getRepository(object, { intersectionOf: [roleId] })` (never `shouldBypassPermissionChecks`). To prove the where clause actually renders as ILIKE (US-008: a plain `{ ilike }` object binds as equality and silently matches nothing), capture the `find` options and render them through the REAL query builder: `applyFindOptionsToQueryBuilder(new WorkspaceSelectQueryBuilder(name, { tableShape, executor, objectRecordsPermissions, tableShapeByObjectMetadataId, onBeforeExecute, formatResult }), { where }).getQueryAndParameters()[0]`. See `search/services/__tests__/document-search-provider.service.spec.ts` and `a2e-projects-search-provider.service.spec.ts`.
- **Search-provider install gate:** `AppSearchService.searchInstalledAppRecords` filters `SearchProviderRegistryService.getAllSearchProviders()` by `installedAppUniversalIdentifiers` (the `flatApplicationMaps.idByUniversalIdentifier` keys). To prove an uninstalled app contributes nothing, give its provider items and assert both `result` lacks them AND `provider.search` was never called; the provider classes are decorated `@RegisteredSearchProvider({ appUniversalIdentifier })`, so the registry itself is keyed by app id.

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


