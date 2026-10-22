# Bureau workspace — implementation and verification

[Delivery plan](../PLAN.md) · [Applications](applications.md) · [Verification](verification.md)

Updated **2026-10-22**, starting from `2741c7e2`. PLAN.md remains the release
acceptance reference. This replaces the Emergent handoff and its estimated
completion percentage; the old preview environment is not the local runtime.

## 2026-10-23 home increment

The Bureau home now combines a small animated pixel progress card, a native
editable task sheet, recent pages and starter templates. It uses Twenty theme
tokens for both themes and collapses to one column on narrow screens. Motion
honors `prefers-reduced-motion`. This is the in-app Bureau home; no separate
public marketing website was added.

The sheet reuses saved native task table views, including their fields, filters,
sorts, inline edits and record-opening behavior. It prefers a view containing
the readable priority field when available, otherwise the native index. The
full task link retains the selected view. Table state is isolated from the
ordinary task index and resets when workspace object metadata changes. Native
permissions gate read and update paths. Priority and parent/subtask relations
continue to require the existing Projects application fields; this increment
does not install Projects or introduce another task model or nested task editor.

Daily progress uses server aggregate counts across tasks assigned to the
current workspace member and due during today in the member's configured time
zone. It follows Projects' pipeline status when that field is readable, with
native status as the fallback for tasks whose app pipeline is unset. Counts
refresh through the existing native mutation/aggregate path. Day boundaries
advance at midnight or when the window regains focus. Loading and provider
errors do not display invented completion percentages; an empty day shows 0%.

Thirty focused home/sheet/progress/embedded-view tests and the production
frontend build passed. Browser layout, real inline-edit persistence, cross-user
updates and production journeys still need acceptance verification; see the
[dated phase report](plan/phases/phase-13-report.md).

## Product contract

The **2026-10-23 Notion import hardening** adds native column/callout/checklist
conversion, source-media URL preservation, file figures, Notion page-link
remapping, per-path review details, raw ZIP path validation, empty-page support
and workspace checks through the upload/attachment pipeline. Existing native
parsers, records, permissions and storage remain in use. See the
[compatibility and recovery guide](notion-import.md); full Notion parity and
live two-account acceptance remain unverified.

- One Twenty shell, workspace identity, permission model and storage system.
- App navigation focuses the existing native folder when its link is opened;
  **All apps** restores workspace navigation without leaving the current page.
  Folder names and native links remain editable; no separate app registry.
- Bureau prioritizes full-page writing at `/bureau/:documentId`, while native
  record pages, side panels, projects, tasks and cross-app references remain
  available. The `document` identity is shared by all of those surfaces.
- Keep the existing BlockNote schema and its rich blocks, columns, tables,
  media, mentions, page links and native view embeds. No editor replacement or
  new premium dependency was introduced. Existing Syna behavior is unchanged.
- New host UI strings use Lingui with English source text. Production Docker
  already extracts/compiles front catalogs before building. Generated catalogs
  are not part of this change.

## Delivered in this change

- [x] Connect the existing tree/actions to Twenty's native drawer and register
  `/bureau/:documentId`; retain the Bureau landing, templates and record views.
- [x] Load/seed the selected record before mounting the existing rich-text
  editor. Save titles on debounce, blur and navigation; offer retry on failure.
  Flush pending editor serialization when leaving a page.
- [x] Mount breadcrumbs, personal favorites, emoji icons, cover picker and
  reading controls. Respect native field read-only state and existing locks.
  Older installations keep writing available and hide unavailable controls.
- [x] Add title/body search, keyboard selection, escaped literal queries and
  loading/error states. Pending searches cannot open an old result.
- [x] Mount trash with paginated subtree restore, orphan recovery, Undo, and
  an explicit permanent-deletion confirmation. Mutation controls follow object
  permissions; server authorization remains authoritative.
- [x] Add Notion import preview and progress: HTML/Markdown files or ZIPs,
  nested page hierarchy, supported BlockNote formatting and tables, uploaded
  local images/linked files, rewritten page links (including table cells).
  Unreferenced assets are attached to the first imported page.
- [x] Reuse the existing archive codec, sanitizer, BlockNote parser, URL mapper,
  record mutations and attachment uploader. Stable page IDs and an in-dialog
  session allow failed writes to resume without making duplicate pages.
- [x] Bound archive processing: 100 MB input, 5,000 ZIP entries and 250 MB
  uncompressed; reject traversal/duplicate paths. Keep the modal open while
  importing and explain conversion limitations before creating records.

## Evidence from this session

- Frontend: uncached `tsgo`, direct type-aware oxlint; focused Bureau/import/
  navigation/application-catalog Jest checks. Exact final counts and build
  evidence are in [the phase report](plan/phases/phase-13-report.md).
- Existing server install-readiness, already-installed and uninstall-preflight
  tests: **3 suites, 17 tests passed**.
- Local server was rebuilt from source. The backed-up development database
  received the repository's two missing instance migrations. No database reset.
- Existing Bureau package `0.2.14` built and published to the **local scratch
  registry**; native CLI upgrade of the Apple seed workspace completed with
  **1 upgraded, 0 failed**. The document written before upgrade survived.
- Browser: login, full-page creation/writing and reload; imported HTML archive
  with two nested pages, formatting/table, working page links and a successfully
  loaded workspace-stored image; child breadcrumbs; personal favorite; body
  search. These are local development proofs, not production certification.

## Remaining release acceptance

- [ ] Verify large real customer exports, missing/duplicate assets, malformed
  archives, interruption/reconnect, low-storage and negative permissions in two
  workspaces. The tested archive is a synthetic Notion-shaped fixture.
- [ ] Notion database formulas, relations, view configurations, sharing and
  comments need an explicit migration contract. HTML/Markdown export conversion
  cannot reconstruct features that those formats do not represent. CSVs
  remain files; they do not become native databases automatically. Nested ZIPs remain downloadable attachments; their contents are not recursively
  converted. Unlinked assets are preserved as attachments.
- [ ] Persist import recovery beyond closing/reloading the dialog; expose
  per-file fidelity details and a subtree export/re-import journey.
- [ ] Finish the broader PLAN.md gates: clean deployment provisioning, persona
  bundle/retry/seeding, safe removal/reinstall on disposable workspaces,
  populated upgrades for every app, cross-app permission journeys and worker
  execution. Only the Bureau populated upgrade was run here.
- [ ] Finish M8 backlinks widget/daily note and the full E14 embedded-view edit,
  reload and export journey. Existing editor tools are reused, not newly
  certified as lossless collaboration or export.
- [ ] Cross-device/mobile and accessibility acceptance, cover-upload workflow,
  concurrent-edit conflict recovery and production deployment checks remain
  part of the release matrix even after focused local checks pass.
