# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

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
