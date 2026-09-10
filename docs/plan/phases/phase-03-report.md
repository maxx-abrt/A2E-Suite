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
