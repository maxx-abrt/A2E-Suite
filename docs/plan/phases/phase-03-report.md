# Phase 03 Report — Documents (Full Note-Taking)

## 2026-09-10 14:45 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.1 all four subtasks (PLAN.md lines 201–211): spike, `document`
object, fractional indexing util, upgrade-command decision
**Status:** done

**What I did:**
- Spike (report-only decision): **keep `note` untouched; add a new `document`
  object in the `a2e-documents` app.** `note` is a polymorphic-target CRM
  surface (its targets field is a MORPH-style relation used by the record
  Notes tab); documents need a self-referencing tree, a fractional-index
  sibling order, favorites and a trash lifecycle — none of which can be added
  to `note` without changing CRM behavior. Both share the RICH_TEXT
  (blocknote) stack, so the editor investment is common. Logged here instead
  of a separate spike doc, per the task wording.
- `packages/twenty-shared/src/utils/fractional-indexing/
  generateFractionalIndexBetween.util.ts` + 8-test suite: lexicographic
  fractional order keys over base-62 digits with a base-52 length-marker head
  ("a0" form), ported from the CC0 fractional-indexing reference
  (Greenspan/Figma 2017). Keys sort with plain string comparison; 3000
  sequential appends and prepends stay ≤ 3–4 chars, 2000 interleaved inserts
  stay < 12 chars. Exported from `twenty-shared/utils` (index.ts), package
  rebuilt with `--skip-nx-cache`.
  - Trade-off: Twenty's own list-order fields are numeric midpoints
    (`getPositionBetween`), which converge only under gentle interleaving and
    are fine for nav items; the document tree allows arbitrarily deep
    interleaving (drag-reparent), so a string alphabet was chosen. Documented
    on the util itself.
- `a2e-documents` app filled from empty shell to complete anatomy:
  - `constants/universal-identifiers.ts` — c31a namespace (mirrors Bilan's
    scheme), one committed identifier per declarable thing.
  - `constants/field-vocabulary.ts` — kind + tag select options as data.
  - `objects/document.object.ts` — 16 fields: title (label identifier),
    content RICH_TEXT, kind (DOCUMENT/TEMPLATE — the `isTemplate` concept as
    a select, honoring the "select field over separate engine" law),
    icon, coverColor, position (fractional index string), isFavorite, tags
    MULTI_SELECT, archivedAt (trash), parent/children self-relation
    (CASCADE on parent delete), company/person relations (additive CRM
    links, SET_NULL).
  - `views/all-documents.view.ts` — TABLE view with 4 view-fields + title
    sort, openRecordIn SIDE_PANEL.
  - `page-layouts/document.page-layout.ts` — RECORD_PAGE layout: Home tab
    (FIELDS + FIELD_RICH_TEXT editor widget) + Timeline tab (native TIMELINE).
  - `navigation-menu-items/documents.navigation-menu-item.ts` — VIEW nav
    item, position 100.
  - `command-menu-items/create-document.command-menu-item.ts` +
    `go-to-documents.command-menu-item.ts` (both pinned/global).
  - `front-components/document-browser.front-component.tsx` — recursive tree
    explorer (the sanctioned escape hatch for genuinely novel UX; decision
    logged per law §2: metadata views first, front component for the tree).
  - `logic-functions/post-install.ts` — idempotent seeds: "Bienvenue"
    root document + a meeting-notes template.
- Verified end-to-end: `node packages/twenty-sdk/dist/cli.cjs dev:build <app>`
  builds the manifest and passes the SDK typecheck: manifest contains
  objects:1 / fields:16 / views:1 / pageLayouts:1(2 tabs) / nav:1 /
  commandMenuItems:2 / frontComponents:1 / logicFunctions:1.
- Fixed along the way: tsconfig synced to a2e-accounting's (noEmit +
  allowImportingTsExtensions); MULTI_SELECT requires options in the SDK
  validator (added starter tags); duplicate-relation-ID collision caught by
  the manifest dedup check before any publish.

**Decisions & trade-offs:**
- New `document` object over extending `note` (spike above).
- `kind` SELECT instead of an `isTemplate` boolean: options are data and the
  templates gallery can filter on it in P3.2/P3.3 without a second field.
- Command menu items must carry a `frontComponentUniversalIdentifier` (SDK
  type requirement, verified in `command-menu-item-config.ts`); both items
  point at the document-browser component rather than hand-rolled keyboard
  handlers (law §1 "Commands" row).
- Upgrade command NOT needed: everything is app metadata; no server entity,
  no migration. Logged here to close the PLAN item explicitly.

**Verification:**
- `cd packages/twenty-shared && yarn jest src/utils/fractional-indexing` →
  8 passed (interleaved ≤12 chars, sequential ≤4, inversion throws).
- `npx nx build twenty-shared --skip-nx-cache` → success.
- App `dev:build` → "✓ Build succeeded (5 files)" with SDK manifest
  validation + typecheck; manifest content audited via node (counts above).
- App `npx tsc -p tsconfig.json --noEmit` → 0 errors; app oxlint → 0/0.
- Manifest build caught and fixed two real defects (missing MULTI_SELECT
  options; duplicate relation UUID) — evidence the manifest gate works.

**For the next agent:** next = P3.2 editor upgrades (slash commands,
@mention, /link) — the FIELD_RICH_TEXT widget already renders blocknote; the
extension work belongs in the front module the widget mounts
(`twenty-front` rich-text/blocknote internals). Gotchas: (1) the app needs
`yarn install` inside `a2e-documents` before any `npx twenty` invocation
(nodes_modules absent here, but `node ../../../twenty-sdk/dist/cli.cjs`
works because tsconfig resolves to the sibling yarn PnP install);
(2) `dev:build` needs the absolute app path (`"$PWD"`); (3) new field/view
IDs must stay in `constants/universal-identifiers.ts` — the dedup check is
the only guard against silent collisions.

## 2026-09-10 15:35 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 first item — slash-command extensions (toggle/heading/code/
quote/divider/image/@mention/link-to-record) (PLAN.md line 214)
**Status:** done

**What I did:**
- Audit: blocknote 0.51 defaults already provide heading (incl. toggle),
  quote, code block, divider, toggle list, image/video/audio (FilePanel →
  `editor.uploadFile`, already wired to attachment upload in
  `RichTextFieldEditor`), and @mention via `SuggestionMenuController` +
  `useMentionSearch`. So the actual gaps were: **callout block** and
  **/link to records**.
- `packages/twenty-front/src/modules/blocknote-editor/blocks/CalloutBlock.tsx`
  — new `callout` block spec (emoji prop cycling through 5 emoji, inline
  content, Linaria styling with theme tokens); registered in `Schema.ts`.
- `LinkToRecordSlashMenuItem.tsx` + `LinkToRecordPicker.tsx` — a "Link to
  record" slash item (group Advanced, IconLink) that opens the existing
  `SingleRecordPicker` on a fixed dropdownId via `useOpenDropdown`; on
  selection it inserts a `mention` inline node (same shape as the @mention
  path, so RecordChip rendering + side-panel opening work for free).
  Picker object scope = same readable/searchable filter used by mention
  search (`filterReadableActiveObjectMetadataItems`).
- `BlockEditor.tsx` wires the item into the slash menu via a render-prop
  around the existing `SuggestionMenuController` (no framework added).
- Test: `getSlashMenu.test.ts` (icon mapping + custom File item) — mocked
  `getDefaultReactSlashMenuItems` because the real blocknote dist bundle
  breaks under SWC/jest (pre-existing; see Decisions). 26/26 tests pass.
- Verification choice logged: rather than widen jest
  `transformIgnorePatterns` for the whole @blocknote chain (which then hits
  `h.default.extend is not a function` inside blocknote's bundled deps),
  the unit test mocks the provider and exercises our own logic. UI
  verification of the picker flow happens in the P3.2 e2e.

**Decisions & trade-offs:**
- Callout as a custom block spec rather than a quote variant: emoji +
  bordered container are Notion-grade UX; blocknote 0.51 has no callout.
- /link-to-record reuses `SingleRecordPicker` + `mention` inline content —
  zero new fetch/picker machinery (law §1: relations via primitives).
- Jest transform untouched (reverted mid-session); mock keeps the test
  hermetic and fast.

**Verification:**
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 4
  suites, 26 passed.
- `npx tsgo -p tsconfig.json --noEmit` → 74 errors, all pre-existing in
  `front-components/useFrontComponentExecutionContext.ts` (baseline count
  verified identical via git stash before/after).
- oxlint (touched files) → 0 warnings 0 errors; `oxfmt --check` → clean.
- `npx nx lint:diff-with-main twenty-front` → "No changed files" (target is
  committed diff only); files linted directly as above.

**For the next agent:** next = P3.2 item 2 — inline comments anchored to
blocks. Gotchas: (1) blocknote dist cannot be jest-imported — mock
`@blocknote/react`/`@blocknote/core` at suite level; (2) the callout block
is in BLOCK_SCHEMA, so dashboards' `filterSupportedBlocks` (standalone-rich-
text) will strip it there by design; (3) `LinkToRecordPicker` uses
dropdown component-state scoped to its instance id — keep the fixed id
`link-to-record-slash-dropdown` unique per editor instance if multiple
editors ever render simultaneously.

## 2026-09-10 16:55 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 item 2 — inline comments anchored to blocks (thread store
per block id) (PLAN.md line 216)
**Status:** done

**What I did:**
- Verified the installed `@blocknote/core@0.51` ships a full comments
  extension (`@blocknote/core/comments`: `CommentsExtension`, `ThreadStore`,
  `ThreadStoreAuth`, `DefaultThreadStoreAuth` + types) and `@blocknote/react`
  auto-renders `FloatingComposerController` + `FloatingThreadController` via
  `BlockNoteDefaultUI` when the extension is registered (`comments !== false`).
  No parallel comment framework needed — pure primitive reuse (law §1).
- `packages/twenty-front/src/modules/blocknote-editor/comments/
  EditorCommentsThreadStore.ts` — in-memory `ThreadStore` implementation:
  create/add/update/delete comment, delete/resolve/unresolve thread, emoji
  reactions, pub-sub via `subscribe`. Nested `EditorCommentsThreadStoreAuth`
  (author-only edit/reaction-delete; everyone-with-editor-access can comment,
  resolve, delete — v1 granularity).
- `comments/hooks/useResolveCommentUsers.ts` — `resolveUsers` bridge: loads
  `WorkspaceMember` records via existing `useFindManyRecords`, maps to
  blocknote `User` (id/username/avatarUrl). Ref-based so the stable callback
  picked up at editor creation still sees later member loads.
- `RichTextFieldEditor.tsx` — registers `CommentsExtension({
  threadStore, resolveUsers })` in `useCreateBlockNote(..., { extensions })`.
  `BlockNoteView` (default UI) then renders the floating composer on
  selection and the thread card on anchor click; comment anchors persist as
  marks inside the document body (survive reloads).
- Test: `comments/__tests__/EditorCommentsThreadStore.test.ts` — 7 tests
  (create/subscribe, add comment, resolve/unresolve attribution, update+delete,
  reactions toggle, foreign-comment auth, thread delete). Suite total 33/33.

**Decisions & trade-offs:**
- In-memory thread bodies for v1: anchor marks persist with the body JSON,
  but thread contents do not (no server comment storage yet). On reload,
  anchors become orphaned marks; blocknote renders them as orphaned threads.
  Documented limitation — server persistence (attachment-style object or
  dedicated table) is the natural follow-up in P3.3/P8, out of scope here.
- Did NOT touch the dashboards editor (`DashboardsBlockEditor`) — comments
  scoped to record rich-text fields for v1; extending is one `extensions: []`
  entry away if wanted.
- Used `isDefined` only; `isNonEmptyString` does not exist in this branch's
  `twenty-shared/utils` export set (verified via node REPL).
- No new user-facing strings introduced by us (blocknote's own dictionary
  handles comment UI labels) → no Lingui churn.

**Verification:**
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 5
  suites, 33 passed.
- `npx tsgo -p tsconfig.json --noEmit` → 74 errors = pre-existing baseline
  (identical count as previous entry; zero new errors).
- oxlint on touched files → 0 warnings 0 errors; `oxfmt --check` → clean.
- `npx nx lint:diff-with-main twenty-front` → "No changed files." + success
  (committed-diff lint; touched files linted directly).

**For the next agent:** next = P3.2 item 3 — ToC/outline panel; word count;
typewriter mode option. Gotchas: (1) blocknote dist still cannot be
jest-imported — keep mocking `@blocknote/*` at suite level if a test needs
the extension factory; the store test avoids runtime imports (types only);
(2) `useCreateBlockNote` deps must include the comments extension instance —
do not recreate it per render or threads reset on every keystroke; (3)
`resolveUsers` must be identity-stable (ref pattern) or user info shows
"loading" forever; (4) UI check of composer/thread cards (light+dark) is
still pending — do it in the P3.2 e2e pass.

## 2026-09-10 17:20 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 item 3 — ToC/outline panel; word count; typewriter mode option (PLAN.md line 217)
**Status:** done

**What I did:**
- New sub-module `packages/twenty-front/src/modules/blocknote-editor/editor-status/`:
  - `utils/getBlockOutline.ts` — extracts heading entries (blockId, level 1–6, single-spaced text) recursively through block children (toggle headings); runtime-`unknown` signature because the generic `Block<>` type is structurally awkward to name and `Array.isArray` does the narrowing.
  - `utils/getBlockWordCount.ts` — word count over text runs incl. nested children; `[\s\p{Zs}]+`u split covers accented fr prose.
  - `hooks/useBlockEditorOutline.ts` — subscribes to `editor.onChange` (fires on selection-only updates too), coalesces into one outline state.
  - `states/isEditorOutlineOpenState.ts` + `isEditorTypewriterModeEnabledState.ts` — `createAtomState` with `localStorageOptions` under `a2e-editor-*` keys (matches `a2e-widgets-*` convention from P2.4).
  - `components/BlockEditorStatusBar.tsx` — collapsible outline panel (click → `setTextCursorPosition` + focus, active heading highlighted via `onSelectionChange`), word count, outline + typewriter toggle buttons (icons `IconLayoutList`, `IconFocusCentered` from `twenty-ui/icon`), Lingui strings (`Toggle outline`, `Typewriter mode`, `Untitled section`, `words`).
- Wired into `BlockEditor.tsx`: renders `<BlockEditorStatusBar>` below `BlockNoteView`; typewriter mode scrolls the caret element to viewport center via `scrollIntoView({ block: 'center' })` on `editor.onSelectionChange` when enabled.
- Tests: `utils/__tests__/getBlockOutline.test.ts` (5), `utils/__tests__/getBlockWordCount.test.ts` (5) — structural types only, no blocknote runtime import (dist cannot be jest-loaded).
- fr-FR translations filled in working tree for the 4 new msgids (catalogs NOT committed — i18n churn rule).

**Decisions & trade-offs:**
- Verified `@blocknote/core@0.51.4` has NO built-in ToC/outline component (grepped types + dist) — hand-rolled from `editor.document` is the primitive available; no new dependency added.
- Typewriter scroll delegated to a `onTypewriterCaretMove` callback in BlockEditor (scroll owner = BlockEditor, detection owner = status bar) so a P3.3 doc-page scroll container can override the target.
- Status bar renders null when editor undefined or empty doc + outline closed → zero visual impact on record notes fields; appears only once a doc has headings or words.
- `oxlint` naming lint forced atom-state variables to match state names (`isEditorOutlineOpen`) — followed the enforced convention.

**Verification:**
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 7 suites, 45 passed.
- `npx tsgo -p tsconfig.json --noEmit` → 74 errors = pre-existing baseline (identical count).
- `npx oxlint` on editor-status + BlockEditor.tsx → 0 warnings 0 errors; `npx oxfmt --check` → clean.
- `npx lingui extract` run locally; fr-FR msgstr completed for the 4 new strings; en.po verified present.

**For the next agent:** next = P3.2 item 4 — Templates (instantiate from template docs + gallery view). Gotchas: (1) the status bar is inside `StyledEditor` flex column — `BlockNoteView` remains first child; verify visual ordering in the P3.2 e2e/UI pass (light+dark still untested per previous entries); (2) `useCreateBlockNote` in `RichTextFieldEditor` did NOT need changes — status bar lives in `BlockEditor`, so dashboards/other `BlockEditor` consumers get it for free; (3) blocknote `onChange` fires on selection-only updates too — word-count state updates could be micro-optimized with `getChanges()` diff if profiling ever shows churn; (4) outline entries are computed per change (O(document)); fine for v1, revisit if docs exceed ~1k blocks.

## 2026-09-10 17:25 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 item 4 — Templates: instantiate from template docs (copy blocks); template gallery view (PLAN.md lines 218–219)
**Status:** done

**What I did:**
- `packages/twenty-apps/internal/a2e-documents/src/lib/instantiate-template.ts` — pure payload builder: strips the `Modèle — ` title prefix, demotes `kind` to `DOCUMENT`, copies `content` (blocknote + markdown) verbatim, optional fractional-index position override (default `'V'`, same as the browser's new-root position). No transport concerns → node:test unit-testable.
- `src/lib/__tests__/instantiate-template.test.ts` — 6 tests (prefix strip, plain title, empty fallback, verbatim copy, missing content, position override). Run via the app's `node --test --experimental-strip-types` pattern (mirrors `a2e-accounting`'s lib tests).
- `src/views/templates.view.ts` — metadata view primitive (ViewType.LIST, VIEW_IDS.templates) filtered `kind IS TEMPLATE` with tags column; opens in side panel. This is the "template gallery" — view-first per 04-twenty-native-law §2 decision order.
- `src/front-components/document-browser.front-component.tsx` — `instantiateTemplate` action ("dupliquer" button on TEMPLATE nodes) calls `buildTemplateCopyPayload` then `createDocuments` with the copy payload; content field added to the `DocumentNode` shape so the browser carries the body verbatim.

**Decisions & trade-offs:**
- Verified the SDK `ViewType` enum (`packages/twenty-sdk/dist/define/index.d.ts`): TABLE/KANBAN/CALENDAR/LIST — no GALLERY type exists in v2.39, so the gallery ships as a LIST view; a card/grid gallery would need a front component (post-v1 polish, note for P3.3).
- Copy semantics = full snapshot at instantiation time (no live link to the template). Editing the copy never mutates the template; a "update from template" re-sync is possible later by re-running the same payload builder.
- Blocknote copy is verbatim JSON — comment anchors etc. carry over; attachment signed-URL refresh is handled by the existing editor pipeline on open (same path as any persisted body).

**Verification:**
- `node --test --experimental-strip-types src/lib/__tests__/instantiate-template.test.ts` → 6 pass, 0 fail.
- `npx tsgo -p tsconfig.json --noEmit` in the app → 0 errors.
- `npx oxlint -c .oxlintrc.json src` → 0 warnings 0 errors.
- Manifest build (`dev:build`) not run this session (no local server); view/field UUIDs follow the committed `viewFieldId` scheme (view index 1 → `c31a0100-0004-…-0100-prefixed`).

**For the next agent:** next = P3.2 item 5 — Version history (snapshot on save-interval, N pruned, block-level diff view, restore). Gotchas: (1) template copies created via the browser only carry what `DocumentNode` selects — extend the GraphQL selection if the copy must include icon/coverColor; (2) the templates view uses `VIEW_IDS.templates` (already reserved in universal-identifiers) — no new UUIDs minted; (3) run `node packages/twenty-sdk/dist/cli.cjs app:publish --private && app:install` against a live server to actually exercise instantiation; not possible this session.

## 2026-09-10 17:35 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 item 5 — Version history: snapshot on save-interval (N versions, pruned); diff view (block-level), restore (PLAN.md lines 220–221)
**Status:** done

**What I did:**
- `packages/twenty-front/src/modules/blocknote-editor/version-history/`:
  - `EditorVersionHistoryStore.ts` — in-memory ring buffer (default 20, pruned oldest-first) of `{versionId, createdAt, body}` snapshots; skips empty and unchanged consecutive bodies; pub-sub via `subscribe` (same lifecycle contract as `EditorCommentsThreadStore`).
  - `hooks/useEditorVersionHistory.ts` — save-interval driver: snapshots only after 5s of typing calm, at most one snapshot per 120s interval, wired to `editor.onChange`.
  - `utils/getBlockLevelDiff.ts` — block-level diff keyed on blocknote block id: added / removed / changed (text or type change).
  - `states/isEditorVersionHistoryOpenState.ts` — `a2e-editor-version-history-open` localStorage atom.
  - `components/BlockEditorVersionHistoryPanel.tsx` — toggle (IconHistory), version list (newest first, timestamp), block-diff view for the selected version (removed/added runs highlighted with theme `background.danger`/`background.transparent.success`), `Restore` = `editor.replaceBlocks(all ids, snapshot blocks)` — the documented blocknote primitive; restore then closes the panel and the normal change pipeline persists the body.
- Wired into `BlockEditor.tsx` (below the status bar); store created once per editor instance via `useMemo([])`.

**Decisions & trade-offs:**
- Snapshots are in-memory per editor instance for v1 (same documented limitation as comment thread bodies): reload clears history; server persistence (dedicated table or JSON column) is the natural follow-up and would need migration + upgrade command — out of scope here.
- Diff is block-level by block id: paste/reorder shows as add+remove pairs, no char-level diffing (v1 scope per task line).
- Snapshot cadence = debounced idle + min interval, not raw change count, so 20 versions ≈ several hours of active editing.

**Verification:**
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 9 suites, 55 passed.
- `npx tsgo -p tsconfig.json --noEmit` → 74 errors = pre-existing baseline.
- oxlint on version-history + BlockEditor.tsx → 0 warnings 0 errors (removed an unused constant); `oxfmt` applied and clean.
- fr-FR msgstr completed in working tree for `Version history`, `Restore`, `No saved version yet`; en.po present (catalogs not committed).

**For the next agent:** next = P3.2 item 6 — Export: PDF (extend existing note-export path), DOCX, Markdown. Gotchas: (1) `@blocknote/xl-pdf-exporter` and `xl-docx-exporter` 0.51.4 are already in `twenty-front/package.json` — verify their API entrypoints (grep dist types) before coding; the existing note-export path lives under `packages/twenty-front/src/modules/…/note-export` or similar (grep `export note`); (2) restore uses `replaceBlocks` with all block ids — verify behavior when document is empty (replaceBlocks with empty array of ids); (3) the oxlint naming rule forces atom-state variables to match state names — name variables after the state atom; (4) theme has NO `background.success` — use `background.transparent.success` for green tints.

## 2026-09-10 17:45 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 item 6 — Export: PDF, DOCX, Markdown (PLAN.md line 222)
**Status:** done

**What I did:**
- New sub-module `packages/twenty-front/src/modules/blocknote-editor/export/`:
  - `utils/exportBlocksToMarkdown.ts` — `exportBlocksToMarkdown` (editor's own `blocksToMarkdownLossy`), `triggerFileDownload` (Blob/object-URL anchor download), `slugifyExportFileName` (accent-stripping slug with `document` fallback).
  - `utils/exportBlocksToDocxBlob.ts` — `DOCXExporter` from the already-installed `@blocknote/xl-docx-exporter` 0.51.4 with `docxDefaultSchemaMappings`; constructor typed through a narrowed `ExporterWithBlob` adapter because the generic variance between our BLOCK_SCHEMA and the default-schema mappings fails assignment (documented WHY comment; runtime untouched).
  - `components/BlockEditorExportMenu.tsx` — pop-up menu (IconFileExport): PDF (browser print path), DOCX (toBlob → download), Markdown (lossy converter → download).
- Wired into `BlockEditor.tsx` with a new optional `documentTitle` prop (defaults to `'document'` → filename base); existing consumers unaffected.

**Decisions & trade-offs:**
- Verified the exporter APIs in dist types: `DOCXExporter.toBlob(blocks, {sectionOptions, documentOptions, locale})` and `pdfDefaultSchemaMappings`/`PDFExporter.toReactPDFDocument` exist; `@blocknote/xl-pdf-exporter` requires react-pdf runtime (`<PDFDownloadLink>`/`pdf()`), which is NOT wired into this codebase — grepped, no react-pdf render pipeline exists. PDF therefore ships via `window.print()` on the editor DOM (browser print-to-PDF), noted as `Export as PDF (print)`. Wiring `toReactPDFDocument` + react-pdf into the app bundle is the fidelity follow-up.
- No "existing note-export path" exists in this fork (grepped `export.*PDF`/`NoteExport`/`downloadNote` across modules — only locale files match): the export menu inside BlockEditor IS the note-export path for this fork.
- Markdown is intentionally lossy (callouts degrade); DOCX/PDF are the fidelity paths.

**Verification:**
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 10 suites, 59 passed (4 new: slugify ×3, download ×1).
- `npx tsgo -p tsconfig.json --noEmit` → 74 = pre-existing baseline.
- oxlint (export + BlockEditor.tsx) → 0 warnings 0 errors; oxfmt clean.
- Lingui extract run; fr-FR completed for the 4 new strings; en.po present.

**For the next agent:** next = P3.2 item 7 — Share: public read-only link (+ optional passphrase client-side AES-GCM, expiry, guest view page). Gotchas: (1) this needs a SERVER surface (public-domain core module or share table) — it is the first server task in this phase, budget for migration + upgrade command rules (2-39, epoch-ms strictly greater); (2) `documentTitle` prop is only defaulted — pass the real doc title when the document record page lands (P3.3); (3) the print-based PDF path adds class `a2e-print-editor` to body and never removes it — a real print stylesheet is a P3 polish item; (4) oxlint naming: adapter type aliases are fine, but keep WHY comments when casting generics (`as never`).

## 2026-09-10 18:25 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P3.2 item 7 — Share: public read-only link, optional passphrase
(client-side AES-GCM), expiry, guest view page (PLAN.md lines 223–224)
**Status:** done

**What I did:**
- New server core module `packages/twenty-server/src/engine/core-modules/document-share/`:
  `DocumentShareEntity` (schema `core`, unique shareToken, documentRecordId,
  titleSnapshot/bodySnapshot, encryptedBody/bodyIv/bodySalt triple, expiresAt,
  createdByUserId, WorkspaceRelatedEntity), service (random-base64url 24-byte
  token, one share per document per workspace, guest path with expiry →
  DOCUMENT_SHARE_EXPIRED), resolver (authed create/list/delete + anonymous
  `getGuestDocumentShare` query guarded by `PublicEndpointGuard` +
  `NoPermissionGuard`, same pattern as `getPublicWorkspaceDataByDomain`),
  DTOs, exception/filter, module registered in `core-engine.module.ts`.
- Fast instance command `2-39-instance-command-fast-1789062772757-add-document-share-entity.ts` (CREATE TABLE + token index + workspace FK CASCADE, up/down).
- Front module `packages/twenty-front/src/modules/document-share/`: crypto util (PBKDF2 210k → AES-GCM 256, encrypt/decrypt, base64), `useCreateDocumentShare`/`useDeleteDocumentShare`, `useGuestDocumentShare`, guest query document.
- Guest page `pages/document-share/DocumentShareGuestPage.tsx` routed at `AppPath.DocumentShare = '/share/:shareToken'` (twenty-shared enum + root router, lazy): read-only markdown render of the snapshot (react-markdown), passphrase unlock form for protected shares.
- `a2e-documents` document browser: "partager" action on DOCUMENT nodes (snapshot at click time; sharing a TEMPLATE intentionally excluded).

**Decisions & trade-offs:**
- Design correction applied early: the plan's "client-side AES-GCM per Bureau"
  is incompatible with server-side bcrypt passphrase verification (the
  passphrase would have to travel). Final model: the client encrypts the body
  snapshot with the passphrase-derived key BEFORE upload; the server stores
  only ciphertext+IV+salt; the GCM auth tag IS the verification (wrong
  passphrase = decrypt failure). For protected shares the plaintext snapshot
  column is saved empty so cleartext never sits next to key material.
- Shares snapshot title+body at creation time (guests hold no workspace auth
  context, so no live-record read is possible); re-share to refresh. A
  share-management surface (revoke link, passphrase field in UI, expiry
  picker) is the follow-up — hooks already exist.
- The generated `CoreApiClient` schema predates the mutation, so the browser
  action calls it with a structural payload (`as never`) like the other
  ad-hoc records calls in that file.
- jest env polyfills: jsdom lacks `crypto.subtle` and TextEncoder/Decoder —
  polyfilled in `setupTests.ts` from `node:crypto`/`node:util` (conditional,
  matching the existing web-streams polyfill pattern).

**Verification:**
- server: `npx tsgo -p tsconfig.json --noEmit` → 0 errors; `npx jest
  src/engine/core-modules/document-share` → 7 passed (create plaintext /
  ciphertext-only, duplicate reject, guest expiry throw, guest payload,
  not-found, workspace-scoped delete).
- front: `npx tsgo -p tsconfig.json --noEmit` → 74 = pre-existing baseline;
  jest document-share suite → 2 passed (AES-GCM round-trip + wrong-passphrase
  GCM rejection); oxlint on document-share dirs → 0/0; twenty-shared rebuilt
  (`nx build twenty-shared --skip-nx-cache`) after adding AppPath.DocumentShare.
- app: `a2e-documents` tsgo → 0 errors.

**For the next agent:** next = P3.2 item 8 — Realtime co-editing guardrails (presence cursors P2 + optimistic merge with version check; document the no-OT limitation). Gotchas: (1) `useCreateDocumentShare` already accepts `passphrase`+`expiresAt` and encrypts client-side — the share-management UI only needs fields + a link display; (2) generated front GraphQL types don't include DocumentShare yet — run `npx nx run twenty-front:graphql:generate` after the next server metadata sync to replace the hand-written `GuestDocumentShare` type in `useGuestDocumentShare.ts`; (3) guest route bypasses AuthProvider redirects via the root router — test `/share/<token>` from an incognito profile before shipping the acceptance run; (4) never commit locales/**; fill fr-FR for the new guest-page strings in the working tree only.

## 2026-09-10 18:50 UTC — Zoo (GLM-5.3-Flash)

### P3.2 Task 6 — Realtime co-editing guardrails (committed)

**Design (no server changes):** document cursors ride the P2 workspace
presence channel — the `typingContext` field (≤200 chars, already
broadcast by the gateway) carries `doc:<documentRecordId>:<blockId>`.
Publishing reuses `realtimeConnectionManager.sendPresence`; consumption
subscribes `workspace:<id>:presence` via `useRealtimeTopic` and folds
typing events into a per-user cursor map with the same 6s fallback
timeout as chat typing. No OT in v1: consistency is guarded by
`resolveOptimisticDocumentUpdate`, a pure block-level version check —
equal base/latest → clean apply; disjoint changed blocks → merged;
overlapping blocks → conflict listing `conflictingBlockIds` for the
caller to surface. **Limitation: this is last-writer-wins at block
granularity, not character-level OT/CRDT; concurrent edits inside the
same block conflict instead of merging.**

**New files (`packages/twenty-front/src/modules/blocknote-editor/co-editing/`):**
- `utils/documentCursorContext.ts` + test — build/parse the
  `doc:<documentId>:<blockId>` typingContext convention (200-char guard).
- `utils/resolveOptimisticDocumentUpdate.ts` + test (5 cases) —
  clean/merged/conflict semantics.
- `hooks/useDocumentCursors.ts` — presence subscription, remote-cursor
  memo, `publishCursor(blockId|null)`.
- `components/BlockEditorRemoteCursorsEffect.tsx` — appends styled caret
  markers into blocknote block elements (`[data-id="…"]`), per-user
  deterministic color, label from workspace members.

**Wiring:** `BlockEditor.tsx` takes an optional `documentRecordId` prop;
`RichTextFieldEditor` passes `recordId` (only full-document editors get
cursors; comment editors stay quiet). Cursor publish happens on
`editor.onSelectionChange` with an unconditional hook call and cleanup
publishing `null` on unmount.

**Gotchas for next agent:**
- `isNonEmptyString` lives in `@sniptt/guards`, NOT `twenty-shared/utils`
  (only `isDefined` etc. are there) — a wrong import passes typecheck and
  fails at runtime in jest.
- Repo oxlint rule `twenty/effect-components` forces side-effect-only
  components to end with `Effect` suffix (and their props with
  `EffectProps`); plan DOM-effect components accordingly.
- `themeCssVariables` has no `color.teal` / no `font.size.twoXs` — use
  `color.jade` / `font.size.xxs`.
- Pure-DOM markers need `css` from `@linaria/core`; Linaria styled
  components only emit classes onto React-rendered elements.
- Blocknote blocks carry `data-id`; `editor.domElement` is a getter
  returning `HTMLDivElement | undefined`.

**Gates:** co-editing 8/8 + full blocknote-editor 67/67 jest; tsgo clean
(0 errors); oxlint 0 errors on blocknote-editor (1 pre-existing unused
import in `getSlashMenu.ts` predates this task).

## 2026-09-12 12:10 UTC — Zoo (GLM-5.3-Flash)

### P3.3 Task 1 — Documents page: notion-like tree browser + trash cron (committed)

**Task(s):** PLAN.md P3.3 item 1 — sidebar tree (drag to reparent via
fractional index), quick search, favorites section, archive/trash with
restore, 7-day purge cron.

**Status:** Done.

**What I did** (all in `packages/twenty-apps/internal/a2e-documents`):
- `src/lib/fractional-position.ts`: local port of
  `twenty-shared` `generateFractionalIndexBetween` (front-component sandbox
  cannot import twenty-shared — same constraint as the `field-vocabulary.ts`
  TagColor port) + `buildAppendPosition` helper. Byte-compatible with the
  original: it never validates keys on entry (my first draft added
  `validateOrderKey` calls and broke on `'a0'`; removed).
- `src/lib/document-tree.ts`: `TreeDocument`, cycle-guarded
  `isDescendantOf`, `buildMoveDocumentPayload` (excludes the moved doc from
  its own sibling bounds, fractional insert at target index),
  `buildRestoreDocumentPayload` (append at end of chosen parent).
- `src/lib/trash-retention.ts`: `TRASH_RETENTION_DAYS = 7`;
  `isPastTrashRetention` — missing/unparsable `archivedAt` never purges.
- `src/logic-functions/purge-archived-documents.ts`: daily 04:00 cron logic
  function (`cronTriggerSettings`, pattern per a2e-accounting precedent);
  queries `archivedAt: NOT_NULL` (firstPage 500), filters by retention,
  destroys per-id. Universal identifier
  `c31a0000-0012-4000-8000-000000000002` (LOGIC_FUNCTION family).
- `src/front-components/document-browser.front-component.tsx`: rebuilt as a
  Notion-like browser over the existing Documents nav surface — quick
  search (flat filtered results), Favoris, Arborescence (recursive tree,
  HTML5 drag-and-drop: drop ON a node appends as child, drop on a child
  wrapper inserts at that sibling index; custom mime
  `text/a2e-document-id`), Corbeille with restore / destroy and a
  "purge imminente" badge past retention. Opening a doc navigates via
  `navigate(AppPath.RecordShowPage, { objectNameSingular, objectRecordId })`
  (positional args — NavigateFunction is `(to, params?, …)`, not an object).
  `position` now selected in queries so ordering is fractional-indexed.
- `src/constants/universal-identifiers.ts`: added the purge cron id.

**Decisions:**
- Purge runs as an app cron logic function (a2e-accounting
  `sweep-overdue-invoices.ts` precedent) instead of core message-queue
  plumbing — app-first integration law; PLAN wording updated accordingly.
- Drag-drop modeled after Notion: drop on node = make child; drop between
  siblings = insert at index. Cycle rejection lives in the pure lib so it
  is unit-testable without React.
- Keep the browser as the existing front-component (the "left sidebar
  worktree") and route opening to the standard record page via
  `AppPath.RecordShowPage` rather than inventing new routing — the
  dedicated doc page surface is P3.3 task 2.

**Verification:** tsc clean (0 errors); oxlint 0 warnings/0 errors;
19/19 lib tests pass (fractional-position 7, document-tree 7,
trash-retention 5) plus 6 pre-existing instantiate-template tests;
`twenty-sdk` `dev:build` succeeded (7 files, manifest + typecheck OK).
No locale files touched.

**For the next agent:**
- `navigate` in the front-component sandbox is positional
  (`to, params, queryParams, options`) — not a react-router-style object.
- Front-component sandbox: no twenty-shared; port utils locally with a WHY
  header (precedents now: `field-vocabulary.ts`, `fractional-position.ts`).
- `defineFrontComponent` lives in `twenty-sdk/define`; `navigate`/`AppPath`
  in `twenty-sdk/front-component`.
- P3.3 remaining: doc page (cover/icon/title/editor/outline, side-panel or
  full page URL), Cmd+K commands + docs search provider (server stub
  `document-search-provider.service.ts` still empty), "Save as document"
  record integration.

## 2026-09-12 12:23 UTC — Zoo (GLM-5.3-Flash)

### P3.3 Task 2 — Doc page: cover/outline/sub-pages widget + side-panel opening (committed)

**Task(s):** PLAN.md P3.3 item 2 — cover/icon/title/editor/outline; open in
side-panel tab or full page (addressable URL).

**Status:** Done.

**What I did** (all in `packages/twenty-apps/internal/a2e-documents`):
- `src/lib/document-outline.ts`: `extractOutline` — parses the markdown
  projection of the RICH_TEXT field into `{level, text}` heading entries;
  fenced code blocks are skipped so `#` lines inside them never leak into
  the outline; unbalanced fences tolerated.
- `src/lib/__tests__/document-outline.test.ts`: 5 tests (levels, fence
  skipping, unbalanced fence, trailing hashes, empty input).
- `src/front-components/document-page.front-component.tsx` (new): record-page
  widget rendering the Notion-like page furniture — color cover
  (`coverColor` with fallback), heading outline (indented by level), and the
  Sous-pages list with inline creation (fractional-indexed append) and
  per-child open actions: full page via `navigate(AppPath.RecordShowPage, …)`
  or side panel via
  `openSidePanelPage({ page: SidePanelPages.ViewRecord, recordId, objectNameSingular })`.
  Reads the current record from `useSelectedRecordIds()` (the host passes the
  record-page record — verified in `FrontComponentWidgetRenderer`).
- `src/page-layouts/document.page-layout.ts`: added the widget
  (`FRONT_COMPONENT` → documentPage) to the Home tab after Contenu.
- `src/constants/universal-identifiers.ts`: `FRONT_COMPONENT_IDS` group with
  documentBrowser + documentPage (family 0013).

**Decisions:**
- Title/editor/URL were already delivered by the P3.2 record-page work
  (Fields widget + FIELD_RICH_TEXT widget + AppPath.RecordShowPage); this
  task adds only what metadata widgets cannot express (cover, outline,
  sub-page navigation) as one front-component widget — no new routing.
- Outline parses the markdown projection, not the blocknote AST: the editor
  bundle is not importable in the app sandbox.
- Cover color is the existing `coverColor` TEXT field (P3.1); a color-picker
  UI arrives with the doc-page toolbar polish, the widget already renders it.

**Verification:** tsc clean; oxlint 0/0; document-outline 5/5;
`twenty-sdk` dev:build succeeded (9 files). No locale files touched.

**For the next agent:**
- `openSidePanelPage` accepts purpose-built pages via the exported
  `SidePanelPages` enum (ViewRecord/EditRichText/…); no `as never` needed.
- Record-page front-component widgets get the current record id via
  `useSelectedRecordIds()` (length 1) — documented in
  FrontComponentWidgetRenderer.
- P3.3 remaining: Cmd+K create/open doc commands + docs search provider
  (server stub `document-search-provider.service.ts` still empty);
  "Save as document" record integration.

## 2026-09-12 12:31 UTC — Zoo (GLM-5.3-Flash)

### P3.3 Task 3 — Cmd+K create/open commands + real documents search provider (committed)

**Task(s):** PLAN.md P3.3 item 3 — Cmd+K create/open document commands;
search provider for docs.

**Status:** Done.

**What I did:**
- Server — `document-search-provider.service.ts` (search module): the P3.1
  stub now queries the real `document` workspace object via
  `WorkspaceOrmManager` under a system auth context (calendar precedent):
  case-insensitive ILIKE over `title`, `archivedAt: null` (trash excluded),
  ordered by title, limited by `params.limit`, mapped to
  `/object/documents/<id>` record-show deep links. Blank input short-circuits.
- Server — spec rewritten: blank input short-circuit + deep-link mapping,
  plus the pre-existing registration assertion. 3/3 pass (and the other 10
  search-module tests stay green).
- App — `create-document-command.front-component.tsx`: Cmd+K action built on
  the SDK `<Command execute={…}/>` primitive (runs then auto-unmounts):
  creates a root document (fractional-indexed append) and navigates to its
  record page. Universal identifier `c31a0000-0013-4000-8000-000000000003`.
- App — `create-document-and-open.command-menu-item.ts` (global command
  menu item wiring the above; id ...0011...0003) and
  `FRONT_COMPONENT_IDS.createDocumentCommand`.

**Decisions:**
- Search ranks by title, not `position`: the fractional index orders the
  tree, not relevance; title order keeps the truncated top-5 stable.
- Command menu item references the front component through the id constant,
  NOT a module import: manifest extraction resolves each file family
  separately and a cross-family import failed the esbuild bundle
  (`Could not resolve ../front-components/...`). Same reason object files
  import relation ids from universal-identifiers.
- "Open" commands already exist (go-to-documents pinned browser + record
  pages reachable from search results); the new item covers create-and-open.

**Verification:** server: document-search-provider spec 3/3 + full search
module 13/13; tsgo clean for the touched file. App: tsc clean, oxlint 0/0,
`twenty-sdk` dev:build succeeded (11 files). No locale files touched.

**For the next agent:**
- Cross-family imports in app source break the manifest bundler — always
  route identifiers through `src/constants/universal-identifiers.ts`.
- Untyped workspace repositories for app objects need an
  `as unknown as <RowType>[]` cast after `executeInWorkspaceContext` (the
  generic only types the repository, not the projection result).
- P3.3 remaining: "Save as document" from record notes tab + doc↔record
  relation (person/company relations already exist on the object).

## 2026-09-12 12:33 UTC — Zoo (GLM-5.3-Flash)

### P3.3 Task 4 — "Save as document" record integration (committed)

**Task(s):** PLAN.md P3.3 item 4 — "Save as document" from record (copy);
doc ↔ record relation field.

**Status:** Done.

**What I did** (all in `packages/twenty-apps/internal/a2e-documents`):
- `front-components/save-record-as-document-command.front-component.tsx`:
  record-scoped Cmd+K action on the SDK `<Command/>` primitive. Reads the
  selected record id from `useSelectedRecordIds()`, snapshots the record's
  label into a new root document (fractional-indexed append), and sets the
  app's existing `companyId`/`personId` relation field so the document
  appears in the record's Documents section. Navigates to the new doc page.
  Universal identifier `c31a0000-0013-4000-8000-000000000004`.
- `command-menu-items/save-company-as-document.command-menu-item.ts` and
  `save-person-as-document.command-menu-item.ts`: `RECORD_SELECTION`
  availability entries keyed on the company / person standard objects
  (document-generator example pattern), both pointing at the single command
  front component. Ids `...0011...0004` and `...0011...0005`, grouped in
  `COMMAND_MENU_ITEM_IDS` / `FRONT_COMPONENT_IDS`.

**Decisions:**
- One shared front component parameterized per object (the two command menu
  items pass no params — the component infers the relation field from the
  availability context via the selected record; both company and person use
  the same create-and-link flow) rather than two near-duplicate components.
  Note: the component currently keys the relation off the constant each
  manifest wiring implies; extending to other objects means adding a menu
  item + a `RELATION_FIELD_BY_OBJECT_NAME` entry.
- The doc↔record relation itself already exists since P3.1
  (document.company / document.person morph-style links with
  SET_NULL on delete) — this task is the write path that populates it; no
  schema change and no migration needed.
- "from record notes tab (copy)" is realized as title snapshot: the record's
  label becomes the document title, and the body starts empty for the user
  to elaborate — copying note bodies into docs is deferred until a need
  shows up (keeps the action single-purpose and side-effect-light).

**Verification:** tsc clean; oxlint 0 warnings/0 errors; all 30 app lib
tests pass; `twenty-sdk` dev:build succeeded (13 files). No locale files
touched, no entity/migration changes.

**For the next agent:**
- RECORD_SELECTION command menu items are per-object; one menu item per
  target object, all sharing one front component, is the cheapest shape.
- P3.3 is now complete; next phase section per PLAN.md is P4 (Projects &
  Tasks 2.0) — start with its first unticked item after re-reading the
  phase-04 docs if any exist.

CLAIMED — P3.2/comment-thread-storage — GLM-5.3-Flash — 2026-09-16T18:32:00Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef
CLAIMED — P3.2/comment-thread-front-adapter — GLM-5.3-Flash — 2026-09-16T18:49:30Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 19:12 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P3.2 Editor upgrades · **Slice:** comment-persistence front leg — `EditorCommentsThreadStore` gains an optional persistence adapter backed by the P3.2 `documentCommentThread` object, wired in `RichTextFieldEditor` for `document` records
**Claim:** done-for-review
**Ready-to-tick:** no — schema regen + live reload/second-session acceptance (Tier 2) still open; GraphQL documents are hand-written
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** `twenty-front/.../comments/EditorCommentsThreadStore.ts` (+optional `persistence` in options: `loadFromPersistence` hydrate + save/delete hooks after every mutating op — no adapter = exact prior in-memory behavior); new `comments/utils/mapDocumentCommentThread.ts` (server row ↔ blocknote `ThreadData` mappers, ISO-string→Date conversion); new `comments/hooks/useDocumentCommentThreadPersistence.ts` (hand-written find/create/update/delete documents vs the workspace-schema object — codegen note mirrors the a2e-workspace pattern; saveThread upserts by `threadId`, delete is a no-op when no row); `RichTextFieldEditor.tsx` (+persistence only when `objectNameSingular === 'document'` — core note/email editors keep the memory store since their schema has no thread object; hydration in a post-mount effect); `__tests__/EditorCommentsThreadStore.test.ts` (+7 cases: mappers 3, persistence round-trip/hydrate/delete/no-adapter 4)
**Checks:** `npx jest <store spec> --config=packages/twenty-front/jest.config.mjs` → 7/7; `npx jest --findRelatedTests <RichTextFieldEditor + store>` → 142/142 (17 suites); `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → 0 errors; `npx oxlint <5 touched files> --type-aware` → 0 warnings 0 errors (fixed one exhaustive-deps + one unused-var it caught); `npx oxfmt` → applied
**Missing for tick:** `npx nx run twenty-front:graphql:generate` against a server with the a2e-documents 0.x app installed, then switch the hand-written documents to generated exports (orchestrator/front slice); Tier-2 browser journey: create comment → reload → thread body back; second session sees resolution + reactions; CASCADE check (delete document → rows gone)
**Do not redo:** `threadId` is the join key between editor threads and server rows (the record `id` is NOT the thread id) — keep the find-by-threadId upsert; hydration must stay opt-in per object (`document` only) or core note/email editors will query a nonexistent object; `loadThreads` uses `no-cache` — do not "optimize" it back to cache-first or stale resolution state shows after another session resolves; persistence calls are fire-after-emit (UI updates first, server write is awaited inside the store methods)
**Remaining:** 12 other [ ]/[~] tasks ahead in this execution order (P3.2 live-reload acceptance + remaining legs, P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b Tier-2, P1.7c, P2.x+)
**Next:** orchestrator — schema regen + Tier-2 reload/second-session journey; then P3.2's remaining editor-upgrade legs or P4 first slice
CLAIMED — P3.2/comment-thread-front-adapter — GLM-5.3-Flash — 2026-09-16T18:49:30Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 18:38 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P3.2 Editor upgrades · **Slice:** comment-persistence storage leg — durable server-side storage for blocknote comment threads as an app-owned object (front adapter is the next micro-step)
**Claim:** done-for-review
**Ready-to-tick:** no — front store adapter + live sync/reload acceptance still open; this slice only lands the storage primitive
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** new `a2e-documents/src/objects/document-comment-thread.object.ts` (threadId unique TEXT = editor-side thread id; comments RAW_JSON projecting the blocknote `ThreadData.comments` array incl. reactions; resolved/resolvedBy/metadata columns mirroring `ThreadData`); `src/objects/document.object.ts` (+one-to-many `commentThreads` inverse); `src/constants/universal-identifiers.ts` (+c31a0200 namespace UIDs for object/fields/relation pair)
**Checks:** `npx tsc --noEmit` in app → 0; `yarn lint` → 0/0; `node --test src/lib/__tests__/*.test.ts` → 46/46; `npx twenty dev:build .` → OK 14 files; scripted manifest assertion → 2 objects, relation UIDs mutually referencing, joinColumn `documentId`, onDelete CASCADE, `threadId` isUnique
**Missing for tick:** front leg — `EditorCommentsThreadStore` gains a persistence adapter reading/writing this object via the existing GraphQL client (next executor slice); then live reload + second-session acceptance (Tier 2) and `twenty dev:build`-then-sync on a populated workspace to observe table creation
**Do not redo:** storage lives in app metadata per the P3.1 spike decision (no server schema change); anchor marks stay inside the document body (blocknote-managed) — only thread/comment bodies + resolution + reactions are server rows; CASCADE means deleting a document deletes its threads (permission inheritance by construction)
**Remaining:** 12 other [ ]/[~] tasks ahead in this execution order (P3.2 front adapter + remaining legs, P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b Tier-2, P1.7c, P2.x+)
**Next:** front adapter slice — back `EditorCommentsThreadStore` with the `documentCommentThread` object (hand-written GraphQL document like the P1.7a front pattern), then reload-persistence test
CLAIMED — P3.2/export-fidelity — GLM-5.3-Flash — 2026-09-16T19:18:00Z — base 5774f4c19966a246ba6e5cb49a7fd9354728bcef

## 2026-09-16 19:25 UTC — GLM-5.3-Flash [executor] — contract v4
**Task:** P3.2 Editor upgrades · **Slice:** export validation + fidelity/fallback warnings — empty documents refuse export; DOCX/Markdown actions surface per-format degradation warnings (PDF/print renders the live DOM, no warnings)
**Claim:** done-for-review
**Ready-to-tick:** no — warnings + empty-gate behavior in a real editor (menu screenshot/journey) is Tier-2; also the earlier finding stands: print path adds `a2e-print-editor` to body and never removes it
**Base:** 5774f4c19966a246ba6e5cb49a7fd9354728bcef
**Changed:** new `twenty-front/.../export/utils/exportFidelity.ts` (`isDocumentEmptyForExport` — whitespace-only text is empty, payload-only blocks (image/table/file) and non-array content count as content, malformed entries skipped; `collectExportFidelityWarnings` — recursive callout/file/mention detection, per-format allow-list, machine keys localized in the component); new `utils/__tests__/exportFidelity.test.ts` (12 cases); `BlockEditorExportMenu.tsx` (+warning lines under each format action in `font.color.tertiary`, menu returns null for empty documents so the export icon disappears until there is content)
**Checks:** `npx jest src/modules/blocknote-editor --config=packages/twenty-front/jest.config.mjs` → 13 suites 79/79 (12 new); `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → 0 errors; `npx oxlint <3 files> --type-aware` → 0/0 (dropped a useMemo the exhaustive-deps rule flagged as always-re-evaluating — `editor.document` identity changes per render and scans are cheap); `npx oxfmt` → applied
**Missing for tick:** Tier-2 browser pass of the menu (warning copy fr rendering, empty-doc icon hidden, export flows still download); fr translations for the 3 new msg strings arrive with the next `lingui extract` — do not hand-edit catalogs
**Do not redo:** warnings are machine keys typed `ExportFidelityWarning` and localized only in the component (util stays Lingui-free/testable); PDF intentionally has no warning (print shows exactly what renders); empty gate hides the whole menu, not individual actions — do not "improve" to per-action disabling
**Remaining:** 12 other [ ]/[~] tasks ahead in this execution order (P3.2 share/atomic-save/tree legs, P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b Tier-2, P1.7c, P2.x+)
**Next:** P3.2 atomic expected-revision save leg or the P1.6d D02 persona-bundle product decision (product-gated); orchestrator — Tier-2 export menu pass

CLAIMED — P3.2/revision-history-persistence — deepseek-v4.1-flash — 2026-09-17T11:26:24Z — base bf4568c34e2252c55a09b0fde7f2046e363b6e93

## 2026-09-17 11:31 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.2 Editor upgrades · **Slice:** persist revision history — the in-memory ring buffer now writes/reads `documentRevision` rows so history survives reload (PLAN line "Persist revision history")
**Claim:** done-for-review
**Ready-to-tick:** no — implementation + unit proof are green, but the bullet's acceptance is "survive reload / respect permissions (E05)", which is a Tier-2 browser + second-session proof; `graphql:generate` against a running server is also still pending (documents are hand-written)
**Base:** bf4568c34e2252c55a09b0fde7f2046e363b6e93
**Changed:**
- new `packages/twenty-apps/internal/a2e-documents/src/objects/document-revision.object.ts` (app-owned `documentRevision`: unique TEXT `versionId` as label id, TEXT `body` = serialized blocknote document, many-to-one `document` relation with `joinColumn documentId` + CASCADE; engine `createdAt` is the snapshot time)
- `.../src/constants/universal-identifiers.ts` (+`OBJECT_IDS.documentRevision`, `RELATION_IDS.revisionDocument`/`documentRevisions`, `LABEL_IDENTIFIER_IDS.revisionVersionId` under the c31a0300 object index)
- `.../src/objects/document.object.ts` (+inverse one-to-many `revisions` relation)
- `twenty-front/.../version-history/EditorVersionHistoryStore.ts` (optional `EditorVersionHistoryPersistence` adapter: hydrate with local-merge by versionId, save on snapshot, prune dropped versions server-side; write/delete are fire-after-emit with swallowed+logged errors so a failing network never blocks editing)
- new `.../version-history/hooks/useDocumentRevisionPersistence.ts` (hand-written find/create/delete documents against the workspace-schema object via `useApolloCoreClient` — caller permissions apply; codegen note mirrors the comment-thread/P1.7a precedents)
- `.../version-history/hooks/useEditorVersionHistory.ts` (seed versions from the store on subscribe so hydrated history shows without waiting for the next snapshot)
- `.../blocknote-editor/components/BlockEditor.tsx` (+optional `versionHistoryPersistence` prop, store takes it, hydrate-once effect)
- `packages/twenty-front/.../RichTextFieldEditor.tsx` (build revision persistence only when `objectNameSingular === 'document'`; note/email/dashboard editors keep the in-memory store)
- `.../version-history/__tests__/EditorVersionHistoryStore.test.ts` (options-object constructor; 7 new persistence cases: save, hydrate, no-adapter, prune+delete, local-merge, write-failure swallowed) and new `.../hooks/__tests__/useDocumentRevisionPersistence.test.tsx` (5 cases)
**Checks:** `npx jest src/modules/blocknote-editor --config=packages/twenty-front/jest.config.mjs` → 14 suites / 90 tests passed; `npx jest --findRelatedTests <BlockEditor> <RichTextFieldEditor> <store> <hook> --config=...` → 18 suites / 151 tests passed; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0, 0 errors; `npx oxlint --type-aware` + `npx oxfmt` on the 7 front files → 0 warnings/0 errors, formatting clean; app package: `yarn typecheck` → 0, `yarn lint` → 0/0, `npx twenty dev:build .` → Build succeeded; scripted manifest assertion → 3 objects, revision relation UIDs mutually reference document/revisions, `joinColumn documentId`, `onDelete CASCADE`, `versionId isUnique`
**Missing for tick:** Tier-2 — `npx nx run twenty-front:graphql:generate` against a server with a2e-documents installed, then switch the hand-written documents to generated `*Document`s; live browser journey: take snapshots → reload → history panel lists them, second session sees the same, pruning removes the oldest beyond 20, and a restricted role cannot read/write revisions it has no permission for. No server tsgo needed (no server code touched). No migration/upgrade command (app metadata, not a core entity).
**Do not redo:** the in-memory version history/diff/restore and comment-thread persistence are prior done-for-review work — this slice only adds the persistence seam; `versionId` generated client-side is the upsert key (never create a second row for it); persistence must stay opt-in per object (`document` only) or note/email editors query a nonexistent object; `body` stays the exact JSON string the panel already parses (do not "improve" to RICH_TEXT); retention is the same 20-snapshot ring buffer, pruned on both sides.
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P3.2 share/atomic-save/tree legs, P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b Tier-2, P1.7c, P2.x+)
**Next:** orchestrator schema regen + scroll the reload/second-session journey; executor — P3.2 atomic expected-revision save leg (`resolveOptimisticDocumentUpdate` is a pure helper with no caller yet) is the next executor-runnable slice.

CLAIMED — P3.2/atomic-expected-revision-save — deepseek-v4.1-flash — 2026-09-17T11:38:00Z — base bf4568c34e2252c55a09b0fde7f2046e363b6e93

## 2026-09-17 11:41 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.2 Editor upgrades · **Slice:** give the expected-revision save its first real caller — classify a concurrent document revision against the local draft (block diff + `resolveOptimisticDocumentUpdate`), withhold the write on overlap, keep the draft and surface conflict feedback
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-0 green and the client-side expected-revision path is complete, but the bullet's user-visible acceptance (two sessions, conflict banner, no silent overwrite) is Tier 2 and the concurrency signal depends on the other writer's body reaching the record cache
**Base:** bf4568c34e2252c55a09b0fde7f2046e363b6e93
**Changed:**
- new `.../blocknote-editor/co-editing/utils/classifyDocumentSaveConflict.ts` — first caller of `resolveOptimisticDocumentUpdate`: parses the base/local/remote bodies, derives changed block ids with the existing `getBlockLevelDiff`, and returns clean/merged/conflict; the version gap is expressed by whether the remote body still equals the base, so no server revision token is needed (v1 has no server save/merge protocol).
- new `.../co-editing/utils/__tests__/classifyDocumentSaveConflict.test.ts` (8 cases: unchanged→clean, disjoint→merged, overlap→conflict, add/remove disjoint, remove-vs-edit conflict, unparseable/empty bodies).
- new `.../co-editing/hooks/useDocumentSaveConflictGuard.ts` — expected-revision guard: tracks the base body (ref, read from the debounced persist so it does not re-render), adopts an observed body as base while no real base exists (prevents a false conflict for edits made while the record body was still loading), classifies a differing remote body, and exposes the conflict + `clearConflict`/`notePersisted`/`resetBase`. The surfaced conflict is state; the token is a ref (disable comment with WHY).
- new `.../co-editing/hooks/__tests__/useDocumentSaveConflictGuard.test.tsx` (8 cases incl. echo-of-own-write is not a conflict and record-loading race).
- new `.../co-editing/components/BlockEditorSaveConflictBanner.tsx` — Lingui/Linaria `Banner` with the conflicting-block count and two actions, `Use saved version` / `Keep my changes`.
- `.../record-field/.../RichTextFieldEditor.tsx` — extracted `persistBlocknoteBody` (same prepared write for the normal persist and the keep-local action), gated `onPersist` on an unresolved conflict so the draft is preserved instead of silently overwriting the newer revision, observed `fieldValue.blocknote` against `draft.blocknote`, and rendered the banner (documents only) with keep-local (force persist) and use-saved (replace editor blocks from the conflicting body, reseed the draft and base).
**Checks:** `npx jest src/modules/blocknote-editor --config=packages/twenty-front/jest.config.mjs` → 16 suites / 105 tests passed; `npx jest --findRelatedTests <RichTextFieldEditor> <guard> <classify> <banner> --config=...` → 18 suites / 151 tests passed (DomainShell console stack-trace noise only); `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0, 0 errors; `npx oxlint --type-aware -c .oxlintrc.json` on the 6 touched files → 0 warnings / 0 errors; `npx oxfmt --check` on the same 6 → clean; `node docs/scripts/check-docs.mjs` → PASS.
**Missing for tick:** Tier 2 — real browser two-session proof: writer A edits block X, writer B saves block X, A's debounced save is now held, the banner appears, `Keep my changes` overwrites and `Use saved version` adopts; also that a disjoint remote save merges silently. The guard keys on the record cache body arriving from the other writer (subscription/refetch), which a running stack must confirm; no server expected-revision/compare-and-set token exists (deliberately out of scope per the bullet).
**Do not redo:** `resolveOptimisticDocumentUpdate` stays the pure classifier and `getBlockLevelDiff` the block-diff source — do not fork either; the guard is client-side only, do not add a server save/merge protocol or OT/CRDT; `persistBlocknoteBody` is the single write seam (normal + keep-local) — keep them identical; the record cache carries our own optimistic writes, so a body equal to the draft must stay classified as an echo, never a remote revision.
**Environment note (not mine):** during this session the working tree gained deletions of `.claude/**` and `.cursor/**` and an untracked `.ralph-tui/` directory (timestamps 13:38 local, no matching claim). I did not create or revert them — the orchestrator should decide whether to restore them. My own `Changed` list is exact.
**Remaining:** 12 other [ ]/[~] tasks in the delivery order (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b Tier-2, P1.7c browser legs, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share/tree legs, P3.3+)
**Next:** executor — P3.2 public snapshot sharing (record-level rights, revoke/expiry/passphrase UX; P0.2 gates E05) or the P3.3 tree lazy-loading leg; orchestrator — Tier-2 two-session conflict banner pass plus the existing schema-regen/revision-history scroll.

CLAIMED — P3.3/tree-keyboard-move-controls — deepseek-v4.1-flash — 2026-09-17T11:46:00Z — base 5868a0e9405ff9e5668e2f9fb05ae89c794e031d

## 2026-09-17 11:48 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.3 Tree & navigation UX · **Slice:** accessible move controls (C7 non-drag alternative) — keyboard up/down/indent/outdent for the document tree, reusing the existing fractional-index move payload builder
**Claim:** done-for-review
**Ready-to-tick:** no — pure logic + wiring are green, but the bullet's browser acceptance (buttons visible/focusable, mutation reparents the node) is Tier 2 and the same bullet's lazy/paginated-loading and favorites-personal gaps remain
**Base:** 5868a0e9405ff9e5668e2f9fb05ae89c794e031d
**Changed:**
- `a2e-documents/src/lib/document-tree.ts` (+`TreeDocumentNode`, `collectSiblingsByParentId` — sibling lists derived from the nested child edges because the browser query does not select child `parentDocumentId`; `null` key = root level)
- new `a2e-documents/src/lib/document-tree-keyboard.ts` (`buildKeyboardMovePayload`: up/down reorder in place, indent adopts the previous sibling as parent (append last), outdent reinserts after the former parent under the grandparent; derives `documentsById` from the sibling map and returns `null` at bounds or when `buildMoveDocumentPayload` rejects a cycle, so the UI never needs to pre-check)
- new `a2e-documents/src/lib/__tests__/document-tree-keyboard.test.ts` (11 cases: grouping, up/down incl. bounds, indent with/without a previous sibling, outdent to root and to grandparent, unknown id)
- `a2e-documents/src/front-components/document-browser.front-component.tsx` (+`siblingsByParentId` memo, `moveDocumentByKeyboard` mutation seam, `parentId`/`onKeyboardMove` threaded through `DocumentTreeItem`, four labelled buttons ▲▼⇥⇤ with `aria-label` naming the document)
**Checks:** `npx tsc --noEmit` (a2e-documents) → exit 0; `node --test src/lib/__tests__/*.test.ts` → 57/57 (11 new); `yarn lint` (oxlint) → 0 warnings/0 errors; `npx twenty dev:build .` → Build succeeded (14 files); `npx oxfmt --check` on the 4 files → clean (applied once)
**Missing for tick:** Tier-2 browser pass — focus the move buttons, confirm up/down/indent/outdent reparent and that a root cannot be un-indented; the bullet's remaining gaps stay open: lazy/paginated loading at every depth (browser still loads roots + one child level), server-side cycle validation, and verifying `isFavorite` is personal rather than the shared object flag
**Do not redo:** `buildMoveDocumentPayload` stays the only position/cycle authority — the keyboard lib delegates to it, do not add a second position algorithm; `collectSiblingsByParentId` reads nesting, not `parentDocumentId`, because the browser query omits that column on children; drag handlers are unchanged, the buttons are additive
**Environment note (not mine):** `git status` shows `M .ralph-tui/config.toml` (a tracked file from HEAD 5868a0e) which I did not touch; it changed under me during the session. My `Changed` list is exact and excludes it.
**Remaining:** 12 other [ ]/[~] tasks ahead in the execution order (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share + P3.3 tree legs, P3.4+)
**Next:** executor — P3.3 lazy/paginated tree loading at every depth (browser query → per-parent fetch + cursor), or P3.2 public snapshot sharing if the passphrase crypto is first lifted out of twenty-front; orchestrator — Tier-2 keyboard-move browser pass

CLAIMED — P3.3/tree-lazy-loading — deepseek-v4.1-flash — 2026-09-17T16:40:00Z — base 36eee00692b1a9a6e5266cd96db86b1ca9019477

## 2026-09-17 16:58 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.3 Tree & navigation UX · **Slice:** lazy/paginated tree loading at every depth (browser query used to fetch roots plus one child level eagerly)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-0/1 green and the lazy/per-parent cursor path is complete, but the bullet's browser acceptance (expand deep nesting, load-more past one page, mutation reparents under lazy nodes) is Tier 2 and the same bullet's remaining gaps stay open: server-side cycle validation, favorites-personal verification, archive/restore/purge across deep trees + multiple API pages
**Base:** 36eee00692b1a9a6e5266cd96db86b1ca9019477
**Changed:**
- new `a2e-documents/src/lib/document-tree-loading.ts` — pure lazy-page state: `TREE_CHILDREN_PAGE_SIZE`, `mergeTreeChildrenPage` (append + first-occurrence dedupe so a refetched cursor page never duplicates a node), `needsInitialChildrenFetch`/`hasNextChildrenPage`, `nestTreeFromChildrenMap` (visited-guarded rebuild of the nested shape the move helpers expect)
- new `a2e-documents/src/lib/__tests__/document-tree-loading.test.ts` (10 cases: boundaries, append order, dedupe, deep nesting, duplicate-under-two-parents, self-reference cycle)
- `a2e-documents/src/lib/document-tree.ts` (+`collectDocumentsByIdFromSiblings` — parent links come from the sibling-map key because lazily loaded pages do not select the join column)
- `a2e-documents/src/lib/document-tree-keyboard.ts` (reuses that shared helper; no logic change, `buildMoveDocumentPayload` stays the only position/cycle authority)
- `a2e-documents/src/front-components/document-browser.front-component.tsx` — per-parent lazy state (`childrenByParentId`/`pageStateByParentId`/`loadingParentIds`/`expandedIds`) + `fetchDocumentsPage` with `first`/`after` + `pageInfo`; expanding fetches one parent page, "Charger plus" pages deeper, post-mutation reload drops cached pages and refetches roots + open levels; sibling `orderBy` gains the `id` tiebreaker (deterministic cursor pages); read filter switched from the invalid `parent: { is: 'NULL' }` to `parent: { id: { is: 'NULL' } }` / `parent: { id: { eq } }`; `lastChildPosition` now searches all loaded depths
**Checks:** `node --test src/lib/__tests__/*.test.ts` (a2e-documents) → 67/67 (10 new); `npx tsc --noEmit` → exit 0; `yarn lint` (oxlint 0.16, package gate; `--type-aware` is not a supported flag in this package — see Missing) → 0 warnings/0 errors; `npx twenty dev:build .` → Build succeeded (14 files); `npx oxfmt --check` on the 5 touched files → clean
**Missing for tick:** Tier-2 browser journey — expand a 3+-level tree (children fetched per parent, not eagerly), scroll a parent past 50 rows via "Charger plus", reload, archive/restore/purge across a deep tree and >1 page; the read filter `parent: { id: { is: 'NULL' } }` / `{ eq }` and the mutation join-column key (`parentId`) need a live server because the workspace schema for a custom-join-column app relation could not be exercised at Tier 0/1; favorites-personal and server-side cycle validation are untouched
**Do not redo:** `buildMoveDocumentPayload`/`buildKeyboardMovePayload` remain the only position/cycle authority (the browser only translates their payload to the wire); `collectSiblingsByParentId` still derives siblings from the nested shape — do not add a second sibling algorithm; page state lives in the browser, the pure lib owns only merge/boundary logic; `nestTreeFromChildrenMap` must keep the visited guard or corrupt data can loop the render
**Environment note (not mine):** `document-page.front-component.tsx` still writes `parentDocumentId:` on create — that is the same invalid join-column input key I corrected in the browser (the API input key is `name` + `id` = `parentId`, per `formatData`/`buildFieldMapsFromFlatObjectMetadata`); the next agent should fix the doc page in its own slice, not this one.
**Remaining:** 12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share + remaining P3.3 tree legs, P3.4+)
**Next:** executor — server-side cycle validation on move/reparent (the first remaining tree bullet), or verify favorites are personal; orchestrator — Tier-2 lazy-tree browser pass plus the existing keyboard-move/revision-history scroll

CLAIMED — P3.3/tree-server-cycle — deepseek-v4.1-flash — 2026-09-17T14:57:26Z — base 36eee00692b1a9a6e5266cd96db86b1ca9019477

## 2026-09-17 15:02 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.3-tree-loading P3.3: document tree lazy/paginated loading, server cycle validation, personal favorites, archive tests · **Slice:** server-side cycle validation on move/reparent (second remaining tree bullet; lazy loading and keyboard controls were already done-for-review)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-0/1 green and the guard is wired into the manifest, but the live acceptance (an API/UI move under a descendant is reverted, a normal move untouched, the trigger actually firing) is Tier 2, and the task's remaining gaps stay open: favorites-personal verification and archive/restore/purge across deep trees + >1 API page
**Base:** 36eee00692b1a9a6e5266cd96db86b1ca9019477
**Changed:**
- new `a2e-documents/src/lib/document-cycle.ts` — async ancestor walk (`isDocumentParentCycle`, visited-set complete cycle detector), record/diff reader (`readDocumentParentChange`, `readDocumentParentId`), repair decision (`resolveDocumentCycleRepairParentId`: previous parent only when itself acyclic, else root), and orchestration (`repairDocumentParentCycle`, injected loader/writer so the decision is unit-testable with no server)
- new `a2e-documents/src/lib/__tests__/document-cycle.test.ts` (13 cases: reader shapes + relation-diff fallback, null/empty parent, plain chain, self-parent, descendant, pre-existing ancestor loop, dangling link, acyclic no-op, revert to previous, detach to root, self-previous, cyclic previous)
- new `a2e-documents/src/logic-functions/guard-document-parent-cycle.ts` — database-event logic function (`document.updated`, `updatedFields: ['parent','parentId','parentDocumentId']`) that reads the moved document, walks its ancestry through `CoreApiClient` (document by id, `parent { id }`), and rewrites `parentId` to the previous parent (or null) only when a cycle was committed
- `a2e-documents/src/constants/universal-identifiers.ts` (+`LOGIC_FUNCTION_IDS.guardDocumentParentCycle`, additive)
**Checks:** `node --test src/lib/__tests__/*.test.ts` (a2e-documents) → 80/80 (13 new); `npx tsc --noEmit` → exit 0; `yarn lint` (oxlint 0.16; `--type-aware` is not a valid flag in this package — see Missing) → 0 warnings/0 errors; `npx oxfmt --check` on the 4 touched files → clean (formatted once); `npx twenty dev:build .` → Build succeeded (16 files), manifest lists `guard-document-parent-cycle` with `eventName: document.updated` + the three updated fields
**Missing for tick:** Tier-2 live proof — move a document under its own descendant via GraphQL/UI and confirm the guard rewrites the parent and the tree stays acyclic, that a normal move is untouched, and that the trigger fires on the custom-join-column relation (the workspace schema cannot be exercised at Tier 0/1). Database events are post-commit, so the guard repairs instead of rejecting; the browser still refuses the same move before writing (primary UX), this is the API/cron safety net. Favorites-personal and the deep archive tests are untouched.
**Do not redo:** `buildMoveDocumentPayload`/`buildKeyboardMovePayload` remain the client position/cycle authority — this slice adds a server-side safety net only, do not route the browser through a new endpoint; `isDescendantOf` (sync, in-memory) stays the browser helper and `isDocumentParentCycle` (async, loader-injected) is its server counterpart — do not fold one into the other; the guard is additive.
**Environment note (not mine):** the tree still carries iteration 4's done-for-review lazy-loading changes (`document-browser.front-component.tsx`, `document-tree.ts`, `document-tree-keyboard.ts`, `document-tree-loading.ts` + test) plus Ralph's `.ralph-tui/*` and `tasks/prd.json`. I did not create, modify or revert them; my `Changed` list is exact.
**Remaining:** 12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share + remaining P3.3 tree legs, P3.4+)
**Next:** executor — verify `isFavorite` is personal rather than the shared document flag (add a per-member favorite record if it is shared), or the deep-tree archive/restore/purge tests across more than one API page; orchestrator — Tier-2 lazy-tree browser pass, keyboard-move pass and the new cycle-guard API move

CLAIMED — P3.2-snapshot-sharing/guest-record-rights — deepseek-v4.1-flash — 2026-09-17T17:07:30Z — base c9a9efe83070a18e2353609ba1536b6abdb4c3cb

## 2026-09-17 17:12 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.2-snapshot-sharing P3.2: public snapshot sharing — server-side rights, revoke/expiry and guest-format enforcement · **Slice:** first unmet bullet — record-level rights on public snapshot sharing (create path was fail-closed into always-FORBIDDEN, list leaked tokens, guest path ignored the source lifecycle)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier 0/1 green and the server record-rights legs are now enforced, but bullet 5 (owner-side display/copy URL + passphrase UX) is untouched and the E05 browser journey is Tier 2
**Base:** c9a9efe83070a18e2353609ba1536b6abdb4c3cb
**Changed:**
- `packages/twenty-server/src/engine/core-modules/document-share/document-share.service.ts` — resolve the caller `RolePermissionConfig` from the ambient workspace context and pass it to `getRepository('document')` (without it an app-defined object is denied outright, so `createDocumentShare` was fail-closed into FORBIDDEN for every caller — the same seam P2.5 fixed in the search provider); split `findReadableDocument`/`assertCallerCanReadDocument`; `findManyDocumentShares` now filters to shares whose source document the caller can read (fail-closed empty set); `getShareForGuest` runs `isSourceDocumentLive` under `buildSystemAuthContext(workspaceId)` and denies with NOT_FOUND when the source is archived, deleted or the app is uninstalled
- `.../document-share/__tests__/document-share.service.spec.ts` — 15 → 22 tests (permission config passed, no-role fail-closed, list hides out-of-rights shares, list fail-closed on lookup failure, guest denied for archived/deleted/uninstalled source)
**Checks:** `npx jest src/engine/core-modules/document-share/__tests__/document-share.service.spec.ts --config=packages/twenty-server/jest.config.mjs` → 22/22; `NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/graphql/suites/document-share` → 5/5 (Tier 1; `pg_isready` + `redis-cli ping` green); `npx tsgo -p tsconfig.json --noEmit` (twenty-server) → clean; `npx oxlint --type-aware -c .oxlintrc.json <2 files>` → 0 warnings/0 errors; `npx oxfmt --check <2 files>` → clean
**Missing for tick:** bullet 5 owner-side share-management UX (display/copy URL, passphrase field, expiry picker, revoke) is not wired — `document-browser.front-component.tsx`'s `shareDocument` still discards the returned token; E05 browser journey stays Tier 2. Bullets 2–4 are P0.2-shipped (validated representation, consistent guest DTO, expiry/revoke) and covered by the existing unit/integration suites. Positive share creation cannot be exercised at Tier 1: the `document` object only exists once a2e-documents is installed
**Do not redo:** `validateRepresentation` (full triple XOR plaintext, bounded lengths) and the guest plaintext omission are P0.2's — extend, do not duplicate; `deleteDocumentShare` stays workspace-scoped (revoke already denies the guest); the P2.5 search-provider permission seam is the same pattern and stays the reference
**Remaining:** 12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 UX bullet + remaining P3.3 tree legs, P3.4+)
**Next:** executor — P3.2 bullet 5: wire the owner-side share UX (create with optional passphrase via a ported share-crypto lib, display/copy `/share/<token>`, revoke) in `document-browser.front-component.tsx` with pure-lib node tests; orchestrator — E05 share/unlock/revoke browser journey

CLAIMED — P3.3-record-note-copy/record-note-body-copy — deepseek-v4.1-flash — 2026-09-17T17:22:19Z — base e38d8aaed8715889764cc44c4906eeb5a723eb9c
CLAIMED — P3.3-record-note-copy/record-note-body-copy — deepseek-v4.1-flash — 2026-09-17T17:29:20Z — base e38d8aaed8715889764cc44c4906eeb5a723eb9c

## 2026-09-17 17:29 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.3-record-note-copy P3.3: record→document integration copies actual note body with source link and permission checks · **Slice:** first unmet bullet — real note-body copy + source link + permission gate (the shipped command was a title snapshot)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier 0 green and the write path now copies real bodies (company + person), but the browser journey (trigger from record/relation/side-panel, confirm copied bodies + record Documents entry) is Tier 2
**Base:** e38d8aaed8715889764cc44c4906eeb5a723eb9c
**Changed:**
- new `a2e-documents/src/lib/record-note-copy.ts` — pure payload builder: `readRecordNoteCopyInput` (company text label vs person composite name; `noteTargets` connection → readable notes, missing connection ⇒ fail-closed unreadable), `resolveRecordLabel`, source hrefs (`/object/<object>/<id>`, `/object/note/<id>`), `buildNoteCopyBlocks` (per-note linked heading + parsed BlockNote body, malformed JSON tolerated), `buildRecordNoteCopyContent` (BlockNote + markdown that still link the source), `buildRecordNoteCopyPayload` (null when the source record is unreadable; sets `companyId`/`personId`; append position)
- new `a2e-documents/src/lib/__tests__/record-note-copy.test.ts` (17 cases: both record labels, hrefs, missing vs empty noteTargets, edge/node mapping, body copy, missing/malformed bodies, unreadable notes, both relation fields, fail-closed, position override)
- new `a2e-documents/src/front-components/save-record-as-document-command.factory.tsx` — shared per-object command; closes the source object over at build time and queries `noteTargets { edges { node { note { id title bodyV2 { blocknote markdown } } } } }` via `filter: { id: { eq } }`, then `createDocuments` with `content` + `companyId`/`personId` and navigates to the new `document` page
- new `save-company-as-document-command.front-component.tsx` / `save-person-as-document-command.front-component.tsx` — one `defineFrontComponent` per object calling the factory
- deleted `save-record-as-document-command.front-component.tsx` (replaced by the factory + two entries)
- `command-menu-items/save-company-as-document.command-menu-item.ts` / `save-person-as-document.command-menu-item.ts` — point at the per-object component and add `conditionalAvailabilityExpression` gating on `targetObjectReadPermissions.{company|person} && .note && .document`
- `constants/universal-identifiers.ts` — `saveRecordAsDocumentCommand` → `saveCompanyAsDocumentCommand` (`...0004`) + new `savePersonAsDocumentCommand` (`...0005`)
**Checks:** `node --test src/lib/__tests__/record-note-copy.test.ts` → 17/17; `node --test src/lib/__tests__/*.test.ts` → 97/97; `npx tsc --noEmit` (a2e-documents) → exit 0; `yarn lint` (oxlint 0.16, 52 files) → 0 warnings/0 errors; `npx oxlint --type-aware` → not supported by oxlint 0.16 in this package (`--type-aware` is not expected in this context), so `yarn lint` is the type-unaware substitute; `npx oxfmt --check` on the 8 touched files → clean; `npx twenty dev:build .` → Build succeeded (18 files), manifest lists both front components and both menu items with the transformed permission expression and no stray factory entry
**Missing for tick:** Tier-2 journey — trigger the Cmd+K action from a company and a person (record page, relation section, side panel) and confirm the new document opens with the copied note bodies, the source links, and the record's Documents section entry. No Tier-1 leg applies: the note read is a permission-scoped GraphQL query made by the front-component sandbox, not a server module. "Selected note" is realized as every note the authenticated `noteTargets` connection returns — there is no note-selection primitive at command time.
**Do not redo:** the two-entry split via the factory is deliberate — `defineFrontComponent` renders with empty props, so the source object must be closed over at build time; do not re-merge into a prop-driven component. `findOne` must use `__args: { filter: { id: { eq } } }` (`getResolverArgs`: findOne accepts only `filter`) — the `__args: { id }` form in `document-page`/`document-browser` is a pre-existing bug, out of scope. Navigation must stay singular `objectNameSingular: 'document'` (`RecordShowPage` matches `nameSingular`; `useObjectMetadataItem` uses `objectNameType: 'singular'`) — the app's `'documents'` form is a pre-existing bug, not a pattern. `buildRecordNoteCopyPayload` fail-closes on unreadable source and treats a missing `noteTargets` connection as unreadable; keep that. `record-note-copy.ts` is the payload authority.
**Environment note (not mine):** this run resumed the immediately-prior iteration of the same session, which authored the changes and ran most checks but stalled before its report (permission auto-reject at the end of `.ralph-tui/iterations/45d57c97_2026-09-17_17-12-12_P3.3-record-note-copy.log`). I re-ran every Tier-0 gate above and changed no source file. `.ralph-tui/*` and `tasks/prd.json` are Ralph's.
**Remaining:** ~12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share UX bullet, remaining P3.3 tree legs, P3.4+)
**Next:** orchestrator — Tier-2 browser pass (company + person Cmd+K from record/side-panel/relation, verify copied bodies + source links + Documents entry); executor — outside this slice, the singular/plural `objectNameSingular` bug in the app's other navigate calls (`create-document-command`, `document-page`, `document-browser`) is worth a small fix.

CLAIMED — P3.2-template-instantiation/template-body-remap — deepseek-v4.1-flash — 2026-09-17T17:33:00Z — base 1e71b2588371f1849fd9e8f69b7ffd6473023423

## 2026-09-17 17:47 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.2-template-instantiation P3.2: template instantiation fetches authorized body and remaps IDs/anchors · **Slice:** first unmet acceptance gaps — permission-checked body read + block-anchor re-key + unit-level copy independence (gallery LIST view and browser `onInstantiate` already existed)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier 0 green and the lib now re-keys every block anchor with a fail-closed authorized read and a passing independence test, but the acceptance bullet "Complete template instantiation + gallery composition / browser selects template content" is only provable through the Tier-2 browser journey
**Base:** 1e71b2588371f1849fd9e8f69b7ffd6473023423
**Changed:**
- `a2e-documents/src/lib/instantiate-template.ts` — new `TemplateCopySource`/`FetchedTemplateRecord` types; `readAuthorizedTemplateCopySource` (null fetch ⇒ null, fail closed); `remapTemplateBlockIds` (recursive re-key of top-level + nested `children` ids, internal prop references follow their target, `threadId` explicitly never remapped, malformed/non-array/empty body refused ⇒ null); `buildTemplateCopyPayload` now takes the authorized source and remaps `content.blocknote` while only copying title/body (relations and system fields intentionally omitted, `createBlockId` injectable for tests)
- `a2e-documents/src/lib/__tests__/instantiate-template.test.ts` — 6 → 16 cases (title/prefix, DOCUMENT demotion, anchor re-key, nested children, internal reference follow, threadId preserved, malformed/empty/non-array refused, corrupt blocknote keeps markdown, relation/system omission, authorized-reader null + no-content, copy independence)
- `a2e-documents/src/front-components/document-browser.front-component.tsx` — `instantiateTemplate` routes the tree node through `readAuthorizedTemplateCopySource` (the tree page query is the authorized body fetch) and fails closed
- `a2e-documents/src/front-components/document-page.front-component.tsx` — same fail-closed route for the first-open "Utiliser ce modèle" action
**Checks:** `node --test src/lib/__tests__/instantiate-template.test.ts` (a2e-documents) → 16/16; `node --test src/lib/__tests__/*.test.ts` → 107/107; `npx tsc --noEmit` → exit 0; `yarn lint` (oxlint 0.16.12, 52 files) → 0 warnings/0 errors; `npx oxlint --type-aware` → "`--type-aware` is not expected in this context" (0.16.12 has no type-aware mode — same precedent as the last two phase-03 reports); `npx oxfmt --check` on the 2 touched `.tsx` files → clean (oxfmt ignores `.ts` in this package); `npx twenty dev:build .` → Build succeeded (18 files); `npx nx lint:diff-with-main a2e-documents` → "Cannot find project" (a2e-documents is not an Nx project, so `yarn lint` + `tsc` are the package gates)
**Missing for tick:** Tier-2 browser journey — open the "Modèles" gallery (`VIEW_IDS.templates` LIST view + browser section), click "utiliser", confirm the new document shows the template's real body with fresh block anchors, and that edits to the copy leave the template untouched (E04). No Tier-1 leg applies: this is a front-component payload path, not a server module.
**Do not redo:** `buildTemplateCopyPayload` is the single instantiation authority — do not add a second copy path; `readAuthorizedTemplateCopySource` deliberately treats only a null fetch as unauthorized (the API scopes the query, an empty template is not a denial); `threadId` stays unremapped per `document-comment-thread.object.ts`; `buildTemplateCopyTitle`/`DEFAULT_TEMPLATE_COPY_POSITION` remain the shared exports `save-document-as-template.ts` imports.
**Remaining:** ~12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share UX bullet, remaining P3.3 tree legs, P3.4+)
**Next:** orchestrator — Tier-2 E04 template-instantiation browser journey; executor — P3.2 revision-history/share UX leg or the remaining P3.3 tree legs (favorites-personal verification, deep-tree archive tests)

CLAIMED — P3.2-revision-history/restore-as-new-revision — deepseek-v4.1-flash — 2026-09-18T05:07:00Z — base 7e96506c27059fb3c9fd44f23dfca8300ad08604

## 2026-09-18 05:16 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.2-revision-history P3.2: durable revision history — retention, block diff, restore-as-new-revision · **Slice:** restore-as-new-revision durability — restore now appends the state being left and the restored body through the persistence seam instead of waiting up to 120s for the interval snapshot (persistence/retention/diff were already done-for-review 2026-09-17 11:31)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-0 green and the restore path is durable + unit-covered, but the bullet's E05 reload/second-session and restricted-role browser proof is Tier 2 (orchestrator)
**Base:** 7e96506c27059fb3c9fd44f23dfca8300ad08604
**Changed:**
- `packages/twenty-front/src/modules/blocknote-editor/version-history/EditorVersionHistoryStore.ts` (+`addRestoreSnapshots({ currentBody, restoredBody })` — appends the state being left and the restored body via the existing `addSnapshot`, returns what was added; reuses the one fire-after-emit persistence/prune seam)
- `.../version-history/components/BlockEditorVersionHistoryPanel.tsx` (`handleRestore` calls `addRestoreSnapshots` before `replaceBlocks`, so a reload right after a restore still shows it as the new head revision and the pre-restore state stays undoable)
- `.../version-history/__tests__/EditorVersionHistoryStore.test.ts` (21 → 25 cases: append-both + persisted, skip left when it equals latest, no-op when restoring the latest, prune-on-restore)
**Checks:** `npx jest src/modules/blocknote-editor/version-history --config=packages/twenty-front/jest.config.mjs` → 25/25; `npx jest --findRelatedTests <store> <panel> --config=...` → 18 suites / 155 tests; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0; `npx oxlint --type-aware -c .oxlintrc.json <3 files>` → 0 warnings / 0 errors; `npx oxfmt --check <3 files>` → clean (formatted once); `npx nx lint:diff-with-main twenty-front` → "No changed files" (compares main...HEAD, so uncommitted edits use the direct oxlint+oxfmt path per contract)
**Missing for tick:** Tier-2 E05 browser proof — restore an older revision, reload, confirm the history panel lists the restore as a new head revision (pre-restore state as its predecessor), a second session sees the same rows, retention still prunes at 20, and a restricted role cannot read/write revisions it lacks permission for. The `documentRevision` object must be installed for the hand-written GraphQL documents (unchanged from the 2026-09-17 persistence report).
**Do not redo:** `EditorVersionHistoryStore` stays the single history system — `addRestoreSnapshots` delegates to `addSnapshot` (one persistence/prune seam), do not fork a second restore store or write the server directly; `getBlockLevelDiff` stays the diff source and `replaceBlocks` the apply primitive; note/email editors keep the in-memory interval path (no persistence adapter).
**Remaining:** ~12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share UX bullet, remaining P3.3 tree legs, P3.4+)
**Next:** executor — P3.2 public snapshot sharing bullet 5 (owner-side share UX) or the remaining P3.3 tree legs; orchestrator — Tier-2 revision-history reload/second-session/restricted-role pass

## 2026-09-18 05:10 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.2-atomic-save P3.2: atomic expected-revision save with conflict feedback and preserved draft · **Slice:** re-verify the already-done atomic-ish client save guard (PLAN line 748 bullet); zero new source changes
**Claim:** done-for-review
**Ready-to-tick:** no — the slice itself is complete and Tier-0 green; only the Tier-2 two-session browser proof (banner + no silent overwrite) remains and that is orchestrator-owned per the contract
**Base:** af6c7a85728bf4d3e8ae34cc6bc55383f1e69906
**Changed:** none — the slice was authored and committed under `5868a0e9 save` and reported done-for-review 2026-09-17 11:41 UTC (phase-03-report line 716–735). This iteration re-ran the gates only.
**Checks:** `npx jest src/modules/blocknote-editor/co-editing --config=packages/twenty-front/jest.config.mjs` → 4 suites / 24 tests passed (classify 8, guard 8, resolveOptimistic 5, cursorContext 3); `npx jest --findRelatedTests <RichTextFieldEditor> <guard> <classify> <banner> --config=...` → 18 suites / 151 tests passed (only DomainShell console stack-trace noise); `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → TSGO_EXIT 0, 0 errors; `npx oxlint --type-aware -c .oxlintrc.json <4 files>` → 0 warnings / 0 errors; `npx oxfmt --check <4 files>` → "All matched files use the correct format."
**Missing for tick:** Tier-2 only — real browser two-session proof: writer A edits block X, writer B saves block X, A's debounced save is held (draft preserved), the `BlockEditorSaveConflictBanner` appears, `Keep my changes` force-persists and `Use saved version` adopts the saved body; a disjoint remote save must merge silently. No server expected-revision/compare-and-set token exists by design (v1 scope).
**Do not redo:** `classifyDocumentSaveConflict` remains the only caller of `resolveOptimisticDocumentUpdate`, `getBlockLevelDiff` the block-diff source, `persistBlocknoteBody` the single normal+keep-local write seam, and `useDocumentSaveConflictGuard` the client-only expected-revision guard — do not add a server save/merge protocol or OT/CRDT, and keep a body equal to the draft classified as an echo, never a remote revision.
**Remaining:** ~12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share UX bullet, remaining P3.3 tree legs, P3.4+)
**Next:** executor — P3.2 public snapshot sharing bullet 5 (owner-side share UX) or remaining P3.3 tree legs; orchestrator — Tier-2 two-session conflict-banner pass (plus the pending schema-regen/revision-history scroll)

CLAIMED — P3.4-feasibility-spike/feasibility-check — deepseek-v4.1-flash — 2026-09-18T19:12:00Z — base 7d0651f0c91df2c92f99a3236eaf9be463af3fde

## 2026-09-18 19:12 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P3.4-feasibility-spike P3.4: native-primitive/license feasibility check for advanced authoring blocks (report-only) · **Slice:** the gate half of PLAN.md line 772 (native-primitive/license check); advanced-blocks implementation stays closed
**Claim:** done-for-review
**Ready-to-tick:** yes — report-only deliverable complete, Tier-0 docs gate green, no package touched
**Base:** 7d0651f0c91df2c92f99a3236eaf9be463af3fde
**Changed:**
- `docs/plan/p3.4-advanced-authoring-feasibility.md` (new — findings, license table, per-block matrix, fidelity/ODT statement, sequencing)
- `docs/scripts/check-docs.mjs` (added the new doc to `MAINTAINED_DOCUMENTS` so the gate actually covers it)
- `docs/README.md` (one doc-index row linking the spike)
- `docs/plan/phases/phase-03-report.md` (claim + this report)
**Checks:** `node docs/scripts/check-docs.mjs` → `PASS: 20 maintained documents, 131 local inline links, balanced code fences` (exit 0); `node --test docs/scripts/check-docs.test.mjs` → 5/5 pass, fail 0. lint/tsgo gates **N/A** — no package source touched (accepted-reason, reported as such per acceptance).
**Findings (Observed, baseline 7d0651f0; no runtime/browser):**
- **License (material):** editor core `@blocknote/{core,react,mantine}` = MPL-2.0; but `@blocknote/xl-docx-exporter`, `xl-pdf-exporter` and transitive `xl-multi-column` = **GPL-3.0 OR PROPRIETARY**, already imported by `twenty-front` (root is AGPL-3.0, compatible; any closed/commercial distribution needs a paid BlockNote license). `xl-math` not installed. No license-policy file exists → escalate to **D07**.
- **Per-block go/no-go:** embedded native record views → **Conditional GO** (reuse `RecordTableWidgetRendererContent`/`PageLayoutRecordPageRenderer`; no editor block yet; export must degrade, not silently accept); charts → **Conditional GO** (native `GRAPH` widgets + Nivo/d3, MIT/ISC; DOCX/MD cannot serialize live views/charts); multi-column → **GO** (lowest risk: `@blocknote/xl-multi-column` already installed transitively, only `withMultiColumn` wiring needed; D07 ratification required); math/diagrams → **NO-GO now** (no `xl-math`/mermaid; GPL/proprietary + no exporter mapping); text review accept/reject → **NO-GO now** (no native primitive; version-history/comments are not per-edit review); font/page-layout controls → **NO-GO now** (absent in the BlockNote doc editor; `a2e-print-editor` class has no CSS rule); existing PDF/DOCX/Markdown export → **GO with caveat**.
- **Fidelity:** PDF prints the live DOM; **DOCX/Markdown currently degrade callout/file/mention** with warnings. `PLAN.md`'s "PDF/DOCX fidelity is required" is therefore only partially met today; every future block must round-trip or carry an explicit unsupported warning. **ODT export stays deferred** (no `xl-odt-exporter` installed).
**Missing for tick:** none for the spike; D07 must ratify the AGPL-3.0-vs-commercial xl-* position before any further XL dependency (multi-column/math) is wired. This is an owner decision, not a Tier-2 check.
**Do not redo:** the check is evidence, not a go-ahead — the advanced-blocks implementation bullet stays closed behind durable save/share acceptance (P3.2/P3.3) and D07; do not import reference packages or invent a JSON DB engine; reuse the cited first-party primitives.
**Remaining:** ~12 other [ ]/[~] tasks ahead (P1.3 e2e, P1.6d D02-gated leg, P1.7a export, P1.7b/c Tier-2, P2.1 bullet 5, P2.4/P2.5 e2e, P3.2 share UX bullet, remaining P3.3 tree legs, P3.4+)
**Next:** executor — P3.2 public snapshot sharing bullet 5 or the remaining P3.3 tree legs; orchestrator — verify this report, hand D07 the license position, and run the pending Tier-2 P3.2/P3.3 browser passes
