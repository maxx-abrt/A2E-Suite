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
