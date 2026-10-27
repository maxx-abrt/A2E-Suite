# Bureau and connected workspace — delivery plan

[Documentation home](README.md) · [Root delivery plan](../PLAN.md) ·
[Execution contract](../PROMPT.md)

**Prepared:** 2026-10-27 · **Source baseline:** `3e9cf316` plus the current
working tree · **Status:** proposed, no implementation or release claim.

Turn the supplied Notion-gap and student-workflow ideas into incremental,
native A2E capabilities. Prioritize reliable daily work, useful database
semantics and a complete student workflow. Preserve CRM, the five-app product
identity and existing data. Do not pursue feature-count parity as a release gate.

## How this plan fits

This is an additional planning package, not a replacement execution order.
[PLAN.md](../PLAN.md) remains authoritative for release acceptance and existing
milestones; [PROMPT.md](../PROMPT.md) remains the executor/orchestrator contract.
Existing work is extended under its original milestone, with this plan supplying
smaller slices. New scope needs an orchestrator scheduling decision before code.

The user request for this session is **planning only**. No feature has been
implemented, no pending executor brief has been installed, and no root-plan
checkbox has changed. In particular, the active Notion-import work is independent
and must be preserved.

## Read only what the task needs

| Document | Use it for |
| --- | --- |
| [01 — Foundations and authoring](plan/notion-workspace/01-foundations.md) | BYOK, backlinks, inline views, templates, daily notes, search, math and diagrams |
| [02 — Database semantics](plan/notion-workspace/02-databases.md) | Formulas, relation rollups, Gallery, Timeline and Map |
| [03 — Trust and collaboration](plan/notion-workspace/03-trust.md) | Permissions, guest access, concurrent edits, offline, block references and comments |
| [04 — Connected work](plan/notion-workspace/04-connected-work.md) | Time planning, recurrence, Gantt, cross-app links, meeting and receipt flows, Syna |
| [05 — Student workflow and ecosystem](plan/notion-workspace/05-student.md) | Courses, assignments, flashcards, citations, PDF/audio/pencil, printing and marketplace |
| [Execution guide and copyable prompts](plan/notion-workspace/execution.md) | Small-model briefs, decision gates, exact check selection and audit handoff |
| [Program report](plan/phases/notion-workspace-report.md) | Actual work, evidence, blockers and next slices; append only |

## Source observations and corrections

These are **Observed**, not runtime-verified. The pasted feature list is input,
not proof of the current implementation or of another product's capabilities.
Recheck the selected feature before implementation.

| Area | Observed source | Planning consequence |
| --- | --- | --- |
| Field types | [FieldMetadataType](../packages/twenty-shared/src/types/FieldMetadataType.ts) has no formula or general rollup member | Inspect the full metadata/query lifecycle before choosing a representation; adding an enum is not a formula implementation |
| Views | [Shared ViewType](../packages/twenty-shared/src/types/ViewType.ts) includes table/kanban/calendar/list and widget variants; no Gallery/Timeline/Map member | Extend the native engine, including saved views and SDK paths; do not create a second database |
| Embedded views | [RecordViewEmbedHost](../packages/twenty-front/src/modules/blocknote-editor/components/RecordViewEmbedHost.tsx) passes permission-derived `isUIEditable` to the native widget | Audit inline create, filter/sort isolation and persistence; do not rebuild cell editing on the assumption that embeds are read-only |
| Editor | [Schema](../packages/twenty-front/src/modules/blocknote-editor/blocks/Schema.ts) includes columns, native defaults, page links and record views | Audit each missing behavior separately; columns and ordinary tables are not new features |
| Search | [BureauSearchModal](../packages/twenty-front/src/modules/bureau/components/BureauSearchModal.tsx) uses title/body `ilike` with a 50-result bound; [SearchService](../packages/twenty-server/src/engine/core-modules/search/services/search.service.ts) already has permission-aware repository/query paths | Reuse the native search pipeline and verify rich-text indexing; avoid an independent search backend |
| Mentions | [Indexer](../packages/twenty-apps/internal/a2e-documents/src/logic-functions/index-document-mentions.ts) and [helpers](../packages/twenty-apps/internal/a2e-documents/src/lib/document-mentions.ts) index document-to-record mentions, deduplicated per target | Mount/reuse the reader first; block references require new identity and lifecycle decisions |
| AI model discovery | [Availability hook](../packages/twenty-front/src/modules/ai/hooks/useWorkspaceAiModelAvailability.ts) has a workspace provider flag, but [picker](../packages/twenty-front/src/modules/ai/hooks/useAiModelOptions.ts) still uses the shared model list; [client config](../packages/twenty-server/src/engine/core-modules/client-config/services/client-config.service.ts) uses admin registry methods | Reproduce the BYOK-only picker path before fixing it; provider availability and selectable models are separate contracts |
| Saving and sharing | [Revision helper](../packages/twenty-apps/internal/a2e-documents/src/lib/document-revision-cas.ts) explicitly describes post-commit repair; [share service](../packages/twenty-server/src/engine/core-modules/document-share/document-share.service.ts) stores plaintext or encrypted snapshots | Presence/repair does not prove atomic concurrency; snapshot links do not establish live guest ACLs |
| Comments | [Persistence hook](../packages/twenty-front/src/modules/blocknote-editor/comments/hooks/useDocumentCommentThreadPersistence.ts) reads/writes stored threads and resolution state | Inspect supported thread/reaction behavior before adding storage |
| Gantt and recurrence | [Gantt helper](../packages/twenty-apps/internal/a2e-projects/src/lib/project-gantt.ts) uses created/due dates and parent edges; [recurrence generator](../packages/twenty-apps/internal/a2e-projects/src/lib/recurring-task-generator.ts) has stable occurrence keys | Created-at is not a planned start and hierarchy is not dependency scheduling; preserve existing identities when adding edit scopes |
| Linking | [Related-link endpoints](../packages/twenty-apps/internal/a2e-links/src/lib/related-links-targets.ts) currently declare document/task legs | Finance, files, projects and events require explicit endpoint expansion and lifecycle tests |
| Templates and recipes | [Document descriptors](../packages/twenty-apps/internal/a2e-documents/src/lib/document-template-descriptors.ts) have bilingual labels; [meeting recipe](../packages/twenty-apps/internal/a2e-projects/src/lib/meeting-notes-recipe.ts) already plans notes creation | Translate template bodies without duplicating the gallery; extend the existing meeting recipe |

Historical feasibility reports and root-plan checkmarks can be stale. For example,
the [advanced-authoring review](plan/p3.4-advanced-authoring-feasibility.md) predates
the current columns/view integration. Retain its decision context, then inspect
current code and installed dependencies before adopting a conclusion.

## Priorities and release boundaries

Every workstream starts with NW-00. Within a workstream, follow the explicit task
dependencies; an earlier row alone is not proof that a task is ready.

| Batch | Outcome | Required slices | Acceptance boundary |
| --- | --- | --- | --- |
| R0 — Reconcile | Evidence and a safe first brief | NW-00 | Orchestrator accepts source audit, ownership, gates and one pinned slice |
| R1 — Everyday Bureau | Find, reference, edit and start today's work | A1–A8 | Actual BYOK-only/zero-AI paths, backlinks, embedded creation, bilingual content and daily note survive reload and permission tests |
| R2 — Useful databases | Calculated records and visual collections | B0–B12 | Formula/rollup correctness and lifecycle, native Gallery, populated upgrade and CRM regression |
| R3 — Study loop | Course → notes → assignment → review → print | A9–A10, E1–E6 | Complete bilingual non-AI student journey; formulas and Gallery used where required |
| R4 — Connected work | Plan tasks, meetings and linked evidence | D1–D8, D10 | No duplicate tasks/events/links/postings; reviewed changes and failure recovery |
| R5 — Shared knowledge | Safer edits, explicit access, comments and offline work | C0–C10, C14 | Accepted permission/concurrency designs; two-user/two-workspace and logout/revocation evidence |
| Later, gated | New platform capabilities and public distribution | A11–A13, B13–B14, C11–C13, D9, E7–E13 | Each capability passes its own feasibility/product gate before implementation |

These are reviewable delivery batches, not calendar estimates or automatic
release promises. R4 can precede R3 when its dependencies and product priority
justify it. R5 is required before marketing live collaboration/guest/offline
capabilities; it does not block unrelated local authoring improvements. Search
permission fixes discovered in A6 are immediate correctness work, not postponed
to R5.

## Architecture decisions to preserve

- One native object, view, permission, workflow, storage and template system.
  Bureau remains a product bundle; `a2e-documents`, `a2e-projects` and chat keep
  package identities and universal IDs. Bundle UX does not imply a package merge.
- Computed fields must work through server reads and applicable queries, not
  only a front-end cell renderer. Money uses existing numeric/currency semantics.
  General formulas never become Bilan's accounting authority.
- Document content, comments, saved views and referenced records keep distinct
  permissions. A readable page cannot grant access to an embedded object,
  attachment, synced source, hidden formula input or linked target.
- Concurrent editing, synced blocks and offline writes share save semantics.
  Pick one compatible protocol; do not build three independent persistence paths.
- Syna remains optional. Every AI write gets a concrete preview and confirmation;
  recheck permissions when applying it. Ordinary study/planning flows work with
  no provider, and API keys never reach the client.
- Imports preserve originals and explain unsupported features. This plan does
  not promise reconstruction of Notion formulas/relations/views from exports that
  omit those semantics. Coordinate with [import compatibility](notion-import.md).
- Existing root-plan unresolved decisions, including D07, stay in force. A new
  dependency, external provider, guest identity or migration strategy must be
  resolved in a bounded design slice before a smaller model implements it.

## NW-00 — First task: reconcile and prepare one brief

**Deliverable:** append a source audit to the [program report](plan/phases/notion-workspace-report.md)
and draft one brief using the [execution guide](plan/notion-workspace/execution.md).
This is the only initially eligible task; it does not authorize a feature sweep.

1. Read `AGENTS.md`, `PROMPT.md`, this overview and A1's row/source landmarks.
   Inspect the working tree and current pending brief before selecting work.
2. Confirm A1's picker/config reproduction, find the nearest tests and inspect
   the real authenticated API/registry contract. Record what already works.
3. Map A1 to M10a/M10d and its existing phase report. Check for overlapping work
   or an accepted fix since this baseline; verify rather than reimplement it.
4. Draft the smallest next slice: reproduction test only, server discovery only,
   or picker wiring only, as evidence warrants. Name exact files, test command,
   expected result, check tier and remaining live acceptance. Do not leave
   placeholders in the executable brief.
5. Record decisions/blockers and stop. The orchestrator selects/accepts that
   brief, or explicitly schedules another dependency-ready slice.

**Done when:** source paths and reproduction are concrete, duplicate work is
excluded, one brief fits one session, and an orchestrator can review it without
reading the entire repository. NW-00 is not a claim that A1 or R0 has passed.

## Completion evidence

Use [the existing verification tiers](verification.md). Executors run focused
tests, touched-package lint and uncached typechecks; schema/metadata slices also
need their prescribed generation and integration checks. They report missing
Tier-2 evidence rather than launching a full stack. Orchestrators batch the live,
upgrade/lifecycle and regression journeys and accept only the slices supported
by actual evidence.

For each release batch, retain the tested revision, commands/results, environment,
workspace/app versions, failures and recovery evidence in the report. Include
normal and restricted members, two workspaces, fresh install and populated
upgrade where relevant, keyboard/narrow-screen/light-dark behavior, and one
neighboring CRM journey for shared-engine changes. Record benchmark dataset,
p50/p95 and query counts for search/computation/view changes; the design slice
sets a numerical budget before implementation, not after a slow result.

Implementation status is recorded in each workstream's progress notes; A5's
student-family slice has Tier-0 evidence and awaits installed-app acceptance.
Other implementation tasks remain **planned**. A report saying
`done-for-review` is not release acceptance. Only the orchestrator updates
completion and reconciles the corresponding root-plan item.
