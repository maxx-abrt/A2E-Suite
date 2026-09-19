# Feature surfaces: what each app and page does

[Documentation home](README.md) · [Product experience](product-experience.md) ·
[Applications and installation](applications.md)

This guide is a **user-facing reference to behavior that exists in the source
tree**. It is deliberately separate from [product-experience.md](product-experience.md),
which describes acceptance targets that may not be implemented yet. For each
surface, the linked package README is the detailed reference.

The suite has two kinds of surface:

- **Installed apps** — `a2e-*` packages under
  [`packages/twenty-apps/internal/`](../packages/twenty-apps/internal/) that
  declare metadata (objects, views, navigation, roles, logic functions). They
  must be published and installed into a workspace; source presence is not an
  installation (see [applications.md](applications.md)).
- **Native pages** — first-party front surfaces in `twenty-front` that ship
  with the platform image (Drive, Discussions, Inbox, Home/workbench), some of
  which read the installed apps' records.

## Apps

| Product | Package | Display name | In A2E allowlist / presets | Feature guide |
| --- | --- | --- | --- | --- |
| Documents | `a2e-documents` | A2E Documents | Yes (all non-CRM presets) | [README](../packages/twenty-apps/internal/a2e-documents/README.md) |
| Bilan | `a2e-accounting` | Bilan | Yes (Non-profit, Small business) | [README](../packages/twenty-apps/internal/a2e-accounting/README.md) |
| Projects | `a2e-projects` | A2E Projects | No | [README](../packages/twenty-apps/internal/a2e-projects/README.md) |
| Drive | `a2e-drive` | A2E Drive | No | [README](../packages/twenty-apps/internal/a2e-drive/README.md) |
| Chat | `a2e-chat` | A2E Chat | No | [README](../packages/twenty-apps/internal/a2e-chat/README.md) |

**Bureau** is not a separate app: it is the intended work/knowledge experience
composed from Documents, Projects, Drive and Chat. There is no Bureau manifest
to install yet.

## Documents

A hierarchical tree of documents with rich-text bodies, favorites,
drag-and-drop reparenting, a trash with 7-day retention, company/person links,
and a template gallery seeded with four starter templates (meeting notes,
project brief, PRD, one-on-one). Share links snapshot the current body. See
the [Documents README](../packages/twenty-apps/internal/a2e-documents/README.md).

## Projects

Projects, milestones, labels, project members and time entries on top of
Twenty's native task engine, with a Kanban board, a monthly calendar, a Gantt
view, time tracking, human-readable task IDs (`KEY-n`), retroplanning and a
recurring-task workflow recipe. Two starter projects seed on install. See the
[Projects README](../packages/twenty-apps/internal/a2e-projects/README.md).
The "extract tasks from a document" AI tool is a deliberate stub.

## Bilan

The finance app: dashboard, quotes/invoices, expenses and income, an automatic
ledger, budgets, official fiches and a public funding catalogue. See the
[Bilan README](../packages/twenty-apps/internal/a2e-accounting/README.md).

## Drive

A folder tree and organisation layer over Twenty's existing attachments, with
starring, descriptions, a source-app tag, a trash and an upload queue. The
native page lives at `/drive`. Files stay in Twenty's file storage; Drive adds
metadata, not a second store. See the
[Drive README](../packages/twenty-apps/internal/a2e-drive/README.md).

## Discussions (chat)

Workspace, project and on-demand channels with threads, reactions, mentions,
typing presence and read cursors. The native page lives at `/discussions`.
Live updates flow through the realtime gateway over a
`workspace:<id>:chat:<channelId>` topic; installs therefore need Redis and a
WebSocket-capable proxy (see [DEPLOY.md](../DEPLOY.md)). See the
[Chat README](../packages/twenty-apps/internal/a2e-chat/README.md).

## Inbox

A native notification page at `/inbox` for mentions, assignments and watched
records. It is not an app object: notifications are core-schema rows, grouped
by day with category tabs (all / mentions / assigned / watching), bulk
mark-read and archive, and a live topic `workspace:<id>:inbox:<userId>`. The
page refetches durable rows and folds realtime events on top, so a reconnect
cannot duplicate a notification.

## Installation and help

- Find, publish and install apps: [applications.md](applications.md).
- Run the suite: [DEPLOY.md](../DEPLOY.md).
- Run checks locally: [verification.md](verification.md).
- Contribute an app: [app authoring guide](../packages/twenty-apps/README-A2E.md).

## Evidence and honesty

These guides describe what the code declares. They use the vocabulary in
[docs/README.md](README.md#evidence-vocabulary): **observed** in source does
not mean **verified** in a running deployment. Where a capability is partial or
deliberately inert, the app README says so instead of advertising it as done.
