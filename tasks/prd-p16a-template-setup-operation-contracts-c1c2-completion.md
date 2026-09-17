# PRD: P1.6a — Template & setup-operation contracts (C1/C2) completion

## Overview
PLAN.md task **P1.6a** specifies contracts C1 (templates are reusable configuration) and C2 (one unified setup operation) using actual SDK manifests, workflow definitions and the existing template service. A substantial spec already exists at `docs/plan/05-template-contracts.md` (202 lines, source-verified 2026-09-13) and `packages/twenty-server/src/engine/core-modules/onboarding/types/apply-template-operation.types.ts` mirrors its §4–§6. This PRD covers the **remaining unmet work**: re-verification against 4 days of source drift (accounting manifest 0.1.0→0.1.1 fixes, post-install seed-hook failure, C3 preflight changes), explicit closure of the "cycles" and provenance requirements from the P1.6a bullet, and executable fixtures that make the contract machine-verifiable. No implementation of P1.6b/c.

## Goals
- Every claim in `docs/plan/05-template-contracts.md` §1–§6 re-verified against current source, with dated corrections where drift is found
- The P1.6a bullet "reject unknown IDs, **cycles**, unavailable requirements and cross-workspace content" fully addressed (cycles are currently absent from §7's rejection matrix)
- Provenance shape for template-instantiated content decided in the contract, not left to P1.6b/d/e to invent
- §7 fixtures become checked-in, type-conformant data validated by unit tests, so doc examples cannot silently drift from `apply-template-operation.types.ts` or the actual preset definitions
- P1.6b executors can start from §4 without re-deriving any contract

## Quality Gates

These commands must pass for every user story (run only for packages actually touched):
- `npx nx lint:diff-with-main twenty-server` — diff-based lint
- `npx tsgo -p tsconfig.json --noEmit` (run inside `packages/twenty-server`) — typecheck
- `npx jest <touched-spec> --config=packages/twenty-server/jest.config.mjs` — targeted tests for any spec a story adds or edits

If `twenty-shared` is ever touched: `npx nx build twenty-shared --skip-nx-cache` first.

No browser verification in any story (Tier 2 checks are never the executor's). Integration suites are NOT required for these stories.

## User Stories

### US-001: Re-verify contract spec against current source (drift audit)
As an executor implementing P1.6b, I want every symbol and version claim in `docs/plan/05-template-contracts.md` re-verified against current source so that the contract I build on is not stale.

**Acceptance Criteria:**
- [ ] Every file link in the doc resolves; every named symbol (`WorkspaceTemplate`, `WORKSPACE_TEMPLATE_DEFINITIONS`, `TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS`, `ApplicationVersionValidationService` methods, `ApplicationRegistrationService`, `ApplyTemplateRequest`/`ApplyTemplateStep`/`ApplyTemplateResult`/`TemplatePreview`) exists and its shape matches the doc
- [ ] `apply-template-operation.types.ts` conforms to §4–§6; any divergence is either corrected in the types (additive, with a `//` why-comment referencing the doc section) or recorded as a dated doc correction
- [ ] §3/§7 version claims match the actual app packages (`a2e-documents`, `a2e-projects`, `a2e-accounting` `application.config.ts` / package versions) — including the post-09-13 accounting manifest fixes
- [ ] §2 ownership inventory still holds against `workspace-template.service.ts` current behavior (including the known seed-hook failure recorded 2026-09-16 in `docs/plan/phases/phase-01-report.md` — the doc must state this as a known P1.6b obligation, not claim seeding works)
- [ ] Drift corrections carry a dated note (`2026-09-17: …`) appended in place, preserving prior text per repo handoff convention
- [ ] A dated entry is appended to `docs/plan/phases/phase-01-report.md` (what was checked, what drifted, files touched); PLAN.md is not edited; nothing is committed

### US-002: Close contract gaps — cycle rejection and provenance shape
As an executor implementing P1.6e content templates, I want the contract to state normative cycle-rejection rules and the exact provenance shape on instantiated content so that later slices do not invent conflicting rules.

**Acceptance Criteria:**
- [ ] Rejection matrix (§7) gains a row covering cycles: workspace presets are flat app lists (no dependency graph — state this explicitly); content-template descriptors (P1.6e) **must** reject relation/reference cycles at load time, with the same "reject at load time" severity as cross-workspace content
- [ ] A provenance subsection specifies the exact shape carried by template-instantiated content (at minimum: source template key + version + instantiating operationId), consistent with §5's `createdRecordUniversalIdentifiers` sample provenance; the decision references C1's "fresh content IDs with source-template/version provenance"
- [ ] `apply-template-operation.types.ts` is extended additively only if the provenance shape needs a server-side type now; otherwise the subsection records the type lands with P1.6d/e
- [ ] The "Deliberate gaps" section (§8) is updated so nothing in this story is silently deferred — every P1.6a-bullet requirement (version, compatibility, inputs, provenance, preview fixtures; unknown IDs, cycles, unavailable requirements, cross-workspace content) is either specified or has an explicit gap entry
- [ ] A dated entry is appended to `docs/plan/phases/phase-01-report.md`; PLAN.md is not edited; nothing is committed

### US-003: Executable fixtures with conformance tests
As an executor implementing P1.6b, I want the §7 fixtures checked in as typed data with unit tests so the contract examples are machine-verified and cannot drift.

**Acceptance Criteria:**
- [ ] Fixture module created under `packages/twenty-server/src/engine/core-modules/onboarding/__tests__/fixtures/` typed against `apply-template-operation.types.ts` (named exports, no `any`)
- [ ] Fixtures cover: the §7 preview example, the §7 result example, and one fixture per rejection-matrix row (including the US-002 cycles row and cross-workspace content)
- [ ] A unit spec asserts: every fixture conforms to its contract type; the `individual` preview fixture's app universal identifiers match `onboarding-installable-app-universal-identifiers.ts` / `workspace-template-definitions.constant.ts`; its navigation-change UUIDs match the definition's managed identifiers
- [ ] The doc's §7 JSON blocks are updated to match the checked-in fixtures exactly (or annotated as generated from them), so markdown and code cannot diverge
- [ ] Targeted jest run passes (`npx jest <spec> --config=packages/twenty-server/jest.config.mjs`); lint and tsgo gates clean
- [ ] A dated entry is appended to `docs/plan/phases/phase-01-report.md`; PLAN.md is not edited; nothing is committed

## Functional Requirements
- FR-1: The contract spec remains a documentation + typed-fixture deliverable; no service, resolver, DTO or schema behavior may change in any story
- FR-2: All corrections to `docs/plan/05-template-contracts.md` are additive and dated; prior text is corrected in place or annotated, never silently rewritten
- FR-3: Rejection rules must be expressed as normative **must** statements with typed error codes consistent with `OperationStepErrorCode` (extending it additively if cycles need a code)
- FR-4: Fixtures must use only universal identifiers and default values — never record IDs, user IDs, share URLs, tokens or live finance rows (C1 §3 construction rule)
- FR-5: Every story ends with a dated executor entry in `docs/plan/phases/phase-01-report.md`; executors never tick PLAN.md and never commit (orchestrator only)
- FR-6: If verification reveals a claim that cannot be confirmed from source alone, the doc records it as UNVERIFIED with the reason — a claim is never left implicitly stale

## Non-Goals
- No P1.6b backend implementation (no resumable operation service, no idempotency-key persistence, no per-step capture in `workspace-template.service.ts`)
- No content-template descriptor schema (P1.6e) — only the cycle/provenance rules it must obey
- No UI work, no GraphQL schema regeneration, no database migrations, no i18n catalog changes
- No reference-app code from `Inspiration apps (bureaubilan)`; feature ideas only
- No PLAN.md edits, no commits, no browser/Playwright runs by the executor
- No app→app dependency field in SDK manifests (§8 keeps ordering preset-flat)

## Technical Considerations
- Primary files: `docs/plan/05-template-contracts.md`, `packages/twenty-server/src/engine/core-modules/onboarding/types/apply-template-operation.types.ts`, `.../onboarding/constants/workspace-template-definitions.constant.ts`, `.../onboarding/constants/onboarding-installable-app-universal-identifiers.ts`, `.../onboarding/workspace-template.service.ts`, `.../onboarding/dtos/apply-workspace-template.input.ts`
- Cross-checks: `packages/twenty-apps/internal/*/src/application.config.ts` (app versions/universal identifiers), `docs/plan/04-twenty-native-law.md` §5 wiring checklist, `docs/plan/phases/phase-01-report.md` (2026-09-14/16 orchestrator entries for seed-hook failure and C3 preflight)
- House rules apply: short `//` comments (why only), named exports, types over interfaces, no `any`, `twenty-shared/utils` guards where applicable
- Known live-behavior facts to reflect, not paper over: a2e-accounting installs clean as of the 2026-09-16 manifest fix; post-install sample seeding currently writes 0 rows (hook failure) — the contract's `seed-samples` step must be specified as the target behavior while marking current behavior broken in the doc

## Success Metrics
- Zero unresolved symbol/version claims in `docs/plan/05-template-contracts.md` (every claim verified or explicitly UNVERIFIED with reason)
- P1.6a acceptance bullet fully traceable in the doc: version, compatibility, inputs, provenance, preview fixtures, and all four rejection categories (unknown IDs, cycles, unavailable requirements, cross-workspace content)
- Fixture conformance suite green; P1.6b can be planned purely from §4–§7

## Open Questions
- Should the provenance shape land as a server-side type now (US-002) or wait for P1.6d's descriptor work? Default: type now only if it has a consumer in the existing types file; otherwise document-only
- Fixture location: `__tests__/fixtures/` is proposed; if the onboarding module has an existing fixtures convention, follow that instead