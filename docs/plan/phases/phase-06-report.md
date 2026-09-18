# Phase 06 — Drive

CLAIMED — P6.1-folder-modeling-spike/folder-modeling-spike — deepseek-v4.1-flash — 2026-09-18T04:58:29Z — base c1bf077cbfd302d5f6d2155e84433e3894ec4369

## 2026-09-18 — P6.1 folder-modeling spike — findings (report-only)

Base commit `c1bf077c`. Method: read-only inspection of the standard
`attachment` object, the FILES field + file-storage primitives, the native
Files activity upload path and the P3 document attachment pattern at that
commit. No object, field, code or metadata was created or modified — this
section is the deliverable and closes PLAN.md **P6.1 bullet 1**. P6.1
bullets 2–3 (`driveFolder`, attachment extensions) and all of P6.2 stay
`[ ]`, gated on this decision and the still-open P1.7a legs (below). Paths
are relative to the repo root, backticked so no doc link can rot.

### Decision

**Create the `driveFolder` object in `a2e-drive` and model folder
membership as an additive `folderId` MANY_TO_ONE relation field on the
standard `attachment` object** (inverse `files` on `driveFolder`, on-delete
`SET_NULL`), **not** as another morph target added to the attachment
`targetMorphId` morph set. `driveFolder` carries `name`, a `parent`
self-relation for the tree, color/icon and `position`, per P6.1 bullet 2.

### 1. Existing primitives (observed)

- The store is the standard system object **`attachment`**
  (`packages/twenty-server/src/modules/attachment/standard-objects/attachment.workspace-entity.ts:16-45`).
  A record holds `name` (TEXT), **`file`** (a `FILES` field,
  `maxNumberOfValues: 1`), `position`, deprecated `fullPath`/`fileCategory`,
  and **seven morph target relations** `targetTask/targetNote/targetPerson/
  targetCompany/targetOpportunity/targetDashboard/targetWorkflow`
  (`compute-attachment-standard-flat-field-metadata.util.ts:158-184` for
  `file`; `:422-652` for the morph targets). All seven share one morph id,
  `STANDARD_OBJECTS.attachment.morphIds.targetMorphId.morphId =
  '20202020-f634-435d-ab8d-e1168b375c69'`
  (`packages/twenty-shared/src/metadata/constants/standard-object.constant.ts:26-28`),
  each with `targetFieldName: 'attachments'` on the target object and
  `SET_NULL` (task/note) or `CASCADE` (the rest).
- **File bytes never live in the object.** A `FILES` field stores a single
  `FileEntity` row under `FileFolder.FilesField` keyed by
  `<fieldMetadata.universalIdentifier>/<fileId>.<ext>` through the
  file-storage service
  (`packages/twenty-server/src/engine/core-modules/file/files-field/services/files-field.service.ts:40-107`;
  `FileFolder` enum `packages/twenty-shared/src/types/FileFolder.ts:8`).
  Folder membership is metadata, never a storage path.
- The native **Files** activity uploads directly to the `attachment.file`
  FILES field, then creates an `attachment` record carrying `name`,
  `file[0]` and the resolved morph `targetXId` for the record it is attached
  to (`packages/twenty-front/src/modules/activities/files/hooks/useUploadAttachmentFile.tsx`).
  A record's native Files tab reads the reverse morph `attachments`.
- Apps extend standard objects with plain fields already: real-estate adds
  TEXT/CURRENCY fields to `person`
  (`packages/twenty-apps/internal/real-estate/src/fields/person-desired-area.field.ts`),
  `a2e-projects` adds a `RELATION` task→project with the reverse on the app
  object (`packages/twenty-apps/internal/a2e-projects/src/fields/task-project.field.ts`).
  Both use `defineField({ objectUniversalIdentifier: <standard object uid> })`.
- The SDK/`defineField` manifest type supports both `RELATION` and
  `MORPH_RELATION` (with an explicit `morphId`) on any
  `objectUniversalIdentifier`, including standard objects
  (`packages/twenty-shared/src/application/fieldManifestType.ts:36-55`).

### 2. P3 documents attachment pattern

- P3.1 kept CRM `note` for record-attached notes and added a first-class
  `document` object, each using the shared RICH_TEXT (blocknote) stack
  (`docs/plan/phases/phase-03-report.md:9-16`). Documents have **no**
  attachment/folder field — embedded images are uploaded through the editor
  (`packages/twenty-front/src/modules/blocknote-editor/blocks/FileBlock.tsx:66`
  → FILES upload) and referenced from the body JSON. So the P3 pattern
  confirms the FILES/file-storage primitive but gives Drive nothing to
  reuse for folder organization; Drive must own its own organizing field.

### 3. Options analyzed

- **(a) Additive `folderId` relation on `attachment`** — a plain
  MANY_TO_ONE `attachment` → `driveFolder` field declared by `a2e-drive`,
  with the reverse `files` field on `driveFolder`. No change to any standard
  object definition, no server schema change, no upgrade command (app
  metadata only).
- **(b) Morph attachment** — declare a new `MORPH_RELATION` field on
  `attachment` (`targetDriveFolder`) reusing the standard
  `targetMorphId` morph id, with reverse `attachments` on `driveFolder`.
  This makes "is in this folder" the same axis as "is attached to this
  record".

### 4. Trade-offs and why the additive field wins

- **Semantics.** The morph set means *the record this file is attached to*
  (one native Files tab per target). Folder membership is an orthogonal
  organizational axis: a file can target a task **and** live in a folder.
  Option (b) overloads one axis for two meanings and makes a folder look
  like a record the file is "attached to"; the `driveFolder` inverse would
  read `attachments`, indistinguishable from a record's Files tab.
- **Views.** Drive needs to filter, group and sort by folder. A plain
  relation is a first-class view field/filter/group-by target; morph
  relations are weaker for that, and the plan already filters attachments by
  `sourceApp`.
- **Blast radius.** (b) touches the standard object's compiled morph target
  set and pins `a2e-drive` to a server-defined morph-id constant; (a) only
  adds a nullable app field — exactly the pattern already proven on
  `person`/`task`/`company`/`opportunity`. Additive-only, consistent with
  the repo rule and the blueprint's "prefer additive field"
  (`docs/plan/03-integration-blueprint.md:185-191`).
- **Existing uploads unaffected.** The native Files activity keeps creating
  morph-targeted `attachment` records; `folderId` is nullable with
  `SET_NULL`, so unmigrated uploads simply have no folder.

### 5. C5 boundary — attribution is not ownership or permission

`PLAN.md:297-299` is explicit: file fields use the attachment/file-storage
primitives and **source-app attribution is not ownership or permission**.
The same holds for `folderId`: a folder is an organizational label, not an
access boundary. Attachment access continues to derive from workspace
membership, roles and the target record; `folderId` must never gate reads
or writes, and moving a file between folders must not change who can see it.
`starred`/`description` (P6.1 bullet 3) are likewise presentation metadata.

### 6. Limitations and risks to carry into the implementation legs

- **`folderId` only organizes `attachment` records.** Files uploaded to a
  FILES field on another object (e.g. `a2e-accounting` invoice/quote
  receipts, real-estate `property.photos`) and images embedded in a document
  body are `FileEntity` rows, **not** `attachment` records
  (`files-field.service.ts:40-107` writes only the file). A single Drive
  browser must project over both; P6.2 must not claim folder
  move/organization for non-`attachment` files unless a later leg also
  creates an `attachment` record per file. Do **not** build a parallel file
  system to bridge this.
- No precedent in-tree yet extends the `attachment` object specifically
  (existing app extensions target `person`/`task`/`company`/`opportunity`).
  The chosen field must be validated at `dev:build` + install time, and the
  standard `allAttachments` view will not show it until a view-field/view is
  added — Drive should own its own attachment view.
- `sourceApp`/`starred`/`description` on `attachment` do not exist yet
  (P6.1 bullet 3 remains `[ ]`).

### 7. P6 phase gate — recorded honestly

The phase index gates P6 on **P0.2/P0.4 (both `[x]`)** and **P1.7a (still
`[~]`)** (`PLAN.md:388`; P0.2 `PLAN.md:440`, P0.4 `PLAN.md:462`). P1.7a's
readiness/dependency-display/export legs are themselves waiting on
**P1.6c** (`PLAN.md:600,576`), which waits on P1.6b (`PLAN.md:572`). This
report-only spike is therefore the only P6 leg runnable now; P6.1 bullets
2–3 and P6.2 remain closed behind this decision **and** the P1.7a legs.

### 8. Checks (Tier 0 only)

- `node docs/scripts/check-docs.mjs` → PASS (maintained docs + inline links
  + fences balanced). The phase report is not in `MAINTAINED_DOCUMENTS`, so
  this run covers the unchanged maintained set.
- No package, app or `twenty-shared` file was touched → package lint/`tsgo`
  gates are **N/A** (reported as such).
- No `yarn start`, browser or multi-session evidence claimed (Tier 2 is
  orchestrator-only).

## 2026-09-18 05:05 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P6.1-folder-modeling-spike P6.1: Drive folder-modeling spike (report-only) — driveFolder + folderId field versus morph attachments · **Slice:** P6.1 bullet 1 (spike; first unmet bullet)
**Claim:** done-for-review
**Ready-to-tick:** yes — report-only decision recorded; no code/metadata changed, so the only applicable gate (`check-docs`) is green and lint/tsgo are N/A.
**Base:** c1bf077cbfd302d5f6d2155e84433e3894ec4369
**Changed:** `docs/plan/phases/phase-06-report.md` (new), `.ralph-tui/progress.md`
**Checks:** `node docs/scripts/check-docs.mjs` → PASS; package lint/`tsgo` N/A (no package touched)
**Missing for tick:** none for the spike bullet. Implementation legs (P6.1 bullets 2–3 and P6.2) stay closed behind this decision and the open P1.7a legs; the `attachment.folderId`-on-a-standard-object assumption should be confirmed at `dev:build`/install during bullet 2/3 (no in-tree precedent extends `attachment`).
**Do not redo:** the folder-modeling decision — additive `folderId` MANY_TO_ONE on `attachment` + a `driveFolder` object with a `parent` self-relation, *not* a new morph target. Folder membership is not a permission boundary (C5). No metadata may be created for this spike.
**Remaining:** P6.1 bullets 2–3, all P6.2, and the rest of the P6 execution order.
**Next:** bullet 2 — declare the `driveFolder` object (`name`, `parent` self-relation, color/icon, `position`) and its view/nav in `a2e-drive`, once P1.7a (or an explicit unblock) permits P6 implementation.

CLAIMED — P6.1-drive-model/drive-model — deepseek-v4.1-flash — 2026-09-18T22:23:18Z — base 7e04aa35fbd9bdb36eaf83a4a94211c05897cc1b

## 2026-09-18 22:50 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P6.1-drive-model P6.1: drive model — driveFolder object + attachment extensions (folderId, starred, sourceApp, description) · **Slice:** bullets 2–3 (driveFolder + attachment extensions; the assigned task bundles both, and the spike that gates them is `passes:true`)
**Claim:** done-for-review
**Ready-to-tick:** yes — every Tier 0/1 gate green; Tier 2 install is orchestrator-only.
**Base:** 7e04aa35fbd9bdb36eaf83a4a94211c05897cc1b
**Changed:** new app `packages/twenty-apps/internal/a2e-drive/` (package.json, tsconfig, .nvmrc/.yarnrc/.gitignore/.oxlintrc, yarn.lock; `src/application.config.ts`, `src/roles/default-function.role.ts`, `src/constants/universal-identifiers.ts`, `src/constants/field-vocabulary.ts`, `src/objects/drive-folder.object.ts`, `src/fields/attachment-{folder,starred,source-app,description}.field.ts`, `src/views/all-drive-{folders,files}.view.ts`, `src/navigation-menu-items/drive.navigation-menu-item.ts`, `src/page-layouts/drive-folder.page-layout.ts`, `src/lib/drive-folder-cycle.ts`, `src/lib/__tests__/drive-folder-{cycle,graph}.test.ts`, `src/logic-functions/guard-drive-folder-parent-cycle.ts`); `docs/plan/phases/phase-06-report.md`; `.ralph-tui/progress.md`
**Checks:** (cwd `packages/twenty-apps/internal/a2e-drive`) `yarn install` → OK from cache; `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` → 0 warnings/0 errors on 17 files; `yarn test:unit` (`node --test --experimental-strip-types`) → 21/21 pass; `npx twenty dev:build .` → `Build succeeded (4 files)`, manifest = 1 object (`driveFolder`) with fields name/icon/color/parent/children/files + 4 standalone attachment fields, 2 views, 1 nav item, 1 page layout, 1 logic function, 1 role; `npx oxfmt --check packages/twenty-apps/internal/a2e-drive` (root) → all formatted after 1 auto-fix; `node docs/scripts/check-docs.mjs` → PASS (20 docs, 131 links). No `twenty-shared`/server/front file touched → those gates N/A.
**Missing for tick:** Tier 2 — `app:publish --private` + `app:install` on a disposable workspace to confirm the standard `attachment` object accepts app fields (no in-tree precedent extends `attachment`; spike flagged this) and that `folderId` materializes as the workspace column + GraphQL scalar, plus live cycle-guard behavior. No command menu items/front components yet (P6.2 owns the Drive page and Cmd+K).
**Do not redo:** the folder-modeling decision (additive `attachment.folder` → join column `folderId` SET_NULL, inverse `driveFolder.files`, NOT a morph target); the `driveFolder` object + views/nav/page-layout; the cycle guard (mirror of P3.3) and its 21-test suite. UUID space c31d* is claimed; application/role UUIDs committed in `application.config.ts` / `default-function.role.ts`. Bullet 2's `position` is the auto-provisioned system field every metadata object carries (nothing to declare, mirroring `document`).
**Remaining:** P6.2 (4 bullets: page, preview/upload, bulk/usage, Cmd+K) and the rest of P6/P7/P8/P9 in the execution order.
**Next:** P6.2-drive-page — build the Drive page (tree/breadcrumb, list & gallery, filters, rename/star/trash) as a native route reading the `driveFolder`/`attachment` metadata this slice declares.
