# Notion import into Bureau

[Bureau delivery evidence](BUREAU_PLAN.md) · [Phase report](plan/phases/phase-13-report.md)

## Import a workspace export

Open the destination A2E workspace, then **Bureau → Import** and choose
**Notion** (or **Markdown & HTML** for another source).
The dialog identifies the destination workspace. Export the source Notion
workspace or pages as **HTML**, including subpages and files, and select the ZIP.
Markdown exports and individual HTML/Markdown files also work. HTML carries
more layout information than plain Markdown.

Drop one ZIP or use **Choose file**. Before accepting, browse/search the nested
page list and select pages to preview their converted content with Bureau's
read-only BlockNote editor, including local media. Previewing does not create
records or upload files. Missing media and conversion warnings are shown; page
links stay inactive until import. The preview uses temporary local URLs that
are released when switching pages or closing the window.

Choose **Bureau root** or an existing page in **Import into**. Opening import
from a page preselects that page; the selection can be changed before starting.
Imported roots are appended beneath the chosen destination and descendants stay
beneath their imported parents. The destination stays fixed during retries.

Notion documents its export options and notes that inaccessible/private pages
and some teamspace content can be absent from an export. An importer cannot
recover pages that are missing from the source archive. See
[Notion's export guide](https://www.notion.com/help/export-your-content).

Each import targets the currently selected A2E workspace. Export/import different
source workspaces separately; importing content does not create accounts,
memberships or workspaces, or grant Notion users access to the destination.
Bureau's Documents application and native document write permission are required.

## Current compatibility

| Exported content | Import behavior |
| --- | --- |
| Pages and subpages | Reconstructed from hashed filenames and hash-free child folders; grouping directories without a page become container pages. HTML/CSV companions share one native page identity; source ordering is retained |
| Headings, rich text, lists and code | Parsed by the existing BlockNote editor; bold, italic, strike, inline code, text colors and highlights are retained. Export CSS color values are converted to native inline styles |
| Page properties | Kept as an editable table, including date text, status/select labels, links and file references outside the exported page body |
| Equations | Original exported LaTeX is retained as editable code, rather than importing flattened KaTeX rendering. Typeset native math editing is not implemented |
| HTML column layouts | Native editable columns, including nested columns and relative widths |
| Callouts | Native callout with source emoji, background/text colors, inline formatting and nested blocks |
| Checkboxes and toggles | Native checklist state and nested toggle content; imported checkboxes do not automatically create task records |
| Simple tables | Native editable tables; links inside cells are rewritten |
| Local images, audio, video and file figures | Uploaded through native workspace file storage and related to the imported document; rich captions retained as adjacent paragraphs when native media captions cannot carry their links/formatting |
| Page links | Relative archive links and matching absolute Notion page URLs point to new documents; fragments are retained, but block-anchor scrolling is not certified |
| External links/media | Retained as external references; remote files are not downloaded or made permanent |
| Executable embeds | Safe iframe destinations become links; active content is removed |
| Original export and unreferenced files | The original ZIP/HTML/Markdown input is attached to the first imported page for recovery. Other files go to their nearest owning page; source CSVs stay on their canonical database page |
| CSV databases | Editable table snapshots (up to 1,000 rows including the header and 20,000 cells), with the original CSV attached to its database page. When HTML and CSV describe the same source page, CSV data is retained in an expandable table snapshot on that page, including columns hidden by the HTML view. Larger/malformed files retain their parent page and original attachment; review is required. These are not live databases |
| JSON and nested ZIPs | Preserved as attachments; not recursively extracted |
| macOS export metadata | `__MACOSX`, resource forks and `.DS_Store` are ignored |
| Formulas, rollups, database relations/views, comments, sharing and history | Not migrated as native behavior |
| Page covers/icons and arbitrary Notion-only blocks | Full visual/semantic fidelity is not certified; keep the export and review the result |

The completion dialog lists page/file paths needing review. Sanitizer removals
and missing attachment/link mappings contribute to this report. This is a
conversion report, not an assertion that every Notion feature has an equivalent.

## Recovery and limits

- ZIP input: up to **100 MB**, **5,000 entries**, **250 MB uncompressed**.
  Unsafe and normalized duplicate file paths are rejected before extraction.
  Empty page files are retained.
- A failed file upload retains a readable reference and caption, saves other page
  content and continues importing other pages. The error identifies the source
  path and transport detail; Retry returns to pending work.
- The open dialog retains allocated page IDs, completed pages and known upload
  results. Retry continues that session. A lost create response is checked
  against the exact allocated ID and expected page properties before continuing.
  Existing pages are never matched or merged by title. Attachment retries reuse a
  completed upload and an allocated native attachment ID; a lost attachment-create
  response is verified against that exact ID, filename and file identity.
- Workspace changes or closing/unmounting the importer stop subsequent import
  operations, including upload finalization and attachment creation. Requests
  already sent can finish; existing server authorization remains authoritative.
- Closing the dialog or reloading loses its in-memory recovery state. Review
  already-created pages before starting a new import. Uploads whose successful
  response was lost are not covered by a durable deduplication guarantee.

## Verification boundary

Automated checks cover the real BlockNote/multi-column parser and serialized
editor reload, archive hierarchy/link/upload retry logic, workspace-switch
guards, native permission affordances and upload stages. The native-parser
test uses the library's real default blocks plus matching callout/file property
contracts, without mounting the application's React renderer.

The 2026-10-27 follow-up audited the supplied 305-entry customer ZIP locally:
282 HTML files, nine CSVs, fourteen binary media/files; six HTML/CSV companion
pairs become one page each. The resulting tree has 286 pages (including one
container), 284 nested pages and all 36 exported property tables. All local
references resolve and all pages parse and reload through the real native
parser. The audit uses storage/mutation callbacks, so it does not certify live
server uploads. The private archive is not included in the repository.

Run the reusable offline audit from the repository root:

```sh
node packages/twenty-front/scripts/audit-notion-export.mjs /path/to/export.zip
```

The audit checks parent-first creation, unique block IDs, source text character
inventories, formatting inventories, local reference resolution, byte-identical
file handoff and serialized editor reload. It reports word-boundary differences
separately; these inventory checks do not certify pixel-perfect rendering or
full semantic equivalence.

Rendered light/dark/mobile review, live two-account
server/storage isolation, production permissions and import recovery after a
browser reload still need acceptance verification. This importer is not a
lossless Notion workspace migration or a release certification.
