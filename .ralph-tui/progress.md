# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Testable app logic-function handlers:** `node --test` cannot import a
  module that calls `definePostInstallLogicFunction` at load, and the generated
  `CoreApiClient` throws before generation. Extract the client-driven logic into
  a `logic-functions/handlers/*.ts` module taking an injectable
  `Pick<ReturnType<typeof coreClient>, 'query' | 'mutation'>` client (see
  `numbering-handler.ts`, `seed-starter-content.ts`). Stub `query` must answer
  `{ [plural]: { edges: [{ node }] } }` (that is the shape `findAllRecords`
  reads), and `mutation` must return `{ [mutationName]: [{ id }] }`.
- **Delegated seeding truth (P1.6b):** seeding is app-owned via each manifest's
  `postInstallLogicFunction`. `WorkspaceTemplateService.resolveSampleSeedingStep`
  reports `succeeded` only for a synchronous hook; an async hook (all a2e apps)
  reports `failed`/`SEED_FAILED` with retry guidance. No server-side seeder.
- **Unit-proving lock-serialized idempotency:** a spec that mocks
  `CacheLockService.withLock` as a passthrough cannot show concurrent dedupe.
  Provide a real per-key serializing fake (a `Map<key, Promise>` chain) plus a
  stateful `KeyValuePairService` store (`set` writes `{ value }`, `get` returns
  `[stored]`), then `Promise.all` two same-key calls: the second waits on the
  chain, reads the persisted operation and skips the install. See
  `workspace-template.service.idempotency.spec.ts`.
- **Proving unreachable content paths without shipping content:** when a
  service path depends on code-data (`WORKSPACE_TEMPLATE_DEFINITIONS`) that no
  shipped entry exercises yet, `jest.mock` the tiny lookup util
  (`get-workspace-template-definition.util`) in the spec and return a crafted
  definition — never edit the shipped constant (that is a product/content call).
  See `workspace-template.service.partial-failure.spec.ts`.
- **Porting a twenty-front pure util into an app lib:** an internal app's
  `twenty-sdk`/`twenty-shared` resolve from the pinned npm version (2.31.0), not
  the workspace, so it cannot import twenty-front internals and may lack newer
  enum members (e.g. `AppPath.DocumentShare`). Carry a byte-compatible local
  port in `a2e-documents/src/lib/` (see `share-crypto.ts`, `fractional-position.ts`)
  and assert compatibility in a node test instead of casting around missing types.
- **Unit-testing owner-side UI logic without JSX:** extract the create/copy/revoke
  transitions into a pure reducer (`reduceDocumentSharePanel`) plus pure request
  builders, test those with `node --test`, and let the front component only wire
  `useReducer` + the Core API calls. The async handler glue stays Tier-2.
- **An app cannot synchronously reject a server write:** the app SDK's
  `LogicFunctionManifest` offers only `databaseEventTriggerSettings` (post-commit
  `created/updated/deleted/...` — no pre-update action) plus cron/http/server
  routes/tools. There is no app-owned pre-write hook. So a server-side invariant
  like "no document-tree cycle" can only be enforced **fail-closed by post-commit
  repair** (restore the previous acyclic parent or detach to root) on the
  app-owned object; a true synchronous reject needs a twenty-server
  `@WorkspaceQueryHook('*.updateOne')` or an app HTTP route. Verify this shape in
  `packages/twenty-sdk/src/sdk/define/logic-functions/` and
  `packages/twenty-server/src/engine/.../workspace-query-hook/` before promising
  rejection.
- **Per-user data in an app front component:** the native personal favorite
  primitive is `navigationMenuItem.userWorkspaceId`, but an app front component
  only gets `useUserId()` (`twenty-sdk/front-component`) and cannot reach the
  metadata API. Model personal state as an app-owned join object with a TEXT
  `userId` + a unique TEXT label key `${userId}:${documentId}`, filter
  `{ userId: { eq } }` server-side, and toggle with
  `createDocumentFavorites`/`deleteDocumentFavorite` (the `<fieldName>Id` FK key
  comes from the relation *field* name, not `joinColumnName` — verified in
  `relation-field-metadata-gql-type.generator.ts`). To make a shared flag
  personal: deprecate, never remove/rename. See `document-favorites.ts`,
  `document-favorite.object.ts`.
- **Stale `twenty-sdk/dist` reddens twenty-front tsgo:** the bundled
  `dist/front-component/index.d.ts` re-declares a local `AppPath` enum, so
  `useFrontComponentExecutionContext.ts` fails with `AppPath.X is not assignable
  to AppPath` until `npx nx build twenty-sdk --skip-nx-cache` (same class as the
  `twenty-shared/dist` gotcha). The app package pins `twenty-sdk@2.31.0` and is
  unaffected.
- **Purge crons must page before deleting:** a single `first: 500` silently
  leaves archived rows past the first page unpurged forever. Read every cursor
  page into memory first, then delete — deleting mid-page shifts the cursor.
  See `purge-archived-documents-handler.ts`.
- **Adding a native side-panel page + command-menu action:** `SidePanelPages`
  lives in `twenty-shared/src/types/SidePanelPages.ts`; a new member must be
  registered in `SIDE_PANEL_PAGES_CONFIG` (`Map<ActiveSidePanelPage, ReactNode>`)
  and the bundled `twenty-sdk/dist/front-component/index.d.ts` ALSO re-declares
  the enum — so after adding a member run
  `npx nx build twenty-shared --skip-nx-cache && npx nx build twenty-sdk --skip-nx-cache`
  or twenty-front tsgo fails with `Property '<member>' is missing` (the AppPath
  gotcha's class). A native command-menu entry is a `CoreObjectsCommands`-style
  `SelectableListItem`+`CommandMenuItem` whose id is added to `selectableItemIds`
  and gated by a search-matching hook (see `quick-capture/**`,
  `SidePanelCommandMenuItemDisplayPage.tsx`). `navigateSidePanel` does NOT clear
  `sidePanelSearchState`, so preset it before navigating to route to an existing
  command. App front components cannot open a sibling front component:
  `frontComponent(id)` resolves a DB id, not the universal identifier, so
  cross-app `openSidePanelPage({ page: ViewFrontComponent })` routing fails.
- **Consuming the native AI tool registry in a front surface:** the registry
  is already exposed to twenty-front by `useGetToolIndex` (`ToolIndexResolver` →
  `ToolRegistryService.buildToolIndex`/`getCatalog`); do not add a resolver or a
  second table. A registry `LOGIC_FUNCTION` tool carries no app id, so resolve
  its owning app in the front by mapping the tool name back to a metadata-store
  `logicFunctionsSelector` entry with a byte-compatible port of the server's
  `LogicFunctionToolProvider.buildLogicFunctionToolName` (`app_` + lowercased
  non-alphanumerics collapsed to `_`), then gate fail-closed on
  `installedApplicationIds` + `canReadObjectRecords` + the current object's
  `applicationId` (context mapping). `ToolCategory.LOGIC_FUNCTION` is the
  read-only/proposal category; `ACTION` and `DATABASE_CRUD` are the mutating
  categories and must never be offered as read-only context buttons. See
  `ai/utils/getContextToolButtons.ts`, `ai/hooks/useContextToolButtons.ts`.
---


## 2026-09-19 - US-016

- Extracted the Bilan post-install seeding write path (`seedCategories`,
  `seedOrgProfile`, `seedStarterSheets`, `seedStarterFiches`) from
  `post-install.ts` into `logic-functions/handlers/seed-starter-content.ts`,
  with an injectable `SeedingClient` (numbering-handler pattern).
- Added `src/lib/__tests__/starter-content-seeding.test.ts` (4 cases): a fresh
  install writes 17 categories / 1 profile / 3 sheets / 2 fiches with usable
  fields; a full reinstall writes 0 mutations; a partial reinstall writes only
  the missing rows; a rejected Core write rejects rather than reporting a seed.
- Files changed: `post-install.ts`, new `seed-starter-content.ts`, new
  `starter-content-seeding.test.ts`, `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - The seed-0-rows root cause was already fixed by the SDK-layer extraction
    race fix (57354bc8) and the step truth by a99f5794; the missing US-016
    acceptance gap was the unit proof of the write path (criterion #4).
  - `yarn test:unit` only globs `src/lib/__tests__/*.test.ts`, so a lib test is
    the way to get handler coverage into the default suite.
  - Reinstall idempotency is keyed on `pcgAccount` (categories), one
    `orgProfiles` row, `systemKey` (sheets) and `(title, templateKey)` (fiches).
---

## 2026-09-19 - US-017

- Implemented US-017 as the unit-proof slice for the already-built
  `WorkspaceTemplateService.applyWorkspaceTemplateOperation` idempotency path
  (no product code change).
- Added `workspace-template.service.idempotency.spec.ts` (3 cases):
  N=3 same-key retries → one install, one workspace update, stable `operationId`
  and surviving statuses, one persisted record; `Promise.all` same-key calls
  over a per-key serializing fake lock → one install, deep-equal results;
  a synchronous-hook seed case → the succeeded `seed-samples` step is not
  re-resolved on retry (lookup count frozen) so no duplicate seeds.
- Files changed: new `workspace-template.service.idempotency.spec.ts`,
  `docs/plan/phases/phase-01-report.md`, this file.
- **Learnings:**
  - The sibling `workspace-template.service.spec.ts` mocks `withLock` through,
    so concurrency was only covered by the Tier-1 integration spec; the unit
    gap was the "asserted by unit test" AC.
  - `operationId` is the idempotency key (stable), not a fresh UUID; the §4 doc's
    "UUID" note is cosmetic and changing it is a wire change with no AC.
  - `nx lint:diff-with-main` diffs `main...HEAD`, so an untracked new spec is
    not covered — run `oxlint --type-aware` + `oxfmt --check` directly.
---

## 2026-09-19 - US-018

- Closed the P1.6b AC5 gap: non-deselected *optional* apps are now attempted.
  `WorkspaceTemplateService` gained `selectedApplicationUniversalIdentifiers`
  (all definition apps minus deselected) used to build install steps, while the
  `set-workspace-template` blocking decision still keys off
  `requiredApplicationUniversalIdentifiers` — so an unavailable optional app is
  excluded from the bundle instead of blocking it. No behavior change for
  shipped definitions (all `optionalApplicationUniversalIdentifiers` are empty).
- Added `workspace-template.service.partial-failure.spec.ts` (5 cases):
  partial required failure keeps the succeeded optional install, names
  `INSTALL_FAILED` with a localized message and withholds
  `appliedTemplateKeyVersion`; unavailable optional app reports
  `APP_NOT_REGISTERED` yet the template still applies; same-key resume
  re-validates compatibility only for the failed app and re-installs once;
  a deselected optional app is absent but the result stands; all-required-failed
  never sets the template.
- Files changed: `workspace-template.service.ts`, new
  `workspace-template.service.partial-failure.spec.ts`,
  `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - Optional-app exclusion was unreachable: the definitions ship no optional
    apps (product call D02/P1.6d), and `buildInitialSteps` dropped every optional
    app. Prove the behavior by `jest.mock`ing `get-workspace-template-definition.util`
    rather than editing shipped content.
  - Resume re-installing a failed app re-runs `validateWorkspaceCompatibility`
    inside `installTemplateApplication`, which is the "revalidate versions on
    resume" AC; permissions are re-checked per request by the resolver guard.
---

## 2026-09-19 - US-019

- Wired the P3.2 owner-side share-management UX in the a2e-documents browser.
  Removed the token-discarding `shareDocument`; added a `DocumentSharePanel`
  that loads any existing share for the document, creates one with an optional
  passphrase (encrypted client-side) and optional expiry, displays/copies the
  `/share/<token>` path, and revokes via the workspace-scoped `deleteDocumentShare`.
- Added pure lib `share-crypto.ts` (byte-compatible port of twenty-front's
  `deriveShareAesGcmKey`) and `document-share-management.ts` (`buildDocumentSharePath`,
  `buildExpiryIso`, `hasSharePassphrase`, `buildCreateDocumentShareRequest`,
  `findDocumentShareForDocument`, `reduceDocumentSharePanel`).
- Files changed: `src/lib/share-crypto.ts`, `src/lib/document-share-management.ts`,
  `src/lib/__tests__/share-crypto.test.ts`,
  `src/lib/__tests__/document-share-management.test.ts`,
  `src/front-components/document-browser.front-component.tsx`,
  `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - The app's pinned `twenty-sdk@2.31.0` lacks `AppPath.DocumentShare` (the
    workspace `twenty-shared` has it), so the share path is carried locally and
    asserted in the node test; do not import the enum there.
  - `findManyDocumentShares` is workspace-scoped and best-effort from the panel:
    a lookup failure still leaves the create form usable.
  - Absolute share URLs are impossible from a front component — no host-origin
    primitive is exposed; copy the canonical app path.
---

---

## 2026-09-19 - US-020

- Extended the existing a2e-documents server-side cycle service rather than
  building anything new: added `validateDocumentParentMove` (fail-closed
  decision reusing `isDocumentParentCycle`), a stable
  `DOCUMENT_PARENT_CYCLE` error code + non-leaking FR message, and made
  `repairDocumentParentCycle` delegate to the validator and return the coded
  error on repair.
- Added the acceptance's exact unit cases to `document-cycle.test.ts`: direct
  A→B→A, deep A→B→C→A, self-parent, and a valid deep cross-branch move that is
  allowed and writes nothing.
- Files changed: `src/lib/document-cycle.ts`,
  `src/lib/__tests__/document-cycle.test.ts`,
  `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - The server guard is a **post-commit repair**, not a synchronous reject:
    `databaseEventTriggerSettings` only fires after commit and there is no
    pre-write hook in the app SDK, so `guard-document-parent-cycle` cannot make
    the original `updateDocument` mutation fail. Bullet 3's "rejected ... mutates
    nothing" is only satisfiable by the client `buildMoveDocumentPayload`
    (primary UX) or by a new server-side system (twenty-server pre-query hook /
    app HTTP route) — reported as the open decision, not implemented.
  - `node --test` needs `--experimental-strip-types`; `src/lib/**` is excluded
    from the root `.oxfmtrc.jsonc` (`**/lib/**`), so oxfmt needs an override
    config to check app lib files.
---

## 2026-09-19 - US-021

- Completed the queued plural→singular `objectNameSingular` navigate fix in
  a2e-documents (5 sites across `create-document-command`, `document-browser`,
  `document-page`) — grep confirms no `'documents'` value remains.
- Added the deterministic across-pages ordering evidence to
  `document-tree-loading.test.ts`: 2·PAGE_SIZE+3 siblings built with
  `buildAppendPosition` and merged across 3 cursor pages reproduce the exact
  fractional-index order with no duplicate/reorder, plus an explicit
  expand-then-load-more page-state transition test.
- The lazy per-parent loader (`fetchDocumentsPage` with `first` + `after`,
  `orderBy position/title/id`, merge/nest helpers) was already committed under
  `c9a9efe8`; this slice extended tests + fixed navigate rather than recreating it.
- Files changed: `src/front-components/create-document-command.front-component.tsx`,
  `src/front-components/document-browser.front-component.tsx`,
  `src/front-components/document-page.front-component.tsx`,
  `src/lib/__tests__/document-tree-loading.test.ts`,
  `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - The a2e-documents app package has **no JSX/front-component test runner** —
    `test:unit` is `node --test --experimental-strip-types` over `src/lib` and
    `src/logic-functions` only. Expand/load-more UI behavior must therefore be
    proven through the pure page-state helpers (`needsInitialChildrenFetch`,
    `hasNextChildrenPage`, `mergeTreeChildrenPage`), not rendered components.
  - The root `.oxfmtrc.jsonc` ignores `**/lib/**`, so oxfmt on app lib specs
    needs an override config; running the root formatter on an app
    front-component can also reformat unrelated pre-existing lines — revert that
    incidental churn to keep the diff scoped.
---

## 2026-09-19 - US-022

- **Favorites audit:** `document.isFavorite` is a boolean on the *shared*
  document record → workspace-shared, not personal. Re-implemented additively as
  a per-user `documentFavorite` join object (unique `favoriteKey`
  `${userId}:${documentId}`, TEXT `userId`, `document` manyToOne CASCADE); the
  browser fetches only the current member's rows (`userId` filter) and toggles
  create/delete. `document.isFavorite` is deprecated (comment only), not
  removed/renamed.
- **Deep-tree trash legs:** `trash-retention.ts` now mirrors P4.3/P6
  (`isInTrash` type predicate, `isRestorable`, `buildArchivePayload`,
  `buildRestorePayload`); the purge was extracted to an injectable
  `purge-archived-documents-handler.ts` that cursor-paginates **all** archived
  pages before deleting (the old single `first: 500` could never purge >1 page).
- Files changed: new `objects/document-favorite.object.ts`, new
  `lib/document-favorites.ts` (+spec), `objects/document.object.ts`,
  `constants/universal-identifiers.ts`, `front-components/document-browser.front-component.tsx`,
  `lib/trash-retention.ts` (+spec), new
  `logic-functions/handlers/purge-archived-documents-handler.ts` (+spec),
  `logic-functions/purge-archived-documents.ts`, `README.md`,
  `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - An app front component can read the acting user via `useUserId()`, but not
    `userWorkspaceId`; scope personal rows by the user id in an app-owned object.
  - The relation create/filter key is the relation **field** name + `Id`
    (`parent` → `parentId`, `document` → `documentId`), regardless of the
    manifest `joinColumnName` (server
    `relation-field-metadata-gql-type.generator.ts`).
  - twenty-front `tsgo` was red on base due to a stale `twenty-sdk/dist` local
    `AppPath` enum; `npx nx build twenty-sdk --skip-nx-cache` clears it.
  - Tier 2 remains: two-session favorites proof, live purge-cron firing, and the
    live `documentFavorites` query/mutation round-trip.
---

## 2026-09-19 - US-023
- Appended the `Modèle — Journal` content template (French, sectioned daily
  journal) to `a2e-documents/src/lib/starter-templates.ts` — content-only, no
  entry-point code: `post-install` seeds it as a TEMPLATE and the existing
  gallery section + template-page first-open action instantiate it by reference.
- Updated `starter-templates.test.ts` (five-title list, install-delta
  expectation, 2 new specs proving `buildTemplateCopyPayload` strips the
  `Modèle — ` prefix and yields a `Journal` DOCUMENT copy), plus the two docs
  that enumerated "four starter templates" (`a2e-documents/README.md`,
  `docs/features.md`).
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/starter-templates.ts`,
  `.../src/lib/__tests__/starter-templates.test.ts`,
  `.../a2e-documents/README.md`, `docs/features.md`,
  `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - A shipped starter template is content-only: append to
    `STARTER_DOCUMENT_TEMPLATES`; `findMissingStarterTemplates` makes the seed
    idempotent by title and the P1.6e payload helpers/surfaces need no change.
  - App packages (`a2e-*`) carry no Lingui runtime, so template content stays
    French code-data matching the four shipped siblings; "localized-safe" here
    means static, locale-stable strings with no tokens/IDs/URLs/live records.
  - `buildTemplateCopyPayload` strips the shared `TEMPLATE_TITLE_PREFIX`
    (`Modèle — `), so re-instantiating a copy is prefix-idempotent.
  - Tier 2 remains: browser gallery/template-page instantiation of the journal.
---

## 2026-09-19 - US-024
- Implemented the P10 Cmd+K quick capture natively in twenty-front: a
  GLOBAL "Quick capture" command-menu action opens a new side-panel page with a
  text input + Note/Task/Income targets. Note and Task create core CRM records
  through `useCreateOneRecord` and navigate to the new record page; Income
  creates nothing — it presets `sidePanelSearchState` to 'saisie rapide' and
  returns to the command menu so P7.2's pinned "Bilan : saisie rapide" command
  stays the only income path (no second creation system).
- Files changed: `packages/twenty-shared/src/types/SidePanelPages.ts` (+
  `QuickCapture`); `packages/twenty-front/src/modules/quick-capture/**` (pure
  `utils/quickCapture.ts` + 13-test spec, `hooks/useQuickCapture.ts`,
  `hooks/useQuickCaptureCommand.ts`, `hooks/useOpenQuickCaptureSidePanel.ts`,
  `components/QuickCaptureCommand.tsx`, `components/QuickCaptureSidePanelPage.tsx`);
  `.../side-panel/constants/SidePanelPagesConfig.tsx`;
  `.../command-menu-item/display/components/SidePanelCommandMenuItemDisplayPage.tsx`;
  `docs/plan/phases/phase-10-report.md`.
- **Learnings:**
  - Core `note`/`task` are standard objects: `CoreObjectNameSingular.Note/Task`
    from `twenty-shared/types`, so quick capture needs no app.
  - The income leg can only be routed to a pinned app command from native code
    (app front components cannot open sibling front components and the host API
    cannot preset the command-menu search).
  - Adding an enum member to `SidePanelPages` requires rebuilding both
    twenty-shared and twenty-sdk (the sdk d.ts re-declares the enum); after that
    twenty-front tsgo is clean (0 errors).
  - A new side-panel page is just an enum member + `SIDE_PANEL_PAGES_CONFIG`
    entry; keyboard submit uses `useHotkeysOnFocusedElement` with
    `SIDE_PANEL_FOCUS_ID` plus the input's own Enter handler.
---

## 2026-09-19 - US-025
- Implemented the P9.1 assistant surface's first Tier-0/1 slice: the side-panel
  assistant (via the shared `AiChatEmptyState`, so full page too) now renders the
  native registry's per-app tools for the current context as read-only context
  buttons. No server code, no new registry/table/registration hook, no per-tool
  front registration.
- Files changed: new `packages/twenty-front/src/modules/ai/types/ContextToolButton.ts`;
  new `.../ai/utils/getContextToolButtons.ts` + `__tests__/getContextToolButtons.test.ts`;
  new `.../ai/hooks/useContextToolButtons.ts`;
  new `.../ai/components/context-tools/AiChatContextToolButtons.tsx`;
  modified `.../ai/components/AiChatEmptyState.tsx` + its spec;
  `docs/plan/phases/phase-01-report.md` (claim + report).
- **Learnings:**
  - `isNonEmptyString` is NOT exported by `twenty-shared/utils` (only
    `isDefined`, `isEmptyObject`, …) despite AGENTS.md naming it — use
    `isDefined(x) && x.length > 0`.
  - The registry's `getToolIndex` entries for logic functions carry no app id;
    the owning app is only recoverable in the front from the metadata-store
    `logicFunctionsSelector` by re-deriving the server tool name.
  - `ToolCategory.LOGIC_FUNCTION` = app read/proposal tools; `ACTION` /
    `DATABASE_CRUD` writes are the mutating categories, so excluding them is the
    fail-closed read-only policy for the buttons.
  - twenty-front tsgo is currently 0 errors on this HEAD (no AppPath baseline
    either), so a clean tsgo run is a meaningful signal here.
---
