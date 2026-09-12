# Native implementation patterns

[Documentation home](../README.md) · [Product experience](../product-experience.md)

Reuse Twenty's metadata, UI and platform services before adding abstractions.
This guide describes design constraints and acceptance targets; it does not
prove every primitive mentioned below is currently exported or every planned
service exists. Inspect SDK exports and adjacent code at the version in use.
Repository conventions live in [AGENTS.md](../../AGENTS.md); SDK-required
exports and local app patterns are exceptions to generic host-code defaults.
Document a demonstrated gap and its simplest solution rather than treating
this guide as a reason to invent an API.

## 0. Prime directive

Twenty's strength is its **metadata-driven core**: objects, fields, views,
page layouts, filters, roles, workflows are DATA, provisioned per workspace.
Apps are the sanctioned way to ship new product surface on top of that
core. Our roadmap adds product modules through that system — users get
Notion/Huly/Bureau-class features that behave exactly like native Twenty
because they ARE native Twenty metadata + first-party code.

```
server core-modules  →  cross-cutting infra (realtime, notifications, AI)
server domain-modules →  module behavior (chat service, accounting jobs)
twenty-apps/internal  →  user-facing units of activation (objects/views/nav)
twenty-front modules  →  first-party UI where app sandbox is not enough
```

## 1. Concept → Twenty primitive mapping (NEVER invent replacements)

| Product concept | REQUIRED Twenty primitive | Forbidden alternative |
|---|---|---|
| New entity ("invoice", "project"…) | SDK `defineObject` in the app (metadata) | Hand-written TypeORM entity unless server logic demands it (then domain module + upgrade command) |
| List/table/kanban views | SDK `defineView`; check supported enum values at the installed SDK version | Custom React table/grid per object or invented view types |
| Record detail page | Page layout (`definePageLayout`) with standard widget types | Custom one-off detail screens (front components allowed only for genuinely novel layouts, e.g. Gantt) |
| Custom statuses (task columns) | Select field + `isDone`-style semantics via field options; kanban view groups on it | Separate status engine |
| Relations to CRM records | SDK relation fields to `company`/`person`/`opportunity` | String-id columns |
| Files/receipts | FILES field type → attachment/file-storage | Custom file tables |
| Rich text | RICH_TEXT (BlockNote JSON) + blocknote-editor | New editor stack |
| Permissions per module | App `defineRole` + workspace roles | Custom ACL tables |
| Automation ("on invoice paid → …") | Workflow engine (`workflow` module, workflow templates shipped by app) | Custom event handlers for user-facing automation |
| Scheduled jobs (recurring invoices, purges, ingest) | SDK logic-function cron triggers or existing server message-queue/cron; workflow recipes for user-configurable automation | Per-feature schedulers |
| Dashboard/widgets | Page layouts + widget types (existing enum; extend additively via upgrade command when a new type is truly needed) | Custom dashboard framework |
| Settings surfaces | Settings sections pattern (SettingsRoutes + settings nav) | Modal-only config |
| Feature availability | App install state + feature flags (kill-switch) | Env-var-only gating for user-facing features |
| Search | Search provider interface on the `search` core module | Per-app search endpoints |
| Commands | `defineCommandMenuItem` / pinned commands | Hidden keyboard handlers |
| Navigation | `defineNavigationMenuItem` (DB-backed nav; users can already reorder/hide in Settings → Experience) | Hard-coded routers |
| Localization | Lingui (`t` + msg), fr+en | Hard-coded strings, ad-hoc i18n |
| Money | Existing CURRENCY/amount primitives with currency and explicit rounding rules; Intl for display, not financial arithmetic | String money or inconsistent floating-point calculations |
| Version history (docs) | Domain module service + object (follow `note` patterns) | Git-style side system |
| Notifications | Notification core service (P8) + realtime gateway topics | Per-app polling endpoints |

## 2. App anatomy standard (every `a2e-*` app)

Mirror `packages/twenty-apps/internal/real-estate/` exactly:

```
src/
  application.config.ts       // defineApplication, fixed UUID
  objects/*.object.ts         // defineObject per entity
  fields/*.field.ts           // cross-object relation fields
  views/*.view.ts             // table; kanban/calendar only where meaningful
  page-layouts/*.page-layout.ts
  navigation-menu-items/*.navigation-menu-item.ts
  roles/*.role.ts             // minimum viable role grants
  logic-functions/           // validated lifecycle/event/cron functions
  command-menu-items/*.command-menu-item.ts
  front-components/*.front-component.tsx  // only for interactions metadata cannot express
```

Rules:
- One object per file; file name = object name. Match the SDK discovery
  pattern: existing app definition files use `export default defineObject(...)`.
  Do not add duplicate exports or remove SDK-required default exports to
  apply the host application's named-export convention mechanically.
- Every app object ships at minimum: a table view, a record page layout,
  a label identifier field, sensible `position`s on nav items.
- The app MUST be uninstallable: no orphan rows, no orphan nav items.
  Test install → uninstall → reinstall on a scratch workspace per app
  (task in each phase's acceptance).
- Heavy UI decision order: (1) metadata views/page layouts; (2) page-layout
  FRONT_COMPONENT widget; (3) dedicated front page feature-flagged — in that
  order. Log the choice in the phase report.

## 3. Server module standard (when apps need behavior)

- Domain module `src/modules/<domain>/` following existing anatomy
  (services, resolvers only if GraphQL beyond metadata CRUD is required,
  query-hooks pattern for record side-effects).
- Server tables: workspace entity files, snake_case, `workspaceId` scoping —
  EXCEPT instance-scoped catalogues (subventions) which are core-schema
  tables; document which one you chose and why.
- Jobs: BullMQ via message-queue; idempotent handlers; named queues
  (`a2e-<domain>`); never inline scheduling loops.
- Events in/out through `event-emitter`; financial mutations emit events the
  auto-journal and notification service consume (loose coupling, mirrors
  Twenty's own event flows).
- Guards: reuse engine guards (WorkspaceAuthGuard etc.) on any custom REST
  endpoints; GraphQL via metadata permissions or custom guards mirroring
  existing modules.

## 4. Front module standard

- New UI lives in `src/modules/<feature>/` with components/hooks/states/
  graphql subfolders — copy the structure of an adjacent module.
- Consume metadata objects through the standard object-record machinery
  (views, filters, context-store) — do not hand-roll record fetching for
  metadata objects.
- Styling: Linaria + twenty-ui components/tokens ONLY. Spacing/radius/shadow
  scales from the theme — no one-off magic numbers.
- State: Jotai atoms colocated in the module; cross-module via context-store
  or new shared atoms module — never prop-drilled globals.
- Side panel and tabs are the ONLY sanctioned "opens a thing" UX; deep links
  use existing URL patterns (`/object/<nameSingular>/<id>`).

## 5. End-to-end wiring checklist (per module, per phase acceptance)

A feature is NOT done when it "works standalone". It is done when:

- [ ] Object(s) visible in Settings → Objects (metadata) with correct icons/labels
- [ ] Appropriate views appear and behave (table; board/calendar where useful; filters/sort work)
- [ ] Record page renders via page layout (tabs: details, timeline, tasks,
      notes, files inherited for free — VERIFY they appear)
- [ ] Nav item present, reorderable, hideable like native items
- [ ] Cmd+K: create + go-to commands work; search provider returns results
- [ ] Side panel: record opens from mention/search/relation click
- [ ] Relations to/from CRM objects work both directions on record pages
- [ ] Realtime where applicable (chat/presence/inbox topics live)
- [ ] Notification types emitted and rendered in inbox (post-P8)
- [ ] AI tools registered; assistant sees object context (post-P9)
- [ ] Workflows/automation templates installed with the app
- [ ] Settings: any module settings live in a proper settings section
- [ ] fr + en complete; light + dark verified; responsive spot-check
- [ ] Uninstall/reinstall clean on scratch workspace
- [ ] Permissions: viewer/member/admin behave differently where the module
      restricts anything

## 6. Anti-hallucination verification anchors (grep these before believing)

Before using any API/pattern, verify it exists in-repo this session:

- App format: `packages/twenty-apps/internal/real-estate/src/**` (objects,
  views, page-layouts, nav items, roles, logic-functions) and
  `packages/twenty-apps/examples/media-notes/src/**` (front components,
  command menu items).
- SDK exports: `packages/twenty-sdk/src/**` — check the export exists
  (`defineObject`, `FieldType`, `ViewType`, `NavigationMenuItemType`…).
- Widget/view types: `packages/twenty-shared/src/types/page-layout/WidgetType.ts`
  and `packages/twenty-shared/src/types/ViewType.ts`; follow through to SDK
  exports, renderer support and metadata validation before adding a type.
  Persisted changes require the appropriate migration/upgrade path.
- Guards/services: `packages/twenty-server/src/engine/**` — import paths
  must match real files.
- Front patterns: the module you're extending (e.g.
  `src/modules/navigation/`, `src/modules/side-panel/`).
- Upgrade command rules: `packages/twenty-server/docs/UPGRADE_COMMANDS.md`
  + an existing command in `2-39/` as template.

If a needed primitive does not exist: STOP → deviation request in the phase
report → plan amendment. Never fake it.

## 7. Performance & quality norms (from Twenty's own patterns)

- Pagination/cursor patterns for every list (mirror existing query hooks).
- N+1 vigilance: batch loaders for relations in new resolvers.
- Virtualization for large surfaces (Gantt, chat scrollback, book grids).
- Redis caching for expensive aggregates (budget spent rollups) with
  explicit invalidation on writes.
- Feature-flag EVERY new core module surface; default-on but kill-switchable
  (env + admin), mirroring the `lab`/feature-flag modules.

## 8. What "keeps working" means (regression covenant)

- CRM flows (companies/people/opportunities, workflows, messaging) untouched
  in behavior; new relations are additive.
- Nav, command menu, search, settings render identically when no A2E app is
  installed (screenshot-diff spot check in P10).
- Upgrade path: a stock 2.39 workspace runs `upgrade` with all new commands
  cleanly and downgrades too.
- No new required env vars for core operation (only for opt-in features:
  AI providers, subvention ingest sources).
