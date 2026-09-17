# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Contract fixtures as a drift guard:** put literal typed examples under `src/**/__tests__/fixtures/<name>.fixtures.ts` using explicit contract-type annotations (`: TemplatePreview`, `: ApplyTemplateResult`) and a `*.spec.ts` that (a) re-checks enum/status values at runtime, (b) asserts the fixtures equal the source-of-truth constants (`WORKSPACE_TEMPLATE_DEFINITIONS`, managed-nav list). The doc mirrors the fixture and says so. `satisfies` keeps literal types but hides optional props (`step.errorCode`) from tests — prefer explicit annotations when the spec reads optional fields.

---

## 2026-09-17 - US-001
- Drift-audited `docs/plan/05-template-contracts.md` against source at `91cb20a9`; appended a header audit note and 4 dated in-place corrections (preserving prior text).
- Corrections: §3 lists only 2 of 3 app packages (a2e-projects 0.1.1 missing); §4 shows positive `selectedAppUniversalIdentifiers` but source implements negative `deselectedOptionalAppUniversalIdentifiers`; §2/§5/§8 claim the `seed-samples` step is a spec-only future seeder, while source now delegates to app post-install hooks that run async and seed 0 rows live (documented as a P1.6b obligation).
- Files changed: `docs/plan/05-template-contracts.md`, `docs/plan/phases/phase-01-report.md` (+ this file).
- **Learnings:**
  - The `a2e-accounting 0.1.1` seen in phase-report logs is a **reverted scratch version** (report line 628) — the on-disk/real version is 0.1.0. Do not trust report prose for version claims; read `package.json`.
  - `seed-samples` reports `succeeded` purely from the presence of `postInstallLogicFunction` in the registration manifest (`resolveSampleSeedingStep`), so it over-reports: the hook is `shouldRunSynchronously: false` and fails silently live. Treat the step status as unverified until a Tier-2 reinstall proves rows land.
  - No app→app dependency field exists in the SDK manifest (`ApplicationConfig` / `ApplicationManifest`) — §3/§8's "flat ordering" claim holds; app relations are only inferred at uninstall time.
  - `docs/scripts/check-docs.mjs` is the cheap gate for doc edits (links + fences); run it before and after.
---

## 2026-09-17 - US-002
- Closed the P1.6a cycle-rejection + provenance contract gaps in `docs/plan/05-template-contracts.md`.
- §7 rejection matrix is now normative (each row a **must**) with the typed code it produces, plus two new rows: workspace presets are flat app lists (no dependency graph → no preset cycles), and P1.6e content-template descriptors must reject relation/reference cycles at load time (same severity as cross-workspace content).
- New §5.1 fixes the exact provenance shape on instantiated content: `sourceTemplateKey` + `sourceTemplateVersion` + `operationId`, tied to §5's `createdRecordUniversalIdentifiers` and C1.
- §8 rewritten as a P1.6a requirement traceability table (version, compatibility, inputs, provenance, preview fixtures, unknown IDs, cycles, unavailable requirements, cross-workspace content) + genuine gaps.
- Files changed: `docs/plan/05-template-contracts.md`, `docs/plan/phases/phase-01-report.md` (+ this file).
- **Learnings:**
  - Two distinct typed rejection surfaces already exist: `OnboardingExceptionCode` (`TEMPLATE_*`) for pre-step/load-time rejections and `OperationStepErrorCode` for step failures. A load-time descriptor rejection (cycles, cross-workspace content) must NOT be added to `OperationStepErrorCode` — that union is for operation steps.
  - `TEMPLATE_UNKNOWN` and `TEMPLATE_BLOCKED` are defined in `onboarding.exception.ts` but not thrown yet; they are reserved typed codes, not live behavior.
  - Default for this PRD is document-only: do not add a type without a consumer in the existing types file (`TemplateContentProvenance` stays a doc TS block until P1.6b/e reads it back).
  - `docs/scripts/check-docs.mjs` is the cheap gate for doc edits; code lint/tsgo gates are N/A when zero package files change (git status proves it).
---

## 2026-09-17 - US-003
- Checked in typed §7 contract fixtures + a conformance spec so the doc examples are machine-verified and cannot drift.
- `onboarding/__tests__/fixtures/apply-template-operation.fixtures.ts`: `individualTemplatePreview: TemplatePreview`, `individualTemplateApplyResult: ApplyTemplateResult`, and `templateRejectionFixtures: TemplateRejectionFixture[]` — one fixture for each of the 9 §7 rejection-matrix rows (incl. the US-002 cycles + cross-workspace rows, modelled symbolically with no record IDs).
- `onboarding/__tests__/apply-template-operation-fixtures.spec.ts` (7 cases): runtime shape/enum conformance, row coverage, individual-preview == `WORKSPACE_TEMPLATE_DEFINITIONS[INDIVIDUAL]` (apps + managed nav), known-app-identifier check across the onboarding + template constants, content codes stay outside the step/onboarding enums, and an FR-4 guard (no `recordId`/`userId`/`workspaceId`/`shareUrl`/`token` keys, no `http(s)://` values).
- `docs/plan/05-template-contracts.md` §7 now annotates the JSON blocks as mirroring the fixtures (module = source of truth); §8 "preview fixtures" row marked **landed**.
- Files changed: new fixture module + spec, `docs/plan/05-template-contracts.md`, `docs/plan/phases/phase-01-report.md` (+ this file).
- **Learnings:**
  - `ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS` is the 3 generic marketplace apps (call-recorder, people-data-labs, last-contact) and does NOT contain the template apps (`19126a9c…` a2e-documents, `b11a0000…` a2e-accounting). Template app identifiers live only in `WORKSPACE_TEMPLATE_DEFINITIONS`; assert against that file for previews and use the onboarding list only as an additional known-set membership check.
  - `satisfies TemplatePreview` narrows the exported literal and makes optional fields (`ApplyTemplateStep.errorCode`) inaccessible in the spec → annotate the export with the contract type instead.
  - `npx nx lint:diff-with-main twenty-server` diffs `main...HEAD`, so it silently covers nothing before commit; run `npx oxlint --type-aware -c .oxlintrc.json <files>` + `npx oxfmt --check <files>` directly in `packages/twenty-server` to actually lint new files.
  - Fixture values that are UUIDs are fine (universal identifiers / operationId); FR-4 forbids *record* IDs, user IDs, share URLs, tokens and live finance rows — the cross-workspace descriptor row is expressed as `referenceKind: 'workspace-record'` with no embedded ID.
---
