# 05 — Student workflow and later ecosystem

[Program overview](../../NOTION_WORKSPACE_PLAN.md) · [Execution guide](execution.md)

**Status:** planned; NW-00 and scheduling required. Root-plan homes: C1/C2,
M9, P3.4, P6 and P10. Build one complete course workflow before adding another
specialized application or public marketplace.

## First useful student journey

Apply an FR/EN course starter → open course notes → add an assignment and see
weighted grade → create/review cards → print a revision sheet. Native documents,
records, files, templates and permissions own the data. AI assistance is optional;
the baseline works with typed notes and manually authored cards.

Use the existing [template descriptors](../../../packages/twenty-apps/internal/a2e-documents/src/lib/document-template-descriptors.ts),
[editor schema](../../../packages/twenty-front/src/modules/blocknote-editor/blocks/Schema.ts),
[native embed host](../../../packages/twenty-front/src/modules/blocknote-editor/components/RecordViewEmbedHost.tsx)
and [applications lifecycle](../../applications.md). New student records need an
accepted owner/metadata migration, not a parallel local JSON database.

## Task contracts

| ID | Depends on | Deliverable / boundary | Acceptance and negative case |
| --- | --- | --- | --- |
| E1 — Student data/template design | A5, B0 accepted | Define minimal course, assignment, deck/card/review metadata and app ownership, stable IDs and required/optional apps | Course note/syllabus, materials links, assignment due date/weight and front/back card fields defined; privacy/install/uninstall and populated-upgrade behavior documented; seed only templates/example configuration, not fictitious grades in real courses |
| E2 — Courses and assignments | E1 accepted, A3, A5, B6 | Separate native metadata from one course-page/assignment starter family | Course page embeds same assignment records and links Archive materials; weighted calculation handles missing marks, zero weights and denominator policy; locale follows template selection; apply retry does not duplicate a course tree |
| E3 — Decks and cards | E1 accepted, B12 | Native deck/card records, Gallery front/back configuration and manual review UI | Create/open/edit a card, show answer and choose a rating with keyboard; deck permission gates review; ordinary database view still works; rich note references preserve source |
| E4 — Review scheduling | E3 | First specify/version an SM-2-style pure scheduling contract, then persist review events and per-user due state | Fixed-clock fixtures cover first/repeated review, lapse, ease bounds and day boundaries; one rating event applies once under retry; two devices cannot double-advance; one member's progress never overwrites another's |
| E5 — Review today | E4 | Native due filter and resumable review session | Only due/readable cards appear; reload resumes without replaying last rating; empty/offline/denied states explicit; retain history and allow correction under the agreed event model |
| E6 — Study print/export | A10, E2, E3 | Print stylesheet and explicit revision-sheet/flashcard output; AI-generated draft is an optional later slice | Notes/math/tables/cards remain readable on chosen paper sizes; long content paginates; printable answers can be included/excluded; output previews unsupported blocks with declared fallback; source document unchanged |
| E7 — Citation manager | E2 | First decide DOI/ISBN resolver, network policy and bibliography format; then metadata fetch/preview and citation block separately | Manual citation works when lookup fails; validate input and constrain outbound requests; user confirms metadata; store source/provenance and editable text; no invented author/year or silent style changes |
| E8 — Audio/transcript contract | E2, A1 for AI transcription | Design-only attachment/recording consent, duration/size limits, capture lifecycle, transcription provider/cost and timestamp schema | Imported audio usable without recording/provider; record with explicit start/stop; canceled/failed uploads recover; transcript words retain source intervals; lifecycle, retention and permission rules accepted before adding provider code |
| E9 — Audio notes | E8 accepted | Separate recording/upload, transcription job and timestamp/playback UI into briefs | Saved audio reopens; transcript block seeks correct timestamp; pending/failed job retries without duplicate charges/transcript; “explain section” proposes a source-linked draft requiring confirmation; no provider means manual notes still work |
| E10 — PDF annotation | E2 | Design protected-file version + page/coordinate anchor representation before highlight UI | Native Archive preview persists highlights and notes against the correct file version; denied files/annotations stay hidden; keyboard/touch and zoom work; export states whether annotations are flattened or separate; no silent source-file rewrite |
| E11 — Attachment search | A7, C1 | Design-only extraction MIME/size policy and protected derived-text lifecycle, then one supported text/PDF format per brief | Worker time/memory bounded; deletes/replacements/revocation update index; malicious/encrypted/scanned files have explicit unsupported state; result highlights readable source text and opens page/file; OCR is a separate opt-in dependency |
| E12 — Pencil notes | E2, A13 accepted | Attachment-backed pen/touch prototype before full canvas authoring | Stroke source retained alongside exported image in native files; input does not block scrolling/keyboard; save/reload, size bounds and image/text fallback pass; co-editing/offline capability claimed only if C6/C10 verified |
| E13 — Public template marketplace | E1, D1 | Design only first: ownership/publication/preview, required-app versions, trust/moderation, licensing and withdrawal; implementation split into publish, discovery and apply | Publishing is explicit, strips private records/files/secrets, preserves author/provenance; apply uses C1 native templates and fresh IDs with dependency preview; no arbitrary code install; failures resume safely; no automatic publication from this plan |

## Student release gate

R3 uses A9–A10 and E1–E6 plus their transitive prerequisites, including native
formulas/Gallery. Existing handwritten notes/simple templates can ship earlier
as limited increments with honest scope. Avoid making the baseline depend on
OCR, live recording, a citation provider, handwriting or marketplace availability.

Orchestrator acceptance uses a fresh student workspace and a populated upgrade:
apply FR and EN starters, create two courses, add/edit assignments, verify a
hand-calculated projected grade, create and review cards on two dates, reopen
notes/materials, and inspect printed output. Use a second member with denied
course access and confirm that cards, review history, citations and extracted
attachment text do not leak.

For E6 inspect actual PDF/print output, not only HTML or a screenshot of the
editor. For E9/E10/E12 use real media, browser reload and interruption/recovery.
Privacy/cost/provider decisions are explicit design outputs; smaller models must
not choose a paid service or package license by accident.
