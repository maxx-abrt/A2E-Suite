# Report 03 — Integration Blueprint (how every module plugs in)

> Target architecture, not a current-feature inventory. Reconciled 2026-09-12.
> Reuse native primitives; document a concrete gap before adding a new one.

[Documentation home](../README.md) · [Current app behavior](../applications.md)

The realtime session/catch-up design, app AI registration, complete starter
packs, global funding catalogue and notification service described below are
acceptance targets, not all implemented contracts. Consult the codebase map
and audit before relying on any named API; in particular `registerAiTools` is
proposed, not an SDK export established by this guide.

## 1. Two extension tracks

**Track A — Core primitives (server engine modules).** Cross-cutting
infrastructure every app depends on: realtime gateway, presence, notification
service, AI orchestration, search federation, module registry. Implemented as
`twenty-server/src/engine/core-modules/*` Nest modules + matching
`twenty-front` modules. Gated by feature flags; always additive; never
workspace-breaking when disabled.

**Track B — Product apps (`packages/twenty-apps/internal/*`).** Documents,
Projects & Tasks 2.0, Chat, Drive, Accounting, Inbox. Each is a first-party
app authored in the SDK format (reference:
`packages/twenty-apps/internal/real-estate/`): `application.config.ts`,
`objects/`, `fields/`, `views/`, `page-layouts/`, `navigation-menu-items/`,
`roles/`, `logic-functions/` (incl. post-install), `command-menu-items/`,
`components/` (front components), and heavyweight UI as front components or
first-party front pages feature-flagged in.

Hybrid rule: domain behavior needing transactions, durable state or privileged
server operations belongs under `src/modules/<domain>/`; cross-cutting behavior
belongs in core. SDK logic functions already support scheduled/event work, so
cron alone is not a reason to add a new domain module. Specify install gating,
permissions and lifecycle explicitly; there is no assumed automatic feature-
flag registration. The app remains the user-facing activation unit.

Bureau should compose existing Documents/Projects rather than duplicate their
objects; its packaging decision is pending. Bilan is `a2e-accounting`. See the
[product contract](../product-experience.md).

## 2. Naming, ids and conventions

- Apps: `a2e-documents`, `a2e-projects`, `a2e-chat`, `a2e-drive`,
  `a2e-accounting`, `a2e-inbox`. Each app's `APPLICATION_UNIVERSAL_IDENTIFIER`
  is a fixed UUID generated once at creation — record it in the app's config
  and never regenerate.
- Objects: nameSingular/namePlural like `project`/`projects`,
  `invoice`/`invoices` (no `a2e_` prefix — metadata names are already
  workspace-scoped).
- Every app object gets: label field, relations to standard objects where
  relevant, and inherits notes/tasks/timeline/attachments automatically via
  the polymorphic system — declare nothing for those.
- Fields follow `defineField` with `FieldType` enums; money uses CURRENCY
  where available else NUMBER + currency selector field; rich text uses
  RICH_TEXT (BlockNote JSON); files use FILES (attachment-backed).
- Universal identifiers: UUIDv4, one per declarable thing, committed forever
  (the additive-only law).
- Server entities (new tables in Track A/B server code): follow existing
  workspace-entity anatomy, snake_case tables, `workspaceId` where
  workspace-scoped.

## 3. Activation & user experience contract

- **Per-workspace activation**: CLI provisioning and Settings → Applications
  reuse Twenty's registration/install machinery. Catalog visibility and
  packaged availability must be verified separately. Uninstall removes
  app-owned metadata and may destroy data; it is not a harmless disable
  toggle. Define retention/dependencies and test on a disposable workspace.
- **Onboarding presets**: extend the onboarding module with workspace
  templates — `Individual`, `Student`, `Team`, `Non-profit`, `Small business`,
  `CRM`. Each preset pre-installs apps, seeds nav order, dashboards and sample
  data. Presented at workspace creation and re-runnable from Settings →
  General ("Change template"). CRM-off presets hide CRM nav items (navigation
  menu items are DB rows — presets just set visibility).
- **Nav**: every app registers one navigation-menu-item (PAGE_LAYOUT or OBJECT
  type), positioned after core items; folders allowed (e.g. "Finance").
- **Command menu**: every app pins at least "Create <thing>" + "Go to <app>"
  commands, mirroring `open-media-notes.command-menu-item.ts`.
- **Side panel**: record previews and quick-editors open in the existing side
  panel (context-store), never new browser tabs.
- **i18n**: all user-facing strings through Lingui `t` + msg; fr and en
  locales maintained for every app (accounting is fr-first in vocabulary:
  Facture/Invoice etc., both complete).

## 4. Realtime gateway (Track A, P2 — chat/presence/inbox foundation)

Self-hosted-grade; no Vercel constraints. Design:

- New core module `realtime-gateway`: WebSocket server (ws) mounted on the
  Nest HTTP server (same port 3000) at path `/realtime`.
- Auth: cookie session (same as HTTP) validated on upgrade; workspace derived
  from subscription topics, not from client input.
- Envelope: `{ topic, seq, type, payload }`; topics like
  `workspace:<id>:chat:<channelId>`, `workspace:<id>:presence`,
  `workspace:<id>:inbox:<userId>`, `workspace:<id>:object:<name>:<recordId>`.
- Fan-out via Redis pub/sub (redis-client core module; channel prefix
  `a2e:rt:*`) so server+worker and future multi-instance deployments work.
- Presence: heartbeat + `presence:<workspaceId>:<userId>` TTL keys in Redis;
  online/typing states broadcast on the presence topic; AvatarStack in
  workbench consumes it.
- Delivery guarantees: at-most-once per socket + client-side catch-up fetch
  on reconnect (REST/GraphQL hydrate). Missed-message window handled by
  `since` cursor params — do NOT build broker-grade exactly-once.
- Front: `realtime` front module exposing `useRealtimeTopic(topic)` hook with
  auto-reconnect (exponential backoff), connection status atom feeding the
  reconnect banner, and an offline mutation queue for chat/inbox composer.
- SSE stays for what already uses it (MCP, db events); the gateway is the
  realtime path for NEW features only. Never wire Vercel-style constraints —
  this app ships self-hosted (docker-compose) and on Twenty Cloud-style
  deployments only.

## 5. Unified AI system (Track A, P9)

- Extend `tool`/`tool-provider` core modules into an **AI registry** every
  module teaches: `registerAiTools(appId, tools[])` at app install
  (logic-function), unregistered on uninstall.
- One assistant surface: upgrade the `ai-chat` page into the system-wide
  assistant (side panel + full page), context-aware of the current object
  (record, doc, invoice, channel) via context-store.
- Each app ships AI actions (record-to-invoice draft, task extraction from
  doc, chat summarization, expense categorization) declared as workflow
  templates + assistant tools. Model providers configurable via existing AI
  settings; never a new provider stack.
- Guardrails: AI actions are explicit (user-invoked), logged via event-logs,
  and never mutate financial records without review (accounting drafts only).

## 6. Search federation (Track A, P2/P8)

- Extend the `search` core module with a provider interface: core objects
  (existing) + registered app providers (documents, chat messages, invoices,
  drive files). Apps register their provider at install.
- Cmd+K results grouped by app with frecency ranking (Bureau pattern).
- Deep links: every result opens the record/doc/message in side panel or
  page, using stable URLs (`/object/<name>/<id>`, app routes).

## 7. Files & attachments

- All file storage goes through file-storage + `attachment` polymorphism
  (chat attachments, receipts, doc images). App objects expose FILES fields.
- Drive app is a management surface (browse by object/source, folders as
  first-class object `driveFolder` with morph attachments or a `folderId`
  field on attachment — decide in P6 spike, prefer additive field).

## 8. Notifications & inbox

- New `notification` core service: events emitted via event-emitter →
  notification rows (workspaceId, userId, type, payload, readAt) → pushed via
  realtime gateway inbox topic → inbox app UI (all/mentions/mine filters,
  quiet hours preference, mark-read bulk).
- Mentions parser shared via twenty-shared/utils (works in docs, chat,
  comments: `@user` and `@object:<name>:<id>` links).

## 9. Testing & quality gates (every phase, no exceptions)

- Unit tests for services/hooks following existing jest configs.
- Integration tests for server modules (`test:integration:with-db-reset`).
- One e2e spec per app happy path (Playwright, `twenty-e2e-testing/tests/`).
- `npx nx lint:diff-with-main <pkg>` + typecheck (`npx tsgo -p tsconfig.json
  --noEmit` in-package) before declaring done.
- `npx nx build twenty-shared --skip-nx-cache` whenever shared changed.
- Screenshots for UI work where feasible; Storybook stories for reusable
  twenty-ui-level components.

## 10. Finance-domain wiring rules (P7, from A2EMoney)

- **Auto-journal**: exactly one system ledger per workspace
  (systemKey-pattern row, `locked`, managed columns). Every financial
  mutation upserts a provenance row (`auto`, `sourceKind`, `sourceId`),
  idempotent; machine rows read-only in UI, badged.
- **Encrypted at rest**: IBAN/BIC and similar secrets go through the
  twenty-server secret-encryption core module — never plaintext columns.
- **Fiches**: template registry lives in shared code (typed schemas);
  `fiche.data` stores template-shaped JSON; typed editors render from the
  registry; PDF export per template; identity fields prefill from the
  workspace finance profile.
- **Subventions catalogue**: instance-scoped (not per-workspace) tables in
  the accounting server module; ingest via cron through message-queue;
  catalogVersion participates in AI cache keys.
- **AI + finance guardrail**: AI may draft/score/categorize; humans commit.
  No AI path mutates financial records without explicit user confirmation.

## 11. Definition of "integrated" (the bar each app must clear)

1. Activates/deactivates per workspace without core impact.
2. Present in nav, Cmd+K, search, and side-panel where relevant.
3. Cross-links at least one other surface (record tab, relation field, or
   assistant action).
4. Localized fr + en; dark + light themes; mobile-responsive (Twenty mobile
   nav exists).
5. Realtime where it matters (chat/presence/inbox).
6. Adds AI tools to the registry.
7. Fully additive; upgrade commands follow the rules; no i18n catalog churn
   committed.
