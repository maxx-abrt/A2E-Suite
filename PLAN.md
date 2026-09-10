# A2E Suite — All-in-One Workspace Master Plan

> **Read [`PROMPT.md`](./PROMPT.md) first if you are an implementing AI.**
> This file is the source of truth for scope, sequence and status.

**Mission.** Transform A2E Suite (Twenty fork, v2.39.0) into an all-in-one
workspace — Notion/Asana/Huly class — where users activate only the modules
they need. Documents, projects & tasks, live chat, drive, accounting
(A2EMoney), inbox, and a unified AI assistant, all built as first-class
citizens of Twenty's app/extension system, fully integrated with the existing
CRM core, its design system and its UX flow. Nothing working today gets
broken; everything new is additive and per-workspace toggleable.

**Audience personas.** individuals, students, groups, non-profits, small
companies, and classic CRM teams.

---

## How to use this plan

- **Status legend** — `[ ]` todo · `[~]` in progress (one at a time, max) ·
  `[x]` done · `[!]` blocked (write why + blocker in the phase report).
- **Tick tasks in this file as you complete them.** A task is ticked ONLY
  after its acceptance criteria (per phase) AND the global quality gates
  (§Gates) pass.
- **One phase at a time, one task at a time.** Never start a new phase while
  another has an unticked non-optional task.
- **Phase reports.** Each phase has `docs/plan/phases/phase-<n>-report.md`.
  Append a dated entry for every work session: what was done, decisions,
  deviations, files touched, what's next. This is the handoff log for the
  next AI.
- **Context docs** (read before your phase):
  - [`docs/plan/01-codebase-map.md`](./docs/plan/01-codebase-map.md) — where
    things live, commands, gotchas.
  - [`docs/plan/02-reference-analysis.md`](./docs/plan/02-reference-analysis.md)
    — Texxel/Bureau + A2EMoney feature mapping (verified schemas).
  - [`docs/plan/03-integration-blueprint.md`](./docs/plan/03-integration-blueprint.md)
    — the binding contract for how modules plug in.
  - [`docs/plan/04-twenty-native-law.md`](./docs/plan/04-twenty-native-law.md)
    — BINDING: concept→primitive mapping, app/module anatomy standards,
    end-to-end wiring checklist, verification anchors. A feature is done
    only when it clears §5 of that doc.
- **House rules** are in [`CLAUDE.md`](./CLAUDE.md) /
  [`AGENTS.md`](./AGENTS.md) and are binding (Lingui, Linaria, icons from
  `twenty-ui/icon`, `twenty-shared/utils` guards, upgrade-command rules, no
  i18n catalog commits, no AI attribution in commits).

## Global acceptance gates (apply to EVERY task)

1. `npx nx lint:diff-with-main <pkg>` clean; typecheck via
   `npx tsgo -p tsconfig.json --noEmit` in each touched package.
2. If `twenty-shared` touched: `npx nx build twenty-shared --skip-nx-cache`.
3. New server entities: generated migration
   (`database:migrate:generate --type fast|slow`) + upgrade command ONLY
   under `2-39/` with strictly increasing epoch-ms timestamp, `up` + `down`.
4. Unit tests for new services/hooks; integration test for server modules;
   one e2e happy-path per app.
5. UI: light+dark themes, responsive, Lingui fr+en, canonical icons from
   `packages/twenty-ui/src/icon/icon-dictionary.md`.
6. No committed i18n catalog churn; no AI-attributed commits.
7. Additive only: no renames/removals of existing tables, fields, GraphQL
   fields, routes. Deprecate, don't delete.
8. Update the phase report + tick the task here in the same commit.

## Phase index

| # | Phase | Delivers | Depends on |
|---|---|---|---|
| P1 | Foundations & module activation | Module registry, onboarding presets, search federation skeleton, conventions doc | — |
| P2 | Realtime gateway & workbench shell | WebSocket gateway, presence, reconnect UX, widgets dock, tabbed side panel, global search v1 | P1 |
| P3 | Documents (full note-taking) | Doc tree, editor upgrades, templates, versions, share/export | P1 (P2 for presence) |
| P4 | Projects & Tasks 2.0 | Project object, boards, subtasks, dependencies, time tracking, calendar links | P1, P3 (optional) |
| P5 | Live chat | Channels, threads, mentions, reactions, read cursors, presence | P2 |
| P6 | Drive | File browser, folders, gallery, usage views | P1 |
| P7 | Accounting & Finance (full A2EMoney) | Invoices/quotes/expenses, books auto-journal, budgets, fiches (8 templates incl. budget à l'équilibre), org profile, GDPR, subventions marketplace | P1, P6 (receipts) |
| P8 | Inbox, notifications & activity | Unified inbox, mentions engine, quiet hours, activity feed widgets | P2 |
| P9 | Unified AI system | AI registry, assistant surface, per-app AI actions, smart integrations | P1; hooks into all apps |
| P10 | Individual mode & polish | Solo presets, CRM-optional mode, guided tours, performance, docs | all |

Dependency note: P9 tools get richer as apps land; build the registry early
(P9.1 is part of P1 scope) and let apps register tools as they ship.

---

# P1 — Foundations & Module Activation

**Goal.** The skeleton that makes "activate only what you need" real:
a workspace-level module system surfaced in Settings, onboarding presets per
persona, and the conventions every later phase relies on.

### P1.1 Conventions & scaffolding
- [x] Create `packages/twenty-apps/internal/a2e-documents` (empty app shell:
      config + default role) to validate the app scaffold script
- [x] Add `packages/twenty-apps/README-A2E.md`: how to create an internal
      app, publish/install locally, naming rules, UUID discipline
- [x] Verify app install/uninstall sync behavior on a scratch workspace
      (objects/views/nav appear and disappear cleanly); documented via
      server-code audit in phase report (no live workspace available)

### P1.2 Module registry (settings surface)
- [x] Server: `workspace-module` concept — per-workspace enable/disable state
      for A2E apps (reuse application install state where possible; add
      `workspaceModule` table only if install state is insufficient — decided:
      application install state is sufficient, see phase report)
- [x] Front: Settings → Applications → "A2E Suite" section listing our apps
      with install/uninstall, short descriptions, screenshots placeholders
- [x] Nav visibility derives from app install state (verified existing
      behavior; no extension needed — see phase report)

### P1.3 Onboarding presets
- [x] Server: preset definitions (`individual`, `student`, `team`,
      `nonProfit`, `smallBusiness`, `crm`) as data (apps to install, nav
      order, sample content flag)
- [x] Onboarding flow: template picker step (skippable, defaults `crm` to
      preserve current behavior)
- [x] Settings → General: "Change workspace template" (re-runnable, additive)
- [x] Preset application logic-function (install apps, order nav, seed
      samples)
- [x] e2e: create workspace with `individual` preset → CRM nav hidden,
      Documents nav present

### P1.4 Search federation skeleton
- [x] Server: search provider interface in `search` core module +
      registry (keyed by app id)
- [x] Front: Cmd+K grouped results structure (group headers, frecency store)
- [x] Consume providers dynamically; core object search unchanged

### P1.5 AI registry seed (pre-work for P9)
- [x] Audit `tool`/`tool-provider` modules; write short design note in phase
      report for `registerAiTools(appId, tools)` extension
- [x] Data model for app-registered AI tools (additive table or metadata)

**Acceptance.** Scratch workspace toggles apps on/off; presets install
correctly; search returns grouped results (core only); no regressions in
existing onboarding e2e.

---

# P2 — Realtime Gateway & Workbench Shell

**Goal.** Huly pillars 1 & 4: a rock-solid WebSocket layer (self-hosted
grade) and the calm, predictable workbench chrome. See blueprint §4–§6.

### P2.1 Realtime gateway (server)
- [x] Core module `realtime-gateway`: ws server on `/realtime`, cookie-auth
      on upgrade, topic subscription protocol (`subscribe/unsubscribe`,
      envelope `{topic, seq, type, payload}`)
- [x] Redis pub/sub fan-out (`a2e:rt:*` channels) via redis-client;
      multi-instance safe
- [x] Topic ACL map: workspace membership required; per-topic checks
      (workspace/user/record scoping)
- [x] Heartbeat/ping-pong, dead-socket cleanup, metrics counters
- [x] Integration tests: auth rejection, topic isolation across workspaces,
      reconnect seq catch-up contract
- [x] Unit tests for topic auth + envelope serialization

### P2.2 Realtime client (front)
- [x] `realtime` front module: connection manager (single socket, backoff
      reconnect), `useRealtimeTopic(topic)` hook, status atom
- [x] Reconnect banner + offline composer queue primitives (used by P5/P8)
- [x] Storybook/test harness with a mock server

### P2.3 Presence
- [x] Server: Redis TTL presence keys, join/leave/typing events on
      `presence` topic, workspace roster query
- [x] Front: AvatarStack presence component (twenty-ui primitives), typing
      indicator primitives
- [x] Consume in side panel header (pilot surface)

### P2.4 Workbench shell (widgets dock + tabs)
- [x] Right widgets dock: collapsible (MINI/EXPANDED), resizable, persisted
      widths (localStorage keys `a2e-widgets-*`), hosts pluggable widgets
      (registry: inbox preview, assistant, comments, task list, activity,
      presence)
- [x] Snap-collapse thresholds (12px rule), floating overlay < 1200px,
      navigator float < 768px (match existing mobile patterns)
- [x] Side-panel tabs: multiple stacked contexts with persisted order,
      middle-click/"open in tab" affordance on records/docs/messages
- [x] Page-header context: active page sources title/breadcrumb/actions
- [x] Unit tests for dock persistence + tab store; e2e: open two records as
      tabs, switch, close, reload → restored

### P2.5 Global search v1
- [x] Index providers wired: records (existing) + documents (stub for P3)
- [x] Frecency ranking; keyboard navigation; deep links open side panel
- [x] Performance budget: < 150ms interaction latency on 10k-record
      workspace (document measurement in report)

**Acceptance.** Two browser sessions see presence + live widget updates;
killing the socket shows banner and queues; search feels instant; existing
pages render unchanged (no layout regressions).

---

# P3 — Documents (Full Note-Taking)

**Goal.** Notion-grade notes on top of the `note` object + blocknote-editor.
App: `a2e-documents`.

### P3.1 Document object model
- [x] Spike (report only): extend `note` vs new `document` object — decision
      criteria: note is polymorphic-target CRM surface; documents are
      first-class tree entities. Expected: keep `note` for record-attached
      notes; add `document` object for the workspace tree, sharing rich-text
      stack. Record decision + trade-offs
- [x] `document` object (app): title, icon, cover, content (RICH_TEXT),
      parent (self-relation), position (fractional index), isFavorite,
      isTemplate, archivedAt, tags/labels
- [x] Fractional indexing util in `twenty-shared/utils` (with tests)
- [x] Upgrade command (2-39) if any server-side columns needed beyond app
      metadata (none needed — all columns live in app metadata; see report)

### P3.2 Editor upgrades
- [x] Slash-command extensions: toggle/heading/code/quote/callout/divider/
      image (upload → FILES), @mention (users + objects), /link to records
- [x] Inline comments anchored to blocks (thread store per block id)
- [x] ToC/outline panel; word count; typewriter mode option
- [x] Templates: instantiate from template docs (copy blocks); template
      gallery view
- [x] Version history: snapshot on save-interval (N versions, pruned);
      diff view (block-level), restore
- [x] Export: PDF (extend existing note-export path), DOCX, Markdown
- [x] Share: public read-only link (public-domain core module), optional
      passphrase (client-side AES-GCM per Bureau), expiry; guest view page
- [ ] Realtime co-editing guardrails: presence cursors (P2) + optimistic
      merge with version check (no OT in v1 — document the limitation)

### P3.3 Tree & navigation UX
- [ ] Documents page: sidebar tree (drag to reparent via fractional index),
      quick search, favorites section, archive/trash with restore (7-day
      purge cron via message-queue)
- [ ] Doc page: cover/icon/title/editor/outline; open in side-panel tab or
      full page (addressable URL)
- [ ] Cmd+K: create/open document commands; search provider for docs
- [ ] Record integration: "Save as document" from record notes tab (copy);
      doc ↔ record relation field (morph-style link on document)

      For docs system, use the base tree system notion-like, cleanly.

**Acceptance.** Create tree, drag-reorder persists across reload; template
flow works; export produces valid PDF/DOCX/MD; public share link with
passphrase works from incognito; e2e covers create→edit→share→export.

---

# P4 — Projects & Tasks 2.0

**Goal.** Asana/Huly-grade projects on Twenty tasks. App: `a2e-projects`.

### P4.1 Model
- [ ] `project` object: name, key (PRJ-style), status pipeline (planning/
      active/completed/on_hold), lead, members (relation), health, start/due
      dates, color, description (RICH_TEXT), milestones (object), budget +
      spent (finance fields, fed by P7 — declare here, wire in P7.1c)
- [ ] `task` extensions (app fields on standard task): project relation,
      status (custom-status object w/ color + isDone), priority, labels,
      estimate (t-shirt), subtask parent relation, blockedBy self-relation,
      human id (`<projectKey>-<n>` computed), time-tracking entries object
- [ ] Milestone object: name, dueDate, project, doneAt
- [ ] Workflow template: "recurring task generator" (uses existing workflow
      engine)

### P4.2 Views & UX
- [ ] Board view (kanban by custom status — extend view types if needed;
      prefer existing kanban view on task with status grouping)
- [ ] Gantt/timeline view (front component; framer-motion-free, virtualized)
- [ ] Calendar view of tasks/due dates (link into existing calendar module
      surface)
- [ ] My-tasks page ("assigned to me" + "created by me" + overdue smart
      lists)
- [ ] Project page: overview widgets (health, milestones, members, activity)
      + tabs (tasks/board/gantt/files/docs)
- [ ] Subtasks & dependencies UI: nested list + dependency picker with
      cycle validation
- [ ] Time tracker: start/stop on task (presence-adjacent), entries list,
      per-project rollup widget
- [ ] Cmd+K: create task, go to project; search provider for tasks/projects

### P4.3 Integrations
- [ ] Calendar: two-way task due-date → calendar event link (opt-in)
- [ ] Documents: doc relation on project; project overview shows linked docs
- [ ] AI seed: "extract tasks from document" (P9 tool stub)
- [ ] Trash: 7-day restore + purge cron (mirror P3 pattern)

**Acceptance.** Kanban drag updates status; Gantt renders 1k tasks smoothly;
dependencies block status change with clear error; time entries roll up;
e2e happy path.

---

# P5 — Live Chat

**Goal.** Slack-in-the-workspace chat, workspace- and record-scoped.
App: `a2e-chat` + server domain module `chat`.

### P5.1 Server
- [ ] Entities: `channel` (name, kind: workspace/project/custom, visibility
      public/private, posting roles), `message` (channelId, authorId, body
      rich/Markdown-lite, threadParentId, createdAt, editedAt, deletedAt),
      `reaction` (messageId, userId, emoji), `readCursor` (channelId,
      userId, lastReadMessageId), channel members
- [ ] GraphQL: channels CRUD/members, messages pagination (cursor),
      reactions, read cursors, typing events
- [ ] Realtime: publish messages/reactions/typing/read on
      `workspace:<id>:chat:<channelId>` via gateway; unread counts
      aggregation
- [ ] Notifications: mention events → notification service (P8 skeleton ok
      — emit event, UI lands with P8)
- [ ] Attachments: message attachments via `attachment` + file-storage
- [ ] Integration tests: pagination, isolation, unread counts

### P5.2 Front
- [ ] Chat page: channel sidebar (sections: workspace/project/custom),
      thread pane, composer (attach, @mention autocomplete, emoji picker
      from twenty-ui set)
- [ ] Threads: inline expandable + dedicated thread view; reply counts
- [ ] Read state: unread dividers, bold channels, mark-read on view
- [ ] Live: new messages/streaming via `useRealtimeTopic`; offline queue
      (P2 primitives); presence/typing indicators (P2)
- [ ] Record-linked channels: "discussions" tab on project/company via
      channel relation; side-panel mini-chat
- [ ] Cmd+K: go to channel, search messages (provider); AI stub: channel
      summarizer (P9)

**Acceptance.** Two sessions chat live with typing/presence/read cursors;
private channels invisible to non-members; record channel appears on record
page; e2e covers send/thread/react/read.

---

# P6 — Drive

**Goal.** File management surface over existing storage. App: `a2e-drive`.

### P6.1 Model
- [ ] Spike: folder modeling — `driveFolder` object + `folderId` field on
      attachments vs morph attachments; prefer additive field; report
      decision
- [ ] `driveFolder`: name, parent self-relation, color/icon, position
- [ ] Attachment extensions: folderId, starred, sourceApp (attribution like
      Bureau `sourceApp`), description

### P6.2 UX
- [ ] Drive page: tree/folder breadcrumb, list & gallery views, filters
      (type, source app, object), bulk select/move, rename, star, trash with
      restore
- [ ] Preview: images/PDF/audio/video using existing preview components;
      fallback icon cards
- [ ] Upload: drag-drop anywhere on page; upload to folder; from chat/docs
      routing (source attribution)
- [ ] Usage widget: storage by type/app; quota display if billing provides
- [ ] Cmd+K + search provider for files; AI stub: "find the invoice PDF
      from X" (P9)

**Acceptance.** Upload→folder→preview→share link flows; filters by source
app distinguish CRM/doc/chat uploads; e2e happy path.

---

# P7 — Accounting & Finance (full A2EMoney/Bilan port)

**Goal.** The complete A2EMoney feature set — small business + non-profit
accounting, budgets, books with auto-journal, fiches (templated official
documents incl. budget à l'équilibre), org profile, GDPR, and the
subventions marketplace. fr-first vocabulary, fr + en locales. App:
`a2e-accounting` + server domain module `accounting`.
Full domain reference: [`docs/plan/02-reference-analysis.md`](./docs/plan/02-reference-analysis.md) §3.

**Status 2026-09-10 — app-side shipped as `Bilan` (`a2e-accounting`), the
server domain module does not exist yet.** Everything below marked `[x]`
lives in the app (objects/views/nav/logic functions/front components);
verify against `.twenty/output/manifest.json` after `dev:build`. What
remains for "clean": the server-side pieces (encryption at rest, period
lock enforcement, reports), invoice PDF rendering, fiche editors as front
components, and e2e.

### P7.1 Core finance model
- [x] `client` mapping spike: reuse `company` + relation fields (no parallel
      client entity) — verified with metadata relations (`invoiceClient`/
      `companyInvoices` relation pair)
- [x] `invoice` object: number, client (company relation), clientEmail/
      clientAddress snapshots, status draft/sent/paid/overdue/cancelled,
      issueDate, dueDate, paidDate, taxRate, currency, notes, project
      relation, opportunity relation, linkedDocuments (attachments)
- [x] `invoiceLine` object: description, quantity, unitPrice, VAT rate
      (per-line, supersedes A2EMoney's header-only taxRate)
- [x] `quote` object (invoice-shaped) + convert-to-invoice with audit trail
- [x] `expense` entry object (`financeEntry`): type expense|income,
      description, amount, category, date, paymentMethod, tags, currency,
      isRecurring + frequency (weekly/monthly/yearly), linkedInvoice,
      linkedSubvention, projectId, receipts via attachments
- [x] `category` object (`financeCategory`): name, icon, color, type
      expense|income|both, archived flag
- [x] Numbering: per-workspace sequences (invoice/quote) with gap detection
- [x] Recurring engine: cron via message-queue; generated rows carry
      provenance (see auto-journal pattern)
- [x] VAT/TVA modes: per-workspace settings (rates, inclusive/exclusive,
      reverse charge, exempt for non-profits)

### P7.1b Books — auto-journal ("Livre")
- [x] `bookSheet` object: name, icon, color, typed columns (id/name/type/
      width/options/formula/required/linkedType/managed), isTemplate,
      **systemKey + isDefault + locked** — one system ledger per workspace
      (A2EMoney "bilan.default.ledger" pattern), undeletable, managed
      columns, badged in UI
- [x] `bookEntry` object: sheet, cells, linkedExpenses/linkedInvoices/
      linkedProject, attachments (justificatifs), **auto + sourceKind +
      sourceId provenance** — machine rows read-only in UI
- [x] Auto-journal service: expense/invoice mutations upsert their ledger
      row, idempotent on (sheetId, sourceKind, sourceId) — logic functions
      `sync-finance-entry-to-ledger` / `sync-invoice-to-ledger`
- [ ] Custom sheets from templates; period lock (fiscal close freezes
      entries, admin unlock) — needs server module; CSV export / print

### P7.1c Budgets
- [x] `budget` object: name, amount, category, period monthly|yearly|
      custom, startDate/endDate, color, currency
- [x] Spent rollup: aggregate over expenses in period+ category (logic
      function `rollup-budgets`, cached on the budget row); progress bars +
      over-budget warnings on Budget page
- [ ] Project wiring: `budget` + `spent` fields on `project` (P4) fed from
      project-linked invoices/expenses
- [ ] Alerts at 80% / 100% of budget via notification service (P8)

### P7.1d Fiches — templated official documents
- [x] `fiche` object: template key, title, subtitle, data (JSON per
      template schema), status draft/submitted/approved/archived, locale,
      project relation
- [x] Template registry — the 8 A2EMoney templates: `asso_fr`, `blank`,
      `recu_don` (reçu fiscal, art. 200/238bis/978), `budget_equilibre`
      (charges PCG 60–65 / produits 70–76 line grids + équilibre
      indicator), `demande_subvention` (CERFA 12156),
      `convention_subvention`, `rapport_activite`, `attestation_honneur`
- [ ] Typed per-template editors as front components (reference:
      A2EMoney `components/fiches/document-editors.tsx`, rebuilt on
      twenty-ui)
- [x] Budget à l'équilibre editor logic: charges/produits grids, totals,
      prefill from real categories/expenses of the fiscal year
      (`lib/budget-equilibre.ts`)
- [ ] PDF export per template (reference: `lib/fiche-pdf.ts`); fr/en
- [x] Org-profile prefill of identity fields; CERFA 15059 fill/print
      (`lib/cerfa.ts`)
- [x] Workflow: submitted → approved transitions with activity log

### P7.1e Org profile & compliance
- [x] Workspace finance profile (one row per workspace): legalName,
      shortName, objet, RNA, SIRET, address, contact, representative,
      IBAN/BIC, RUP recognized, fiscalRegime, structureKind, headcount
- [ ] **IBAN/BIC encrypted at rest** (twenty-server secret-encryption) —
      needs the server `accounting` module (P7 server phase)
- [x] Settings page (Profil financier nav + view); drives fiche prefill +
      invoice header/footer
- [ ] GDPR-lite: consent log + data-export request objects; activity trail

### P7.1f Subventions — public funding marketplace (flagship)
- [x] Instance-scoped catalogue (NOT workspace-scoped): `subvention`
      (source/sourceId, title, description, eligibility, financers,
      audiences, aidTypes, categories, perimeter + scale, region, dates,
      rateMin/Max, urls, isLive, searchText, hash) + `subventionSource`
      bookkeeping with catalogVersion
- [x] Daily ingest cron (message-queue) from French open-data sources
      (configurable): aides-territoires + carenews fetchers + curated
      fallback, `refresh-subventions` logic function; first ingest runs
      in post-install so the catalogue is never empty
- [x] `savedSubvention` workspace object: status shortlisted/preparing/
      submitted/granted/rejected/abandoned, amountRequested/Granted,
      deadline, notes, aiScore/aiReason, projectId
- [x] Granted → auto-create income entry with provenance link
      (`grant-subvention-income` logic function)
- [x] Deterministic matching (rules, no LLM): score candidates against
      org profile with explained reasons (`subvention-matching.ts`,
      `score-subventions` logic function); AI matching via P9 on top
- [x] `aiCacheEntry` object (content-hash + version keys, hits) — the
      global LLM cache data model, ready for P9 to consume
- [x] Subventions page: "Trouver des aides" standalone page layout +
      `subvention-explorer` front component (filters, refresh, scoring,
      shortlist in one click)
- [x] Dossier flow: fiche links (demande/convention/attestation) on the
      saved subvention (`ficheSavedSubvention` relation)

### P7.2 UX
- [x] Finance nav folder "Bilan": Tableau de bord, Factures, Devis,
      Dépenses et recettes, Livre, Budgets, Fiches, Subventions, Mes
      dossiers, Catégories, Ma structure, Sources — one collapsible
      folder, not eleven loose links
- [x] Dashboard page (widget grid): total facturé, encaissé, en attente,
      pipeline subventions + outils (saisie rapide, explorateur d'aides)
- [x] Quick entry: Cmd+K "Bilan : saisie rapide" (pinned, GLOBAL) —
      three-field capture, category-driven VAT prefill
- [x] Cmd+K "Bilan : trouver des aides" (GLOBAL) opens the explorer
- [ ] Invoice builder: line editor, VAT compute, totals, currency
      formatting (fr/en), PDF render, email send (emailing module) with
      tracking
- [x] Payment tracking: partial payments (amountPaid + remaining),
      overdue automation (cron `sweep-overdue-invoices`)
- [ ] Dunning workflow templates (workflow engine + emailing)
- [ ] Reports: P&L-lite, VAT summary, expense breakdown (charts), grant
      report builder
- [ ] Client statement: per-company rollup (invoices, payments,
      outstanding) as record page tab
- [ ] AI tools: categorize expense, draft invoice from opportunity
      (P9, review-required)

**Acceptance.** Quote→invoice keeps audit trail; recurring invoice fires on
schedule; VAT totals match hand-calc in both modes; auto-journal rows
appear with provenance and survive edits idempotently; budget page warns
at 80%; fiche `budget_equilibre` prefills from real data and exports PDF;
subvention ingest populates catalogue and AI match returns cached results
on re-run; e2e covers quote→send→payment→ledger→report.

---

# P8 — Inbox, Notifications & Activity

**Goal.** One inbox for everything; the nervous system of the suite.

### P8.1 Server
- [ ] `notification` core service: event-emitter consumers → notification
      rows (userId, workspaceId, type, payload, readAt, archivedAt), digest
      batching, quiet-hours respect
- [ ] Realtime push on `workspace:<id>:inbox:<userId>`; unread badge counts
- [ ] Preference model per user (per-type channel: inbox/email/none)

### P8.2 UX
- [ ] Inbox app/page: filters (all/mentions/assigned/watching), grouped by
      day, bulk actions, open→deep link (record/doc/message/invoice)
- [ ] Mentions engine: shared parser (docs, chat, comments) emitting mention
      notifications with context snippets
- [ ] Activity feed: workspace-level feed page + record timeline already
      exists — surface unified "Home" dashboard widgets (recent activity,
      my tasks, upcoming events, contribution grid)
- [ ] Email notifications via twenty-emails templates (digest + instant),
      honoring preferences and quiet hours
- [ ] Watchers: watch record/doc/channel → notifications on change

**Acceptance.** Mention in doc and in chat lands in inbox with working deep
links; quiet hours hold email; badge counts live-update; e2e covers
mention→inbox→open.

---

# P9 — Unified AI System

**Goal.** One assistant, all apps, explicit and auditable.

### P9.1 Registry & assistant
- [ ] Extend tool/tool-provider into app-facing AI registry
      (`registerAiTools(appId, tools)` at install; unregister at uninstall)
- [ ] Assistant surface: side-panel assistant + full-page upgrade of
      ai-chat; context injection from current view (record/doc/channel/
      invoice) via context-store
- [ ] Streaming responses (SSE reuse), model provider config (existing AI
      settings), usage logging to event-logs
- [ ] Prompt/action library: per-app actions rendered as buttons in
      context (see below)

### P9.2 Per-app actions (each its own task)
- [ ] Documents: summarize, extract tasks→P4, translate, improve writing
- [ ] Projects: task breakdown suggestions, standup digest from activity
- [ ] Chat: channel/thread summarization, catch-me-up
- [ ] Drive: semantic-ish search (keyword + metadata first), dedupe hints
- [ ] Accounting: expense categorization, invoice draft from
      opportunity/email, anomaly flags (review-required before commit);
      subvention matching with aiScore/aiReason + saved runs (P7.1f)
- [ ] CRM core: email reply drafts, record enrichment assist (respect
      existing enrichment modules)

### P9.2b AI cost discipline (from A2EMoney)
- [ ] Global LLM response cache service (content-hash + version keys,
      hits counter) used by ALL expensive AI calls
- [ ] Saved-run pattern: heavy analyses persist results for instant
      zero-token re-open

### P9.3 Smart integrations (cross-app glue)
- [ ] "Workflow recipes": prebuilt workflow templates combining apps (e.g.
      deal-won → create project + invoice draft + channel)
- [ ] Suggestions engine: proactive cards in Home (stale tasks, overdue
      invoices, unread mentions) — rules first, AI-ranked later
- [ ] Audit page: Settings → AI (usage, logs, provider keys)

**Acceptance.** Assistant answers with record context; every AI mutation
path requires explicit user confirm; usage logged; at least 2 actions per
app ship with tests.

---

# P10 — Individual Mode & Polish

**Goal.** individuals/students love it solo; teams trust it at scale.

- [ ] Solo onboarding polish: 1-user workspace presets hide team UI
      (members/widgets presence gracefully degrade)
- [ ] Personal dashboard: contribution grid, habits/Pomodoro widget,
      journal doc template, quick capture (Cmd+K → note/task/income)
- [ ] Guided tours: contextual onboarding overlays per app (first-open)
- [ ] Performance: workspace switch latency, 10k-record views, cold start —
      profile and fix top 3 issues (document in report)
- [ ] Accessibility pass: keyboard nav for all new surfaces, focus traps in
      docks/modals, reduced-motion
- [ ] Docs: user-facing feature docs (README sections per app), self-host
      docs for gateway requirements (ws, Redis)
- [ ] Final regression: full e2e suite green; upgrade from clean 2.39 DB
      through all upgrade commands; uninstall-everything still leaves a
      working CRM

**Acceptance.** All phases ticked; regression suite green; a fresh
individual workspace feels complete without ever seeing CRM objects.

---

## Cross-cutting risks & mitigations

| Risk | Mitigation |
|---|---|
| App sandbox limits for heavy UI (Gantt, chat) | First-party front components + feature-flagged front pages; decide per spike, record in phase report |
| Realtime at scale | Redis pub/sub + seq catch-up contract; load-test script in P2 report; no exactly-once promises |
| Metadata drift between environments | Fixed UUIDs committed; app publish via CLI in CI for staging verify |
| Scope creep | This file is the contract; deviations need a phase-report entry + plan edit |
| i18n/catalog churn | Lingui extract locally to verify keys; never commit catalogs |
| Editor concurrency (no OT) | Version check + conflict banner; single-writer guidance in docs; full OT explicitly out of scope |

## Definition of done (program level)

Every phase ticked; all quality gates green; a user can create a workspace,
pick a persona, get exactly the apps they need, and use docs/tasks/chat/
drive/accounting/inbox/AI as one product — while the CRM they know still
works exactly as before.
