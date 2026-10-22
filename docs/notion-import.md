# Notion import into Bureau

[Bureau delivery evidence](BUREAU_PLAN.md) · [Phase report](plan/phases/phase-13-report.md)

## Import a workspace export

Open the destination A2E workspace, then **Bureau → Import from Notion**.
The dialog identifies the destination workspace. Export the source Notion
workspace or pages as **HTML**, including subpages and files, and select the ZIP.
Markdown exports and individual HTML/Markdown files also work. HTML carries
more layout information than plain Markdown.

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
| Pages and subpages | Reconstructed from the export folder structure; new native document identities |
| Headings, rich text, lists and code | Parsed by the existing BlockNote editor; no replacement editor |
| HTML column layouts | Native editable columns, including nested columns and relative widths |
| Callouts | Native callout with inline formatting and nested blocks |
| Checkboxes and toggles | Native checklist state and nested toggle content; imported checkboxes do not automatically create task records |
| Simple tables | Native editable tables; links inside cells are rewritten |
| Local images, audio, video and file figures | Uploaded through native workspace file storage and related to the imported document; figure captions retained where supported |
| Page links | Relative archive links and matching absolute Notion page URLs point to new documents; fragments are retained, but block-anchor scrolling is not certified |
| External links/media | Retained as external references; remote files are not downloaded or made permanent |
| Executable embeds | Safe iframe destinations become links; active content is removed |
| Unreferenced files | Preserved as attachments on the first imported page |
| CSV databases, JSON and nested ZIPs | Preserved as attachments; not converted into live databases or recursively extracted |
| Formulas, rollups, database relations/views, comments, sharing and history | Not migrated as native behavior |
| Page covers/icons and arbitrary Notion-only blocks | Full visual/semantic fidelity is not certified; keep the export and review the result |

The completion dialog lists page/file paths needing review. Sanitizer removals
and missing attachment/link mappings contribute to this report. This is a
conversion report, not an assertion that every Notion feature has an equivalent.

## Recovery and limits

- ZIP input: up to **100 MB**, **5,000 entries**, **250 MB uncompressed**.
  Unsafe and normalized duplicate file paths are rejected before extraction.
  Empty page files are retained.
- The open dialog retains allocated page IDs, completed pages and known upload
  results. Retry continues that session. A lost create response is checked
  against the exact allocated ID and expected page properties before continuing.
  Existing pages are never matched or merged by title.
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

Real customer exports, rendered light/dark/mobile review, live two-account
server/storage isolation, production permissions and import recovery after a
browser reload still need acceptance verification. This importer is not a
lossless Notion workspace migration or a release certification.
