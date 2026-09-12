# Report 03 — Integration Blueprint (how every module plugs in)

> Twenty-native implementation guidance, reconciled 2026-09-12.
> PLAN.md owns status, dependencies, C1–C7 contracts and E01–E12 acceptance.
> This blueprint describes target behavior, not a claim it already works.
> All local reference projects are feature/UX inspiration only: never integrate
> their apps wholesale, copy full code or adopt their stacks/dependencies.
> If a primitive is missing, inspect and record the gap before extending it.

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

Hybrid rule: domain behavior may require `src/modules/<domain>/` for atomic
operations or authoritative policy; ordinary app jobs can use existing logic
function cron/event triggers. Domain services check workspace app state and
permissions at request/job execution. A post-install flag alone is not an
activation or security contract. Reuse application metadata and queue/runtime
infrastructure; native install state remains the user-facing activation truth.
Calendar packaging is decided in P4C.1; provider creation/sync already exists.

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

- **Lifecycle (PLAN C3)**: install via existing application registration/install
  and metadata migration, surfaced in Settings and onboarding. Hide is a
  preference; uninstall can delete app objects/fields/data. Do not present it
  as reversible disable. Preflight dependencies, data/file impact and export;
  block removal where retention cannot be honored. Revoke shares and stop jobs/
  tools/search; test failed hooks, populated removal, upgrade and reinstall.
  Standard CRM records survive; app-added field values require explicit policy.
- **Onboarding/templates (PLAN C1/C2)**: six preset identifiers already exist;
  current service does not provide truthful partial setup or optional sample
  seeding. Unify preset and checkbox choices in one authorized, idempotent,
  resumable operation with preview, compatible IDs/versions, progress/errors
  and retry. Same operation serves onboarding and later Settings application.
  No-app/skip keeps CRM usable; optional apps stay optional.
- **Reusable configuration**: distinguish workspace presets, content templates
  and workflow recipes. Version/provenance/inputs and dependency references
  resolve to native metadata, never reference-app code. Instantiate new IDs;
  exclude secrets/private data. Samples are optional; operational defaults are
  separate. Reapplying preserves existing user fields/views/layouts/nav/roles;
  manage only owned defaults. Current nav hiding deletes standard nav rows,
  so restoration/user-override behavior must be repaired and tested.
- **Team/UX (PLAN C4/C7)**: invitations join the already configured workspace;
  roles govern templates/install/records/search/export/realtime. Personal
  preferences do not overwrite team defaults. One useful first action, blank
  or template creation, optional advanced views/widgets and keyboard paths;
  no second shell or Huly-like configuration complexity.
- **Nav**: every app contributes a discoverable native entry or grouped folder
  (e.g. Bilan); use supported VIEW/OBJECT/layout navigation patterns verified
  in the SDK. Preserve user reorder/hide choices rather than hard-coding order.
- **Command menu**: every app pins at least "Create <thing>" + "Go to <app>"
  commands, mirroring `open-media-notes.command-menu-item.ts`.
- **Side panel**: record previews and quick-editors open in the existing side
  panel (context-store), never new browser tabs.
- **i18n**: all user-facing strings through Lingui `t` + msg; fr and en
  locales maintained for every app (accounting is fr-first in vocabulary:
  Facture/Invoice etc., both complete).

## 4. Realtime gateway (Track A, P2 — chat/presence/inbox foundation)

Self-hosted-grade; no Vercel constraints. Design:

- Existing `realtime-gateway` mounts ws on the Nest HTTP server at `/realtime`.
  Current auth/transport is not accepted: see PLAN P0.3 and audit F02/F06.
- Target auth: reuse HTTP session resolution and origin policy, authorize every
  topic against authenticated workspace/member/record/channel rights, and handle
  revocation/expiry. Never trust the topic's workspace ID or readable-cookie
  workaround as proof of membership.
- Envelope: `{ topic, seq, type, payload }`; topics like
  `workspace:<id>:chat:<channelId>`, `workspace:<id>:presence`,
  `workspace:<id>:inbox:<userId>`, `workspace:<id>:object:<name>:<recordId>`.
- Fan-out via Redis pub/sub (redis-client core module; channel prefix
  `a2e:rt:*`) so server+worker and future multi-instance deployments work.
- Presence: heartbeat + `presence:<workspaceId>:<userId>` TTL keys in Redis;
  online/typing states broadcast on the presence topic; AvatarStack in
  workbench consumes it.
- Delivery target: ephemeral pub/sub plus authoritative record refetch on
  reconnect. Existing per-socket sequence numbers are not durable replay
  cursors. Chat/inbox need persisted domain cursors and deduplication; specify
  actual API pagination before inventing `since` parameters. No broker-grade
  exactly-once claim; failed subscriptions must not acknowledge success.
- Front: `realtime` front module exposing `useRealtimeTopic(topic)` hook with
  auto-reconnect (exponential backoff), connection status atom feeding the
  reconnect banner, and an offline mutation queue for chat/inbox composer.
- SSE stays for what already uses it (MCP, db events); the gateway is the
  realtime path for NEW features only. Never wire Vercel-style constraints —
  this app ships self-hosted (docker-compose) and on Twenty Cloud-style
  deployments only.

## 5. Unified AI system (Track A, P9)

- Reuse the **existing** `LogicFunctionToolProvider` and `toolTriggerSettings`
  on app-owned logic functions. P1.5 established native discovery/dispatch;
  there is no need for `registerAiTools`, a new table or registration hooks.
  Validate permissions and uninstall/cache behavior through the real API.
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

- Existing search provider interface/decorator registry discovers Nest providers;
  AppSearchService gates by installed app IDs. It is not an app post-install
  hook. Repair caller-context/row permissions in document search before release;
  install gating alone is insufficient. Future providers follow the same path.
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
- **Subventions catalogue**: current objects are workspace-scoped. PLAN D03
  decides whether shared instance ingestion warrants an additive migration;
  no accounting server module exists yet. Keep source IDs/freshness/errors and
  saved dossier snapshots; no exhaustive-grants or nonempty-catalogue guarantee.
- **Forms/books**: Livre includes system journal and reusable custom tracking
  sheets. Keep grant dossiers/reports separate from donation receipts; resolve
  the current CERFA 15059 naming contradiction with a domain reviewer (D04).
- **AI + finance guardrail**: AI may draft/score/categorize; humans confirm
  mutations. Private results/runs/cache remain workspace/access-scoped, even
  if a future public catalogue is shared. Re-open saved runs without a new
  provider call; permission changes invalidate access (PLAN C6).

## 11. Definition of "integrated" (the bar each app must clear)

1. Installs with truthful readiness; hides without deletion; removes only with
   dependency/data safeguards (C3), preserving core CRM and required records.
2. Present in nav, Cmd+K, search, and side-panel where relevant.
3. Cross-links at least one other surface (record tab, relation field, or
   assistant action).
4. Localized fr + en; dark + light themes; mobile-responsive (Twenty mobile
   nav exists).
5. Realtime where it matters (chat/presence/inbox).
6. Adds AI tools to the registry.
7. Fully additive; upgrade commands follow the rules; no i18n catalog churn
   committed.
