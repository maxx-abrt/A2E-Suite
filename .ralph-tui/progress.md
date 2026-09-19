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
