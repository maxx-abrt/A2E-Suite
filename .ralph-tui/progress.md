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

