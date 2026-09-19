# A2E Documents — notes, knowledge base and templates

A2E Documents is the knowledge part of the suite: a hierarchical tree of
workspace documents with rich-text content, reusable templates and read-only
sharing. Comment and version metadata objects are declared but not yet
surfaced (see below). It is one of the parts that compose the
intended **Bureau** work experience; Bureau itself has no separate
application definition. See the [feature guide](../../../../docs/features.md)
for how Documents fits next to Projects, Bilan, Drive and Discussions.

## Status and installation

**Status: source present, not release-certified.** The metadata and front
components described below exist in this package. That does not prove the app
is registered, published and installed on your server, nor that every journey
below has been exercised end to end.

To register, publish and install it on a disposable workspace, follow the
[applications runbook](../../../../docs/applications.md). The app pins an
older SDK than the workspace; check version compatibility before promising an
installation. The platform Docker build does not publish internal apps
automatically.

## Where users find it

- Sidebar entry **Documents** opens the `allDocuments` table view
  ([documents.navigation-menu-item.ts](./src/navigation-menu-items/documents.navigation-menu-item.ts)).
- The command menu (Cmd+K) exposes **Create document**, **Go to Documents**,
  **Create and open a document**, and **Save company/person as document**.
- Each document has a record page with a rich-text **Content** field and a
  front-component **Page** widget
  ([document.page-layout.ts](./src/page-layouts/document.page-layout.ts)).

## What it does

### Document tree

The `document` object ([document.object.ts](./src/objects/document.object.ts))
is self-referencing (`parent` / `children`, cascade), so documents form a tree.
The browser front component
([document-browser.front-component.tsx](./src/front-components/document-browser.front-component.tsx))
adds quick search, per-member favorites, drag-and-drop reparenting and reordering
(fractional-index positions), and a trash section with restore. A favorite is a
personal `documentFavorite` row keyed by the acting user
([document-favorite.object.ts](./src/objects/document-favorite.object.ts)); the
historical `document.isFavorite` boolean is a shared record flag and is
deprecated, not removed. Archiving sets
`archivedAt`; a daily cron destroys documents archived for more than
`TRASH_RETENTION_DAYS = 7`
([purge-archived-documents.ts](./src/logic-functions/purge-archived-documents.ts)).
A parent-cycle guard repairs an invalid reparent by restoring the previous
parent ([guard-document-parent-cycle.ts](./src/logic-functions/guard-document-parent-cycle.ts)).

### Content and relations

A document carries `title`, rich-text `content`, `icon`, `coverColor`,
`summary`, a `kind` select (`DOCUMENT` / `TEMPLATE`), tags
(`MEETING_NOTES`, `REFERENCE`, `DRAFT`), a deprecated `isFavorite` flag and
`archivedAt`. Personal favorites live on the `documentFavorite` join object.
It links to a `company` and a `person` (set null on delete); inverse
`documents` fields are added to those standard objects. The record page's
front component renders the cover, a Markdown heading outline and inline child
creation. "Save company/person as document" copies a record's notes into a
linked document.

### Templates

`post-install`
([post-install.ts](./src/logic-functions/post-install.ts)) idempotently seeds a
welcome document plus five starter templates from
[starter-templates.ts](./src/lib/starter-templates.ts):

- Modèle — Notes de réunion
- Modèle — Brief de projet
- Modèle — Spécifications produit (PRD)
- Modèle — Entretien individuel
- Modèle — Journal

The gallery lets a user instantiate a template (copies the body into a fresh
document, so editing never mutates the template), save a document as a new
template, and duplicate a template. Templates are listed in the `templates`
view.

### Sharing

A document can produce a share link that snapshots the current body; later
edits stay private until a new link is created. v1 shares are unencrypted and
the passphrase / share-management surface is not implemented yet.

### Comments and versions

The app declares `documentCommentThread` and `documentRevision` metadata
objects. There is no dedicated editing surface for them in this package yet;
do not advertise co-editing, comment threads or revision restore as shipped.

## Development

From this directory, after installing a compatible Node/SDK:

```sh
yarn typecheck
yarn lint
yarn test:unit
yarn twenty dev:build .
```

The unit tests cover the pure helpers (cycle repair, fractional positions,
template instantiation, trash retention, record-note copy); they do not prove
an installed workspace or a browser journey. Record real results with the
[verification guide](../../../../docs/verification.md).
