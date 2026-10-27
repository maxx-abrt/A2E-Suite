# 03 — Trust, collaboration and offline

[Program overview](../../NOTION_WORKSPACE_PLAN.md) · [Execution guide](execution.md)

**Status:** planned; NW-00 and scheduling required. Root-plan homes: C4,
P3.2/P3.3/P3.4, P8, P10, M8d and unresolved D07. Guest editing remains gated
until the existing decision is explicitly resolved.

## Source landmarks and risk

Read the [revision repair helper](../../../packages/twenty-apps/internal/a2e-documents/src/lib/document-revision-cas.ts),
[share service](../../../packages/twenty-server/src/engine/core-modules/document-share/document-share.service.ts),
[comment persistence](../../../packages/twenty-front/src/modules/blocknote-editor/comments/hooks/useDocumentCommentThreadPersistence.ts)
and [mention index](../../../packages/twenty-apps/internal/a2e-documents/src/lib/document-mentions.ts).
These establish existing primitives, not complete collaboration guarantees.

The current revision helper describes repair after commit. Do not use that as an
atomic lock for merging offline or concurrent writes. The collaboration design
must trace all document writers, including imports, workflows, AI and raw APIs.
Old clients and repair handlers must not undo writes made by a new protocol.

## Task contracts

| ID | Depends on | Deliverable / boundary | Acceptance and negative case |
| --- | --- | --- | --- |
| C0 — Trust design | — | Design-only matrix of object/field/record/page permissions, inherited/direct grants, ownership, comment rights and guest identity; inventory current save writers | Record effective read/comment/edit/admin rules, child-page behavior, revocation, app uninstall and source of enforcement; distinguish live grants from public snapshots; identify the native extension path |
| C1 — Live page authorization | C0 accepted | Add only missing server enforcement using native permissions; migrations in a separate slice if required | Direct GraphQL/REST/save, revisions, search, backlinks, embeds, files and comments agree; denied pages reveal neither title nor snippet; parent move does not silently broaden access |
| C2 — Member sharing UI | C1 | Native member picker and explicit read/comment/edit grant controls | Preview effective access, save/reload, revoke and retry; non-admin cannot grant beyond own authority; commenting does not grant body edits; existing snapshot links remain clearly identified |
| C3 — Guest access | C1, C2; guest decision accepted | Separate identity/token/expiry API from UI; read/comment first, editing only under an accepted save protocol | Expiry/revoke checked server-side on requests/subscriptions/files; no workspace browsing; embedded records need independent access; existing encrypted snapshot recipient is not silently converted to a live member |
| C4 — Concurrent-save design | C0 accepted | Compare atomic revision-checked writes + three-way block merge against BlockNote-supported Yjs; choose one scoped protocol with compatibility/rollback plan | Specify same-block conflict, move/delete/insert ordering, comments anchors, persisted updates, reconnect and worker behavior; demo conflicting edits on two sessions; an in-memory proof alone cannot pass |
| C5 — Atomic save boundary | C4 accepted | Enforce the chosen server write protocol before enabling automatic merging; migrate or reject incompatible writers explicitly | Two equal-base writes cannot both silently replace content; response accurately reports durable state; old repair job cannot overwrite a newer accepted body; lost acknowledgment can be retried safely |
| C6 — Concurrent editor integration | C5 | One chosen merge/CRDT protocol, split transport, persistence and UI into distinct briefs | Two users edit separate and same paragraphs; reconnect/restart/reorder events; deterministic result or explicit recoverable conflict; no last-writer content loss; ACL change closes edit access |
| C7 — Offline-read design | C0 accepted | Decide cache ownership, opt-in policy, supported browsers/service-worker scope, eviction and revocation limits | Cached account/workspace separation and logout/switch clearing defined; remote revoke cannot instantly erase an offline copy and UI/docs say so; decide what may be cached before storing private content |
| C8 — Offline reading | C7 accepted | Read-only cached-page list and visible freshness/offline state; shell caching only as needed | Previously selected pages open without network, uncached ones explain unavailability, reconnect refreshes; cache is bounded and cleared per policy; offline UI never presents writes as saved |
| C9 — Offline-write design | C5, C7 accepted | Durable operation/draft contract compatible with C4; define idempotency, attachment limits, replay order and quota failure | Base revision, identity, pending/conflict/rejected states and permission recheck specified; local backup/recovery available; no unscoped localStorage queue |
| C10 — Offline editing | C6, C8, C9 accepted | Split durable draft persistence, replay and recovery UI into separate briefs | Edit/reload offline, reconnect to conflicting remote edit or revoked access, retry after lost response; no duplicate operations or overwritten remote body; failure preserves an exportable draft |
| C11 — Block references | A2, C5 | First stable source-document/block identity and deleted/moved/duplicated-block contract; then index migration and anchor UI separately | Multiple references to different blocks remain distinguishable; click scrolls/highlights correct block; copied/imported blocks get deliberate identities; deletion shows unavailable target without stale private text |
| C12 — Synced-block design | C11, C6 | Design-only ownership model using the existing content/save infrastructure | Choose source/reference representation, cycle/depth bound, permissions intersection, detachment, history/export, source deletion/uninstall and offline behavior; do not create a parallel document store |
| C13 — Synced blocks | C12 accepted | Read-only references first, edit-through second after conflict tests | One source rendered in two pages updates both; denied source exposes nothing; edit/retry/conflict uses C5/C6; detach creates independent content with fresh identity; export identifies the source or deliberate snapshot |
| C14 — Comment polish | C1 | Audit existing thread API; one brief each for reactions, resolve-all and subscriptions | Idempotent toggles, actor-scoped resolve permissions and bounded bulk operation; subscribe/unsubscribe persists, notifications dedupe through P8 and stop after access revocation; no duplicate thread store |

## Acceptance matrix

Test the effective permission on every read/write route, not only the share
dialog. Use owner, editor, commenter, reader, unrelated member, expired guest
and a second workspace. Include a readable page with an unreadable embedded
record, attachment or synced source. Resolve whether revealing counts is allowed;
hidden titles alone do not prevent inference.

Concurrency tests need two clients, durable storage, a server/worker restart and
both same-block and different-block changes. Offline tests need browser reload,
network loss after a successful write but before acknowledgment, quota exhaustion,
logout/switch, expired/revoked rights and recovery of pending content.

Executors run pure protocol/store tests and focused server integration according
to their briefs. Orchestrators run multi-session browser/storage journeys and
verify existing history, import, workflows and comments survive upgrade. Do not
advertise “real-time co-editing”, “guest editing” or “offline editing” until the
matching C6, C3/C6 or C10 evidence has been accepted.
