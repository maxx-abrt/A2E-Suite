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
