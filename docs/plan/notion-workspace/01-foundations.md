# 01 — Everyday Bureau and authoring

[Program overview](../../NOTION_WORKSPACE_PLAN.md) · [Execution guide](execution.md)

**Status:** planned. NW-00 and orchestrator scheduling are prerequisites for
every row. Each row is an outcome to split into a single-session brief if it
crosses layers; it is never permission to complete the entire workstream.

## Source landmarks

- AI: [workspace availability](../../../packages/twenty-front/src/modules/ai/hooks/useWorkspaceAiModelAvailability.ts),
  [model picker](../../../packages/twenty-front/src/modules/ai/hooks/useAiModelOptions.ts),
  [client config](../../../packages/twenty-server/src/engine/core-modules/client-config/services/client-config.service.ts).
- Backlinks: [mention helpers](../../../packages/twenty-apps/internal/a2e-documents/src/lib/document-mentions.ts)
  and [index event](../../../packages/twenty-apps/internal/a2e-documents/src/logic-functions/index-document-mentions.ts).
- Editor: [schema](../../../packages/twenty-front/src/modules/blocknote-editor/blocks/Schema.ts),
  [record-view block](../../../packages/twenty-front/src/modules/blocknote-editor/blocks/RecordViewBlock.tsx),
  [embed host](../../../packages/twenty-front/src/modules/blocknote-editor/components/RecordViewEmbedHost.tsx).
- Search: [Bureau modal](../../../packages/twenty-front/src/modules/bureau/components/BureauSearchModal.tsx)
  and [native service](../../../packages/twenty-server/src/engine/core-modules/search/services/search.service.ts).
- Content: [document template descriptors](../../../packages/twenty-apps/internal/a2e-documents/src/lib/document-template-descriptors.ts)
  and [Bureau behavior](../../BUREAU_PLAN.md). Existing mappings: M8, M9, M10,
  M11, P2.5 and P3.4; use their original acceptance/report homes too.

## Task contracts

Dependencies below are in addition to NW-00. “Design” tasks deliver a decision,
fixtures and an implementation brief; they do not add production code.

| ID | Depends on | Smallest useful deliverable | Acceptance and negative case |
| --- | --- | --- | --- |
| A1 — BYOK models | — | Reproduce and fix authenticated workspace model discovery; first pin a reproduction test, then split server response and client refresh if both need changes | BYOK-only workspace offers an allowed model and can execute it; no-provider workspace has correct zero-AI state; instance fallback still works; switching workspace/removing a key cannot retain another workspace's list; no secret in payload or logs |
| A2 — Mentioned in | — | Mount/reuse the existing indexed-backlink reader on the Bureau page and relevant native record surface | Saved mention appears, removal disappears and result opens its source after reload; unreadable/archived/deleted sources expose no titles or snippets; bounded lists disclose truncation or paginate; index failure can be reconciled |
| A3 — Embedded create | — | Audit current editing, then add the missing native inline-create entry using the embed's own command context | Create and edit a task inside a page, reload, open the same task in its normal view; denied create/update and required-field failures preserve input; two embeds never borrow selection/commands from each other |
| A4 — Embedded filters/sorts | A3 | Decide persisted shared-view versus per-embed settings, then expose native controls under that ownership rule | Changing one embed follows the stated sharing rule; reload restores its settings; no silent mutation of another page's saved view; records/fields remain permission filtered |
| A5 — Bilingual template bodies | — | One existing student template family per brief; supply English body fallback while preserving French and stable template IDs | Preview and applied content follow locale, fresh IDs/provenance remain correct, switching locale does not rewrite an existing user document; never translate only the gallery label |
| A6 — Search indexing design | — | Trace rich-text extraction, `TS_VECTOR` lifecycle, native permissions and pagination; specify an idempotent populated-data backfill and FR/EN tokenization | Fixtures include title-only/body-only matches, accents, punctuation, code/math and restricted content; document chosen indexed text, ranking, query-plan/performance budget and rollback before implementing |
| A7 — Search integration | A6 | Split into indexing/backfill, query/snippet response, then Bureau modal wiring briefs | Find a body-only word beyond the former first 50 results using native cursor pagination; updates/deletes refresh results; safe highlighted snippets contain permitted plain text only; stale responses/errors never masquerade as empty success |
| A8 — Daily note | A5 | Design identity first, then add an explicit Open today's note action to Today/Agenda using native documents | Same member/local date returns the same note under simultaneous clicks/retry; yesterday's unfinished tasks are linked references, never cloned tasks; midnight/DST/timezone-change and changed permissions have defined behavior; viewing Today does not create a note implicitly |
| A9 — Math contract | — | Inspect current BlockNote/dependencies, D07 and import/export behavior; choose an allowed renderer and raw-source schema for block and inline math | Decide supported syntax, malformed/oversized input limits, accessible fallback, safe rendering and print/DOCX/Markdown behavior; no claim that preserving imported LaTeX already provides native authoring |
| A10 — Math authoring | A9 accepted | Separate block authoring, inline authoring and export adapters into individual briefs | Source survives save/reload/import/export; invalid math stays editable; no raw HTML execution or external fetch; keyboard insertion and printable fallback work |
| A11 — Mermaid | A9 accepted | Separate feasibility/renderer decision from a lazy-loaded diagram block that stores source | Save/reload retains source; invalid diagrams show editable text; disable unsafe HTML/click handlers/network behavior; large render is bounded; export produces a declared diagram or source fallback |
| A12 — Small block gaps | — | Audit toggle headings, existing simple tables and in-content progress; pin only one genuinely missing behavior | Toggle heading retains children after save/reload/export; simple table remains content rather than a native database; progress has an explicit manual/record source and accessible value; no duplicate table/block system |
| A13 — Canvas options | A11 | Design-only comparison of a first-party drawing attachment, draw.io file embed and full whiteboard | Decide storage/identity, file-size limit, licensing, touch/keyboard behavior, offline/concurrent-edit needs and export fallback; keep source attachment downloadable; implementation requires a separately accepted brief |

## A5 progress — 2026-10-27

- [x] A5.1 implementation and Tier-0 checks: gallery forwards locale; Cornell
  notes, thesis planner and reading-list copies have English titles/bodies for
  non-French locales, preserve French and keep stable keys/retry identity.
- [ ] A5.1 release acceptance: installed Documents upgrade and actual FR/EN
  gallery → create → reload journey; existing user pages remain unchanged.
- [ ] A5 remaining template families; untranslated templates retain their current
  French content. Full A5 remains partial. See the program report for evidence.

## Scope and checks

A1 is a correctness candidate, not a “quick fix” estimate. A2 must inspect any
existing Related/mentions widgets before introducing a new panel. A3/A4 preserve
the native record engine; rich document editability and record editability are
separate checks.

For each UI slice use focused behavior tests, the front package's direct
`tsgo` and diff lint. Server search/model changes also need focused service and
permission integration tests. App metadata/index changes use app-local scripts
and lifecycle gates. Exact files/commands go into the pinned brief after source
inspection; see [execution](execution.md).

The orchestrator validates E14/E16/E17 portions that actually apply, with reload,
two workspaces, permission denials and interruption/retry. Search backfill needs
a populated upgrade and proof it resumes without duplicate index data. Editor
additions require the shared save → reload → export journey and declared loss
warnings. No completion claim follows from a manifest build alone.
