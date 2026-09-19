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
