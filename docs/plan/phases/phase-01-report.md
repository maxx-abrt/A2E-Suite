# Phase 01 Report — Foundations & Module Activation

## 2026-09-06 14:35 UTC — Planning agent (architect/code)
**Task(s):** Phase setup (no P1.* task started yet)
**Status:** planning complete, implementation not started
**What I did:** Created the planning corpus this roadmap runs on:
`PLAN.md`, `PROMPT.md`, `docs/plan/01-codebase-map.md`,
`docs/plan/02-reference-analysis.md`, `docs/plan/03-integration-blueprint.md`,
and this report file. Next agents do not need to re-derive context.
**Decisions & trade-offs:**
- Port strategy: Texxel (local at `../Texxel`) + A2EMoney (cloned at
  `/tmp/A2EMoney` — re-clone shallow if missing) → Twenty-native apps +
  minimal server modules. Both schemas read in full and mapped in
  `docs/plan/02-reference-analysis.md`.
- A2EMoney full surface verified: books auto-journal (systemKey/locked/
  managed + provenance rows), budgets, org profile (encrypted IBAN/BIC),
  GDPR tables, **fiches with 8 official FR templates** (incl.
  budget_equilibre with PCG 60-65/70-76 lines, CERFA 12156 & 15059), and
  the **subventions open-data catalogue + AI matching with LLM cache** —
  all folded into P7 (P7.1–P7.1f).
- Realtime: new WebSocket gateway core module (`/realtime`, ws, Redis
  pub/sub fan-out) — none exists today (SSE only). Self-hosted constraints
  only (user confirmed: no Vercel).
- Accounting depth for small companies + non-profits (books, fiches, grant
  reports, VAT/TVA modes, quotes→invoices, recurring, dunning), fr + en.
- AI: one registry extending `tool`/`tool-provider`; assistant surface from
  existing ai-chat; every app ships AI tools; financial mutations always
  review-required.
**Verification:** investigation-only session; no code changed; no gates due.
**For the next agent:** start at PLAN.md → P1.1 first unticked task
(create `packages/twenty-apps/internal/a2e-documents` empty shell). Read
`packages/twenty-apps/README-A2E.md` task note and mirror
`packages/twenty-apps/internal/real-estate/src/application.config.ts`. Run
the kickoff protocol in PROMPT.md §1.

## 2026-09-06 15:00 UTC — Code agent (GLM-5.3-Flash)
**Task(s):** P1.1 — Create `packages/twenty-apps/internal/a2e-documents`
(empty app shell: config + default role)
**Status:** partial — files created; `yarn install` in the new package was
not run (user declined terminal install), so `twenty-sdk/define` imports
show unresolved-module TS errors until deps are installed. Everything else
done.
**What I did:**
- Created `packages/twenty-apps/internal/a2e-documents/` mirroring the
  `real-estate` reference app: `package.json` (same devDeps/engines/scripts,
  name `a2e-documents`, v0.1.0), `tsconfig.json`, `.gitignore`, `.nvmrc`,
  `.yarnrc.yml`, `.oxlintrc.json` (copied verbatim).
- `src/application.config.ts`: `defineApplication` with fixed UUID
  `19126a9c-7cc0-4368-aaba-c7e5a87b0c48`, displayName "A2E Documents".
- `src/roles/default-function.role.ts`: `defineApplicationRole` with UUID
  `1e0eda2a-8319-4211-93f7-e0e185ee35b1`, read/update/soft-delete-all grants,
  no hard-destroy (matches real-estate default-function role shape).
- Created empty `src/{objects,fields,views,page-layouts,navigation-menu-items,
  roles,logic-functions,command-menu-items}/` skeleton dirs (git ignores empty
  dirs; they materialize as P3 adds content).
- Ticked PLAN.md P1.1 first task.
**Decisions & trade-offs:**
- UUIDs freshly generated via `crypto.randomUUID()` this session (no
  collision with real-estate / twenty-partners checked).
- Kept `twenty-sdk`/`twenty-client-sdk` at `2.31.0` to match real-estate's
  known-good pin; upgrade both together later.
- Did NOT create `README-A2E.md` (that's the separate second P1.1 task).
- Pre-existing dirty tree (branding renames Twenty→A2E across ~30 files +
  untracked PLAN/PROMPT/docs) belongs to the planning session, not this
  task; left untouched, not reverted.
**Verification:** file structure compared side-by-side against
`packages/twenty-apps/internal/real-estate/` (read all template files first).
No gates runnable: package has no tests yet; `tsgo` typecheck blocked on
missing `node_modules` (after `yarn install`, expected clean — only two
files, mirroring real-estate's imports which typecheck today).
**For the next agent:** next task = P1.1 second item (`README-A2E.md`).
Before publishing/installing a2e-documents anywhere, run
`cd packages/twenty-apps/internal/a2e-documents && yarn install`, then
confirm `npx tsgo -p tsconfig.json --noEmit` passes. The two UUIDs in
`application.config.ts` / `default-function.role.ts` must never change once
the app is published to any workspace.

## 2026-09-06 15:45 UTC — Code agent (GLM-5.3-Flash)
**Task(s):** P1.1 items 2–3 (README-A2E.md; install/uninstall sync
verification) + P1.2 (module registry: server decision, Settings "A2E Suite"
section, nav visibility check) — PLAN.md lines 94–108
**Status:** done (see "partial" caveats under Verification)
**What I did:**
- `packages/twenty-apps/README-A2E.md`: authoring guide (skeleton layout,
  naming rules, UUID discipline, publish/install commands, anatomy minimums).
- Verified P1.1 install/uninstall sync by server-code audit (no running
  workspace available): `application-sync.service.ts`
  `uninstallApplication` deletes the app + all app-owned metadata via
  workspace migration (inferDeletion), `canBeUninstalled` guard,
  uninstall logic-function hook (`application-uninstall.service.ts`),
  post-install hook infra (`application-install.service.ts`). Findings
  recorded above; live scratch-workspace verification still recommended
  during P3 when a2e-documents has real objects.
- P1.2 server decision (with evidence): NO `workspaceModule` table. The
  per-workspace `application` row IS the enable/disable state — created on
  install (`application-install.service.ts installApplication`, per-workspace,
  version-guarded) and deleted on uninstall (`application-sync.service.ts
  uninstallApplication`); guards exist (`SettingsPermissionGuard(APPLICATIONS)`,
  `canBeUninstalled`, kill-switch). A second table would duplicate install
  state and drift. GraphQL surface already complete:
  `installApplication`/`uninstallApplication` mutations,
  `findManyApplications` query, `findManyMarketplaceApps(universalIdentifiers)`.
- Front module `twenty-front/src/modules/a2e-workspace/`:
  `constants/A2eSuiteApplicationUniversalIdentifiers.ts` (lists the apps'
  committed UUIDs — a2e-documents
  `19126a9c-7cc0-4368-aaba-c7e5a87b0c48`; extend as apps land),
  `hooks/useA2eSuiteApplications.ts` (installed = our UUIDs within
  `findManyApplications`; available = our UUIDs within marketplace catalog
  minus installed — marketplace card `id` IS the universal identifier, per
  `marketplace-catalog-cache-provider.service.ts`),
  `components/SettingsA2eSuiteSection.tsx` (H2Title + installed table +
  available cards; renders nothing when no A2E apps exist so stock Twenty is
  unchanged), `components/A2eSuiteApplicationCard.tsx` (install button via
  existing `useInstallMarketplaceApp`).
- Wired `SettingsA2eSuiteSection` into
  `pages/settings/applications/SettingsApplications.tsx` (hero + section +
  tabs).
- Nav visibility: verified no extension needed — nav items are DB rows owned
  by the app; uninstall deletes them with the metadata sync; no code change.
- Tests: `hooks/__tests__/useA2eSuiteApplications.test.tsx` (4 cases:
  none/split/available-only/no-data).
**Decisions & trade-offs:**
- Marketplace catalog vs workspace applications: `findManyApplications`
  returns only workspace installs, so "available but not installed" apps come
  from the catalog query filtered by our UUIDs. Catalog `MarketplaceApp.id`
  is the application universal identifier (server-side mapping), enabling
  `installApplication(universalIdentifier: id)` directly.
- Settings section lives in a new `a2e-workspace` front module (not inside
  `pages/settings/applications/`) so later P1.3 presets and P9 registry
  consumers can import the same constants/hooks; the page imports the
  section only.
- Screenshots placeholders: cards use the standard Avatar/logo fallback; no
  binary placeholder assets committed (they'd churn).
**Verification:**
- `npx jest .../a2e-workspace --config=packages/twenty-front/jest.config.mjs`
  → 4 passed.
- oxlint type-aware on `src/modules/a2e-workspace/` → 0 errors; oxfmt
  --check clean on all 5 files.
- In-package `npx tsgo -p tsconfig.json --noEmit` → 4304 errors, ALL
  pre-existing baseline (3819 = `twenty-ui/*` TS2307 across the whole repo,
  incl. untouched files; `twenty-ui` vite build itself fails with TS5042 in
  this checkout). Zero errors originate in files I touched. Baseline
  unrelated to this change; needs an environment fix (fresh yarn install /
  twenty-ui dist rebuild) tracked separately.
- `npx nx lint:diff-with-main twenty-front` → "No changed files" (diff vs
  committed main; my work is uncommitted) — hence direct oxlint run above.
- twenty-shared NOT touched (no rebuild needed despite building it once
  during diagnosis).
**For the next agent:** next = P1.3 first task (preset definitions). Add
future app UUIDs to
`packages/twenty-front/src/modules/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers.ts`
as each app is created. Do not trust `nx typecheck` for twenty-front until
the twenty-ui baseline is fixed; use in-package tsgo and diff against the
4304 baseline. Scratch-workspace install/uninstall e2e deferred to P3
acceptance (a2e-documents has no objects yet).

## 2026-09-06 19:15 UTC — Code agent (GLM-5.3-Flash)
**Task(s):** P1.3 — Onboarding presets (all five PLAN.md items, lines 110–121)
**Status:** done (sample-content seeding intentionally deferred to P3 — no
seeder target exists yet; e2e spec written but not executed — needs a live
server, see Verification)
**What I did:**
- Server preset data:
  `enums/workspace-template.enum.ts` (GraphQL enum CRM/INDIVIDUAL/STUDENT/
  TEAM/NON_PROFIT/SMALL_BUSINESS),
  `constants/workspace-template-definitions.constant.ts` (apps to install =
  a2e-documents UUID; hidden standard nav rows for CRM-off presets —
  companies/people/opportunities; sample-content flag), and
  `utils/get-workspace-template-definition.util.ts`.
- Application service `workspace-template.service.ts`: installs template
  apps via ApplicationRegistrationService + ApplicationInstallService
  (skip-and-log when the app is not registered on the server), applies nav
  visibility by deleting standard rows / restoring them via
  `createStandardNavigationMenuItemFlatMetadata` +
  `WorkspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration`
  (same pattern as `2-25-remove-message-campaign-navigation-menu-item`), and
  records `workspaceTemplate` on the workspace row.
- Persistence: `WorkspaceEntity.workspaceTemplate` varchar nullable column +
  `@WasIntroducedInUpgrade`; new fast instance command
  `2-39-instance-command-fast-1788716868602-add-workspace-template-to-workspace.ts`
  (up + down), name constant, registered in
  `instance-commands.constant.ts` (timestamp strictly greater than the
  previous max 1788639976437).
- GraphQL: `applyWorkspaceTemplate(input: ApplyWorkspaceTemplateInput!)`
  mutation on OnboardingResolver (WorkspaceAuthGuard+UserAuthGuard via class
  decorators, NoPermissionGuard like sibling mutations); new
  `TEMPLATE_APPLICATION_FAILED` exception code with Lingui-friendly message.
- Front `a2e-workspace` module: `constants/A2eWorkspaceTemplates.ts`
  (6 Lingui msg options with canonical icon-dictionary icons: User, Book,
  Users, Heart, Briefcase, BuildingSkyscraper), `useApplyWorkspaceTemplate`
  hook (snackbar feedback), shared `A2eWorkspaceTemplatePicker` (Linaria,
  theme tokens only), `SettingsA2eWorkspaceTemplateSection`.
- Onboarding: picker hosted inside the existing install-apps step
  (`InstallApps.tsx`/`InstallAppsContent.tsx` new optional `templatePicker`
  prop) — no new route, no OnboardingStatus change, skip keeps the CRM
  default (zero regression surface for the existing step machine).
- Settings → General: "Workspace template" section (re-runnable).
- Tests: `workspace-template.service.spec.ts` (4 cases) +
  `useApplyWorkspaceTemplate.test.tsx` (2 cases).
- e2e: `twenty-e2e-testing/tests/authentication/workspace-template-preset.spec.ts`
  (signup → onboarding skip → apply `individual` from Settings → CRM nav
  hidden).
**Decisions & trade-offs:**
- Template picker lives on the install-apps step instead of a new onboarding
  route: the PLAN asks for a skippable picker step; grafting it onto the
  existing skippable step avoids touching the server step machine
  (`OnboardingStatus` enum, `usePageChangeEffectNavigateLocation`,
  `ONBOARDING_PATHS`) and cannot regress existing onboarding e2e.
- Nav hiding = DELETE of the workspace-wide standard row, restoring =
  recreate via the standard flat-metadata util (Twenty's own upgrade-command
  pattern). This makes "CRM-off" survive nav sync while staying uninstall-safe.
- Sample content: `sampleContentEnabled` is part of the preset data contract
  but false for every preset today; service logs a warning when set. Real
  seeding lands in P3 when a2e-documents has objects to seed.
- Front mutation document is hand-written (schema on running servers only);
  run `npx nx run twenty-front:graphql:generate` against an updated server
  and swap to the generated document.
**Verification:**
- `npx jest .../workspace-template.service.spec.ts --config=packages/twenty-server/jest.config.mjs` → 4 passed.
- `npx jest src/modules/a2e-workspace --config=packages/twenty-front/jest.config.mjs` → 6 passed (incl. pre-existing hook tests).
- Regression: all 5 server onboarding suites (40 tests) + front onboarding
  hooks/pages suites pass; `BookCall.test.tsx` suite failure reproduced on a
  stashed pristine tree (pre-existing environment baseline, not this diff).
- oxlint --type-aware: 0 errors (front 14 files, server onboarding+2-39 46
  files); oxfmt --check clean.
- In-package tsgo: twenty-server 13 errors (baseline on pristine tree: 14;
  12 are `twenty-emails`/SDK-artifact TS2307s, none in my files).
  twenty-front 4311 vs documented 4304 baseline: +7, all pre-existing-class
  `twenty-ui/*` TS2307 module-resolution in the new files (jest/oxlint both
  resolve fine; needs the same environment fix as the baseline).
- Environment repair this session: built `twenty-client-sdk` dist — the
  missing `twenty-client-sdk/generate` artifact broke jest module resolution
  for any spec importing ApplicationInstallService, incl. the pre-existing
  `install-onboarding-apps.job.spec.ts`. After `cd packages/twenty-client-sdk
  && yarn build`, that spec runs again.
- e2e NOT executed (requires running front+server+DB); spec follows the
  proven `onboarding.spec.ts` signup flow.
**For the next agent:** next = P1.4 first task (search provider interface in
the `search` core module). Gotchas: (1) the graphql:generate swap noted
above; (2) when a2e-documents gains objects in P3, add real sample-content
seeding behind `sampleContentEnabled`; (3) new A2E app UUIDs must be added to
BOTH `twenty-front/.../A2eSuiteApplicationUniversalIdentifiers.ts` and
`workspace-template-definitions.constant.ts`; (4) if `yarn install` is ever
re-run, `twenty-client-sdk` dist must be rebuilt or server jest breaks again.

## 2026-09-06 19:40 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P1.4 server task — search provider interface in `search` core module + registry keyed by app id (PLAN.md P1.4 first checkbox)
**Status:** done
**What I did:**
- `search/types/search-provider.type.ts`: `SearchProviderParams` (searchInput, limit, workspaceId), `SearchProviderResultItem` (recordId, label, optional description/imageUrl, required stable `path` deep link per blueprint §6), `SearchProviderResult`, `SearchProvider`.
- `search/decorators/registered-search-provider.decorator.ts`: `@RegisteredSearchProvider({ appUniversalIdentifier })` + metadata getter — mirrors `registered-instance-command.decorator.ts` (Injectable + Reflect.defineMetadata).
- `search/services/search-provider-registry.service.ts`: `SearchProviderRegistryService` — `DiscoveryService`-based scan on `onModuleInit`, providers stored per app universal identifier (`Map<string, RegisteredSearchProvider[]>`), accessors `getSearchProvidersByAppUniversalIdentifier` + `getAllSearchProviders`.
- `search.module.ts`: added `DiscoveryModule` import + registry provider (additive; resolver/service untouched).
- Test: `search/services/__tests__/search-provider-registry.service.spec.ts` (discovery keyed by app id, unknown app → [], getAll, delegation contract).
**Decisions & trade-offs:**
- Registry uses the decorator + `DiscoveryService` pattern proven by `UpgradeCommandRegistryService` rather than a Nest multi-provider token: it survives module import order, needs no registration list, and gives per-app keying for free (blueprint §6 "apps register their provider at install").
- No GraphQL surface yet: consumption is the separate P1.4 task ("consume providers dynamically"); this commit only adds the interface + registry so no schema regen is needed.
- `path` is a required provider output (not computed by core): keeps deep-link policy per app (page routes vs `/object/<name>/<id>`) as blueprint §6 requires.
**Verification:**
- `npx jest .../search-provider-registry.service.spec.ts --config=packages/twenty-server/jest.config.mjs` → 4 passed.
- In-package `npx tsgo -p tsconfig.json --noEmit` → 13 errors, identical to the documented P1.3 baseline (12 `twenty-emails`/SDK TS2307s + pre-existing `workspaceTemplate` TS2322 in `from-workspace-entity-to-flat.util.ts`); none in new files.
- oxlint --type-aware on the 5 touched files → 0 warnings/errors; oxfmt --check clean. `npx nx lint:diff-with-main twenty-server` passes (pre-existing committed diff).
**For the next agent:** next = P1.4 front task (Cmd+K grouped results: group headers + frecency store) then "consume providers dynamically". When wiring consumption, call `searchProviderRegistryService.getAllSearchProviders()` alongside `SearchService` in `SearchResolver` (or a new sibling query — additive) and gate per app via application install state; remember `path` must be resolved against the front router. Registry test file lives under `search/services/__tests__/` (search module has no `__tests__` sibling convention yet — I started one next to the service).

## 2026-09-06 20:25 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P1.4 front task — Cmd+K grouped results structure (group headers, frecency store) (PLAN.md line 125)
**Status:** done
**What I did:**
- `side-panel/pages/search/states/searchRecordsFrecencyByObjectState.ts`: localStorage-backed jotai atom `{[objectNameSingular]: {lastUsedAtTimestamp, useCount}}` with `validateInitFn` guard, capped at 100 entries.
- `utils/computeSearchRecordObjectFrecencyRank.ts`: classic frecency = useCount / (hoursSinceLastUse + 2); 0 for unused; clock-skew-safe.
- `utils/groupSearchResultItems.ts`: sorts by group frecency rank (stable, server relevance order preserved inside a group), folds into `SearchResultGroup[]` + flat `orderedItems`.
- `utils/pruneSearchRecordObjectFrecency.ts`: LRU-style cap.
- `hooks/useRecordSearchObjectUsage.ts`: records a use on result click.
- `hooks/useSidePanelSearchRecords.tsx`: items now carry `groupKey` (raw object name, locale-stable) + `groupHeading` (translated label).
- `components/SidePanelSearchRecordsPage.tsx`: renders one `SidePanelGroup` per object (header = object label) instead of a single "Results" group; click records usage; ordering = frecency.
- Tests: `utils/__tests__/` 3 suites, 10 cases (ordering, in-group stability, tie behavior, prune, frecency math).
**Decisions & trade-offs:**
- Frecency is per object-name group (Bureau "grouped by app with frecency" pattern; today the groups are core objects, P1.4 task 2 adds app groups with the same mechanism — group key simply becomes the app id).
- Group key = `objectNameSingular` (not translated label) so stored frecency survives locale switches.
- `useCount`/`lastUsedAtTimestamp` payload validated on hydration; invalid localStorage falls back to `{}` via `createAtomState`.
- Only records opened *from search results* count toward frecency (no passive tracking).
**Verification:**
- `npx jest src/modules/side-panel/pages/search --config=jest.config.mjs` (cwd packages/twenty-front) → 10 passed.
- oxlint --type-aware on the search folder → 0 warnings/0 errors (fixed a real `matching-state-variable` rule hit: jotai state vars must be named after the state).
- oxfmt --check clean.
- In-package tsgo: 4313 total vs 4311 documented baseline; +2 are pre-existing TS2339/TS2741 in untouched `SidePanelSearchRecordPreviewCard.tsx` (baseline class, file not in my diff); 0 errors in new/modified files (only documented TS2307 module-resolution class remains there).
- No GraphQL schema change (core `search` query untouched); twenty-shared untouched.
**For the next agent:** next = P1.4 last task ("Consume providers dynamically; core object search unchanged"). Server side: extend `SearchResolver` (or additive sibling query) to run `SearchProviderRegistryService.getAllSearchProviders()` gated per app via `flatApplicationMaps` (workspace-flat-application-map-cache.service provides `idByUniversalIdentifier` — only run a provider when its appUniversalIdentifier is installed); reuse `SearchProviderResultItem` incl. required `path`. Front side: add a second query in the search page, render each app's items as its own `SidePanelGroup` (the grouping/frecency infra from this task takes any `groupKey`), deep-link via `navigate(path)`; CommandMenu story has an msw `Search` mock to extend for the new query. Do NOT reuse the object-name frecency bucket for app groups unless you intend shared ranking.

## 2026-09-06 20:45 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P1.4 last task — consume search providers dynamically; core object search unchanged (PLAN.md line 126)
**Status:** done (graphql:generate deferred — needs a running server, same caveat as P1.3)
**What I did:**
- Server `AppSearchService` (`search/services/app-search.service.ts`): runs all registered providers whose app is installed (install gate = `flatApplicationMaps.idByUniversalIdentifier` keys via the existing cache service), 5 records max per app, per-provider try/catch so one broken provider cannot break the payload; empty groups dropped.
- GraphQL (additive): `AppSearchRecordDTO` (recordId/label/description/imageUrl/path) + `AppSearchResultGroupDTO` (appUniversalIdentifier + records); new `searchAppRecords(searchInput)` query on `SearchResolver` (same guards/filters as `search`); `AppSearchService` added to `SearchModule` providers. Core `search` query + `SearchService` untouched.
- Front: `SEARCH_APP_RECORDS_QUERY` document (hand-written, pending graphql:generate), `useAppSearchResultItems` hook (no-cache fetch, app display names from `FindManyApplicationsDocument`), items merged into the existing grouped/frecency machinery with `groupKey = app:<universalIdentifier>`; `GroupableSearchResultItem` gained optional `path`; page opens `path` via router before the record-page fallback.
- Test: `app-search.service.spec.ts` (4 cases: install gate, empty-group drop, provider isolation, params forwarding).
**Decisions & trade-offs:**
- Separate `searchAppRecords` query instead of extending the `search` connection: keeps the core contract and its cursor pagination untouched (blueprint §6 "core objects + registered providers"; deep link policy per app via required `path`).
- Install gate server-side only; front re-resolves group display names from workspace application rows so group headers are localized names, never raw UUIDs (fallback = identifier).
- `no-cache` on the app query: provider results are per-input and cheap; avoids Apollo cache normalization of unnamed lists.
- Frecency buckets stay separate per group key (`app:<id>` vs object names) — app groups rank among themselves and among objects with rank 0 until used.
**Verification:**
- `npx jest src/engine/core-modules/search --config=jest.config.mjs` (cwd twenty-server) → 3 suites, 10 passed (incl. pre-existing registry + format-search-terms).
- `npx jest src/modules/side-panel/pages/search --config=jest.config.mjs` (cwd twenty-front) → 10 passed.
- oxlint --type-aware + oxfmt --check clean on `search` module (server) and search pages (front).
- In-package tsgo: twenty-server 1 error total (pre-existing `workspaceTemplate` TS2322, documented in P1.3; search module clean). twenty-front 3055 total — BELOW the documented 4311 baseline (twenty-ui TS2307 class partially self-repaired this session); remaining `pages/search` errors are the pre-existing Avatar/AppTooltip typing class in untouched `SidePanelSearchRecordPreviewCard.tsx` + identical class on pre-existing lines of the page; zero errors attributable to new code.
- `graphql:generate` NOT run (introspects a live server; none running). Front document is hand-written per the P1.3 precedent — run `npx nx run twenty-front:graphql:generate` against an updated server and swap to the generated document.
- twenty-shared untouched; no entity changed (no migration/upgrade command needed).
**For the next agent:** P1.4 is complete; P1.5 ("AI registry seed") is the next phase task. Gotchas: (1) the graphql:generate swap above; (2) when the first real provider ships (P3+ documents), register it with `@RegisteredSearchProvider({ appUniversalIdentifier })` on a Nest provider — the registry picks it up automatically; (3) CommandMenu storybook `Search` msw mock can be extended with a `searchAppRecords` handler for visual testing; (4) `SidePanelSearchRecordPreviewCard` tooltip preview does not cover app results (they have `path`, not object metadata) — selection preview simply finds no match for now, acceptable until P2.5 wire-up.

## 2026-09-06 20:42 UTC — Zoo (GLM-5.3-Flash) — STATE REPAIR note
**Task(s):** none (bookkeeping)
**Status:** done
**What I did:** None (state note only): commit `f4b4a72b "p1.4/5"` (authored outside this session, 22:37 +02:00) contains this session's in-progress P1.4b server/front files plus environment-repair changes to `twenty-emails`/`twenty-ui` vite configs and `yarn.lock` — which is why the twenty-front tsgo baseline improved from 4311 to 3055 within this session. All P1.4b code is committed there; my follow-up commit `3569b08b` adds the page wiring, PLAN.md tick and report entry. Working tree clean.
**For the next agent:** treat 3055 as the current twenty-front tsgo baseline (twenty-ui TS2307 class) and 1 for twenty-server (workspaceTemplate TS2322). P1.4 fully ticked; next task = P1.5 (AI registry seed, PLAN.md).
