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

## 2026-09-07 16:05 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P1.5 — AI registry seed (both PLAN.md items: tool/tool-provider audit + design note; data model for app-registered AI tools)
**Status:** done — with a DEVIATION (favorable): the blueprint's `registerAiTools(appId, tools[])` hook is NOT needed; the registration primitive already exists natively. No new table, no migration, no install/uninstall hook code.
**What I did:**
- Full audit of `tool` / `tool-provider` (evidence below under Decisions). Findings summarized as a design note (this entry, "Decisions" + "For the next agent" replace a separate design doc).
- Data-model verification for app-registered AI tools: the model IS app metadata — `LogicFunctionEntity.toolTriggerSettings` (jsonb, nullable) populated from `LogicFunctionManifest.toolTriggerSettings` at app sync (`from-logic-function-manifest-to-universal-flat-logic-function.util.ts:96`), stored per-workspace on the app-owned `logicFunction` row. Nothing to add.
- Contract-locking regression spec:
  `packages/twenty-server/src/engine/core-modules/tool-provider/providers/__tests__/logic-function-tool.provider.spec.ts` — 8 cases covering the registration surface end to end: tools emitted only for functions with `toolTriggerSettings` (registration flag), soft-deleted excluded (uninstall path), name/label/description/category/`executionRef.kind='logic_function'` shape (dispatch path), default-schema fallback, record-typed property resolution via `buildToolInputJsonSchema`, `includeSchemas:false` catalog mode, description fallback, `isAvailable`.
**Decisions & trade-offs (audit + design note):**
- Verified chain: SDK `defineLogicFunction` accepts `toolTriggerSettings` (`LogicFunctionConfigBase` = `Omit<LogicFunctionManifest, …>`; manifest builder infers `inputSchema` from handler source when omitted — `twenty-shared/logic-function#getInputSchemaFromSourceCode`). Sync persists it (`toolTriggerSettings: logicFunctionManifest.toolTriggerSettings ?? null` in the converter; editable-properties constant includes it). At runtime `LogicFunctionToolProvider.generateDescriptors` scans `flatLogicFunctionMaps` for functions with `toolTriggerSettings && deletedAt===null` and emits `ToolIndexEntry{executionRef:{kind:'logic_function',logicFunctionId}}` (category `LOGIC_FUNCTION` from `twenty-shared/ai`). `ToolExecutorService.dispatchLogicFunction` executes with the caller's auth context; role/object permissions apply through `rolePermissionConfig`.
- Install/uninstall semantics are inherited, not re-implemented: rows are app-owned metadata synced from the manifest (`application-sync.service.ts` `inferDeletionFromMissingEntities` deletes functions removed from the manifest; uninstall deletes app + metadata). Per-workspace tool list = functions of installed apps, gated by the provider reading workspace-scoped flat maps. This is exactly the "registerAiTools at install / unregister at uninstall" contract — expressed as data, per twenty-native-law §1 (use the primitive; no parallel framework).
- New A2E-app AI tools therefore cost zero server code: app authors add a logic function with `toolTriggerSettings: {}` (or `{inputSchema}`) to the app manifest. P9's "registry" work reduces to consuming `ToolRegistryService.getCatalog()` / `getToolsByCategories()` in the assistant surface + any per-app gating policy.
- Rejected alternative: a `workspaceAiTool` table keyed by app id. It would duplicate `logicFunction.toolTriggerSettings` + install state, drift on uninstall, and require a migration + upgrade command for zero capability gain (PLAN.md explicitly allowed "additive table or metadata"; metadata wins).
- Open question for P9: tools emitted per logic function are currently name-spaced `app_<slug>` by the provider; if P9 wants app-scoped grouping in the assistant UI, group by the function's `applicationId` via flat maps (data already present), no schema change.
**Verification:**
- `npx jest src/engine/core-modules/tool-provider/providers/__tests__/logic-function-tool.provider.spec.ts --config=jest.config.mjs` (cwd twenty-server) → 8 passed.
- oxlint --type-aware on the spec → 0 warnings/0 errors; oxfmt --check clean.
- In-package `npx tsgo -p tsconfig.json --noEmit` → 1 error, identical to the documented P1.3 baseline (pre-existing `workspaceTemplate` TS2322 in `from-workspace-entity-to-flat.util.ts`); 0 errors in new code (after fixing one real error in my own first draft: flat entities carry serialized string `deletedAt`, not `Date`).
- No GraphQL schema change; no entity/DB change (no migration or upgrade command due); twenty-shared untouched.
**For the next agent:** P1.5 is complete; all P1 tasks ticked — phase acceptance is ready for review and P2 is next (realtime gateway, PLAN.md P2.1). When the first A2E app ships an AI tool (P3+ documents), author it as a logic function with `toolTriggerSettings` in the app manifest — do NOT create any registration hook. Consumption entry points for P9: `ToolRegistryService.getCatalog(context)` / `getToolsByCategories(context, {categories})` (tool-provider module), `COMMON_PRELOAD_TOOLS` constant for chat preloading, `buildToolCatalogSection` util for system-prompt rendering. Known limitation: `LogicFunctionToolProvider` doesn't filter by owning app's install state per se — it reads workspace flat maps, which only contain functions of synced (installed) apps; verify this assumption once during P2 integration testing.

## 2026-09-10 12:05 UTC — Bilan (a2e-accounting) completion & hardening

**Task(s):** finish Bilan integration into the app system (P7 app-side;
P1.2 anatomy conformance).

**What I did:**
- Fixed 13 blocking `tsc` errors in the app manifest: the shared `option()`
  helper typed select colors as `string` (13 fields across 5 objects rejected
  by `FieldMetadataComplexOption`), now typed as a local `OptionColor` literal
  union mirroring `twenty-shared`'s un-exported `TagColor`.
- Removed the invalid `readability: MetadataReadability.RESTRICTED` property
  from `orgProfile.iban/bic` (not part of `RegularFieldManifest`; only
  `writability` exists). The gating intent is preserved by the
  `bilan.finance.settings` permission flag + field descriptions; the
  restriction now travels through the default role, which is the sanctioned
  mechanism.
- Built `quick-entry` front component (declared ID family 0013-0006, never
  implemented): three-field expense/income capture, category-driven VAT
  prefill, `enqueueSnackbar` feedback, `CoreApiClient` write. Ledger write
  stays in `sync-finance-entry-to-ledger` logic — the component only creates
  the finance entry.
- Added the two required command menu items (anatomy rule): "Bilan : saisie
  rapide" (GLOBAL, pinned) and "Bilan : trouver des aides" (GLOBAL) — the six
  declared `COMMAND_MENU_ITEM_IDS` previously had zero backing files.

**Verification:**
- `npx tsc --noEmit` in the app → 0 errors (was 13).
- `node --test` → 79/79 pass.
- `dev:build .` → manifest OK; verified `commandMenuItems` (2),
  `frontComponents` (subvention-explorer, quick-entry), 14 objects, 14 nav
  items, 10 logic functions, dashboard + subvention-explorer page layouts.
- `a2e-documents` still builds (1 file).
- oxlint clean on all touched files.

**Known limitations:**
- No live workspace: install/uninstall sync verified by code audit +
  manifest build, as with the earlier session noted above.
- `readability` restriction for IBAN/BIC is currently advisory (permission
  flag + description); a proper field-level visibility mechanism for app
  fields would need server support (P7.1e).

## 2026-09-10 13:55 UTC — Onboarding picker lists A2E apps

The onboarding InstallApps step listed only Three Twenty marketplace apps and
filtered by `isVetted` — first-party A2E apps (published on the private
registry, `isVetted=false` by default) would never appear. Added Bureau +
Bilan to `OnboardingInstallableApps` and exempted first-party A2E universal
identifiers from the vetting filter in `InstallApps.tsx` (template picker
still drives the actual template installs server-side). Verification:
twenty-front typecheck clean; 165 onboarding tests pass.

## 2026-09-13 20:45 UTC — GLM-5.3-Flash [executor]
**Task:** P1.6a Contract task · **Slice:** whole bullet (spec-only task) · **Claim:** done-for-review
**Changed:** `docs/plan/05-template-contracts.md` (new P1.6a spec: template identity/version, ownership inventory, compatibility surface, ApplyTemplateRequest/Result + TemplatePreview shapes, fixtures, rejection matrix, gaps); `docs/scripts/check-docs.mjs` (doc added to MAINTAINED_DOCUMENTS).
**Checks:** `node docs/scripts/check-docs.mjs` → PASS (19 maintained, 130 links); `node --test docs/scripts/check-docs.test.mjs` → 6/6. All symbols verified in source before writing: `WorkspaceTemplateService`, `WORKSPACE_TEMPLATE_DEFINITIONS` + `TEMPLATE_MANAGED_…` allow-list, `ApplyWorkspaceTemplateInput`, `ApplicationVersionValidationService` (`engines.twenty` semver), app package versions (documents 0.2.0, accounting 0.1.0).
**Missing for tick:** orchestrator review of the contract decisions (flat app ordering until SDK adds dependencies; result persistence shape left to P1.6b). No code, so no typecheck/lint applies.
**Do not redo:** the spec is grounded in the current service — P1.6b must extend `ApplyWorkspaceTemplateInput` additively, not replace it; managed nav rows stay bounded by the existing allow-list constant.
**Next:** P1.6b backend operation — per-step status capture, idempotency key, preview query, typed failure codes per §4–§5 of the spec.

## 2026-09-14 07:00 UTC — GLM-5.3-Flash [executor]
**Task:** P1.6b Backend operation · **Slice:** whole bullet (resumable setup operation + preview) · **Claim:** done-for-review
**Changed:** `workspace-template.service.ts` (operation + preview + per-step capture, legacy mutation now delegates); `workspace-template-definitions.constant.ts` (adds `version: 1` + `optionalApplicationUniversalIdentifiers`); new `types/apply-template-operation.types.ts`, `dtos/apply-template-operation-result.dto.ts`, extended `dtos/apply-workspace-template.input.ts`; `onboarding.resolver.ts` (new `applyWorkspaceTemplateOperation` mutation + `workspaceTemplatePreview` query); `onboarding.module.ts` (+ApplicationPackageModule, CacheLockModule, KeyValuePairModule); `onboarding.exception.ts` (6 new typed codes); spec rewritten `__tests__/workspace-template.service.spec.ts` (12 tests).
**Checks:** `tsgo --noEmit` in twenty-server → clean; oxlint type-aware on onboarding/ → 0/0; oxfmt --check → clean; `npx jest` on the spec → 12/12.
**Missing for tick:** GraphQL schema regeneration (`npx nx run twenty-front:graphql:generate`) against a running server + front consumption of the new operation (P1.6c) — Tier 2, orchestrator. Real-DB concurrency check of the CacheLock-serialized same-key retry (unit-tested with the lock mocked through).
**Do not redo:** result persistence goes through `KeyValuePairService` (workspace-scoped `template-operation:<key>` keys, USER_VARIABLE type); retry semantics = re-run only failed/pending steps, succeeded steps returned as-is; legacy `applyWorkspaceTemplate` keeps its old GraphQL shape and delegates internally — front code untouched and still passing.
**Next:** P1.6c — front onboarding/Settings consume `workspaceTemplatePreview` + `applyWorkspaceTemplateOperation`, surface per-step partial states and retry; generate the schema first.

## 2026-09-14 15:25 UTC — GLM-5.3-Flash [executor]
**Task:** P1.6c Front onboarding/Settings · **Slice:** whole bullet — both entrypoints consume `workspaceTemplatePreview` + `applyWorkspaceTemplateOperation` with per-step partial states and retry · **Claim:** done-for-review
**Changed:** new `twenty-front/src/modules/a2e-workspace/`: `types/apply-template-operation.types.ts` (mirror of server contract), `graphql/queries/workspaceTemplatePreview.ts` + `graphql/mutations/applyWorkspaceTemplateOperation.ts` (hand-written documents, codegen note included), hooks `useWorkspaceTemplatePreview` (skipped until a template is selected) and `useApplyWorkspaceTemplateOperation` (client uuid idempotency key reused across retries, resettable), component `A2eWorkspaceTemplatePreview` (per-app required/optional checkboxes, samples toggle, blocked banner, per-step status list with error codes, retry button label switches to "Retry failed steps"); `A2eWorkspaceTemplatePicker` now renders the preview under the selected card instead of the legacy `useApplyWorkspaceTemplate` mutation — both onboarding (InstallApps) and Settings sections go through the same flow with zero page-level changes. Legacy `useApplyWorkspaceTemplate` kept untouched (still used by its passing test; delete it in a later additive-safe slice once real-server smoke passes).
**Checks:** `npx tsgo -p tsconfig.json --noEmit` (twenty-front) → 0 errors; oxlint type-aware on a2e-workspace → 0/0; oxfmt → clean; `npx jest src/modules/a2e-workspace` → 9/9 (incl. new hook test: per-step result, same idempotency key on retry after failure, fresh key after reset).
**Missing for tick:** GraphQL documents are hand-written because the checked-in `generated-metadata/graphql.ts` predates the P1.6b schema — run `npx nx run twenty-front:graphql:generate` against a running server (Tier 2) and switch the two documents to the generated `*Document` exports; real browser journey of onboarding + Settings apply/retry against `yarn start` (Tier 2, orchestrator).
**Do not redo:** operation hook keys retries by a per-hook-instance uuid — re-rendering the picker keeps the same key; only unmount/reset generates a new one. Preview query is skipped while no template is selected. Server contract mirrored type-for-type from `apply-template-operation.types.ts` — keep both sides in sync when the schema changes.
**Next:** orchestrator: schema regeneration + Tier-2 journey; then P1.6d starter bundles.

## 2026-09-14 15:35 UTC — GLM-5.3-Flash [executor]
**Task:** P1.6d Starter bundles · **Slice:** first unmet bullet — starter content: Documents bundle (meeting notes/project brief/PRD/one-on-one) shipped via the app's post-install seeder · **Claim:** partial
**Changed:** `a2e-documents/src/lib/starter-templates.ts` (new: 4 template descriptors + `findMissingStarterTemplates` delta helper); `a2e-documents/src/logic-functions/post-install.ts` (template seeding now installs the full bundle, repeat-safe by title check — matches the provenance rule: only missing titles are created, so reinstall/retry never duplicates seeds); new `src/lib/__tests__/starter-templates.test.ts`.
**Checks:** `npx tsc --noEmit` in the app → 0 errors; `node --test src/lib/__tests__/*.test.ts` → 34/34 (4 new); `npx twenty dev:build .` → manifest OK, 14 files; `yarn lint` → 0/0.
**Missing for tick:** live install on a populated workspace to observe the seeded bundle + non-duplication on reinstall (Tier 2: app:publish/app:install, orchestrator); remaining bundle content — a2e-projects (project delivery/event retro) has no post-install seeder at all, and Bilan cashflow/donation/grant sheets+fiches belong to the P7 safe slice; persona-bundle proposal definitions (student/journal/non-profit…) in `WORKSPACE_TEMPLATE_DEFINITIONS` stay version-1 code-data — needs a product decision before bumping (D02); real-server smoke of P1.6b/c still open.
**Do not redo:** the seeder's idempotency contract (missing-titles-only delta) and the descriptor shape — P1.6e content templates should reuse `starter-templates.ts` rather than re-declare content; do not extend the post-install to write anything beyond the `_document` tree.
**Next:** second bundle slice — give a2e-projects a post-install seeder (project-delivery + event-retro briefs as project templates), then the persona-bundle product decision (D02).

## 2026-09-14 18:30 UTC — GLM-5.3-Flash [executor]
**Task:** P1.1 Verify install/uninstall on populated scratch workspace under C3 · **Slice:** reinstall-after-uninstall acceptance (the last unaccepted item; install/upgrade/hook-failure/data-loss-preflight were accepted in phase-00) · **Claim:** done-for-review
**Changed:** `test/integration/metadata/suites/application/uninstall-data-loss-preflight.integration-spec.ts` (new 5th case: uninstall succeeds → object table dropped → manifest re-syncs → same object universal identifier back with an empty table — reinstall restores defaults, not deleted data; role label now run-unique like the dependent manifest); new util `utils/recreate-development-application.util.ts` (re-creates the development application + re-uploads package.json after uninstall, without touching the surviving registration — `setupApplicationForSync` fails there with UNIVERSAL_IDENTIFIER_ALREADY_CLAIMED); BLOCKER FIX `src/database/typeorm/database-version-check.service.ts` + its spec: `SHOW server_version` was destructured as `[[{ version }]]` — TypeORM returns a flat rows array and the column is `server_version`; the wrong shape threw `object is not iterable` in `onModuleInit` and **blocked every integration suite at globalSetup** since it was committed (unit spec mocked the wrong shape, so it passed). Test-DB cleanup: removed the orphaned "Test Application"/role/file rows left in `test` by an earlier OOM-killed run.
**Checks:** integration spec on `test` DB (`NODE_ENV=test`, `--runInBand`, 6 GB heap) → 5/5; version-check unit spec → 3/3; `tsgo --noEmit` in twenty-server → clean; oxlint type-aware on the 4 touched files → 0/0; `nx lint:diff-with-main twenty-server` → no changed files vs main cache.
**Missing for tick:** none server-side; the published-artifact path (`app:publish`/`app:install` against a live registry) for a2e-documents/a2e-projects/a2e-accounting remains Tier 2 (server :3000 and registry :2020 were down this session) — phase-00 already recorded that acceptance for a2e-documents 0.1.2/0.2.0.
**Do not redo:** the reinstall case reuses the suite's run-unique object-name suffix — never revert that; the role label must stay suffixed too (workspace-unique constraint, leftover debris from aborted runs otherwise blocks `beforeEach`). `setupApplicationForSync` leaves fake timers active: any new test doing HTTP after `beforeEach` must `jest.useRealTimers()` first.
**Next:** orchestrator review → tick P1.1; P1.3's first unmet bullet (complete preset orchestration) is P1.6-owned, so next dependency-ready executor slice is P1.6d's Bilan bundle content (P7 safe slice) or the D02 persona-bundle product decision.
**Task:** P1.6d Starter bundles · **Slice:** second bundle slice — a2e-projects post-install seeder (project-delivery + event-retroplanning starter projects) · **Claim:** done-for-review
**Changed:** new `a2e-projects/src/logic-functions/post-install.ts` (fills the previously unused `LOGIC_FUNCTION_IDS.postInstall` reservation) + `src/lib/starter-projects.ts` (2 project templates: Livraison `LIV`, Rétroplanning d'événement `EVT`, each with 5 tasks + 3 milestones; `findMissingStarterProjects` delta by project key; `resolveMilestoneDueAt` pure day-offset mapper) + `src/lib/__tests__/starter-projects.test.ts` (6 cases).
**Checks:** `node --test src/lib/__tests__/starter-projects.test.ts` → 6/6; `npx tsc --noEmit` in the app → 0 errors; `yarn lint` → 0 errors (2 pre-existing warnings in untouched files); `npx twenty dev:build .` → OK 14 files, manifest `postInstallLogicFunction` = c31a0000-0012-4000-8000-000000000003 confirmed.
**Missing for tick:** live install on a populated workspace to observe the seeded projects/tasks/milestones + non-duplication on reinstall (Tier 2: app:publish/app:install, orchestrator); relation FK payload written via join-column scalars (`projectId`) per the a2e-accounting ledger pattern — real-server smoke will confirm the 2.31 SDK shape.
**Do not redo:** delta contract is by project `key` (not name) — the key is the human-id provenance marker; milestone dates resolve `dueInDays` offsets against install day at seed time (calendar shows a live plan). Post-install writes only project/task/milestone rows — do not extend it to labels or time entries.
**Next:** Bilan cashflow/donation/grant sheets+fiches belong to the P7 safe slice; then the persona-bundle product decision (D02) before bumping `WORKSPACE_TEMPLATE_DEFINITIONS`.

## 2026-09-14 18:42 UTC — GLM-5.3-Flash [executor]
**Task:** P1.6d Starter bundles · **Slice:** third bundle slice — a2e-accounting (Bilan) post-install seeder: trésorerie/dons/subventions sheets + 2 draft fiches · **Claim:** done-for-review
**Changed:** new `a2e-accounting/src/lib/starter-books.ts` (3 sheet descriptors with typed non-managed `LedgerColumn` sets, `findMissingStarterSheets` delta by `systemKey`, `findMissingStarterFiches` delta by (title, templateKey), `starterFichePayloads` reusing `withTemplateDefaults` so seeds match the editor contract, `isStarterSheetSystemKey` guard); `a2e-accounting/src/logic-functions/post-install.ts` (adds `seedStarterSheets` + `seedStarterFiches` to the existing install chain and summary — existing category/ledger/org-profile/catalogue seeds untouched); new `src/lib/__tests__/starter-books.test.ts` (8 cases).
**Checks:** `node --test` on the new spec → 8/8; full app unit sweep → 88/88; `yarn typecheck` → clean; `yarn lint` → 0/0; `npx twenty dev:build .` → OK 26 files with internal typecheck.
**Missing for tick:** live install/reinstall on a populated workspace to observe the three sheets + two fiches and confirm non-duplication (Tier 2: app:publish/app:install, orchestrator — same evidence gap as the documents/projects slices); `systemKey` uniqueness collision with a user sheet holding the same key would fail the create — real-server smoke will confirm error surface.
**Do not redo:** sheet delta is by `systemKey` (unique column, never the ledger's `bilan.default.ledger`); fiche delta is (title, templateKey) pairs — not title alone. Seeds carry `isTemplate: true` + `sheetKind: 'CUSTOM'`, never `isDefault`/`isLocked` (those belong to the system ledger only). Do not extend the post-install to pre-fill finance entries — C6 forbids demo content becoming a financial transaction.
**Next:** persona-bundle product decision (D02) before touching `WORKSPACE_TEMPLATE_DEFINITIONS`; orchestrator Tier-2 install sweeps for all three app seeders.

## 2026-09-14 20:40 UTC — GLM-5.3-Flash [executor]
**Task:** P1.6e Workspace reuse · **Slice:** first unmet sub-piece — save/edit/duplicate workspace content templates in the documents surface (instantiate-from-gallery and delete-without-deleting-copies already existed) · **Claim:** done-for-review
**Changed:** `a2e-documents/src/lib/instantiate-template.ts` (exports the existing `TEMPLATE_TITLE_PREFIX` — the only change to a shipped file); new `src/lib/save-document-as-template.ts` (pure payloads: `buildSaveAsTemplatePayload` document→TEMPLATE with prefix-once title, `buildTemplateDuplicatePayload` template→template with " (copie)" suffix); new `src/lib/__tests__/save-document-as-template.test.ts` (8 cases); `document-browser.front-component.tsx` — root query now selects `content { blocknote markdown }` (it never did, so the pre-existing "dupliquer" button instantiated empty bodies — same ledger-noted gap as the browser query omitting content), and each tree row gains "créer un modèle" (document) / "dupliquer" (template) alongside the relabelled "utiliser".
**Checks:** `node --test save-document-as-template.test.ts` → 8/8; lib suite sweep → 42/42; `npx tsc --noEmit` in the app → 0 errors; `yarn lint` → 0 warnings 0 errors; `npx twenty dev:build .` → OK 14 files with typecheck.
**Missing for tick:** real-server/browser verification of save→instantiate round-trip and duplicate non-aliasing (Tier 2, orchestrator — same gap as the P1.6d seeders); the "edit template" leg of the bullet needs a product call — editing today = edit the TEMPLATE record directly in the record page, no separate template-editor surface; permission-aware attachment/ID remapping is N/A for `_document` (no attachment/relation fields to remap — verified in `document.object.ts`).
**Do not redo:** payloads stay pure (caller owns persistence) — reuse them for any future gallery/settings surface; the browser query content selection must survive refactors or copies go empty again; title prefixes are idempotent (never double "Modèle — ").
**Next:** P1.3's e2e preset-acceptance bullet or P1.7a (both after orchestrator Tier-2 passes); D02 persona-bundle decision still gates P1.6d's last leg.
## 2026-09-14 20:11 UTC — GLM-5.3 [executor]
**Task:** P1.7a App management · **Slice:** blocked-removal explanation per C3 + no-data-restoration confirmation wording (the "hide versus uninstall labels and blocked-removal explanation" leg) · **Claim:** done-for-review
**Changed:** `twenty-server/.../application-uninstall-preflight.service.ts` — both C3 refusals now pass a specific `userFriendlyMessage` (data-loss: names objects, states deletion is permanent, reinstall restores nothing, hide-via-navigation is the alternative; dependents: names dependent apps) instead of falling back to the misleading FORBIDDEN "no permission" text; removed 4 pre-existing unused imports in the touched file. `twenty-front/.../SettingsApplicationDetails.tsx` — uninstall catch now surfaces the server explanation via `getErrorMessageFromApolloError` (CombinedGraphQLErrors only) with the generic message as fallback. `twenty-front/.../SettingsApplicationDetailAboutTab.tsx` — uninstall ConfirmationModal subtitle now states permanent deletion, no restoration on reinstall, and the remove-from-navigation alternative before the type-to-confirm line. Spec extended: both refusal cases assert the `userFriendlyMessage` interpolations.
**Checks:** `npx jest application-uninstall-preflight.service.spec.ts` → 8/8; `npx tsgo --noEmit` in twenty-server and twenty-front → clean; oxlint type-aware on all 4 touched files → 0/0; `npx jest --findRelatedTests` on the 2 front files → 41/41; `nx lint:diff-with-main` both pkgs → no changed files vs main (uncommitted work; direct oxlint used instead).
**Missing for tick:** browser verification of the snackbar wording against a live blocked uninstall (Tier 2, orchestrator); `lingui extract` for the new msg strings is intentionally NOT run (catalog churn rule) — fr/en catalogs regenerate via the i18n pipeline; remaining P1.7a legs (install-later readiness surface, dependency impact display, export flow) untouched.
**Do not redo:** the two `userFriendlyMessage` descriptors and their spec interpolations; the front catch pattern (CombinedGraphQLErrors.is gate) — it exists so non-GraphQL failures keep the generic message.
**Next:** next P1.7a slice — export/confirmation flow before uninstall (needs product decision on export format) or move to P1.7b Team entry (after P1.6c/P0.2, both done).

## 2026-09-14 22:33 UTC — GLM-5.3 [orchestrator verification]
**Scope:** the four unverified P1.6e/P1.7a executor entries above.
**Diff review:** clean — additive only, no secrets, no i18n catalog churn, no deleted features; all five report entries attribute the dirty tree exactly.
**Checks re-run (all green):** documents lib suite 42/42; server preflight spec 8/8; front related tests 41/41; `tsgo --noEmit` twenty-server/twenty-front/both apps clean; oxlint 0/0; `dev:build` OK both apps.
**Tier 2 (live, scratch remote against :3000 via minted admin API key):**
- P1.6e: published + installed a2e-documents 0.2.1 (version bump scratch-only, reverted after) — install clean, new front component code live. Browser round-trip not driven (no browser session); state stays `[~]`.
- P1.7a: **C3 preflight FAILS live.** Created a `_document` record (id 5bcc54e3…) then called `uninstallApplication` — it returned true and DROPPED the table with the record in it. Root cause: `getApproximateRecordCountByTableName` reads `pg_class.reltuples`, which is -1 on never-ANALYZEd tables → clamped to 0 → preflight sees an empty app. This invalidates the live-refusal acceptance recorded for P0.4 C3 in commit 0a21643b (its spec mocked the count service). Server process verified running current dist (started 22:10:19, dist built 22:09:44).
- Also surfaced: a2e-accounting 0.1.0 is **not installable** — `app:install` fails with 38 manifest sync errors (missing `settings.maxNumberOfValues` on 6 fields, 2 relation-field targets not found, reserved names `address`/`links`, 25 view-field refs to nonexistent field metadata, unique index on TEXT `cacheKey`). No partial application row was left behind.
**Actions:** PLAN.md P1.6e/P1.7a → `[~]` with reasons; no tick — the C3 refusal wording is in the code path but its trigger is broken for fresh tables.
**Next:** (1) fix the preflight count (exact `count(*)` for small tables or `ANALYZE` before reading reltuples — choose with perf in mind; a data-destroying gate must not be approximate); (2) fix the a2e-accounting manifest errors — blocks all P7 Tier-2; (3) re-run this live C3 scenario as the repaired acceptance.

## 2026-09-15 22:15 UTC — GLM-5.3 [executor]
**Task:** P1.7a App management · **Slice:** orchestrator next-step (1) — C3 preflight exact record counts (reltuples=-1 on never-ANALYZEd tables let a populated app uninstall and drop data) · **Claim:** done-for-review
**Changed:** `object-record-count.service.ts` — new `getExactRecordCountByTableNames` (per-table `count(*)` on the caller-named owned tables only, identifier allow-list regex since names are inlined; the approximate reltuples method stays for its existing consumers); `application-uninstall-preflight.service.ts` — impact now built from exact counts, internal type field `approximateRecordLossByObject`→`recordLossByObject` (`recordCount`), refusal logic unchanged; unit spec mocks renamed; integration spec — removed the `analyzeCouponTable` workaround (preflight must see un-ANALYZEd rows — that is the regression being fixed) and fixed the reinstall case which inserted a record then expected uninstall success (only passed via the stale-statistics bug, contradicting its own "starting from empty data" name).
**Checks:** unit preflight spec → 8/8; integration `uninstall-data-loss-preflight` on `test` DB (NODE_ENV=test, --runInBand, 6 GB heap) → 5/5 — the exact never-ANALYZEd-table-with-record refusal the orchestrator found broken now passes; adjacent uninstall suites (retry, logic-function-hook, package-file-fks) → 8/8; `tsgo --noEmit` → clean; oxlint type-aware on the 4 touched files → 0/0.
**Missing for tick:** live re-run of the orchestrator's C3 scenario against the dev server (minted API key, create `_document` record, uninstall must refuse) — Tier 2; note a first integration attempt without the heap flag OOM-crashed and left debris that made test 5 fail once — clean re-run is authoritative.
**Do not redo:** `getApproximateRecordCountByTableName` is NOT removed — `mostly-empty-fields.service` and `getRecordCounts` still use it; only the uninstall gate switched to exact counts. Never reintroduce an ANALYZE step or reltuples read into the C3 gate.
**Next:** orchestrator next-step (2): fix the 38 a2e-accounting manifest sync errors (blocks P7 Tier-2); then live C3 re-verification.

## 2026-09-16 12:10 UTC — GLM-5.3-Flash [executor]
**Task:** P1.7a/P7-adjacent · **Slice:** orchestrator next-step (2) — fix the 38 a2e-accounting (Bilan) manifest sync errors · **Claim:** done-for-review
**Changed:** app `src/` — 7 FILES fields get `universalSettings.maxNumberOfValues` (10; logo 1; saved-subvention docs 20); 3 standalone inverse-field manifests in new `src/fields/` (company.invoices, opportunity.invoices, company.quotes — a2e-documents pattern); reserved renames `orgProfile.address`→`headOfficeAddress`, `subvention.links`→`officialLinks` (UIDs preserved) with all reference sites updated; `aiCacheEntry.cacheKey` drops `defaultValue`, stays unique via `isNullable: true`; `book-entries.view.ts` puts label at position 0 (label identifier must be lowest). Server — `object-record-count.service.ts` allow-list regex accepts uppercase (custom tables keep camelCase names, e.g. `_invoiceLine`; uninstall preflight threw for ANY camelCase custom object); `create-app.ts` (integration harness) applies production body-parser limits — Nest's 100kb default 413-rejected the 167KB Bilan manifest before GraphQL. New `bilan-manifest-sync.integration-spec.ts` syncs the real built manifest on the `test` DB (uploads built logic-function/front-component files first, self-cleans via beforeAll).
**Checks:** `twenty dev:build` OK (28 files); scripted manifest pass (FILES settings, reserved names, relation targets, view-field refs, label-identifier position) → PASS, 14 objects / 250 fields; integration spec → 1/1, re-run → 1/1 (self-cleaning); app `tsc --noEmit` 0, `yarn lint` 0/0, `yarn test:unit` 96/96; `tsgo --noEmit` twenty-server 0 errors; oxlint touched server files 0 errors.
**Missing for tick:** Tier 2 — live `app:publish`/`app:install` of Bilan + the C3 uninstall scenario re-run (orchestrator, closes next-step 3); the new spec needs `.twenty/output/manifest.json` (fails if missing — run `twenty dev:build` first). Note: diagnostic OOM crashes during development left orphaned enums/tables/columns in the `test` DB's workspace schema — dropped manually; if a future Bilan sync hits "type `_x_enum` already exists", clean that schema, do not chase app causes.
**Do not redo:** renames are safe — Bilan never installed successfully (no partial rows); hardcoded standard-object UIDs in `src/fields/` match a2e-documents (app build can't resolve twenty-shared); spec calls `makeMetadataAPIRequest` directly because `syncApplication`'s util throws before the spec can print errors.
**Next:** orchestrator Tier 2 (Bilan live install + C3 re-verification); then PLAN's P1.7b or P1.3 e2e.

## 2026-09-16 13:15 UTC — GLM-5.3-Flash [executor]
**Task:** P1.7b Team entry · **Slice:** first unmet bullet — invitations join the configured workspace (Tier-1 acceptance evidence for the native join path) · **Claim:** done-for-review
**Changed:** new `twenty-server/test/integration/graphql/suites/auth/sign-up/invitation-join-preserves-configured-workspace.integration-spec.ts` (4 cases): (1) sign-up with a valid personal invitation on the seeded Apple workspace with `workspaceTemplate='INDIVIDUAL'` set lands the invitee in the SAME workspace (not a fresh one), the template value survives the join, the standard CRM nav row (`…b001`) still exists exactly once (a join must not re-seed managed rows), a `workspaceMember` row is created (links by `userId`, not `userWorkspaceId`), (2) the invitation token is consumed after use (`invalidateWorkspaceInvitation`), (3) an invitation whose `context.roleId` belongs to the YC workspace is refused (`ROLE_NOT_FOUND` via `resolveRoleIdForNewMember`→`validateRoleAssignableToUsersOrThrow`) and the join half-applies nothing (no `userWorkspace` row), (4) an invitation carrying a valid assignable in-workspace role (Apple Guest) is HONORED — a `core."roleTarget"` row links the new membership to the invitation's `roleId` (not just the workspace default role).
**Checks:** spec on `test` DB (NODE_ENV=test, --runInBand, 6 GB heap) → 4/4 pass; `npx tsgo -p tsconfig.json --noEmit` → clean; `npx oxlint` on the new file → 0/0. No product code changed — the native path (`checkAccessAndUseInvitationOrThrow` → `addUserToWorkspaceIfUserNotInWorkspace` → role resolution → member creation → `assignRoleToManyUserWorkspace` → token invalidation) was already correct; this slice converts it from source-audit to recorded acceptance.
**Missing for tick:** P1.7b's remaining legs — member/viewer/admin permission matrix across templates/projects/search/tools/shares, role-change and removed-member behavior, personal-preference isolation across workspace switches; browser-level journey of invite→join→land (Tier 2, orchestrator). Note for that journey: the test DB had no ClickHouse running (ECONNREFUSED :8123 log-sink noise during the spec — non-fatal, events dropped).
**Do not redo:** metadata lives in `core` (`navigationMenuItem`, `application`, `role`, `userWorkspace`, `appToken`) — only object records live in `workspace_<base36>` schemas; `workspaceMember` joins by `userId`; the Apple company nav row UID is `20202020-b001-4b01-8b01-c0aba11c0001`. Do not delete/reinsert seeded nav rows in tests — assert counts instead (restoring them requires the full standard-application sync, not a bare INSERT).
**Next:** P1.7b second leg — role-matrix acceptance (member vs viewer vs admin on template apply, project records, document shares) reusing `send-invitations-operation-factory` + seeded guest/limited roles; or P1.3's e2e preset bullet if the orchestrator prefers Tier 2 first.

CLAIMED — P1.7b/role-matrix — GLM-5.3-Flash — 2026-09-16T14:17:00Z — base 3a6d3ff049f7fc679027037bc6e082c5f4b2023a — worktree ../a2e-p17b-rolematrix-x7kq

## 2026-09-16 14:35 UTC — GLM-5.3-Flash [executor]
**Task:** P1.7b Team entry · **Slice:** second leg — role-matrix acceptance on standard records: invited Guest (viewer) read-only, role change Guest→Member applies to an already-minted token, removed member loses access immediately
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-1 acceptance recorded, but P1.7b remaining legs (settings/tool/share matrix breadth, personal-preference isolation across workspace switches) and browser-level invite→join journey (Tier 2) are open
**Base:** 3a6d3ff049f7fc679027037bc6e082c5f4b2023a · **Worktree:** ../a2e-p17b-rolematrix-x7kq
**Changed:** new `twenty-server/test/integration/graphql/suites/auth/sign-up/role-matrix-invitee-read-write-promote-remove.integration-spec.ts` (4 cases, no product code)
**Checks:** preflight `pg_isready` + `redis-cli ping` → OK; spec on `test` DB (NODE_ENV=test, --runInBand) → 4/4 pass; `npx oxlint <spec>` → 0 warnings 0 errors; `npx tsgo -p tsconfig.json --noEmit` → 0 errors mentioning the spec (7 pre-existing TS2742 in unrelated test utils are a worktree-symlink artifact — same files have 0 in the main checkout)
**Missing for tick:** P1.7b legs beyond record-level matrix: role changes applying across templates/projects/search/tools/shares breadth, personal preferences across workspace switches; Tier-2 browser journey. Note: spec needs seeded non-light workspace (Guest/Member roles + Phil guest member); ClickHouse ECONNREFUSED :8123 log noise is non-fatal
**Do not redo:** role resolution reads live DB per request (no permission-cache layer in this tree) — role change applies to an existing token without re-minting; `updateWorkspaceMemberRole`/`deleteUserFromWorkspace` mutations take workspaceMember IDs, resolved in spec via workspaceMember→user join; afterAll hard-cleans invitee (roleTarget→workspaceMember→userWorkspace→user) because deleteUser by the removed user token itself fails post-removal
**Next:** orchestrator Tier-2 browser journey of invite→join→promote→remove; then P1.7b third leg (preference isolation across workspace switches) or P1.3 e2e preset bullet

CLAIMED — P1.7b/search-breadth — GLM-5.3-Flash — 2026-09-16T15:00:00Z — base 3a6d3ff049f7fc679027037bc6e082c5f4b2023a

## 2026-09-16 15:10 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.7b Team entry · **Slice:** third leg — role-matrix breadth on the search surface (unified `search` under caller role, write-through-search-id guard, soft-delete visibility, removal revocation)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-1 search breadth recorded, but P1.7b's remaining legs (personal-preference isolation across workspace switches; settings/tool/share matrix breadth; Tier-2 browser journey) are open
**Base:** 3a6d3ff049f7fc679027037bc6e082c5f4b2023a (final tree was committed by a user-side auto-commit hook "save" → 34e7e320, not by this session)
**Changed:** new `twenty-server/test/integration/graphql/suites/auth/sign-up/role-matrix-invitee-search-breadth.integration-spec.ts` (5 cases, no product code)
**Checks:** preflight `pg_isready` + `redis-cli ping` → OK; spec on `test` DB (`NODE_ENV=test npx jest … --config jest-integration.config.ts --runInBand`) → 5/5 pass; `npx tsgo -p tsconfig.json --noEmit` → 0 errors mentioning the spec; `npx oxlint <spec>` → 0 warnings 0 errors
**Missing for tick:** preference-isolation leg across workspace switches; Tier-2 browser invite→join→search journey. Note: shares breadth stays covered by P0.2's fail-closed document-share suite — the seeded `test` workspace has no a2e-documents app (`_document` table absent), so a viewer-share-creation matrix there is not exercisable without an app install (Tier 2)
**Do not redo:** search matches on websearch OR-tokens — seeded companies share "Co"/"Matrix" tokens with any test name, so assertions must target the specific `recordId` (helpers `expectSearchFindsRecord`/`expectSearchOmitsRecord`), never edge counts; `searchFactory` requires `limit` at the type level despite a runtime default; same hard-cleanup order as the second leg (roleTarget→workspaceMember→userWorkspace→user); ClickHouse ECONNREFUSED :8123 log noise is non-fatal
**Remaining:** 12 other [ ]/[~] tasks ahead of this slice in the execution order (P1.3 e2e, P1.6d remainder, P1.7b/c, P2.x+)
**Next:** P1.7b fourth leg — personal-preference isolation across workspace switches (navigation/map settings per user per workspace), or orchestrator Tier-2 browser journey

## 2026-09-16 16:10 UTC — GLM-5.3-Flash [executor]
**Task:** P1.7b Team entry · **Slice:** fourth leg — personal-preference isolation across workspace switches (per-workspace member prefs, user-locale scoping, self-removal preserves other memberships) · **Claim:** done-for-review
**Changed:** new `twenty-server/test/integration/graphql/suites/auth/sign-up/role-matrix-invitee-preference-isolation.integration-spec.ts` (4 cases, no product code)
**Checks:** preflight `pg_isready` + `redis-cli ping` → OK; spec on `test` DB (`NODE_ENV=test npx jest … --config jest-integration.config.ts --runInBand`) → 4/4 pass; `npx tsgo -p tsconfig.json --noEmit` → 0 errors in the spec; `npx oxlint <spec>` → 0 warnings 0 errors; post-run DB check → no invitee debris left
**Missing for tick:** settings/tool/share matrix breadth legs; Tier-2 browser journey (invite→join→customize→switch→verify). Note: YCombinator workspace needed a seeded personal invitation — the spec seeds `appToken` rows directly into both workspaces (seed util defaults to Apple)
**Do not redo:** core user mutations (`currentUser`, `updateWorkspaceMemberSettings`, `deleteUserFromWorkspace`) live on the `/metadata` endpoint, NOT `/graphql` (request-utils take `{query, variables}` wrappers — a bare `gql` AST fails `print()`); member enums are `HOUR_24`/`DAY_FIRST`/`MONTH_FIRST` (not `MILITARY`/`SYSTEM`-style legacy); `createWorkspaceMember` defaults fresh members to `colorScheme 'System'` + user locale; a fresh second membership inherits the USER locale (en) even when another membership carries fr-FR — that is the asserted contract; the `updateWorkspaceMemberSettings` locale path writes ONLY the userWorkspace row, never `user.locale`
**Remaining:** 12 other [ ]/[~] tasks ahead of this slice in the execution order (P1.3 e2e, P1.6d remainder, P1.7b settings/share breadth legs, P1.7c, P2.x+)
**Next:** orchestrator Tier-2 browser journey (invite→join→customize→switch workspaces), or P1.7b remaining breadth legs (settings/tools/shares beyond record-level)

## 2026-09-16 16:51 UTC — GLM-5.3-Flash [executor]
**Task:** P1.7b Team entry · **Slice:** fifth leg — role-matrix breadth on the tool index + settings surface (unified `getToolIndex`/`getToolInputSchema` under caller role, Member≠settings separation, removal revocation) · **Claim:** done-for-review
**Changed:** new `twenty-server/test/integration/graphql/suites/auth/sign-up/role-matrix-invitee-tool-and-settings-breadth.integration-spec.ts` (3 cases, no product code)
**Checks:** preflight `pg_isready` + `redis-cli ping` → OK; spec on `test` DB (`NODE_ENV=test npx jest … --config jest-integration.config.ts --runInBand`, 6 GB heap) → 3/3 pass, re-run → 3/3; `npx tsgo -p tsconfig.json --noEmit` → 0 errors mentioning the spec; `npx oxlint <spec>` → 0/0; post-run DB check → no invitee debris
**Missing for tick:** settings breadth beyond ROLES/WORKSPACE_MEMBERS (same guard class, exercised via the existing seeded-token suites); Tier-2 browser journey (invite→join→customize→switch→verify). Note: role TOOL breadth (`canAccessAllTools`) is gated at role level via `checkRolesPermissions(ROLES/DATA_MODEL/…)` inside each provider — Guest sees `find_one_company`-class read tools but no write/ROLE/METADATA/WEBHOOK/WORKFLOW entries and a null write schema; Member unlocks writes but NOT settings (`canUpdateAllSettings=false`) — asserted via sendInvitations + getRoles FORBIDDEN on the SAME token
**Do not redo:** `updateWorkspaceMemberRole`/`deleteUserFromWorkspace` need the workspace-schema `workspaceMember.id` (NOT `core.userWorkspace.id` — first run failed with "Workspace member not found" until the lookup joined the schema table); `expect` bodies: `getToolInputSchema` returns `null` (not absent) for a denied tool; hard-cleanup order roleTarget→userWorkspace→user (no workspaceMember row delete needed — deleteUserFromWorkspace already removed it); ClickHouse ECONNREFUSED :8123 log noise is non-fatal
**Remaining:** 12 other [ ]/[~] tasks ahead of this slice in the execution order (P1.3 e2e, P1.6d remainder, P1.7b Tier-2 browser journey, P1.7c, P2.x+)
**Next:** orchestrator Tier-2 browser journey (invite→join→customize→switch workspaces), or P1.3's e2e preset-acceptance bullet

CLAIMED — P1.6e/gallery-entrypoint — GLM-5.3-Flash — 2026-09-16T16:58:00Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 17:02 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.6e Workspace reuse · **Slice:** gallery entrypoint — template gallery section in the document browser (instantiate-from-gallery; populated-workspace regression left to Tier 2) · **Claim:** done-for-review
**Ready-to-tick:** no — gallery live-behavior needs a browser against a running app (Tier 2, orchestrator)
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** `a2e-documents/src/lib/template-gallery.ts` (new: generic `collectGalleryTemplates` — TEMPLATE kind, non-archived, fr-locale title sort); `src/lib/__tests__/template-gallery.test.ts` (4 cases); `document-browser.front-component.tsx` (+32: "Modèles" section above the tree with empty-state, gallery rows gain a `utiliser` instantiate button via optional `onInstantiate` on `DocumentRow`).
**Checks:** `node --test template-gallery.test.ts` → 4/4; lib suite sweep → 46/46; `npx tsc --noEmit` in the app → 0 errors; `yarn lint` → 0/0; `npx twenty dev:build .` → OK 14 files with typecheck.
**Missing for tick:** browser verification of the gallery section + instantiate-from-gallery against `yarn start` (Tier 2, orchestrator — same gap as prior P1.6e slices); the "edit template" leg still needs the recorded product call (edit = template record page today).
**Do not redo:** gallery helper is pure and generic — reuse it for any future new-document/gallery surface; archived templates deliberately excluded (restore from trash first); tree rows and actions untouched.
**Remaining:** >20 other [ ]/[~] tasks in the execution order (grep truncated at 40 bullets, P4.2+ unseen).
**Next:** orchestrator Tier-2 gallery journey; executors — P1.3's e2e preset-acceptance bullet or P1.7c first-use acceptance.

CLAIMED — P1.7b/template-permission-gate — GLM-5.3-Flash — 2026-09-16T17:14:24Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 17:29 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.7b Team entry · **Slice:** sixth leg — role-matrix breadth on the templates surface: the workspace-wide setup operation was reachable by ANY workspace member (permit-all `NoPermissionGuard` on `applyWorkspaceTemplate`/`applyWorkspaceTemplateOperation`/`workspaceTemplatePreview`) — closed with `SettingsPermissionGuard(APPLICATIONS)`, matching `installApplication`/`uninstallApplication` · **Claim:** done-for-review
**Ready-to-tick:** no — front re-export/regen unaffected but the Settings/onboarding browser journey after the gate (Tier 2) is still open; P1.7b keeps remaining Tier-2 legs
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** `twenty-server/src/engine/core-modules/onboarding/onboarding.resolver.ts` (3 guards swapped + `PermissionsGraphqlApiExceptionFilter` + comment WHY); `onboarding.module.ts` (+`PermissionsModule` import for the guard's DI); new `test/integration/graphql/suites/auth/sign-up/role-matrix-invitee-template-permission-gate.integration-spec.ts` (3 cases)
**Checks:** preflight `pg_isready` + `redis-cli ping` → OK; new integration spec on `test` DB (`NODE_ENV=test npx jest --config jest-integration.config.ts --runInBand`) → 3/3 pass (Guest denied preview+both applies; SAME token promoted to Member still denied; seeded Apple admin preview succeeds with `blocked:false`); `npx tsgo -p tsconfig.json --noEmit` → 0 errors; `npx oxlint` on 3 touched files → 0/0; `workspace-template.service.spec.ts` → 12/12 (unit behavior unchanged); post-run DB check → no invitee debris
**Missing for tick:** browser verification that the onboarding/Settings template pickers still work for the workspace admin under the new gate, and that a Guest sees a permission error not a blank screen (Tier 2, orchestrator); the gate semantic — Member is denied too because both seeded roles carry `canUpdateAllSettings=false` and the guard falls back to flags — is a deliberate product call to confirm
**Do not redo:** the onboarding first-run path is safe: the guard returns true for `PENDING_CREATION`/`ONGOING_CREATION` workspaces, so sign-up-time applies never hit the permission check; the spec's Member-denial is the same "Member ≠ settings" contract asserted by the fifth leg — do not "fix" it by granting Member the APPLICATIONS flag; `deleteUserFromWorkspace` cleanup order roleTarget→userWorkspace→user as prior legs; ClickHouse ECONNREFUSED :8123 noise is non-fatal
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7b Tier-2 journey, P1.7c, P2.x+)
**Next:** orchestrator Tier-2 (browser journey incl. admin template apply post-gate); executors — P1.3's e2e preset-acceptance bullet, P1.7c first-use acceptance, or P1.7a's remaining legs (readiness surface, dependency display, export)

CLAIMED — P1.7a/uninstall-impact-query — GLM-5.3-Flash — 2026-09-16T17:47:30Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 17:52 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.7a App management · **Slice:** dependency impact display (server leg) — expose the existing `computeUninstallImpact` as a GraphQL query so the front can show what an uninstall removes before attempting it
**Claim:** done-for-review
**Ready-to-tick:** no — front consumption + browser rendering of the impact surface (Tier 2) still open; export flow leg needs its product decision
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** new `twenty-server/.../application-manifest/dtos/application-uninstall-impact.dto.ts` (5 @ObjectType DTOs mirroring the service's `UninstallImpact`); `application-install.resolver.ts` (+`applicationUninstallImpact` query with `SettingsPermissionGuard(APPLICATIONS)`, +preflight service injection)
**Checks:** `cd packages/twenty-server && npx jest .../application-uninstall-preflight.service.spec.ts --config=jest.config.mjs` → 8/8; `npx tsgo -p tsconfig.json --noEmit` → 0 errors (excluding pre-existing TS2742 noise); `npx oxlint` type-aware on both touched files → 0/0
**Missing for tick:** front wiring (impact panel in Settings → Applications uninstall confirmation) + browser verification — Tier 2/next slice; schema regen (`nx run twenty-front:graphql:generate`) is orchestrator/front-slice work; export flow needs the product call on export format
**Do not redo:** the query deliberately does NOT throw on populated/dependent apps — refusal stays in `uninstallApplication` via `assertUninstallAllowed`; no module changes were needed (`ApplicationInstallModule` already imports `ApplicationManifestModule`, which exports the preflight service); keep the query read-only report semantics, never a parallel activation state
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c, P2.x+)
**Next:** front slice — consume `applicationUninstallImpact` in the uninstall confirmation dialog (matches the P1.7a C3 pattern already shipped for refusal wording), then orchestrator schema regen + Tier-2

CLAIMED — P1.7a/uninstall-impact-front — GLM-5.3-Flash — 2026-09-16T17:56:30Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 18:08 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.7a App management · **Slice:** dependency impact display (front leg) — consume `applicationUninstallImpact` in the uninstall confirmation dialog
**Claim:** done-for-review
**Ready-to-tick:** no — browser journey of the dialog against `yarn start` is Tier 2; schema regen still pending
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** new `twenty-front/src/pages/settings/applications/graphql/queries/applicationUninstallImpact.ts` (hand-written document, codegen note — mirrors the P1.6c a2e-workspace pattern); new `hooks/useApplicationUninstallImpact.ts` (hook + exported `ApplicationUninstallImpact` type mirroring the 5 DTO shapes); `tabs/SettingsApplicationDetailAboutTab.tsx` (+`universalIdentifier` prop, query gated on a state set only when the Uninstall button opens the modal — no page-mount fetch; impact rendered in the dialog subtitle: deleted objects/record counts in danger color, fields/views in secondary, cross-app dependents flagged); `SettingsApplicationDetails.tsx` (+pass `universalIdentifier`)
**Checks:** `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → 0 errors; `npx oxlint` type-aware on the 4 files → 0/0; `npx oxfmt --check` → clean (AboutTab auto-fixed once); `npx jest --findRelatedTests <AboutTab + new hook> --config=jest.config.mjs` → 41/41 (2 suites)
**Missing for tick:** browser verification of the dialog rendering with real impact data (Tier 2, orchestrator); `npx nx run twenty-front:graphql:generate` + switching the hand-written document to the generated `*Document`; Lingui `fr` catalog compile is maintained by the i18n pipeline
**Do not redo:** the query is gated by local state set in `openUninstallModal`, NOT by modal visibility — do not "simplify" to an unconditional fetch (the report surface would run for admins browsing app details); empty impact (no objects/fields/views/records/dependents) renders no list, keeping the default warning text alone; marketplace preview page (`SettingsAvailableApplicationDetails`) never passes `onUninstall`, so it is unaffected
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c, P2.x+)
**Next:** orchestrator schema regen + Tier-2 browser pass; then P1.6d second bullet (Projects starter bundle) is the next executor-ready slice

CLAIMED — P1.6d/projects-seeder — GLM-5.3-Flash — 2026-09-16T19:13:40Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

RETRACTED — P1.6d/projects-seeder — GLM-5.3-Flash — 2026-09-16T19:15:30Z — claim was mistaken: slice already done-for-review in 2026-09-14 18:30 entry (post-install.ts + starter-projects.ts committed at aa4979e7). No work performed, no files touched. Next executor slice re-selected below.

CLAIMED — P1.6d/bilan-post-install-diagnostics — GLM-5.3-Flash — 2026-09-17T07:25:00Z — base 0cf91b682203810201c6be96ba3c7944105b5880

## 2026-09-17 08:50 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.6d Starter bundles · **Slice:** orchestrator-pinned diagnostics — per-step try/catch + structured failure reporting in the Bilan post-install hook (phase-01 2026-09-16 20:45 "pin a debug brief" leg)
**Claim:** done-for-review
**Ready-to-tick:** no — live re-install to watch the new per-step summary land in queue logs is Tier 2; root cause of the empty SDK layer needs that live run to confirm
**Base:** 0cf91b682203810201c6be96ba3c7944105b5880
**Changed:** new `a2e-accounting/src/lib/install-steps.ts` (`runInstallStep` — step name + error/stack captured, failure never blocks later steps); new `src/lib/__tests__/install-steps.test.ts` (4 cases); `src/logic-functions/post-install.ts` (five un-guarded awaits + catalogue try/catch → six named `runInstallStep` calls; summary now `{ steps: {…status}, failures: [{step,error}], …counts }` so the worker log names the failing step exactly)
**Checks:** `yarn typecheck` (app) → exit 0; `yarn test:unit` → 100/100 (4 new); `yarn lint` → 0/0; `npx twenty dev:build .` → succeeded (28 files); verified the built `post-install.mjs` bundles `install-steps.ts` inline (no new runtime import beyond the existing `twenty-client-sdk/core`)
**Diagnosis evidence (read-only, no services started):** every SDK layer under `$TMPDIR/logic-function-executor-tmpdir/sdk/<workspace>-<app>/node_modules/twenty-client-sdk/` is an EMPTY directory tree — 0 files, no `package.json`, no `dist/core.mjs`, no `.twenty-layer-ready` sentinel (Bilan's layer dir not even created). The stored archive `.local-storage/<ws>/b11a0000…/generated-sdk-client/twenty-client-sdk.zip` is VALID (965 KB, real generated `dist/core.mjs` referencing `TWENTY_API_URL`, exports intact; `isSdkLayerStale=t` + checksum present on the application row). So at handler runtime `import 'twenty-client-sdk/core'` resolves into an empty package → module load fails → first un-guarded await killed the whole chain, surfacing only in worker stdout. Suspicion shifts from token/auth to `downloadAndExtractToPackage` extraction/sentinel (layer-manager L74-133) or a worker/server $TMPDIR mismatch.
**Missing for tick:** Tier-2: reinstall Bilan on the running server, read the new per-step summary in the logic-function queue logs — it will name the exact failing step and error; then fix the empty-extraction root cause (inspect `downloadAndExtractToPackage` unzipper extraction + sentinel write, verify worker vs server tmpdir); P1.3 sync-vs-async over-report stays as previously recorded
**Do not redo:** the handler's step order and idempotency are unchanged; seeding stays app-owned; do NOT "fix" by catching at module scope — the runner is the pattern; the stored archive and DB checksum row are healthy, don't regenerate them
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c, P2.x+)
**Next:** Tier-2 live reinstall (orchestrator/next session with app up) reading the new `steps`/`failures` summary; then the extraction root-cause fix

CLAIMED — P1.3/preset-orchestration — GLM-5.3-Flash — 2026-09-16T19:42:00Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 19:52 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.3 Onboarding presets · **Slice:** complete preset orchestration — partial-state reporting, owned navigation and optional samples (first unmet bullet; install-failure logging was already fixed by P1.6b)
**Claim:** done-for-review
**Ready-to-tick:** no — live seed of starter content via a real post-install hook on a running server is Tier 2
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** `twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts` (`seed-samples` step no longer a hardcoded skip with a stale "seeder arrives with P1.6d" comment: new `resolveSampleSeedingStep` inspects the succeeded install steps' registration manifests for `postInstallLogicFunction` — P1.6d moved sample seeding into app-owned post-install hooks, so the step reports `succeeded` (delegated seeding) or `skipped` (no hook) instead of faking a skip; failed installs can never report seeding); `__tests__/workspace-template.service.spec.ts` (+3 cases: delegated→succeeded, no-hook→skipped, failed-install→skipped; `buildRegistration` manifest type widened).
**Checks:** `npx jest src/engine/core-modules/onboarding/__tests__/workspace-template.service.spec.ts --config=jest.config.mjs` → 15/15 (12 pre-existing + 3 new); `npx tsgo -p tsconfig.json --noEmit` → 0 errors in touched files; `npx oxlint <both files> --type-aware` → 0/0.
**Missing for tick:** Tier-2 live check that a2e-documents' async post-install hook actually seeds on template apply (`shouldRunSynchronously: false` — the install step resolves before seeding completes; if the contract needs seeding-in-result semantics, that hook flag or the step's reporting needs a product call); P1.3's e2e browser bullet remains open.
**Do not redo:** no parallel server-side seeder — seeding stays app-owned via post-install hooks (provenance/idempotency live in the apps); `sampleContentEnabled` definitions are all `false` today, so the step only enters when the client passes the flag; first draft used a nonexistent `isNonEmptyString` guard from twenty-shared/utils — only `isDefined`/`isNonEmptyArray` exist, verify before importing.
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b Tier-2, P1.7c, P2.x+)
**Next:** P1.3's e2e preset-acceptance bullet (browser, Tier 2) or P1.7c first-use acceptance; orchestrator — the sync-vs-async post-install question above.

## 2026-09-16 20:45 UTC — GLM-5.3 [orchestrator verification]
**Scope:** phase-01 executor entries 2026-09-15 22:15 → 2026-09-16 19:52 (C3 exact-counts, Bilan manifest fix, P1.7b six legs, P1.7a impact surfaces, P1.3 seed-samples step).
**Diff review:** 606cf284..d935a9dc (55 files) — clean; no i18n catalog churn, no secrets, no unrelated edits; scratch version bump (a2e-accounting 0.1.0→0.1.1) reverted before commit.
**Checks re-run (all green, matching executor numbers):** workspace-template.service.spec 15/15; front related suites 142/142; template-permission-gate integration 3/3.
**Tier 2 — C3 refusal VERIFIED live (repairs the 2026-09-14 FAIL):** never-ANALYZEd table, orgProfile record created → `applicationUninstallImpact` returns exact recordLossByObject [orgProfile:1] (not the reltuples 0); `uninstallApplication` refuses FORBIDDEN with the full userFriendlyMessage, record survives. After `destroyOrgProfile` (hard delete — soft `deleteOrgProfile` still counts, correct), uninstall succeeds and drops the table. The 22:15 exact-counts fix is confirmed live; P1.7a refusal leg closed.
**Tier 2 — post-install seeding (P1.3 19:52 open question): FAILS live.** Two installs of Bilan 0.1.1 (fresh + reinstall): sheets/fiches/orgProfiles/finCats/subventions all 0 rows. No `LogicFunctionTriggerJob` visible in `logic-function-queue`, but BullMQ metrics count 16 vs 6 retained completed jobs (~10 auto-removed by retention since Sep 13) — the job almost certainly ran; the handler's five seed awaits (post-install.ts L192-196) have no try/catch, so a first-step throw aborts seeding with nothing surfaced beyond worker stdout (no persisted execution table exists; `executeOneLogicFunction` manual runs reject API keys). Root cause unproven — suspect `coreClient()` auth/context in the worker; needs a pinned debug brief with per-step logging.
**Answers to the 19:52 sync-vs-async question:** the hook is async (`shouldRunSynchronously: false`), so "delegated seeding succeeded" in the template step is an over-report while the hook fails silently — P1.3 bullet stays `[~]` until the hook works or the step reports hook failure.
**Actions:** PLAN.md — P1.7a `[~]` annotation repaired with the live C3 proof; P1.7b → `[~]` (six legs green, Tier-2 browser journey open); P1.6d → `[~]` (payloads shipped, live seeding fails); P1.3 orchestration bullet → `[~]` with the over-report caveat. No `[x]` — every task keeps an open leg. P7.0 follow-up in phase-04-report 2026-09-16 entry.
**Next:** pin `docs/tasks/` brief: diagnose the Bilan post-install hook's failing step (per-step try/catch + logging), decide sync-vs-async semantics with the P1.3 step; then P7.0 live gate proofs on the populated install.

CLAIMED — P1.6d/sdk-layer-extraction-fix — GLM-5.3-Flash — 2026-09-17T09:22:00Z — base 0cf91b682203810201c6be96ba3c7944105b5880

## 2026-09-17 09:25 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.6d Starter bundles · **Slice:** follow-up to orchestrator-pinned diagnostics — fix the empty-SDK-layer root cause (staged extraction + completeness verification + atomic swap in `downloadAndExtractToPackage`)
**Claim:** done-for-review
**Ready-to-tick:** no — root cause fixed with strong evidence, but the Tier-2 live reinstall (post-install summary naming the failing step, seeding actually landing) still needs the running server
**Base:** 0cf91b682203810201c6be96ba3c7944105b5880
**Changed:** `twenty-server/src/engine/core-modules/sdk-client/sdk-client-archive.service.ts` (extraction no longer writes the live path directly: extract to a pid/timestamp-staged sibling, verify `package.json` + `dist/core.mjs` exist — the two files `import 'twenty-client-sdk/core'` resolves through — then one `rename` into place; rename-failure retry replaces a concurrently-written target; staging debris removed on any pre-swap error)
**Checks:** root-cause evidence — standalone unzip of BOTH on-disk archives (incl. the Bilan `b11a0000…` one) extracts 105 files with the correct layout, while every live layer under `$TMPDIR/logic-function-executor-tmpdir/sdk/` is dirs-with-zero-files and NO `.twenty-layer-ready` sentinel → the locked critical section (`fs.rm` → extract → sentinel, `LAYER_BUILD_LOCK_TTL_MS` 5.5s, non-owner-checked `releaseLock`) loses its lock mid-extract when server+worker run the same app, the second holder `rm`s the first's half-written package; `npx jest src/engine/core-modules/sdk-client --config=jest.config.mjs` → 11/11; `npx tsgo -p tsconfig.json --noEmit` → 0 errors; `npx oxlint <file> --type-aware` → 0/0; `npx nx lint:diff-with-main twenty-server` → success
**Missing for tick:** Tier-2: reinstall Bilan on the running server and confirm the per-step summary from the previous entry now reports all steps succeeded and sheets/fiches seed >0 rows; optionally clear the stale empty layer dirs from $TMPDIR (self-heals anyway: no sentinel + isSdkLayerStale=true forces a rebuild)
**Do not redo:** the previous entry's install-steps handler and its tests; the on-disk archives and DB checksum rows are healthy — no regeneration; do not lengthen `LAYER_BUILD_LOCK_TTL_MS` instead (extraction time is unbounded when generation runs on-the-fly; the swap makes correctness TTL-independent)
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c, P2.x+)
**Next:** Tier-2 live reinstall reading the `steps`/`failures` summary; if seeding still fails, the next suspect is `coreClient()` auth in the worker, not extraction

CLAIMED — P1.6e/first-open-entrypoint — GLM-5.3-Flash — 2026-09-17T09:53:40Z — base 0cf91b682203810201c6be96ba3c7944105b5880

## 2026-09-17 10:00 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P1.6e Workspace reuse · **Slice:** first-open entrypoint — a TEMPLATE record opened directly (search result, tree click, direct link) now offers instantiation on its own page (gallery leg was already done-for-review 2026-09-16 17:02)
**Claim:** done-for-review
**Ready-to-tick:** no — banner + instantiate-and-navigate on the template's own record page needs a browser against `yarn start` (Tier 2); populated-workspace regression equally Tier 2
**Base:** 0cf91b682203810201c6be96ba3c7944105b5880
**Changed:** `a2e-documents/src/front-components/document-page.front-component.tsx` (+kind/composite content on the record query — was `content: true`, the composite field the SDK types reject; new template banner with "Utiliser ce modèle" when `kind === TEMPLATE`; `instantiateTemplate` reuses `buildTemplateCopyPayload` + creates the DOCUMENT copy and navigates to it — copy-never-mutates-template contract identical to the browser action)
**Checks:** `npx tsc --noEmit` in the app → 0 errors; `node --test src/lib/__tests__/*.test.ts` → 46/46; `yarn lint` → 0/0; `npx twenty dev:build .` → succeeded (14 files)
**Missing for tick:** browser verification of the banner (only on kind=TEMPLATE, hidden on plain documents) and that "Utiliser" lands on the fresh copy (Tier 2, orchestrator); "edit template" semantics still needs the recorded product call noted by the gallery entry
**Do not redo:** the banner reads `record.kind` from the SAME query that feeds the page — do not add a second fetch; instantiate deliberately does NOT refresh the current page (it navigates away); `DEFAULT_TEMPLATE_COPY_POSITION 'V'` matches the browser's append behavior, keep both in sync if changed
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c, P2.x+)
**Next:** Tier-2 browser journey (orchestrator); next executor slice — P1.7c first-use acceptance has executor-runnable legs, else P2.1 realtime auth repair

CLAIMED — P1.6b/concurrent-same-key-test — GLM-5.3-Flash — 2026-09-17T10:14:59Z — base 0cf91b682203810201c6be96ba3c7944105b5880

CLAIMED — P1.7c/first-use-unavailable-apps — deepseek-v4.1-flash — 2026-09-17T10:35:00Z — base 57354bc89dfed3031c523d1d3b63065c4a5d2e08

## 2026-09-17 10:39 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P1.7c First-use acceptance · **Slice:** server-side E01/E02/E03 leg — first-use setup when a preset's required apps are unregistered (zero app availability)
**Claim:** done-for-review
**Ready-to-tick:** no — P1.7c is broad and browser/Tier-2 legs (E01 picker, E04, E12) remain; this slice records only the server acceptance on the seeded populated workspace
**Base:** 57354bc89dfed3031c523d1d3b63065c4a5d2e08
**Changed:** new `packages/twenty-server/test/integration/graphql/suites/onboarding/template-unavailable-apps-first-use.integration-spec.ts` (3 cases, no product code)
**Checks:** preflight `pg_isready` + `redis-cli ping` → OK; spec on `test` DB (`NODE_ENV=test npx jest --config jest-integration.config.ts … --runInBand`, 6 GB heap) → 3/3 pass; post-run DB check → `workspaceTemplate` restored to NULL, 0 `template-operation:*` rows, 0 a2e app rows; `npx tsgo -p tsconfig.json --noEmit` → exit 0, 0 errors; `npx oxlint --type-aware <spec>` → 0 warnings 0 errors
**Missing for tick:** browser legs (E01 onboarding picker with an empty catalogue, E04 template instances, E12 no-AI/narrow-screen); app-optional deselection (E01) is untestable until P1.6d marks an app optional (`optionalApplicationUniversalIdentifiers` is empty); E03 INDIVIDUAL/CRM switch is not exercised because INDIVIDUAL deletes standard nav rows — restoring them needs the full standard-application sync (per the invitation-join leg warning)
**Do not redo:** GraphQL serializes these registered enums by MEMBER NAME — wire values are `INSTALL_APP`/`NAVIGATION_VISIBILITY`/`SET_WORKSPACE_TEMPLATE`, `FAILED`/`SKIPPED`, `APP_NOT_REGISTERED`, NOT the lower-case internal values. **Discovered defect (P1.6c, not this slice):** `twenty-front/src/modules/a2e-workspace/types/apply-template-operation.types.ts` and `A2eWorkspaceTemplatePreview.tsx` `STEP_KIND_LABELS` / `StepStatusIcon` compare against `'install-app'`/`'failed'`, so against a live server every step kind/status/errorCode falls through — hand-written docs were never Tier-2 verified. Fix direction: type the front on the SCREAMING_SNAKE enum names (and switch to generated `*Document`s when `graphql:generate` runs). The spec deliberately uses only CRM + NON_PROFIT (their definitions hide no nav rows) so the shared seeded workspace is never mutated.
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c browser legs, P2.x+)
**Next:** fix the P1.6c wire-enum mismatch (front), then orchestrator Tier-2 first-use browser journey; executors — P1.7a install-later readiness surface or P2.1 realtime auth repair

CLAIMED — P1.6c/wire-enum-names — deepseek-v4.1-flash — 2026-09-17T10:41:00Z — base 57354bc89dfed3031c523d1d3b63065c4a5d2e08

## 2026-09-17 10:52 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P1.6c Front onboarding/Settings · **Slice:** fix the wire-enum mismatch discovered by the P1.7c server leg (front typed/matched the server's lower-case internal values instead of the GraphQL enum names)
**Claim:** done-for-review
**Ready-to-tick:** no — defect fixed and type-guarded, but P1.6c still needs the orchestrator Tier-2 step (schema regen + real browser apply/retry)
**Base:** 57354bc89dfed3031c523d1d3b63065c4a5d2e08
**Changed:** `twenty-front/src/modules/a2e-workspace/types/apply-template-operation.types.ts` (`OperationStepKind`/`OperationStepStatus` now the wire names `INSTALL_APP`/…/`FAILED`/`SKIPPED`, WHY-comment explains GraphQL cannot carry hyphenated values); `components/A2eWorkspaceTemplatePreview.tsx` (`STEP_KIND_LABELS` keys, `StyledStepIcon` and `StepStatusIcon` comparisons, the two `step.status === 'failed'` checks); `hooks/__tests__/useApplyWorkspaceTemplateOperation.test.tsx` (fixtures use the wire names)
**Checks:** `npx tsgo -p tsconfig.json --noEmit` (twenty-front) → exit 0, 0 errors (the union now makes the old lower-case comparisons a type error — that is the regression guard, no component test existed before); `npx jest src/modules/a2e-workspace --config=jest.config.mjs` → 9/9; `npx jest --findRelatedTests <component> <types> --config=jest.config.mjs` → 44/44 (3 suites, incl. DomainShell noise-free pass); `npx oxlint --type-aware` on the 3 files → 0/0; `npx oxfmt --check` on the 3 files → clean; repo-wide grep for the lower-case wire strings → no matches
**Missing for tick:** Tier-2 — `npx nx run twenty-front:graphql:generate` against a running server then switching both hand-written a2e-workspace documents to the generated `*Document` exports; real browser onboarding + Settings apply/retry. No dedicated component render test exists for the preview (the TS union is the current guard) — optional follow-up
**Do not redo:** the wire values are the enum MEMBER NAMES — do not "restore" lower-case kinds/statuses and do not fix this server-side with `registerEnumType` valuesMap: GraphQL enum value names cannot contain hyphens, so lower-case internal values are unreachable over the wire. `errorCode` was already uppercase and needed no change; preview `action: 'hide' | 'restore'` and the app flags are plain booleans/strings, unaffected
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c browser legs, P2.x+)
**Next:** orchestrator Tier-2 schema regen + apply/retry browser pass; executors — P1.7a install-later readiness surface or P2.1 realtime auth repair

CLAIMED — P1.7a/install-readiness-server — deepseek-v4.1-flash — 2026-09-17T10:45:00Z — base c3081797598a2733b90cd7b55fcf45b2d292dcff

## 2026-09-17 10:58 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P1.7a App management · **Slice:** install-later readiness surface (server leg) — read-only query reporting whether each requested app can be installed in the caller's workspace now
**Claim:** done-for-review
**Ready-to-tick:** no — the server primitive exists and is tested, but no UI consumes it yet (front leg) and no live GraphQL check was possible (Tier 2)
**Base:** c3081797598a2733b90cd7b55fcf45b2d292dcff
**Changed:** new `packages/twenty-server/.../application-install/dtos/application-install-readiness.dto.ts` (6 Boolean/String fields mirroring the template-preview readiness shape); new `.../application-install/services/application-install-readiness.service.ts` (`getInstallReadiness` loops identifiers, reading `findOneByUniversalIdentifierGlobal` + `validateWorkspaceCompatibility` + `findByUniversalIdentifier` — the same three sources the install path uses); new `.../services/__tests__/application-install-readiness.service.spec.ts` (5 cases); `application-install.resolver.ts` (+`applicationInstallReadiness(universalIdentifiers: [String!]!)` under `SettingsPermissionGuard(APPLICATIONS)`); `application-install.module.ts` (+provider; all deps already imported)
**Checks:** `npx jest src/engine/core-modules/application/application-install --config=packages/twenty-server/jest.config.mjs` → 13/13 (3 suites); `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit` → exit 0, 0 errors; `npx oxlint --type-aware -c .oxlintrc.json <5 files>` → 0 warnings 0 errors; `npx oxfmt --check <5 files>` → clean (spec auto-fixed once); `npx nx lint:diff-with-main twenty-server` → success but reports "No changed files" (the target diffs `main...HEAD`, so it does not cover uncommitted edits — oxlint/oxfmt ran directly on the files instead)
**Missing for tick:** front leg — consume `applicationInstallReadiness` from the A2E Suite cards / available-app detail (hand-written document, codegen note like the P1.6c/uninstall-impact precedents), disable Install and show `blockedReason` when `ready` is false; `npx nx run twenty-front:graphql:generate` against a running server (Tier 2) + browser check; the P1.7a export leg still needs the product call on export format
**Do not redo:** readiness must NOT be added to the cached `MarketplaceAppDTO`/catalog (`marketplaceCatalog` core-entity cache is server-global; a workspace-specific field would leak across workspaces) — keep it a separate query. Reuse `validateWorkspaceCompatibility` (workspace scope, same source install uses), not a new semver check. `blockedReason` values are the wire enum-ish strings `APP_NOT_REGISTERED`/`VERSION_INCOMPATIBLE` shared with the P1.6b template operation
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c browser legs, P2.x+)
**Next:** front leg — A2E card/detail readiness via a hand-written `applicationInstallReadiness` document + hook, then orchestrator schema regen + Tier-2 browser pass

CLAIMED — P1.7a/install-readiness-front — deepseek-v4.1-flash — 2026-09-17T10:54:00Z — base c3081797598a2733b90cd7b55fcf45b2d292dcff

## 2026-09-17 11:05 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P1.7a App management · **Slice:** install-later readiness surface (front leg) — consume `applicationInstallReadiness` in the A2E Suite cards so a not-registered / version-incompatible app can no longer be offered an enabled Install button
**Claim:** done-for-review
**Ready-to-tick:** no — the UI is wired and type-guarded, but `applicationInstallReadiness` is not in the checked-in generated schema and no browser saw the blocked card (Tier 2, orchestrator)
**Base:** c3081797598a2733b90cd7b55fcf45b2d292dcff
**Changed:** new `twenty-front/src/pages/settings/applications/graphql/queries/applicationInstallReadiness.ts` (hand-written document + codegen note, mirrors the uninstall-impact precedent); new `.../hooks/useApplicationInstallReadiness.ts` (batched query keyed by app universal identifier → `Map`, skipped on empty input); new `.../hooks/__tests__/useApplicationInstallReadiness.test.tsx` (3 cases); `.../a2e-workspace/components/A2eSuiteApplicationCard.tsx` (+optional `readiness` prop: Install disabled and the `blockedReason` sentence shown when a *resolved* report says not ready); `.../a2e-workspace/components/SettingsA2eSuiteSection.tsx` (fetches readiness for the available card identifiers and passes each card its entry)
**Checks:** `npx jest src/pages/settings/applications/hooks/__tests__/useApplicationInstallReadiness.test.tsx --config=jest.config.mjs` (cwd twenty-front) → 3/3; `npx jest --findRelatedTests <card> <section> <hook> --config=jest.config.mjs` → 44/44 (3 suites; DomainShell console stack-trace noise only, suite green); `npx jest src/modules/a2e-workspace --config=jest.config.mjs` → 9/9; `npx tsgo -p tsconfig.json --noEmit` (twenty-front) → exit 0, 0 errors; `npx oxlint --type-aware -c .oxlintrc.json <5 files>` → 0 warnings 0 errors; `npx oxfmt --check <5 files>` → clean (query file auto-fixed once)
**Missing for tick:** `npx nx run twenty-front:graphql:generate` against a running server then switching the hand-written document to the generated `*Document`; real browser check that a blocked card (server without the app registered) disables Install and shows the reason while a ready app installs — Tier 2. Deliberately NOT gated: the generic marketplace "Available" tab / `SettingsAvailableApplicationDetails` (would change stock Twenty behavior for all apps, not just A2E) and the onboarding `InstallApps` A2E cards — recorded as a product call, not silently widened
**Do not redo:** readiness stays a SEPARATE query — never add it to the cached `MarketplaceApp`/catalog DTO (server-global cache would leak workspace state, per the server leg); the card only blocks on a resolved report (`isDefined(readiness) && !ready`) so unknown/loading readiness never blocks; `blockedReason` wire values are the shared strings `APP_NOT_REGISTERED`/`VERSION_INCOMPATIBLE` (`null` when ready); the hook batches all available identifiers in one request and skips on an empty list
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d remainder, P1.7a export leg, P1.7b Tier-2 journey, P1.7c browser legs, P2.x+)
**Next:** orchestrator schema regen + Tier-2 browser pass on the A2E Suite section; executors — the P1.7a export/confirmation leg needs the product call on export format, else P1.7c browser legs
