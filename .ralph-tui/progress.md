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

---


## 2026-09-17 - P1.6b-concurrency-proof
- Added a real-DB integration spec proving the CacheLock serializes concurrent same-key apply-operations: exactly one `installApplication` call, identical results, one persisted `template-operation:<key>` row, and per-step failure/retry semantics (failed step re-runs, succeeded steps returned as-is, fully-succeeded retry re-runs nothing).
- Files changed: `packages/twenty-server/test/integration/graphql/suites/onboarding/concurrent-same-key-retry.integration-spec.ts` (new); `docs/plan/phases/phase-01-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - The unit spec mocks `CacheLockService.withLock` through; this is the only coverage exercising the real Redis lock + real KeyValuePair persistence.
  - `ApplicationInstallService` cannot be statically imported from an integration spec (see Codebase Patterns); resolve it from the container.
  - LOCAL-source registrations let the install step succeed without a published tarball.
---
