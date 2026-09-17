# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Front-component layout/virtualization is tested as a pure lib, not a DOM:**
  the app packages have no RTL/jsdom/Storybook and `node --experimental-strip-types`
  cannot parse `.tsx` JSX. Put the render model (time range, bars, order) and the
  virtualization windows (`compute*Window` → `{startIndex,endIndex,offsetY,…}`,
  viewport + overscan, clamped to bounds) in `src/lib/*.ts` returning plain data,
  keep the `.tsx` a thin renderer over it, and test the lib with `node:test` — a
  1k-row fixture asserting the mounted row count stays bounded stands in for a
  DOM virtualization test. Viewport dimensions are read defensively from the
  scroll container (remote-DOM `clientWidth` may be 0 → fall back to declared size).

- **App inverse relation fields must be standalone, on the relation target:**
  `defineObject({fields})` uses `ObjectFieldManifest` = `FieldManifest` with
  `objectUniversalIdentifier` omitted, so an inverse O2M declared *inside* an
  object file is attached to that object, not the relation target (a self/other
  relation the server accepts by id but installs wrong). Declare every inverse
  as a standalone `src/fields/*.field.ts` with
  `objectUniversalIdentifier: <target object>` and target
  `relationTargetFieldMetadataUniversalIdentifier` = the FK field's id
  (model: `real-estate/src/fields/*-on-*.field.ts`). A missing target field id
  hard-fails install with `Relation field target metadata not found`.
- **Tier-0 app manifest integrity is testable without a server:** `defineField`/
  `defineObject` handlers run under `node --test --experimental-strip-types` and
  return `{ success, config }`; import the object/field modules, build an
  id→field map, and assert target objects/fields resolve, every relation is a
  symmetric M2O/O2M pair whose inverse lives on the target, and select option
  ids are unique. This catches the install-blocking relation defects before the
  Tier-2 `app:install`. Cross-check the built `.twenty/output/manifest.json`
  with the same walk.

- **Ephemeral UI state (a running timer/counter) = pure transition lib + a
  storage link:** express every browser transition as a pure function in
  `src/lib/*.ts` (`startTimer`/`stopTimer`/`computeElapsed…`, taking `now: Date`
  as an argument so tests pin time), persist only the serialized link
  (`serializeTimer`/`parseTimer` under one `TIMER_STORAGE_KEY`) and let the
  `.tsx` own persistence + rendering. A failed write must keep the in-memory
  state (the session is not lost); malformed storage reads as "no state", never
  throws. This proved the whole state machine with `node:test` and no server.

- **App Cmd+K search = one provider per app, registered by decorator:**
  implement `SearchProvider`, annotate the class with
  `@RegisteredSearchProvider({ appUniversalIdentifier })` and add it to
  `SearchModule` providers — `SearchProviderRegistryService` (DiscoveryService)
  discovers it and `AppSearchService` already groups by app id and caps at
  `MAX_RECORDS_PER_APP=5`. Never touch the resolver/DTO/Cmd+K host. Resolve
  permissions from the ambient context
  (`resolveRolePermissionConfig({authContext,userWorkspaceRoleMap,apiKeyRoleMap})`
  → `getRepository(..., config)`); a null config must stay `undefined` so the
  query fails closed (empty object permissions), never
  `shouldBypassPermissionChecks`. Result `path` uses the record-show route with
  the object name **singular**: `/object/<nameSingular>/<id>` (matches
  `AppPath.RecordShowPage`), and a new search service is testable at Tier 0 by
  stubbing `WorkspaceOrmManager` + `withWorkspaceContext`.
  A single provider may serve several object types from one app (tasks on the
  standard `task` object + the app's own `project`).

- **Integration tests + ESM-only deps:** a static `import` of
  `application-install.service.ts` (and anything reaching `@file-type/pdf`)
  fails jest's resolver under `jest-integration.config.ts`. Resolve the
  provider by name instead: `getAppProviderByClassName<T>('ApplicationInstallService')`
  from `test/integration/utils/get-app-provider-by-class-name.util.ts`, then
  `jest.spyOn(instance, 'method')` for a call-through call counter.
- **Register an installable template app without a package:** `createApplicationRegistration`
  mutation, then raw SQL `UPDATE core."applicationRegistration" SET "sourceType"='local', "manifest"=$1::jsonb`.
  LOCAL makes `ApplicationInstallService.installApplication` no-op-return true,
  so the template operation's install step succeeds for real with no tarball.
  Registrations are GLOBAL (not workspace-scoped) — always delete them in
  `afterAll` or later suites (e.g. P1.7c) see the apps as registered.
- **Template nav safety in integration tests:** prefer TEAM/NON_PROFIT whose
  `hiddenStandardNavigationMenuItemUniversalIdentifiers` is empty — applying
  them never rewrites the shared seeded workspace navigation.
- **Post-install seeding truth:** `seed-samples` may only report `succeeded`
  for a synchronous post-install hook (`shouldRunSynchronously: true`) — then
  `ApplicationInstallService` awaited it and a failure would have failed the
  install step. Async hooks are enqueued and return immediately, so the step
  must report `failed` / `SEED_FAILED` with retry info, never `succeeded`.
- **App relation with a custom `joinColumnName` is not filterable by that
  column:** the workspace GraphQL layer names the join-column input/filter key
  from the field name (`computeMorphOrRelationFieldJoinColumnName` →
  `<name>Id`), while `settings.joinColumnName` only drives the physical column
  via the ORM relation shape. So `manyToOne('parentDocumentId')` on a `parent`
  field yields a schema key `parentId` but a physical column
  `parentDocumentId` → a raw `parentId` filter compiles to
  `"documents"."parentId"` and fails. Read relations through the target id
  (`parent: { id: { is: 'NULL' } }` / `{ eq }`, a LEFT JOIN) and write through
  `<name>Id`; never use the custom join column as a GraphQL key.
- **App logic-function database triggers are post-commit:** a
  `databaseEventTriggerSettings` handler runs after the row is stored, so it
  cannot reject a write. Server-side "validation" must repair instead — detect
  the bad state and rewrite it (e.g. restore the previous parent) in a way that
  cannot loop (the repair's own event is a no-op). Trigger on relation fields
  with `updatedFields` including both `<name>` and `<name>Id` (the diff adds
  both; the custom `joinColumnName` is not the event key). Keep the decision in
  a loader-injected pure lib so it stays `node --test`-able with no server.
- **`getRepository(name)` with no `RolePermissionConfig` denies every
  non-system object:** the workspace repository resolves permissions only from
  the config passed in; `undefined` → `{}` object permissions +
  `shouldBypassPermissionChecks:false`, so select on an app-defined object
  (e.g. `document`) throws and the caller sees PERMISSION_DENIED. A
  caller-permissioned read MUST resolve it from the ambient context —
  `resolveRolePermissionConfig({ authContext, userWorkspaceRoleMap, apiKeyRoleMap })`
  on `getWorkspaceContext()` inside `executeInWorkspaceContext` — and pass the
  result; system/guest paths deliberately pass
  `{ shouldBypassPermissionChecks: true }` plus an explicit
  `buildSystemAuthContext(workspaceId)`. P2.5 (search provider) and P3.2
  (document-share) are the two fixed instances.
- **App front-component record reads and navigation:** the `CoreApiClient`
  `findOne` root field (singular object name, e.g. `company`) accepts only
  `__args: { filter: { id: { eq } } }` — `getResolverArgs('findOne')` returns
  `{ filter }` alone, so a bare `__args: { id }` is rejected before the
  resolver runs (the `document-page`/`document-browser` uses are pre-existing
  bugs). `navigate(AppPath.RecordShowPage, { objectNameSingular })` needs the
  SINGULAR name: `RecordShowPage` matches `objectMetadataItem.nameSingular` and
  `useObjectMetadataItem` looks up `objectNameType: 'singular'` — the
  `'documents'` form in `create-document-command`/`document-page`/`document-browser`
  is also a pre-existing bug. `defineFrontComponent` renders the component with
  empty props (no `componentParams`), so per-object config must be closed over
  at build time: one `.front-component.tsx` entry per object over a shared
  `.factory.tsx`, never a prop.
- **Instantiate a content template by re-keying the blocknote block tree:**
  `content.blocknote` is a JSON array of blocks (top-level `id` + nested
  `children`); block ids are the anchors block/comment state hangs off, so a
  copy must mint fresh ids or it aliases the template. Re-key only the block
  tree, let any string equal to a known old id follow its mapped target (covers
  internal references buried in `props`), and never remap `threadId` — the
  `documentCommentThread` contract keeps comment identifiers stable. The
  authorized query is the permission gate: a null fetch (record absent from the
  caller's scoped result) means fail closed, not "empty template".
- **Race-safe counter allocation over the Core API = a CAS hidden in
  `updateMany<Plural>`:** there is no atomic increment/upsert, but
  `updateManyX` renders the caller filter into the UPDATE `WHERE` and returns
  only the rows it wrote, so pinning the *expected* counter value in the filter
  makes it a compare-and-swap: an empty response means a rival already bumped
  it. Bump `expected → expected+1`, add an `is: 'NULL'` arm for rows seeded
  before the field existed, re-READ on a lost CAS (never guess the winner) and
  retry with a cap. Allocate before writing the allocated value so a failed
  write burns a number (a gap) instead of reusing one. The `.ts` handler
  receives an injectable `Pick<CoreApiClient,'query'|'mutation'>` client so
  `node --test` can enforce that contract with no live server. Instances:
  `a2e-accounting` invoice numbering, `a2e-projects` task human ids.
- **An app "workflow recipe" ships as a manifest-declared LOGIC_FUNCTION
  action + an app-source recipe definition:** the application manifest has no
  workflow entity (`Manifest` in `twenty-shared/src/application/manifestType.ts`
  has no `workflows`), so an app cannot emit a workflow. What it CAN emit is a
  logic function carrying `workflowActionTriggerSettings`, which the engine's
  `LogicFunctionWorkflowAction` executes as a `LOGIC_FUNCTION` step and the
  builder lists as an action. Declare the whole recipe in the engine's own
  vocabulary (a `CRON`/`DAYS` trigger + one step) as app source and validate
  its shape in unit tests; materializing it into a live `workflow` +
  `workflowVersion` stays a workspace/orchestrator action (Tier 2), not a
  `dev:build` side effect.
- **Workflow-action inputSchema is inferred only from inline handler types:**
  `manifest-build` calls `getInputSchemaFromSourceCode`, which parses the logic
  function file's first top-level function/arrow and only understands inline
  type literals (imported aliases fall back to the default empty schema). Keep
  the action's handler as the first and only function in the file with an
  inline param type, and delegate the real body to an importable handler.
- **oxfmt ignores `**/lib/**` by default (root `.oxfmtrc.jsonc`):** passing a
  path under `src/lib/` to `npx oxfmt --check` silently reports "excluded by
  ignore rules". To actually format/verify those files, run with a config whose
  `ignorePatterns` do not include `**/lib/**`. Also expect `**/lib/**` sources
  (e.g. `src/lib/recurring-task-generator.ts`) to be untested by the standard
  formatter gate.
- **App-level trash lifecycle (P3 pattern) = a nullable `archivedAt` field +
  data retention policy + purge cron:** app-owned objects mark the corbeille
  with a DATE_TIME `archivedAt` (present = trashed, restore writes `null`)
  instead of native soft-delete, so the trash list stays queryable across the
  whole archive window. Keep the policy as data (`TRASH_RETENTION_DAYS`,
  `isPastTrashRetention`) so the cron and the archive/restore payload builders
  read one window; an empty/unparsable timestamp NEVER purges (a broken clock
  must not destroy a visible record). The cron is an app logic function that
  queries per object `filter: { archivedAt: { is: 'NOT_NULL' } }`, filters by
  retention, then calls the generated `delete<Plural>` mutation (the default
  function role has no destroy). Standard objects keep Twenty's native trash —
  never add a parallel `archivedAt` to `task`. Instances: `a2e-documents`
  (`purge-archived-documents`), `a2e-projects` (`purge-projects-trash`; targets
  declared once in `TRASH_OBJECT_TARGETS`, handler client injectable for
  `node --test`).

- **Calendar events are workspace-stored but read-filtered per user, and an app
  cannot change that:** `calendarEvent` has no owner/connected-account column;
  ownership is resolved at query time through
  `calendarChannelEventAssociation` → core `calendarChannel.connectedAccountId`
  → `userWorkspaceId` (`apply-calendar-events-visibility-restrictions.service.ts`
  + the timeline service). Default channel visibility `METADATA` = owner full /
  other users get title+description redacted; `SHARE_EVERYTHING` = workspace
  full; **an event with no channel association is spliced out (invisible to
  everyone)**. Query hooks and sync drivers are core server code an app cannot
  register, and there is **no whole-app enable/disable** (only the `Application`
  lifecycle `state`, per-entity `isActive`, a global kill-switch). So any local
  (non-imported) event path must be core-owned, reuse the standard object, and
  attach a channel/association or first extend the visibility service — an app
  field/mutation alone cannot make a local event visible. Apps may still extend
  standard objects (e.g. `last-contact` adds a relation to `calendarEvent`) but
  may not own an object named `calendarEvent`.

---


## 2026-09-17 - P1.6b-concurrency-proof
- Added a real-DB integration spec proving the CacheLock serializes concurrent same-key apply-operations: exactly one `installApplication` call, identical results, one persisted `template-operation:<key>` row, and per-step failure/retry semantics (failed step re-runs, succeeded steps returned as-is, fully-succeeded retry re-runs nothing).
- Files changed: `packages/twenty-server/test/integration/graphql/suites/onboarding/concurrent-same-key-retry.integration-spec.ts` (new); `docs/plan/phases/phase-01-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - The unit spec mocks `CacheLockService.withLock` through; this is the only coverage exercising the real Redis lock + real KeyValuePair persistence.
  - `ApplicationInstallService` cannot be statically imported from an integration spec (see Codebase Patterns); resolve it from the container.
  - LOCAL-source registrations let the install step succeed without a published tarball.
---

## 2026-09-17 - P1.6b-seed-samples-truth
- Made the `seed-samples` step report truthfully: `resolveSampleSeedingStep` now returns `succeeded` only for a synchronous post-install hook, and `failed` / `SEED_FAILED` + retry guidance for the async hooks every a2e app ships (the old code reported `succeeded` from the mere presence of a hook, before seeding had run).
- Files changed: `packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts`; `.../__tests__/workspace-template.service.spec.ts`; `test/integration/graphql/suites/onboarding/concurrent-same-key-retry.integration-spec.ts`; `docs/plan/05-template-contracts.md`; `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - `shouldRunSynchronously` defaults to `false` in the SDK manifest build, so "hook exists" never means "hook ran"; only `=== true` is awaited by `ApplicationInstallService`.
  - The front (`A2eWorkspaceTemplatePreview`) only renders `localizedMessage` for `FAILED` steps, so the truthful status has to be `failed` for the admin to see retry info.
  - Retry re-runs only non-succeeded steps; the seed step's re-resolution never re-enqueues the install hook, so no duplicate seeds (unit + real-DB spec cover it).
---

## 2026-09-17 - P2.5-provider-validation
- Repaired the real document search provider's caller-permission path: it queried `getRepository('document')` with NO role permission config, which resolves to empty object permissions and denies select on the non-system `document` object — every caller got a caught `PERMISSION_DENIED` and an empty "A2E Documents" Cmd+K group. It now resolves `resolveRolePermissionConfig(getWorkspaceContext())` (the same seam `SearchService` uses) and passes it to the repository; no bypass, ambient context remains the only workspace source.
- Added Tier-1 integration coverage for the records `search` resolver's no-leak contract: seeded "Object-restricted" role (Apple Tim) cannot read rockets but can read pets, and a YCombinator member cannot see Apple titles.
- Files changed: `packages/twenty-server/src/engine/core-modules/search/services/document-search-provider.service.ts`; `.../services/__tests__/document-search-provider.service.spec.ts`; `packages/twenty-server/test/integration/graphql/suites/search/search-caller-permissions.integration-spec.ts` (new); `docs/plan/phases/phase-02-report.md`.
- **Learnings:**
  - `getRepository(name)` with no `RolePermissionConfig` yields `{}` object permissions + `shouldBypassPermissionChecks:false` → `validateOperationIsPermittedOrThrow` denies select for any non-system object. A caller-context provider MUST resolve and pass the config; "ambient auth context" alone is not enough.
  - Seeded restricted-role fixtures already exist: the Apple workspace "Object-restricted" role (assigned to Tim) denies rocket read / pet update, with known userWorkspace/user ids — restricted-member tests need no signup flow.
  - Cross-workspace integration is cheap at Tier 1: forge an HS256 ACCESS token for the seeded YCombinator Tim via `forgeLegacyHs256Token(payload, workspaceId)` (`.env.test` APP_SECRET matches the util's hardcoded default) and call `search` with it.
  - The seeded `document` object only exists once a2e-documents is installed, so its GraphQL path stays out of Tier-1 reach; the provider fix is proven at the ORM-contract seam instead.
---

## 2026-09-17 - P3.3-tree-loading
- Implemented lazy/paginated document tree loading: the browser now fetches only root pages up front and each parent's children on expand through its own `first`/`after` cursor page (`pageInfo.hasNextPage`/`endCursor`), with "Charger plus" for deeper pages and a post-mutation reload that drops cached pages and refetches roots + open levels.
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/document-tree-loading.ts` (new); `.../src/lib/__tests__/document-tree-loading.test.ts` (new); `.../src/lib/document-tree.ts`; `.../src/lib/document-tree-keyboard.ts`; `.../src/front-components/document-browser.front-component.tsx`; `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - App relations with a custom `joinColumnName` are unreadable through the join-column filter key (see Codebase Patterns) — use nested `parent: { id: ... }` filters; this also fixes the pre-existing invalid `parent: { is: 'NULL' }` root query.
  - GraphQL mutation inputs for app relations use `<name>Id` (`parentId`), not the custom `joinColumnName` — the browser now translates `buildMoveDocumentPayload`'s `parentDocumentId` to the wire key; `document-page.front-component.tsx` still has the old key (separate slice).
  - The front-component sandbox has no `--type-aware` oxlint flag (oxlint 0.16); the package gate is `yarn lint` + `tsc --noEmit` + `node --test` + `twenty dev:build`.
  - Cursor pages need a total order: `position`, then `title`, then `id` as the final tiebreaker keeps `after` stable when the first two tie.
---

## 2026-09-17 - P3.3-tree-loading (server cycle guard)
- Added server-side cycle validation for document moves: a new pure lib (`isDocumentParentCycle`, `readDocumentParentChange`, `resolveDocumentCycleRepairParentId`, `repairDocumentParentCycle`) plus the `guard-document-parent-cycle` database-event logic function on `document.updated`.
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/document-cycle.ts` (new); `.../src/lib/__tests__/document-cycle.test.ts` (new); `.../src/logic-functions/guard-document-parent-cycle.ts` (new); `.../src/constants/universal-identifiers.ts`; `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - Database events are post-commit (see Codebase Patterns): the guard repairs (restore previous parent, else root) rather than rejects. The repair's own update is a no-op (previous is acyclic; root short-circuits), so no event loop.
  - `computeUpdatedFieldsFromDiff` emits `<name>` and `<name>Id` (`parent`, `parentId`), never the custom `joinColumnName` (`parentDocumentId`); a trigger listing all three is safe because the filter matches any one.
  - Reading the parent of a moved document is a genql query `documents(filter:{id:{eq}}){ edges { node { id parent { id } } } }`; the relation-diff fallback (`diff.parent.after.id`) covers events whose raw record omits the join column.
  - Verify-as-you-go: `yarn lint` + `npx oxfmt --check` + `npx tsc --noEmit` + `node --test` + `npx twenty dev:build .` (16 files, manifest shows the new trigger).
---

## 2026-09-17 - P3.3-record-note-copy
- Replaced the title-snapshot "save record as document" command with a real note-body copy: a pure lib (`readRecordNoteCopyInput`, `resolveRecordLabel`, `buildRecordNoteCopyContent`, `buildRecordNoteCopyPayload`) reads the record's `noteTargets { edges { node { note { bodyV2 } } } }`, builds a BlockNote body of each note behind its own linked heading plus a source-link paragraph, and returns `companyId`/`personId` so the document still lands in the record's Documents section. Fail-closed: unreadable source ⇒ no document, missing note connection ⇒ source link only, no bodies.
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/record-note-copy.ts` (new); `.../lib/__tests__/record-note-copy.test.ts` (new); `.../front-components/save-record-as-document-command.factory.tsx` (new); `.../front-components/save-company-as-document-command.front-component.tsx` (new); `.../front-components/save-person-as-document-command.front-component.tsx` (new); deleted `.../front-components/save-record-as-document-command.front-component.tsx`; `.../command-menu-items/save-{company,person}-as-document.command-menu-item.ts`; `.../constants/universal-identifiers.ts`; `docs/plan/phases/phase-03-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - `defineFrontComponent` renders with empty props, so the old single prop-driven component never received its `sourceObjectNameSingular`; per-object config must be closed over — one entry file per object over a shared factory (see Codebase Patterns).
  - `findOne` only accepts `filter`; `navigate` needs singular `objectNameSingular` — both fixed here, both are pre-existing bugs in the app's other commands (see Codebase Patterns).
  - There is no note-selection primitive at Cmd+K time, so "selected note" is realized as every note the authenticated `noteTargets` connection returns; each gets a linked heading.
  - Permission gate is a `conditionalAvailabilityExpression` on `targetObjectReadPermissions.{company|person} && .note && .document`; the runtime payload builder then fail-closes independently.
  - This iteration resumed the immediately-prior stalled run of the same session (changes already on disk, no source edit); Tier-0 gates re-run green: 17/17 new tests, 97/97 lib tests, `tsc` exit 0, `yarn lint` 0/0, `oxfmt --check` clean, `twenty dev:build .` 18 files.
---
- Files changed: `packages/twenty-server/src/engine/core-modules/document-share/document-share.service.ts`; `.../document-share/__tests__/document-share.service.spec.ts`; `docs/plan/phases/phase-03-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - The document-share module carried the exact P2.5 permission bug (see Codebase Patterns): `executeInWorkspaceContext` alone is NOT enough — `getRepository` needs the resolved caller config or the app object is denied.
  - The guest path has no caller, so "record-level rights" there means re-checking the record's current state under `buildSystemAuthContext(share.workspaceId)` with `{ shouldBypassPermissionChecks: true }`; deny archived/deleted/uninstalled with the same NOT_FOUND as an unknown token (no oracle).
  - Positive share creation cannot be exercised at Tier 1: the `document` object only exists once a2e-documents is installed, so the ORM-contract unit seam is the proof (same limit P2.5 recorded).
  - Remaining P3.2 work is the owner-side UX bullet in `a2e-documents` (`shareDocument` still discards the returned token); passphrase crypto must be ported into the front-component sandbox (no twenty-shared/twenty-front imports).
---

## 2026-09-17 - P3.2-template-instantiation
- Completed template instantiation: the payload builder now re-keys every blocknote block anchor and reads the body through a fail-closed authorized source, so a copy is independent and its block/comment state cannot alias the template.
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/instantiate-template.ts`; `.../src/lib/__tests__/instantiate-template.test.ts`; `.../src/front-components/document-browser.front-component.tsx`; `.../src/front-components/document-page.front-component.tsx`; `docs/plan/phases/phase-03-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - Blocknote body is a JSON array of blocks; re-key top-level + nested `children` ids, follow internal references by remapping any string equal to a known old id, and skip `threadId` (comment identifiers stay stable per the object contract). See Codebase Patterns.
  - Malformed/non-array/empty blocknote is refused (`null`) rather than copied through; the markdown projection survives so a corrupt body still yields a readable copy.
  - The authorized query is the permission gate — `readAuthorizedTemplateCopySource` returns null only when the record was absent from the caller's result, so an empty template is not mistaken for a denial.
  - Tier-0 gates green: 16/16 new tests, 107/107 lib tests, `tsc --noEmit` exit 0, `yarn lint` 0/0, `oxfmt --check` clean on the `.tsx` files (oxfmt ignores `.ts` here), `twenty dev:build .` 18 files. `--type-aware` is still unsupported by oxlint 0.16.12; `nx lint:diff-with-main` has no `a2e-documents` project.
---

## 2026-09-17 - P4.1-task-extensions
- Made the task human-id function an atomic allocator: `project.taskCounter` is now bumped by a CAS (`updateManyProjects` filter pins the expected counter, `is: NULL` arm covers pre-field projects) with re-read + retry, and the human id is allocated BEFORE the task write so a failed write burns a number instead of reusing one.
- Extracted the idempotent assignment flow and the pure rules into a loader-injected handler + lib so `node --test` proves concurrent uniqueness with no live server.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/task-human-id.ts` (new); `.../src/lib/__tests__/task-human-id.test.ts` (new); `.../src/logic-functions/handlers/task-human-id-handler.ts` (new); `.../src/logic-functions/__tests__/task-human-id-handler.test.ts` (new); `.../src/logic-functions/task-human-id.logic-function.ts`; `.../package.json`; `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - The app package had no `test:unit` script; added one mirroring `a2e-accounting` but covering both `src/lib/__tests__/*.test.ts` and `src/logic-functions/__tests__/*.test.ts`.
  - The CAS pattern is reusable and now documented in Codebase Patterns (also used by `a2e-accounting` invoice numbering).
  - `project.taskCounter` semantics stay "last n attributed" (`<KEY>-<counter+1>`); the accounting counter means "next number" — do not unify them without migrating existing task ids.
  - The concurrency proof works at unit level because a stubbed `query` snapshots the row synchronously: `Promise.all` of two assignments reads the same stale counter, the loser's CAS returns `[]`, it re-reads and retries.
  - Still open for P4.1: UI/API integrity + lifecycle tests for the eight task app fields (needs the app installed — Tier 1→2, orchestrator), the recurring-generator workflow, and the (stale, already-satisfied) milestone bullet.
---

## 2026-09-17 - P4.1-task-extensions (integrity + lifecycle)
- Added a Tier-0 task app-field integrity/lifecycle suite and repaired the relation graph it proved broken: 13 tests assert id uniqueness, exact 6 objects, every relation target object+field resolves, every relation is a symmetric M2O/O2M pair owned by its target object, and the per-field contract (project SET_NULL, projectStatus/priority/estimate selects, labels junction CASCADE, subtask self-relation, blockIssue→note, humanId TEXT, timeEntry task/project/member).
- Fixed: `label.object.ts`/`task-label.object.ts` junction ids pointed at a self/missing id; moved 8 inverse O2M fields out of project/milestone/project-member/time-entry object files into standalone field files on their real target objects; added the missing `task.subtasks` and `milestone.tasks` inverses. The built manifest now walks clean (55 fields, 0 unresolved, 0 ownership mismatches).
- Files changed: `a2e-projects/src/lib/__tests__/task-field-integrity.test.ts` (new); `src/objects/{label,task-label,project,milestone,project-member,time-entry}.object.ts`; new `src/fields/{lead-projects,company-projects,project-milestones,milestone-tasks,project-members,workspace-member-project-memberships,task-time-entries,project-time-entries,workspace-member-time-entries,task-subtasks}.field.ts`; `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - Inverse relations must be standalone fields on the relation target (see Codebase Patterns); embedding them inside the FK object silently misplaces them and a missing target-field id blocks install.
  - `node --test --experimental-strip-types` can import `twenty-sdk/define` field/object modules and read `{success, config}` — a Tier-0 manifest-integrity seam with no server.
  - Menu/diff gates: `a2e-projects` is not an Nx project and oxlint 0.16.12 rejects `--type-aware`; package gates are `node --test` + `tsc --noEmit` + `yarn lint` + `npx oxfmt --check` + `npx twenty dev:build .`.
---

## 2026-09-17 - P4.1-recurring-generator
- Implemented the "recurring task generator" recipe on the existing workflow engine: pure UTC recurrence math (anchored DAILY/WEEKLY/MONTHLY, half-open window, skip-ahead index, cap, stable recurrence key); a recipe definition expressed as a native CRON/DAYS trigger + one LOGIC_FUNCTION step; a `recurring-task-generator` logic function exposed as a workflow action (`workflowActionTriggerSettings`) whose manifest inputSchema is inferred from its inline handler type; and an idempotent handler that creates each due task and skips project+title+dueAt duplicates on replay.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/recurring-task-generator.ts` (new); `.../src/workflow-templates/recurring-task-generator.workflow.ts` (new); `.../src/logic-functions/recurring-task-generator.logic-function.ts` (new); `.../src/logic-functions/handlers/recurring-task-generator-handler.ts` (new); `.../src/lib/__tests__/recurring-task-generator.test.ts` (new, 13); `.../src/lib/__tests__/recurring-task-generator-workflow.test.ts` (new, 5); `.../src/logic-functions/__tests__/recurring-task-generator-handler.test.ts` (new, 6); `.../src/constants/universal-identifiers.ts`; `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - See new Codebase Patterns entries: workflow recipe = manifest-declared LOGIC_FUNCTION action + app-source definition; inputSchema inference needs an inline handler param; oxfmt ignores `**/lib/**`.
  - `npx twenty dev:build .` succeeded (16 files) and the built manifest now carries `recurring-task-generator` @ `c31a0000-0012-4000-8000-000000000009` with label/icon + inferred inputSchema — the manifest-declaration assertion.
  - Tier-0 gates green: 57/57 `node --test`, `tsc --noEmit` exit 0, oxlint 0/0 (1 pre-existing warning), oxfmt clean on all touched files (strict lib-inclusive config). `nx lint:diff-with-main` has no `a2e-projects` project and oxlint 0.16.12 rejects `--type-aware` (package gates substitute).
  - Still open: live materialization/execution of the recipe (Tier 2 orchestrator), the task-extension live lifecycle tests, and the stale already-satisfied milestone bullet.
---

## 2026-09-17 - P4.3-trash
- Implemented the a2e-projects trash lifecycle mirroring the P3 documents pattern: a nullable `archivedAt` DATE_TIME corbeille field on the app-owned objects (project, milestone, timeEntry, label), a pure retention policy lib (`TRASH_RETENTION_DAYS`, `isInTrash`, `isPastTrashRetention`, `isRestorable`, `buildArchivePayload`, `buildRestorePayload`), and a real purge cron that replaces the previous no-op stub.
- The cron handler `purgeExpiredTrash` queries each owned object with `filter: { archivedAt: { is: 'NOT_NULL' } }`, deletes only rows past the 7-day window via the generated `delete<Plural>` mutation, and returns per-object counts; the client is injectable so `node --test` exercises the whole sweep with no server. `TRASH_OBJECT_TARGETS` declares the four objects once. Standard `task` is intentionally excluded — Twenty's native trash already covers it, and an app `archivedAt` there would be a duplicate system.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/trash-retention.ts` (new); `.../src/lib/__tests__/trash-retention.test.ts` (new, 8); `.../src/logic-functions/handlers/purge-trash-handler.ts` (new); `.../src/logic-functions/__tests__/purge-trash-handler.test.ts` (new, 4); `.../src/logic-functions/purge-trash.logic-function.ts`; `.../src/objects/{project,milestone,time-entry,label}.object.ts`; `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - Retain the P3 contract exactly: policy as data, unparsable/empty `archivedAt` never purges, purge via `delete<Plural>` (role has no destroy) so native trash cleanup does the final hard delete.
  - `dev:build` succeeded (16 files) and the manifest now carries 4 `archivedAt` fields; nothing sets the field yet — an archive/restore action surface is P4.2 UX, the field is editable on the native record page meanwhile.
  - Tier-0 gates green: 69/69 `node --test`, `tsc --noEmit` exit 0, oxlint 0 errors (1 pre-existing warning), oxfmt clean on all touched files (lib-inclusive config; root ignores `**/lib/**`). `nx lint:diff-with-main` has no `a2e-projects` project and oxlint 0.16.12 rejects `--type-aware` (package gates substitute).
  - Still open: Tier-2 live archive→restore→purge proof (orchestrator); P4.2 archive/restore UI.
---

## 2026-09-17 - P4.2-subtasks-dependencies-ui (nested subtask list)
- Delivered the first bullet of the task: a nested subtask list UI on the existing `task.parentTask` self-relation. Pure lib `lib/task-tree.ts` nests a flat `{id, parentTaskId}` list into a forest (orphans at root, corrupt cycles broken by promoting only the nodes whose own chain re-enters them), flattens depth-first, and owns the parent-selection cycle guard `isTaskParentCycle` — the SAME visited-set ancestor walk as `a2e-documents/lib/document-cycle.ts`'s `isDocumentParentCycle`, applied synchronously to a loaded map. `buildTaskParentPayload` throws before persistence; `collectTaskParentCandidates` builds picker options from the one predicate.
- The front component `front-components/task-subtasks.front-component.tsx` renders the lazy per-parent nested list (roots when nothing is selected; the selected task's subtree when exactly one record is selected), with expand/collapse, add-subtask, open-task, detach, and a parent `<select>` whose cyclic choices are refused client-side. Mounted by a GLOBAL command menu item `open-subtasks`.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/task-tree.ts` (new); `.../src/lib/__tests__/task-tree.test.ts` (new, 11); `.../src/front-components/task-subtasks.front-component.tsx` (new); `.../src/command-menu-items/open-subtasks.command-menu-item.ts` (new); `.../src/constants/universal-identifiers.ts` (+2 ids); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - One cycle algorithm, not two: the app cannot import a2e-documents (separate package), so the guard is the same algorithm re-expressed synchronously over the loaded map — document that relationship in the lib header (the PRD explicitly forbids a second algorithm).
  - Task create/update relation input uses the `<fieldName>Id` convention (`parentTaskId`), proven by `recurring-task-generator-handler` writing `projectId` — NOT the `subtaskId` join column; the query filter uses `parentTask { id }`, never the join column key.
  - `nestTaskTree` must break corrupt cycles by promoting only the nodes whose own ancestor chain re-enters them; promoting every node that merely *sees* a revisit also orphans innocent siblings of the loop.
  - **Gotcha:** the existing `task.blockIssue` field is task ➜ **note** (`note-blocked-tasks` inverse), so the PRD's "blockedBy self-relation" does not match source — the dependency-picker slice must decide (blocking note vs new task↔task self-relation) before building.
  - Tier-0 gates green: 80/80 `node --test` (11 new), `tsc --noEmit` exit 0, oxlint 0 errors (1 pre-existing warning), oxfmt clean on all 5 touched files (lib-inclusive config; root ignores `**/lib/**`), `twenty dev:build .` 18 files with `task-subtasks` + the command in the manifest. `nx lint:diff-with-main` has no `a2e-projects` project and oxlint 0.16.12 rejects `--type-aware`.
  - Still open: the dependency picker + its cycle tests, and the Tier-2 live nested-list/reparent proof (orchestrator install).
---

## 2026-09-17 - P4.2-gantt (Gantt/timeline view front component)
- Delivered the task's only bullet: a framer-motion-free, virtualized Gantt front component for the project record page. Pure lib `lib/project-gantt.ts` owns the timeline math (createdAt➜dueAt bounds with milestone collapse, padded minimum range, clamped day offsets, deterministic bar order, `parentTask` dependency links, row + day overscan windows, and a `buildGanttModel` that returns only the visible rows/ticks). `front-components/project-gantt.front-component.tsx` queries the project's tasks with pagination, renders a sticky axis + label column, absolutely positioned bars/diamonds, SVG parent➜child elbows limited to visible rows, and a "Charger plus" button. Registered as a `Gantt` FRONT_COMPONENT widget on the project page Timeline tab.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/project-gantt.ts` (new); `.../src/lib/__tests__/project-gantt.test.ts` (new, 15); `.../src/front-components/project-gantt.front-component.tsx` (new); `.../src/constants/universal-identifiers.ts` (+`projectGantt` id); `.../src/page-layouts/project.page-layout.ts` (+Gantt widget); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - No `.tsx` in node:test: JSX cannot be stripped, so the testable unit is the pure model. That satisfies "rendering + virtualization" behavior at Tier 0 without adding test infra; a real DOM assertion is Tier 2.
  - Task has no start field (native: dueAt only, plus createdAt), so the bar start is `createdAt`; a task with a single date renders as a milestone marker. Do not invent a start field for the Gantt story.
  - Dependency arrows use the existing `parentTask` self-relation (`readTaskParentId` reused from `lib/task-tree.ts`); `blockIssue` is task➜note and is NOT a dependency edge (prior gotcha).
  - Absolute day positions must be `day * DAY_WIDTH` in the timeline origin (not `(day - window.startDay)`), because the axis/grid live inside the horizontally scrolled content; the window only selects which ticks mount.
  - Tier-0 gates green: 95/95 `node --test` (15 new), `tsc --noEmit` exit 0, oxlint 0 errors (1 pre-existing warning), oxfmt clean on 5 touched files (lib-inclusive config; root ignores `**/lib/**`), `twenty dev:build .` 20 files with `project-gantt` + the widget in the manifest. `nx lint:diff-with-main` has no `a2e-projects` project and oxlint rejects `--type-aware`.
  - Still open: the Tier-2 install/open-the-widget proof (orchestrator), and the DOM-level render assertion if the orchestrator wants one.
---

## 2026-09-17 - P4.2-time-tracker
- Delivered the task's only bullet: task-scoped start/stop timer, entries list, and a per-project rollup widget, all over the pre-existing `timeEntry` object (no duplicate object/migration). Pure lib `lib/time-tracker.ts` owns the state machine (single running session, sub-minute/corrupt start floored at `MINIMUM_LOGGED_MINUTES`, elapsed floor + skew guard) and the aggregation (`buildProjectTimeRollup` by task with a `sans-tache` bucket, `buildTimeRollupByProject` by project with a `sans-projet` bucket). `front-components/time-tracker.front-component.tsx` persists one running timer in localStorage so a remount resumes, refreshes only while running, creates the entry on stop (keeping the timer if the write fails) and lists/deletes task entries. `front-components/project-time-rollup.front-component.tsx` loads the project's entries and renders the pure rollup as relative bars. Mounted by a RECORD_SELECTION command item `open-time-tracker` on `task`, plus a `Temps` FRONT_COMPONENT widget on the project page.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/time-tracker.ts` (new); `.../src/lib/__tests__/time-tracker.test.ts` (new, 14); `.../src/front-components/time-tracker.front-component.tsx` (new); `.../src/front-components/project-time-rollup.front-component.tsx` (new); `.../src/command-menu-items/open-time-tracker.command-menu-item.ts` (new); `.../src/constants/universal-identifiers.ts` (+3 ids); `.../src/page-layouts/project.page-layout.ts` (+Temps widget); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - Resumed a stalled run: the `CLAIMED` line existed with no report and the matching files were dirty; verified the work against acceptance, re-ran every gate, and reported `done-for-review` without creating a second claim or redoing the code.
  - The stored unit is whole `timeEntry.minutes`; a stopped session writes `spentAt = now` and a formatted `label`, so the entries list is self-describing without a join to the task for display.
  - The command-menu mount is the "presence-adjacent" answer here: a2e front components have no app-level P2.3 presence API (roster/avatar primitives are twenty-front-side), so the tracker mounts on the existing task side-panel surface and declares **no** new presence system.
  - `deleteTimeEntry` (singular, `__args: { id }`) matches the `deleteDocument` convention in a2e-documents; the trash purge cron still uses the plural `deleteTimeEntries`.
  - Tier-0 gates green: 109/109 `node --test` (14 new), `tsc --noEmit` exit 0, oxlint 0 errors (1 pre-existing warning), oxfmt clean on all 7 touched files (lib-inclusive config; root ignores `**/lib/**`), `twenty dev:build .` 24 files with `time-tracker`, `project-time-rollup`, the command and the page widget in the manifest. `nx lint:diff-with-main` has no `a2e-projects` project and oxlint 0.16.12 rejects `--type-aware`.
  - Still open: Tier-2 live start/stop→entry-row and `Temps` rollup proof (orchestrator).
---

## 2026-09-17 - P4.2-cmdk (Cmd+K create task + tasks/projects search provider)
- Delivered the task's only bullet. **Create task**: a GLOBAL command item `createTask` (`…0011-…0008`) + front component `createTaskCommand` (`…0013-…000b`) that calls `createTasks` and navigates to the record show page, mirroring `create-project-command` one-for-one; "go to project" already shipped as `go-to-projects`, so it was validated, not rebuilt. **Search**: one `A2eProjectsSearchProviderService` registered for the a2e-projects app id, ILIKE over `task.title` + non-archived `project.name` under the caller's resolved role config, returning items labelled `Tâche`/`Projet` with `/object/task|project/<id>` deep links. Tests: 8 command-availability (all commands validate, ids registered in `COMMAND_MENU_ITEM_IDS`, front components registered, availability scopes, registry uniqueness/uuid shape) + 9 server provider tests (registration, blank short-circuit, grouping+links, ilike/archived filter, caller-role + fail-closed, workspace scoping, wildcard escaping, malformed-record filtering).
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/command-menu-items/create-task.command-menu-item.ts` (new); `.../src/front-components/create-task-command.front-component.tsx` (new); `.../src/lib/__tests__/command-availability.test.ts` (new, 8); `.../src/constants/universal-identifiers.ts` (+2 ids); `packages/twenty-server/src/engine/core-modules/search/services/a2e-projects-search-provider.service.ts` (new); `.../search/services/__tests__/a2e-projects-search-provider.service.spec.ts` (new, 9); `.../search/search.module.ts` (+provider); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - Resumed a stalled run again (17:45:55Z claim, no report, matching dirty files): verified against acceptance, re-ran every gate, reported `done-for-review` — no second claim, no redo.
  - The search-provider registry/grouping/cap is already complete server-side; a new app provider only needs the decorator + module registration. Do not add a parallel search framework.
  - `AppPath.RecordShowPage = /object/:objectNameSingular/:objectRecordId` — search deep links must use the **singular** name. a2e-documents' provider uses `/object/documents/…` (plural), which looks like a latent pre-existing bug; out of scope, left untouched.
  - Server-side `oxlint --type-aware` works from `packages/twenty-server` with `-c .oxlintrc.json` (0/0). The app package's pinned oxlint 0.16.12 still rejects `--type-aware`; `nx lint:diff-with-main twenty-server` diffs committed history only, so uncommitted edits need the direct command.
  - Tier-0 gates green: 116/116 app `node --test` (8 new), 9/9 server jest, app `tsc --noEmit` exit 0, server `tsgo --noEmit` exit 0, oxlint 0 errors both packages (1 pre-existing warning in untouched `fields/task-labels.field.ts`), oxfmt clean on all 7 touched code files (lib-inclusive config), `twenty dev:build .` 26 files with the new command + front component in the manifest.
  - Still open: Tier-2 live Cmd+K create-task + grouped search proof (orchestrator).
---

## 2026-09-17 - P4C.1 calendar ownership/compatibility spike (report-only)
- Report-only decision record appended to `docs/plan/phases/phase-04-report.md`, feeding PLAN.md D05. No code touched. Inspected at base `7e74c40e`: standard `calendarEvent`/`calendarChannelEventAssociation`/`calendarEventParticipant` metadata + core `calendarChannel`; the create drivers (`createCalendarEvent` mutation, `CREATE_CALENDAR_EVENT` workflow action, `CreateCalendarEventTool`, front composer); the pull-only import/sync pipeline (Google syncToken/watch, Microsoft delta/subscription, CalDAV CTag); and the calendar UI (`record-calendar` Day/Week/Month grid, `activities/calendar` agenda widget, no `/calendar` route).
- Decisions (D5.1–D5.4): local events reuse standard `calendarEvent` (no parallel backend) and require core additive work (origin marker + visibility-service change + provider-optional composer) because channel-less events are dropped and apps cannot register query hooks; app boundary stays off the core local-event path (apps cannot add routes/hooks/drivers; no whole-app toggle); sharing reuses channel `visibility` + per-user ownership, creator = owner for local; capability matrix = create pushable, update/delete read-back-only, recurrence import-metadata-only, attendee create provider-dependent, response import-only. Recorded 10 concrete gaps before any metadata/service extension.
- Files changed: `docs/plan/phases/phase-04-report.md` (findings + report); `.ralph-tui/progress.md`.
- **Learnings:**
  - The decisive constraint for P4C is that local events cannot be app-owned: read filtering is a server post-query hook on `calendarEvent.findMany/findOne` (plus the timeline service), and an association-less event is silently dropped. Any "local event" slice must touch core, not just add an app field/mutation.
  - `calendarEvent` is `isSystem: true, isUICreatable: false` with all fields `isUIEditable: false`; there is **no** `recurrenceRule`/RRULE field (recurrence is only `recurringEventExternalId`, CalDAV-parsed), and **no** provider-side update/delete push exists (only create). This is the real state P4C.2–P4C.4 must build on.
  - A public app (`last-contact`) already adds a relation to standard `calendarEvent`, so "app extends standard object" is supported; "app owns a `calendarEvent`-named object" is not (workspace name collision).
  - Quality gate for a docs-only slice: `node docs/scripts/check-docs.mjs` → `PASS: 19 maintained documents, 130 local inline links, balanced code fences`. The phase report is not in `MAINTAINED_DOCUMENTS`; lint/tsgo are N/A (no package changed), Tier 2 untouched.
  - Still open (not blockers): app packaging name, local-field-vs-marker, workspace default share setting (§10 of the findings).
---
