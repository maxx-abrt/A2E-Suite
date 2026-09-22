# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **App-scoped GraphQL schema generation** (`WorkspaceGraphqlSchemaSDLService.getOrComputeSchemaSDL` with an `applicationId`) filters flat object/field maps to `[standard app, requested app]`. A cross-app relation field (a pinned field targeting another app's object) leaves the field but drops the target → `object-metadata-with-relations-gql-object-type.generator.ts:117` throws. Fix pattern: augment the scoped maps with the missing relation targets from the full maps (`augmentFlatEntityMapsWithRelationTargets`) rather than weakening the guard. The un-scoped workspace schema (no `applicationId`) is unaffected.
- **`ObjectMetadataWithRelationsGqlObjectTypeGenerator.buildAndStore` stores fields as a lazy thunk** — the line-117 guard only fires when the type's fields are materialized (`getFields()`/schema construction), not at `buildAndStore` call time. Tests must call `getFields()` to exercise it.

---

## [2026-09-22] - US-074
- Fixed the a2e-projects install-time schema-build failure: the application-scoped SDL filter dropped the cross-app relation target (`project.documents` → A2E Documents' `document`), making the line-117 guard fire on a valid field. Added `augmentFlatEntityMapsWithRelationTargets` (pulls missing relation targets + their fields transitively from the full maps) and wired it into `getOrComputeSchemaSDL`'s `applicationId` branch only.
- Files changed: `packages/twenty-server/src/engine/api/graphql/workspace-graphql-schema-sdl/workspace-graphql-schema-sdl.service.ts`; NEW `.../workspace-graphql-schema-sdl/utils/augment-flat-entity-maps-with-relation-targets.util.ts` + its spec; NEW `.../workspace-graphql-schema-sdl/__tests__/workspace-graphql-schema-sdl.service.spec.ts`; phase-04 report.
- **Learnings:**
  - The phase-report hypothesis (install-time ordering / ephemeral field before persist) was wrong; the target was persisted but filtered out by application scope.
  - `FlatEntityMaps` lookups go through `universalIdentifierById[id]` → `byUniversalIdentifier[uid]`; use `addFlatEntityToFlatEntityMapsOrThrow` to keep both indexes in sync when augmenting.
  - Tier-2 residual: orchestrator must re-run the live a2e-projects install (ticks M1a install leg) and then P4.1's concurrency proof.
---

## [2026-09-22] - US-075
- Fixed the CRM nav-restore defect: `runRemainingSteps` unconditionally marked the navigation-visibility step `skipped` when a template's `hiddenStandardNavigationMenuItemUniversalIdentifiers` was empty, so a CRM apply (hide-list `[]`) never restored the CRM nav rows a STUDENT/INDIVIDUAL apply had hard-deleted. Removed the hide-list gate; the step now always calls `applyTemplateNavigationVisibility`, which is driven by current row state (restore TEMPLATE_MANAGED rows missing from the workspace) and keeps its no-op early return when there is nothing to delete or restore.
- Files changed: `packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts` (skip block removed, WHY comment added); `packages/twenty-server/src/engine/core-modules/onboarding/__tests__/workspace-template.service.spec.ts` (+3 tests: restore, idempotent re-run, preview/apply agreement; + updated the CRM no-op test setup to a complete workspace); phase-01 report.
- **Learnings:**
  - Two earlier US-075 iterations bailed `CONFLICT` over their own uncommitted edits (no `CLAIMED` line). When resuming a stalled same-task slice on a single-writer checkout, trust the filesystem over the missing claim: one iteration's "spec edit" had actually reverted the whole spec to an older revision and deleted 5 unrelated tests — always diff against HEAD before building on partial work.
  - The nav step's restore set is `TEMPLATE_MANAGED - definition.hideList - existingRows`, computed from row presence alone, so it cannot tell a template-hidden row from a user-hidden one. Fixing the skip therefore also re-creates user-deleted managed rows on any template whose hide-list omits them — flagged as a separate C2 slice ("restore only what it hid").
  - Preview/apply consistency is testable without a DB: mock `getOrRecompute` per requested cache key (`flatNavigationMenuItemMaps` for the row state, `flatViewMaps` for the restore builder), then compare the migration's create/delete UIDs to `preview.navigationChanges`.
  - Tier-2 residual: orchestrator runs the live STUDENT-apply → CRM-apply probe plus the deferred P1.3/P1.6c/E03 browser legs.
---

