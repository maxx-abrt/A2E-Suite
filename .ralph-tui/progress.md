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
