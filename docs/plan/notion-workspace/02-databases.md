# 02 — Native database semantics

[Program overview](../../NOTION_WORKSPACE_PLAN.md) · [Execution guide](execution.md)

**Status:** planned; NW-00 and explicit scheduling required. This is a shared
engine project. Architecture/schema/query decisions belong to the orchestrator;
smaller models implement one accepted contract at a time.

## Source landmarks and boundaries

Start with [FieldMetadataType](../../../packages/twenty-shared/src/types/FieldMetadataType.ts),
[ViewType](../../../packages/twenty-shared/src/types/ViewType.ts), the
[embed host](../../../packages/twenty-front/src/modules/blocknote-editor/components/RecordViewEmbedHost.tsx)
and [codebase map](../01-codebase-map.md). B0 must locate the actual metadata
validators, query planners, record mutations, SDK definitions and adjacent tests;
their names and extension points are not assumed here.

Bilan-specific formulas/rollups and native aggregate APIs may supply patterns;
they do not establish a workspace-wide computed-field feature. Root-plan homes:
P1 native foundations, M8b, P4.2 and P7.1c. General formulas cannot write ledger
entries or replace money/tax logic.

## Accepted contract required before coding

Record stable field IDs independently of user-facing names; renames preserve
references. Decide where computed definitions live and whether values are
query-time or materialized. The design must cover server reads, selection,
filtering, sorting, aggregation, permissions and cache/index invalidation.

V1 formulas are deterministic and side-effect free: numeric arithmetic,
comparisons, `prop("Price") * prop("Qty")`, `if`, `round` and `formatDate`.
Specify number/currency/date/text/boolean/null typing, null versus zero, decimal
precision, divide-by-zero, locale/timezone inputs and stable error values. No
JavaScript evaluation, arbitrary functions, HTTP, file access or dynamic imports.
Defer volatile clocks, AI formulas and unbounded relation traversal.

If dependencies are unreadable, computed outputs must not reveal hidden values.
Choose and test a permission rule across every query surface; merely hiding an
input column is not sufficient. Bound expression size, nesting, execution work
and dependency depth; reject cycles before saving a definition.

## Task contracts

| ID | Depends on | Deliverable / single-session split | Acceptance and negative case |
| --- | --- | --- | --- |
| B0 — Computed-field design | — | Design only: native extension path, typed value/error semantics, permission rule, performance dataset/budget, migration/compatibility matrix; produce fixtures and first exact brief | Covers API/SDK/export/view lifecycle and populated upgrade; identifies all shared consumers; accepted architecture decision before touching an enum |
| B1 — Parser and references | B0 accepted | Pure parser/AST and stable-field reference resolver; separate from evaluation/UI | Arithmetic precedence, quoted property names, renamed/deleted fields, malformed input, size limits and cycle fixtures pass; never execute source as JavaScript |
| B2 — Typed evaluator | B1 | Pure deterministic evaluator for the agreed V1 functions | Hand-calculated numeric/date/rounding fixtures, lazy `if`, nulls, type errors and division errors; timezone/locale explicit; expression budget enforced |
| B3 — Definition persistence | B0 accepted, B1 | Metadata validation/storage, generated migrations or app-manifest changes as appropriate; SDK/codegen changes separately pinned | Fresh install and populated upgrade preserve ordinary fields; invalid/cyclic/unauthorized definitions rejected server-side; rollback or forward repair is specified |
| B4 — Server reads | B2, B3 | Add selected computed values to native reads and permission handling | Same result through native record read, table and export paths; direct API calls cannot forge computed writes or expose hidden dependencies; field renames do not change meaning |
| B5 — Invalidation and queries | B4 | Pin dependency invalidation first; filter/sort/aggregate support in separate briefs | Change source value or definition, then read/filter/sort without stale results; no per-row relation query explosion; unsupported operations rejected explicitly until implemented |
| B6 — Formula field UI | B4, B5 | Native field creation/configuration and error-aware read-only cells, then documentation/examples | Preview matches server result; localized validation; formulas persist/reload; source fields remain editable and computed cells reject manual edits; required examples `Price * Qty`, conditional, rounded score and formatted date pass |
| B7 — Rollup design | B0 accepted | Choose native relation path, allowed aggregates and permission semantics; define empty relation and exact numeric behavior | V1 one-hop relation with count/sum/min/max/average over compatible fields; define count of hidden records, null inputs, deleted relations and cycle interaction with formulas; no generic graph traversal |
| B8 — Rollup execution | B4, B5, B7 accepted | Server aggregate/definition validation, followed by invalidation in its own brief | Add/remove/update child and relation; parent total changes correctly after reload; no leakage through hidden children/counts; no N+1 plan on agreed dataset; populated-data rebuild is idempotent |
| B9 — Rollup UI | B8 | Native relation/field/aggregate picker and result cells | Invalid combinations unavailable and rejected by API; empty/missing relation explained; non-financial sample totals match hand calculation; existing Bilan postings unchanged |
| B10 — Gallery design | — | Native saved-view extension inventory and card contract before adding a view member | Define cover/title/preview fields, grouping/filter/sort, virtualization/paging, empty/loading/permission behavior, mobile and SDK compatibility; files use protected native URLs |
| B11 — Gallery rendering | B10 accepted | Native read renderer and saved configuration, split into shared/server contracts then front renderer as needed | Saved view loads/reloads, pages through real records, respects permissions and handles missing covers; switching Gallery↔table keeps the same records and intended filters |
| B12 — Gallery actions | B11 | Reuse native create/edit/open actions and embedded-view support | New/edit inside a page reflects in table/Gallery without clones; denied actions absent and API-denied; keyboard/narrow-screen and record opening work |
| B13 — Timeline | D3 accepted | First decide generic native Timeline scope versus project Gantt; then pin read layout, saved settings and optional drag separately | Explicit start/end fields, milestones and empty dates; never use `createdAt` as planned start; native filters/permissions; drag requires D4 and never changes hierarchy to imply dependencies |
| B14 — Map | B10 accepted | Feasibility only first: native address/coordinate contract, provider/licensing/cost/network policy and accessibility fallback | No implicit geocoding or external disclosure; unreadable locations hidden; no-coordinate records stay accessible in a list; only schedule renderer/marker actions after a concrete provider decision |

## Review checkpoints

1. **Before B1/B3:** orchestrator accepts B0 and concrete migration/query policy.
2. **Before B6:** uncached server/shared/front checks and integration fixtures
   demonstrate server-derived values; unsupported operations have explicit errors.
3. **Before R2 release:** B0–B12 evidence, an installed populated upgrade,
   restricted role/second workspace, two-edit invalidation and a neighboring CRM
   list/filter/edit journey. Treat any incomplete formula/query semantics as
   partial and keep the feature unavailable beyond its supported scope.

Build `twenty-shared --skip-nx-cache` after shared edits before judging dependent
failures. Generated migration/upgrade paths use the current repository version,
not a historical version copied into this plan. Pick exact unit/integration
targets in each brief and leave live install/browser checks to the orchestrator.
