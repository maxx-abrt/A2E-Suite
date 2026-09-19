# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Cross-app relation pairs are owned by the *consumer* app and make the provider a hard install prerequisite**: when app A wants to show app B's records on its own page, A declares BOTH sides in its manifest — the M2O FK as a standalone `fields/*.field.ts` with `objectUniversalIdentifier` = B's object uid (join column `<name>Id`, `onDelete SET_NULL`), and the O2M inverse on A's object (models: A2E Projects' `document.project` + `project.documents`, A2E Chat's `chatChannel.project` + `project.discussions`). The target object must exist at metadata-sync time (`validate-morph-or-relation-flat-field-metadata.util.ts`), so A cannot install without B; the install fails closed and atomically (no application row, no partial metadata) — that is the C4 "safe degradation" for a required cross-app link. A page-layout `FIELD` widget that names a relation field id therefore can't dangle, but it also can't auto-hide; only widget *types* like `DISCUSSIONS` auto-hide when the owning app is absent. Do not build a front-component fallback for a missing relation — it is unreachable, and install/onboarding partial-failure UX is owned by US-026/US-027.

- **Persisting an app-owned workspace object from `twenty-front`**: the app declares the object (e.g. `documentRevision`, `documentCommentThread`) in `packages/twenty-apps/internal/a2e-documents/src/objects/`, and the front writes it through hand-written `gql` documents + `useApolloCoreClient()` (the objects are absent from checked-in generated metadata — regen with `nx run twenty-front:graphql:generate` once installed). Permissions are the platform's object permissions on the standard GraphQL API; the client adapter must fail closed on a denied transport (no read leak, no write applied), not add a parallel authz layer.
- **Copying note/template body blocks into a fresh record must re-key block anchors**: `remapTemplateBlockIds` (`a2e-documents/src/lib/instantiate-template.ts`) is the single anchor re-key authority (fresh ids, internal refs followed, `threadId` untouched, malformed/non-array refused). Reusing it — rather than parsing/copying raw blocknote — is what keeps a copy from aliasing the source's comment/thread state. `createBlockId` is injectable for deterministic tests; note-copy passes it through `buildNoteCopyBlocks`/`buildRecordNoteCopyContent`/`buildRecordNoteCopyPayload`.
- **Server-side compare-and-set for an app-owned record is a post-commit repair, not a reject**: the app SDK exposes only `databaseEventTriggerSettings` (no pre-write hook), so a `*.updated` logic function reads `properties.before`/`after` (full records) and restores the winner. The expected value must ride on the write itself as an additive field (here `document.contentRevision` head token + `contentBaseRevision` expected token); a repair write uses a `repair-` sentinel base so it is never itself re-classified (loop termination). Writers that omit the token stay last-write-wins (single-writer guidance). The pure decision lives in `a2e-documents/src/lib/document-revision-cas.ts` with an injected-free signature so `node --test` covers it without a server.
- **a2e-projects task status has TWO fields — pick deliberately**: the standard Twenty task already ships a `status` SELECT (TODO/IN_PROGRESS/DONE, and a native `byStatus` kanban), and the app adds a parallel `projectStatus` SELECT with the same values. The board (`task-board.view.ts`), `project-tasks.view.ts`, the calendar (`task-calendar.view.ts`, status column + DONE exclusion) and all three My-tasks smart lists (`my-tasks.view.ts`, `created-by-me.view.ts`, `overdue-tasks.view.ts` — status column + DONE exclusion) are wired to `projectStatus`; `current-tasks.view.ts` and the native record tasks tab still read the standard `status`. Read code paths go through `lib/task-status.ts` (`readTaskPipelineStatus`: projectStatus authoritative, standard status fallback, unknown → null). Reconcile which field a surface should read before adding any status logic (C5) — do not add a third status or a sync workflow. A view cannot express the read-time fallback, so a surface must choose one field for its filter/column: the pipeline field is correct once the app writes it (native status keeps its TODO default).
- **An a2e-projects project page is ONE page-layout; a PLAN "tab" name can already be a widget inside an existing tab**: `page-layouts/project.page-layout.ts` is the single `RECORD_PAGE` for `project`, and the P4.2 gantt "tab" is the `Gantt` `FRONT_COMPONENT` widget inside the `Timeline` tab (README-documented), not a separate tab — the tab set is Accueil/Timeline/Tâches/Tableau/Fichiers/Documents/Discussions. Tabs reuse native primitives (`RECORD_TABLE` + `viewUniversalIdentifier` for tables/kanban, `FILES`, `FIELD` for a relation). Before adding a tab for a PLAN bullet, audit the existing layout and `project-object-integrity.test.ts`'s tab-set test: adding a duplicate Gantt tab is a duplicate system, not a completion. The `c31b0200-0009-*`/`000a-*` namespaces are tab/widget ids; keep them additive.

---


## 2026-09-19 - US-031
- Closed the remaining executor acceptance gaps of the already-shipped durable revision history: made `EditorVersionHistoryStore.loadFromPersistence` fail closed on a denied/failed adapter read (keep local versions, no unhandled rejection), added unit proof that the store round-trips snapshots through the Apollo transport (a fresh store reads them back) and that unauthorized reads/writes are denied, and documented retention (20 snapshots, oldest-first, pruned both sides), non-destructive restore-as-new-revision and permission semantics in the a2e-documents README.
- Files changed: `packages/twenty-front/src/modules/blocknote-editor/version-history/EditorVersionHistoryStore.ts`, `.../version-history/__tests__/EditorVersionHistoryStore.test.ts`, `.../version-history/hooks/__tests__/useDocumentRevisionPersistence.test.tsx`, `packages/twenty-apps/internal/a2e-documents/README.md`, `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - The durable path was already committed in earlier sessions: `documentRevision` object (unique `versionId`, `body`, CASCADE `document` relation) + `useDocumentRevisionPersistence` + the store's optional `EditorVersionHistoryPersistence` adapter. This session only hardened/documented; do not rebuild.
  - `getObjectPermissionsForObject` fails **open** (all flags true) when an object has no permission entry, so it is not a fail-closed primitive; revision access is enforced by the server's object permissions on the normal GraphQL calls, and the client store fails closed when the transport rejects.
  - `nx lint:diff-with-main` diffs `main...HEAD`, so it reports "No changed files" for uncommitted work; run `npx oxlint --type-aware -c .oxlintrc.json <files>` + `npx oxfmt` directly on touched files instead.
---


## 2026-09-19 - US-030
- Verified the committed P3.2 template-instantiation slice (`aae72f9a`: `readAuthorizedTemplateCopySource` fail-closed read + `remapTemplateBlockIds` anchor re-key, both front-components routed through the authorized tree query) and closed the two acceptance bullets it left unproven with unit coverage: disjoint anchors across two instantiations, and deletion independence (a copy carries no template id / block anchor / relation back to the source).
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/__tests__/instantiate-template.test.ts` (+2 cases, 16→18); `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - `buildTemplateCopyPayload` is the single instantiation authority and only ever copies title + content — relations/system fields are dropped, which is *why* deleting a template cannot cascade to a copy (the only CASCADE edge is parent→children, and an instantiated copy is a root with no `parent`).
  - Workspace document templates (`kind = TEMPLATE`) have no descriptor key/version/`operationId`, so C1's `TemplateContentProvenance` shape cannot be recorded for P3.2; spec §5.1/§8 assigns it to P1.6e's descriptor loader. If/when it lands it must be a value copy (key+version), never a live relation, or it would re-break deletion independence via the CASCADE parent edge.
  - The a2e-documents package gates are `yarn test:unit` (node --test), `yarn typecheck`, `yarn lint`, `npx twenty dev:build .` — it is not an Nx project, so `nx lint:diff-with-main` returns "Cannot find project".
---

## 2026-09-19 - US-030 (independent re-verify)
- A second concurrent ralph session (agent pid 48678) had already executed US-030 and committed it as `a605200d` with a `done-for-review` phase report. This iteration changed no source; it independently re-ran the slice's Tier-0 test and reports `done-for-review` with zero new changes.
- Files changed: `docs/plan/phases/phase-03-report.md`, `.ralph-tui/progress.md` only.
- **Learnings:**
  - `node --test --experimental-strip-types src/lib/__tests__/instantiate-template.test.ts` → 18/18 on `a605200d`; the slice's E04 browser leg and the P1.6e provenance clause remain the only open items.
  - Gotcha: two ralph processes can run against one checkout (both acquire/spawn agents); `git status` can acquire new concurrent modifications mid-session. Check `ps` for live sibling opencode agents (children of a `ralph-tui run`) before assuming a dirty tree is a stall.
---

## 2026-09-19 - US-032
- Did **not** implement: a concurrent ralph session claimed the identical slice (`CLAIMED — US-032/server-side-compare-and-set — 2026-09-19T21:38:00Z`) 17 seconds before this session's claim (`US-032/server-expected-revision-cas`, 21:38:17Z). Per contract §3 file-overlap preflight, stopped with zero code changes and reported `conflict`.
- Files changed: `docs/plan/phases/phase-03-report.md`, `.ralph-tui/progress.md` only.
- **Learnings:**
  - Two ralph sessions can be live on one checkout at once (US-030 already showed a duplicate). Always re-read the phase report's tail immediately before claiming — a claim can appear between your read and your append.
  - The first unmet US-032 acceptance gap is AC3 (server-side compare-and-set via the app's logic-function pattern). The app CAS primitive is a **filtered update** (`updateX(filter, data)` compiles to one `UPDATE … WHERE … RETURNING`, per phase-04-report lines 158/210/556) — but the document body path can only be a **post-commit repair** guard (SDK has no pre-write hook), so it needs a client-carried expected-revision token to detect staleness at all.
  - `DatabaseEventPayload.properties` carries full `before`/`after` records (`ObjectRecordUpdateEvent`), so a `document.updated` guard can read `before.content`/`after.content` and restore the winner without a second query.
  - AC4 (front `retry` + draft-preservation cases) and AC5 (single-writer guidance docs) remain open and unclaimed once the AC3 claimant reports.
---

## 2026-09-19 - US-033
- Closed the first unmet acceptance gap of the committed P3.3 record→document slice: the copied note bodies were parsed and re-emitted with their original block ids, which aliases the source note's anchors. Routed them through the existing template-copy helper `remapTemplateBlockIds` (`parseNoteBlocks` → `remapNoteBlocks`), threading an additive `createBlockId` option through the payload builders.
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/record-note-copy.ts`, `.../src/lib/__tests__/record-note-copy.test.ts` (17→18 cases), `docs/plan/phases/phase-03-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - The prior P3.3 record-note-copy `done-for-review` (2026-09-17) shipped payload/permission/provenance/entry-points, but did **not** reuse `remapTemplateBlockIds`, so AC3 ("through the existing template-copy helper") was genuinely open even though the task had a done entry. Read the current task's acceptance list against the code, not just the report status.
  - `buildTemplateCopyPayload` is not a drop-in for note copy (it copies only title/content and no relations); the reusable piece is `remapTemplateBlockIds` on each note body. Headings/source-link blocks stay deterministically id'd and are not passed through the re-key.
  - Gotcha reconfirmed: US-032 edits land in the same checkout concurrently mid-session (`git status` grew files while this run worked). Only the two record-note-copy files are mine; do not revert the sibling session's files.
---

## 2026-09-19 - US-032 (server-side compare-and-set)
- Implemented AC3 + AC5 of the atomic expected-revision save. Server: two additive nullable TEXT fields on `document` (`contentRevision` head token, `contentBaseRevision` expected token), a pure CAS decision lib `document-revision-cas.ts` (13 node cases), and the `guard-document-revision-save` logic function on `document.updated`/`updatedFields:['content']` that restores the winning body post-commit and stamps a `repair-` sentinel base so it never re-repairs. Front: `persistBlocknoteBody` writes the new token + expected token on the same `updateOneRecord`; the save-conflict guard tracks the base revision, captures the conflicting revision, and `Keep my changes` persists against it (retry test added); `Use saved version` reseeds it. Docs: a2e-documents README "Concurrent saves" section (deterministic winner, single-writer guidance) + corrected the audit tradeoff row.
- Files changed: `a2e-documents/src/constants/universal-identifiers.ts`, `.../objects/document.object.ts`, `.../lib/document-revision-cas.ts` (new), `.../lib/__tests__/document-revision-cas.test.ts` (new), `.../logic-functions/guard-document-revision-save.ts` (new), `twenty-front/.../co-editing/utils/documentContentRevision.ts` (new), `.../co-editing/hooks/useDocumentSaveConflictGuard.ts`, `.../co-editing/hooks/__tests__/useDocumentSaveConflictGuard.test.tsx`, `.../RichTextFieldEditor.tsx`, `a2e-documents/README.md`, `docs/repository-architecture-audit.md`, `docs/plan/phases/phase-03-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - `sanitizeRecordInput` drops fields absent from the object metadata, so the front can ship the token write before the app is reinstalled without breaking (CAS just stays inert until the fields exist).
  - The other US-032 session (claim 17s later) stopped with zero code and its Ralph engine auto-committed the app half of my work as `e5824205` mid-iteration; front+docs stayed in the tree. Two ralph sessions on one checkout is the norm here — re-read the report tail right before appending the final report too.
  - Gate that must be re-run after the app is reinstalled: `npx twenty dev:build .` + `nx run twenty-front:graphql:generate`; the CAS cannot be live-proven at Tier 0/1.
---

## 2026-09-19 - US-034
- No source change: the board-view slice was already implemented and committed (0717c7ef, reported done-for-review 2026-09-18). Re-verified the existing KANBAN board against the acceptance and confirmed all Tier 0/1 gates green; did not rebuild it.
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (report only).
- **Learnings:**
  - `task-board.view.ts` is a native KANBAN on the standard task, `mainGroupBy = TASK_FIELD_IDS.projectStatus` (`c31b0201-0001-…0002`), project-scoped by an `IS_NOT_EMPTY` filter on the task→project relation; manifest confirms groups TODO/IN_PROGRESS/DONE.
  - Status divergence is the open C5 item: board + project page read `projectStatus`; calendar/My-tasks/record tab read the standard `status`. Those are US-035/US-036 legs, not the board slice — do not touch them here.
  - Before reporting, re-run `node --test --experimental-strip-types "src/lib/__tests__/task-board.test.ts"`, `yarn test:unit`, `yarn typecheck`, `npx twenty dev:build .`; board test 5/5, full 245/245, tsc exit 0, build 38 files.
---

## 2026-09-19 21:47 UTC - US-034 (re-run)
- No source change: the immediately prior iteration (2026-09-19 21:44 UTC) already reported the board slice `done-for-review` and the engine committed its report as `8fa199c7`. Per contract §1.3 this session re-verified the committed slice instead of redoing it; nothing was rebuilt.
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (report only).
- **Learnings:**
  - A `done-for-review` landed ~1 minute before this session's claim window; HEAD `8fa199c7` is literally the engine's commit of that report. When Ralph re-invokes on a not-yet-ticked task, re-read the report tail first — if a done entry exists for the same slice, re-verify and re-report, do not re-implement.
  - Re-confirmed: board test 5/5, `yarn test:unit` 245/245, `yarn typecheck` exit 0, `npx twenty dev:build .` Build succeeded (38 files), manifest board entry still `type KANBAN` / `mainGroupBy c31b0201-0001-…0002` (app `projectStatus`).
  - Scope boundary is explicit: cross-surface status reconciliation (calendar/My-tasks/record-tab native `status` → `projectStatus`) belongs to US-035/US-036 (US-036 AC bullet 3), not the board slice. Do not fold it into US-034.
---

## 2026-09-19 21:53 UTC - US-035 (calendar pipeline status)
- Resumed a stalled same-model iteration (`e4c4797e`): it had claimed `US-035/task-calendar-pipeline-status`, applied the diff, run every gate green, then died on an `external_directory` permission error before reporting. Re-ran all gates on the resumed tree; the only source change is the calendar status reconciliation US-034 flagged — `task-calendar.view.ts` status column and DONE exclusion now read `TASK_FIELD_IDS.projectStatus` (same field the board groups on) instead of the native task `status`; +2 tests.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/views/task-calendar.view.ts`, `.../src/lib/__tests__/task-calendar.test.ts`, `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - A `CLAIMED` line with a dirty tree but no report is a stalled run, not a live competitor — the iteration log (`.ralph-tui/iterations/<id>_<ts>_US-035.log`) shows where it died. Per contract v4 §0, resume it rather than reporting `BLOCKED — already claimed`.
  - The native calendar shape was already committed (`d7e680a3`: CALENDAR on standard task, native `dueAt`, MONTH, project `IS_NOT_EMPTY`); US-035's only unmet part was the C5 status reconciliation. Do not rebuild the view.
  - View filters can't do the `readTaskPipelineStatus` fallback (projectStatus → standard status); a surface must pick one field. The calendar picking `projectStatus` matches the board and makes the DONE exclusion actually work (the native `status` never leaves TODO when the pipeline moves).
  - Gates: calendar test 6/6, `yarn test:unit` 247/247, `yarn typecheck` exit 0, `yarn lint` 0 errors/1 pre-existing warning, `npx twenty dev:build .` Build succeeded (38 files). Root `.oxfmtrc.jsonc` ignores `**/lib/**`, so format-check the lib test with a lib-inclusive temp config.
---

## 2026-09-19 - US-035
- Reconciled the existing native CALENDAR view (`task-calendar.view.ts`) with the app pipeline status: the status column and the DONE-exclusion filter now target `TASK_FIELD_IDS.projectStatus` instead of the native task `status`, so a task moved to DONE on the board also leaves the calendar. No view recreation, no provider call/invitation (P4C.5 boundary).
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/views/task-calendar.view.ts`, `.../src/lib/__tests__/task-calendar.test.ts` (+2 tests, 4→6), `docs/plan/phases/phase-04-report.md`.
- **Learnings:**
  - Resumed a stalled same-session iteration: it had claimed US-035/task-calendar-pipeline-status, edited + verified the two files green, then died on an `external_directory` permission error before reporting. The dirty tree matched the claim, so verification + report was the whole job (contract v4 §0).
  - `projectStatus` is a SELECT with `defaultValue 'TODO'`, so app-created rows always carry a pipeline value; a pre-existing NULL row is excluded by `IS_NOT 'DONE'` (`NOT (col IN ('DONE'))` drops NULL) while the board shows it ungrouped. The exact read-time fallback needs an OR `filterGroup`, which no view in this repo exercises — left as a Tier-2 watch item.
  - Gates: calendar 6/6, integrity 12/12, `yarn test:unit` 247/247, typecheck exit 0, lint 0 errors (1 pre-existing), oxfmt clean, `npx twenty dev:build .` 38 files; manifest calendar = fields `[title, projectStatus, project]`, filters `[projectStatus IS_NOT DONE, project IS_NOT_EMPTY]`.
---

## 2026-09-19 21:56 UTC - US-036 (conflict, no work)
- Declared CONFLICT without touching source: a concurrent `ralph-tui` session appended `CLAIMED — US-036/reconcile-smart-list-status` (2026-09-19T22:05:00Z) and was already editing the exact three files this session scoped — `views/my-tasks.view.ts`, `views/created-by-me.view.ts`, `views/overdue-tasks.view.ts` (mtimes 23:54 local). Per contract v4 §3 (file-overlap preflight) this iteration stopped at zero work.
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (reports only).
- **Learnings:**
  - Two `ralph-tui run` processes share this checkout (PIDs 35049, 49648). A parallel session can append a same-task CLAIMED line *between* an initial `grep` and your own claim, then start writing the target files within seconds — re-read the report tail AND `git status` immediately before claiming, not just at session start.
  - US-036's real unmet gap is C5: the three My-tasks smart-list views display/filter the native task `status`, while the board and calendar read the app `projectStatus`. The parallel `reconcile-smart-list-status` session is applying exactly that re-point; do not duplicate it.
  - `current-tasks.view.ts` (no nav item, orphan) and the native project record tasks tab remain on native `status` even after the three smart lists are fixed — a separate surface, not part of the My-tasks page AC.
---

## 2026-09-19 22:10 UTC - US-036 (smart-list C5 status reconciliation)
- Reconciled the three existing My-tasks smart lists with the board pipeline status: `my-tasks.view.ts`, `created-by-me.view.ts` and `overdue-tasks.view.ts` now display `TASK_FIELD_IDS.projectStatus` (the field the board groups on), and the overdue list's completion filter is `projectStatus IS_NOT 'DONE'` instead of the native task `status`. No view/nav was recreated (the three TABLE views + FOLDER nav were committed by `e83cfd7a`); only the status reference changed, plus tests.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/views/{my-tasks,created-by-me,overdue-tasks}.view.ts`, `.../src/lib/__tests__/my-tasks.test.ts` (+2 tests, 5→7), `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`. The engine committed the source edits as `dcb69f9f`.
- **Learnings:**
  - The committed smart lists already had the correct standard-task filters (assignee IS current member, createdBy workspaceMemberId sub-field, dueAt IS_IN_PAST); the only unmet AC bullet was C5 — they read the native `status` the board never writes, so a board-moved-to-DONE task stayed in the lists. Re-point both the displayed column and any DONE exclusion to `TASK_FIELD_IDS.projectStatus`; do not add a third status or sync.
  - Same NULL residual as the calendar: `projectStatus IS_NOT 'DONE'` drops NULL rows (`NOT (col IN ('DONE'))`); the field's `TODO` default covers app-created rows, and an OR `filterGroup` fallback remains unexercised/unverified in this repo.
  - Gates: my-tasks test 7/7, `yarn test:unit` 249/249, `yarn typecheck` exit 0, `npx tsgo -p tsconfig.json --noEmit` exit 0, `yarn lint` 0 errors/1 pre-existing warning, `npx twenty dev:build .` Build succeeded (38 files); manifest confirms all three views carry `c31b0201-0001-…0002` and zero native-status ids.
  - A concurrent dual-session iteration logged `US-036 (conflict, no work)` for the same files; its claim line says it claims nothing and it changed zero source. Both processes share this checkout — re-read the report tail and `git status` immediately before claiming.
---

## [2026-09-19] - US-037 (double done-for-review, no work)
- Verified-by-reference only: the concurrent `ralph-tui` session claimed `US-037/verify-existing-project-doc-relation` at 21:57:12Z and appended a full `done-for-review` phase report at 22:03 UTC before this iteration could claim. The work it verified is the committed `8debd2e2` (US-001): `document.project` M2O + `project.documents` O2M, the Documents FIELD tab, and the overview `documentCount` chip. This iteration changed no source.
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (reports only).
- **Learnings:**
  - Same dual-session race as US-036: the sibling `ralph-tui run` (PIDs 35049/49648 share this checkout and session.json `activeTaskIds`) appended the US-037 claim between this session's initial `git status` and its first read of the report tail — then finished and reported within ~60s. A `CLAIMED`/`done-for-review` entry that appears mid-session means the twin owns the slice; report `done-for-review` with zero changes (contract §1.3 / US-034 precedent), never re-run the suite against a tree another agent is verifying.
  - US-037 is a duplicate of US-001 (same P4.3 bullet); the committed relation/overview/tab already satisfy it. Do not rebuild.
  - Residual for the orchestrator's Tier-2 run (not a blocker): `objects/project.object.ts:193` claims the Documents widget "hides when A2E Documents is not installed", but Documents is a hard install prerequisite (D-P4.3-DOC), so the actual behavior is fail-closed install; the widget-hides analog only exists for the DISCUSSIONS widget type, not FIELD.
---

## 2026-09-19 - US-037
- Verified the committed P4.3 project↔document relation slice — it was already implemented and reported done-for-review as US-001 (`8debd2e2`, ancestor of HEAD: `document-project.field.ts` M2O `document.project` + `project.object.ts` inverse O2M `project.documents`, the project-page Documents tab as a native `FIELD` widget, and the overview «N documents» chip). Per contract v4 §1.3 this iteration changed no source; it re-ran the gates and mapped every AC.
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` only.
- **Learnings:**
  - US-037 is a re-issue of the same P4.3 relation work (PLAN.md:904 still `[ ]`): the app-side deliverable is identical to US-001's, and AC bullet 5 explicitly defers the live install proof to Tier 2. Do not rebuild it.
  - C4 nuance: the link is a *required* cross-app dependency under the committed D-P4.3-DOC decision, so "degrades safely" = fail-closed atomic install (target object absent ⇒ whole install aborts, no partial metadata), not "Projects installs without Documents". `objects/project.object.ts:193`'s comment claiming "the widget hides when A2E Documents is not installed" is inaccurate for a `FIELD` widget — corrected understanding only, comment not edited.
  - Gates on `dcb69f9f`: `yarn test:unit` 249/249; focused `project-object-integrity` + `project-overview` 16/16; `yarn typecheck` exit 0; `yarn lint` 0 errors (1 pre-existing `task-labels.field.ts` warning); `npx twenty dev:build .` Build succeeded (38 files); manifest carries `document.project` @ `c31b0200-0002-…0006` (`objectUniversalIdentifier` `c31a0100-…`, join `projectId`, `SET_NULL`) + inverse `project.documents` @ `…0005` + Documents tab FIELD widget `c31b0200-000a-…000f`.
  - C5 is native: A2E Documents' views set `openRecordIn: SIDE_PANEL`, so a linked doc opens in the native side panel; the relation is workspace-scoped (never cross-tenant) and no app code is needed.
---

## [2026-09-19] - US-038
- Verified the committed P4.2 project-page deliverable (`c1bf077c` layout+overview, plus the US-037 `8debd2e2` Documents tab): one RECORD_PAGE on the project object with Accueil [Champs clés, Description, Aperçu, Temps], Timeline [Timeline, Tâches, Jalons, Étiquettes, Notes, Gantt], and the Tâches / Tableau / Fichiers / Documents tabs. The Aperçu overview front component already renders health + task/milestone/member/activity counts and member names via pure `lib/project-overview.ts`. No source change needed — reported `done-for-review`.
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (reports only).
- **Learnings:**
  - US-038 is a re-issue of the same P4.2 `project-page-tabs` work already reported done-for-review on 2026-09-18 04:54 UTC; its only recorded deferral was the docs tab, which US-037's committed `8debd2e2` now supplies. Do not rebuild the layout or the overview component.
  - Gantt is deliberately a widget inside the Timeline tab (FRONT_COMPONENT `project-gantt`), NOT its own tab — the acceptance phrase "gantt tab embeds the existing timeline widget" is satisfied by this pre-existing composition; a duplicate Gantt tab would double the widget. The manifest confirms: Accueil/Timeline/Tâches/Tableau/Fichiers/Documents/Discussions.
  - App-package gates for a2e-projects do not need services: `yarn typecheck` exit 0, `yarn test:unit` 249/249, `yarn lint` 0 errors / 1 pre-existing warning, `npx twenty dev:build .` → Build succeeded (38 files). `npx nx lint:diff-with-main a2e-projects` is N/A (app is not an Nx project).
  - The manifest build is the cheapest manifest-level proof: re-read `.twenty/output/manifest.json` and assert the exact tab/widget shape rather than trusting the source alone.
---

## [2026-09-19] - US-038 (independent re-verify, duplicate done-for-review)
- Did not see the twin's progress entry when I started; ran the same audit independently and reached the same conclusion. The committed page is complete: one RECORD_PAGE on `project` with tabs Accueil@10 / Timeline@20 / Tâches@30 / Tableau@40 / Fichiers@50 / Documents@55 / Discussions@60; the Aperçu overview front component renders health + task/milestone/document/member/activity counts + member names via pure `lib/project-overview.ts`; Documents tab FIELD→`RELATION_IDS.projectDocuments` (`c31b0200-0002-…0005`); Gantt `FRONT_COMPONENT` in Timeline. Changed no source — reported `done-for-review` (contract §1.3, US-034/US-037 double-report precedent).
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (reports only). The twin's phase report and progress entry landed first under slice `US-038/verify-overview-and-tabs`; my claim `US-038/verify-existing-project-page` is the later duplicate.
- **Learnings:**
  - I claimed at 22:14Z without seeing the twin's earlier 22:00:12Z claim because it was appended between my `git status` and my first report read; the two slices had different slice-ids so the §2 exact-id race check did not fire. With two `ralph-tui run` processes on one checkout, re-read the report tail immediately before and after claiming — the twin can finish a full audit inside one session.
  - No source file overlap existed (both slices are verify-only), so §3 conflict did not apply; duplicate done-for-review is the correct outcome.
  - Base drifted mid-session: `<repo>/.git/HEAD` moved from `6943ffab` to `7e21c6c1` (twin's US-037 commit) while this iteration was running; report the base you started from and note the drift.
---

## [2026-09-19] - US-039
- Conflict — did no work. A concurrent same-checkout executor appended `CLAIMED — US-039/partial-row-error-feedback — deepseek-v4.1-flash — 2026-09-19T22:05:55Z` and was mid-edit on the exact slice files; contract v4 §1.3 (already claimed) + §3 (target-file overlap) → stop, report `conflict / blocked — already claimed`, zero source touched (reports only).
- Files changed: `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md` (reports only). No CLAIMED line appended, to avoid racing the live owner.
- **Learnings:**
  - Native record import/export in this checkout is **entirely client-side**: `packages/twenty-front/src/modules/spreadsheet-import/` (wizard + `ValidationStep` per-row errors) and `packages/twenty-front/src/modules/object-record/spreadsheet-import/` (`useOpenObjectRecordsSpreadsheetImportDialog` → `buildRecordFromImportedStructuredRow` → `batchCreateManyRecords({ upsert: true })`). Export is browser-side `generateCsv` (`useRecordIndexExportRecords.ts`, `json-2-csv` + `sanitizeValueForCSVExport`). There is **no** server `import-job`/`export-job` module or `importRecords`/`exportRecords` mutation.
  - The app SDK (`twenty-sdk/front-component`) exposes **no** import/export host API and an app `commandMenuItem` cannot target native `EngineComponentKey.IMPORT_RECORDS` (front-component target only) — so "reusing native import" for tasks means the native generic pipeline, not an app-level importer. Do not build a parallel CSV engine in `a2e-projects`.
  - With two `ralph-tui run` processes on one checkout, `git status` at session start can be clean while a twin claims between scoping and editing; check the report tail AND per-file mtimes immediately before touching anything.
---
