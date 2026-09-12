# A2E Suite — All-in-One Workspace Master Plan

> **Read [`PROMPT.md`](./PROMPT.md) first if you are an implementing AI.**
> This file is the source of truth for scope, sequence and status.

**Mission.** Evolve A2E Suite (Twenty fork, currently v2.39.0) into a coherent,
modular workspace: documents, projects/tasks, a full calendar experience,
chat, drive, Bilan finance/funding, inbox and one assistant, using Twenty's
app system, CRM records, permissions and design system. Aim for **Notion-like
usability and progressive disclosure, not Huly-like complexity**. A user must
be able to start with useful templates, customize them, collaborate, install
more apps later and remove apps with an explicit data policy.

**Planning-only revision — 2026-09-12, baseline `3e664c89`.** This revision
changes requirements and execution guidance, not product code. Source present
is not the same as shipped-to-users or acceptance-tested. No deployment or
product readiness is certified here.

**Reference boundary (all sources, without exception).**
`Inspiration apps (bureaubilan)` contains distinct apps from multiple projects,
not a suite to integrate wholesale. They are exclusively feature/UX
inspiration. Do not integrate the reference applications, copy their full code,
import their dependencies, adopt their architecture, or connect their external
backends. Re-express useful observed behavior in Twenty primitives. The full
local inventory, R01–R15 feature traceability, prototypes and unavailable
external projects are in [reference analysis](./docs/plan/02-reference-analysis.md).
There are two supplied project trees and five runnable app/client surfaces;
shared-client copies, supporting packages and absent standalone apps are
explicitly distinguished there.

**Audience personas.** individuals, students, groups, non-profits, small
companies, and classic CRM teams.

---

## How to use this plan

- **Status legend** — `[ ]` pending (may have partial code, stated inline) ·
  `[~]` active (one maximum) · `[x]` accepted with executable evidence ·
  `[!]` blocked (reason required). **Legacy `[x]` entries retained in P1–P3
  and P7 are historical implementation claims, not release acceptance**;
  the current-state ledger and reopened items below take precedence. Do not
  retick or rebuild existing code merely because historical reports differ.
- **Acceptance rule.** A task can newly become `[x]` only after its explicit
  checks and applicable global gates actually pass. Link command, commit,
  result and artifact in the phase report. A source audit, manifest build,
  mocked store test or written-but-unrun E2E is not a live journey pass.
- **One ready task at a time.** P0 safety/verification and P1.6–P1.7 product
  contracts precede expansion. Use the dependency order below, not the first
  old checkbox blindly. Independent work may proceed only when its listed
  prerequisites pass; do not impose a phase-number cycle on P7/P8/P9.
- **Phase reports.** Implementation sessions append to
  `docs/plan/phases/phase-<n>-report.md` (two-digit n); P0 uses phase-00,
  P4C uses phase-04, and existing reports remain historical. Record decisions,
  touched paths, real checks, blockers and next ready work. Planning-only
  sessions report validation in the MR without creating extra reports.
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
   (`database:migrate:generate --type fast|slow`) + upgrade command only under
   the actual `TWENTY_CURRENT_VERSION` directory (currently `2-39/`), with
   strictly increasing epoch-ms timestamp, `up` + `down`; app metadata uses
   the native manifest/migration path, not hand-created workspace tables.
4. Unit tests for new services/hooks; integration test for server modules;
   one e2e happy-path per app.
5. UI: light+dark themes, responsive, Lingui fr+en, canonical icons from
   `packages/twenty-ui/src/icon/icon-dictionary.md`.
6. No committed i18n catalog churn; no AI-attributed commits.
7. Additive only: no renames/removals of existing tables, fields, GraphQL
   fields, routes. Deprecate, don't delete.
8. For implementation, update the phase report and tick only accepted tasks
   in the same commit. For planning-only changes, check source/link integrity,
   scope and consistency and report runtime limitations; do not tick product work.

## Current-state ledger — source evidence, not release certification

Paths below are repository-relative. Historical test logs remain in existing
phase reports; the [architecture audit](./docs/repository-architecture-audit.md)
F01–F14 records further risks. Its proposed stabilization work is incorporated
below rather than a competing product backlog.

| Capability | Observed in current implementation | Missing acceptance / correction |
| --- | --- | --- |
| Native app lifecycle | `packages/twenty-server/src/engine/core-modules/application/application-manifest/application-sync.service.ts` transitions to UNINSTALLING, runs a best-effort hook, migrates app metadata to empty and removes runtime resources | Uninstall is potentially destructive, **not reversible disable**. Test records, cross-app relations, files, jobs and failed hooks before any safety claim |
| Presets and onboarding | `packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts`; `constants/workspace-template-definitions.constant.ts`; `packages/twenty-front/src/pages/onboarding/InstallApps.tsx` | Six presets exist. CRM installs none; individual/student/team request Documents; non-profit/small-business also request Bilan. Projects is not included. Samples false; service only warns if enabled, catches install errors, and can still record the template. Empty app availability auto-skips the picker. Template selection and checkbox installs are separate paths |
| Workspace customization | Existing metadata objects/fields/views/layouts/navigation, workspace roles, workflow and file storage | Preserve user configuration during template apply/upgrade; no validated versioned reusable workspace bundle or reversible preference overlay yet |
| Documents | `packages/twenty-apps/internal/a2e-documents/src/` object, views, tree/page widgets, template-copy helper, post-install seeds and purge; host editor/share/search code | Browser query loads roots plus one child level and omits content consumed by copy/share. Comments/history stores in `packages/twenty-front/src/modules/blocknote-editor/` are in memory. Co-editing helper is not an atomic server save protocol. PDF uses browser print. Record-to-doc command does not establish note-body copy |
| Projects | `packages/twenty-apps/internal/a2e-projects/src/objects/`: project, projectMember, milestone, label, taskLabel, timeEntry; `fields/task-subtask.field.ts`, human ID, board/calendar/my-tasks views and overview component | Earlier “no junction/milestone” blocker is stale. Validate inverse relation ownership, task status semantics and actual UI wiring. `logic-functions/task-human-id.logic-function.ts` allocates with separate read/write requests, not atomically. No local project tests at this baseline |
| Calendar | `packages/twenty-server/src/modules/calendar/calendar-event-creation-manager/services/create-calendar-event.service.ts` selects Google/Microsoft/CalDAV creation drivers and persists imported records | Provider sync/creation is not the full reference calendar app. Native local-event ownership, series editing, reminders and full calendar UX remain P4C decisions/tests |
| Bilan | `packages/twenty-apps/internal/a2e-accounting/src/` has 14 object definitions, views, explorer/quick-entry and event/cron functions | No dedicated `twenty-server/src/modules/accounting` module at baseline. `objects/subvention.object.ts`, source and AI-cache objects are workspace metadata, **not instance-global tables**. Post-install ingest is asynchronous and catches failure; nonempty catalogue is not guaranteed. Finance/privacy/lifecycle invariants need server enforcement |
| Search/realtime/AI | Document provider, `/realtime` gateway, presence/dock/tabs, existing tool provider `packages/twenty-server/src/engine/core-modules/tool-provider/providers/logic-function-tool.provider.ts` | Search currently uses system auth + permission bypass. Realtime topic auth verifies JWTs rather than the current HTTP session contract; record/channel ACLs and catch-up need tests. Native `toolTriggerSettings` already exposes app functions: **no new AI registry/table/install hook** needed |
| Remaining apps | Existing task/note/attachment/calendar/messaging/workflow/AI primitives are reusable | Live Chat, standalone Drive, unified Inbox and expanded per-app AI journeys remain proposed. Email messaging is not live chat; a FILES field is not a Drive product |

## Product flow and integration contracts (proposed, binding for new work)

**One journey:** create/join workspace → choose blank/CRM or a reusable preset
→ review optional apps and prerequisites → apply with visible progress → land
on a ready-to-use Home/page/template → customize → invite teammates → work
across linked records → install another app in the same workspace → safely
hide or remove it. No second login, second workspace, duplicate tasks or new
backend. Joined members enter the existing workspace, not a new preset wizard.

### C1 — Templates are reusable configuration, not copied applications

Distinguish (a) **workspace presets** (app selection + starter navigation,
views, layouts, workflows), (b) **content templates** (document/project/task/
book/fiche content) and (c) **workflow recipes** (opt-in automation).

Proposed template contract: stable key + version + localized label/description,
preview, compatible app universal IDs/version ranges, required versus optional
capabilities, input schema (dates, team, locale/currency), declarable metadata
references, optional seed descriptors and ownership/provenance. These are
logical requirements, **not existing SDK exports or a mandate for a new engine**.
Resolve actual representation in P1.6 using existing manifests/workflows.

- Never include tokens, account connections, private records, user IDs from
  another workspace, share URLs or live finance transactions in a template.
- Preview a resolved diff before apply: install/keep/unavailable apps, added
  views/pages, optional samples and permissions. Unavailable optional apps can
  be excluded; required dependency errors block only the affected bundle.
- Instantiate fresh content IDs with source-template/version provenance;
  validate/remap relations and block/comment identifiers. Editing a copy does
  not mutate its template. Workspace-owned templates can be created, edited,
  duplicated and shared within that workspace under explicit roles.
- Samples default off and are distinguishable from operational defaults (e.g.
  ledger/categories). Retrying the **same operation** creates no duplicates;
  explicitly creating a second project/template copy is allowed. Template
  deletion never deletes existing instances. No implicit live propagation.

### C2 — One setup operation from onboarding or Settings

Reuse WorkspaceTemplateService, ApplicationInstallService, registration,
workspace migration and the existing onboarding state machine. Unify preset
and manual app selection into one resolved request; no double install path.

Logical request: workspace, template key/version or none, selected app IDs,
optional samples, inputs and idempotency key; caller identity is server-derived.
Logical result: operation ID, requested/applied template versions, per-step
status (`pending/running/succeeded/failed/skipped`), created IDs and safe,
localized error/retry information. This operation progress is **not a duplicate
workspace-module activation table**; installed application state remains truth.

- Authorize workspace configuration/app management with existing permissions;
  invitations/roles do not grant application management implicitly.
- Validate availability and versions first, install dependencies, await required
  post-install defaults, apply only owned starter configuration, then expose
  completion. Async ingest may continue with a truthful “refresh pending” state.
- Partial failure keeps successful work, shows exactly what failed, allows
  retry/skip optional steps, and never reports the entire preset applied.
  Revalidate permissions/version on resume, including another browser session.
- Skip defaults to unchanged CRM/blank setup. No apps available, network error
  and permission denial must have distinct UI, without losing template choice.
- Existing workspaces use the same preview/apply contract. Preserve custom
  fields, records, layouts, nav order, roles and active workflows. Managed
  defaults need provenance so a template switch restores only what it hid,
  not user-hidden navigation. CRM hiding is not deleting CRM data or rights.

### C3 — Install later, hide, uninstall, data and upgrade lifecycle

**Separate actions:** hide/navigation preference retains data and running
behavior; an admin kill-switch contains unsafe functionality; uninstall removes
app metadata and may remove data. Do not label either hide or uninstall as
“pause with guaranteed restore”. A true suspend mode needs a later explicit
contract and tests, not assumed platform support.

- Install later uses C2 readiness/error reporting and fixed app IDs; it augments
  the current workspace without resetting its preset or requiring re-onboarding.
  Upgrade has a preflight compatibility diff and fresh/populated-workspace tests.
- Dependency preflight names dependent apps, fields, views, workflows and linked
  data. Block destructive removal while a required dependent remains. Optional
  links may be detached only with an explicit impact preview; never cascade
  finance/history loss as an incidental app toggle.
- Before uninstall, offer export, show affected record/file counts and retention
  consequences, and require authorized confirmation. **Current native removal
  is not a retention guarantee.** If preservation is required but no supported
  archive/ownership-transfer path is implemented, refuse removal with a useful
  reason; offer hide instead. No hidden “retain data” switch that deletes tables.
- Stop/reject new app writes and jobs; drain/cancel/retry safely; disable tools,
  search providers, recipes and notifications; revoke public shares. Recheck
  app availability on API entry and queued execution, not only in navigation.
  Best-effort uninstall hooks alone cannot guarantee these invariants.
- Standard company/person/task records survive removal; app-owned fields on
  standard objects may not. Preview that loss and preserve/export required
  values first. Keep files referenced by surviving records; purge only after
  ownership/reference checks and the selected retention policy. Finance audit
  retention/legal hold overrides generic seven-day trash.
- Reinstall restores supported defaults, not deleted data. Record restoration
  requires a separately validated import/backup path. Removal failure exposes
  recoverable state; never silently orphan routes, shares, files or jobs.

### C4 — One permission and collaboration model

Use Twenty workspace members, roles, metadata/row permissions and app-owned
junctions; project membership is not an alternative authentication system.
Record cross-links are same-workspace relations with fixed universal IDs;
required dependencies must exist, optional cross-app links must degrade safely.

Role matrix: admin/configurator can manage apps/templates; member can instantiate
permitted templates and edit allowed records; viewer cannot mutate; guest can
only use explicitly authorized shares; removed member loses API/search/realtime
access. Invitations land in the existing configured workspace; project member
assignment, task ownership, mentions, activity and notifications use the same
member identity. Separate workspace defaults from personal favorites/nav/density.
Test permissions at query, mutation, search, export, share, tool and event paths.

### C5 — One task, calendar event, document and file across surfaces

- Projects extends standard `task`; board, My tasks, project page, due-date
  calendar and record tasks tab show the same IDs/status/assignee. Reconcile
  existing `status` versus `projectStatus` before adding more status logic.
- Calendar distinguishes task due dates from scheduled events/time blocks.
  Displaying a deadline must not automatically send provider invitations.
  P4C defines opt-in links, source of truth, recurrence instance identity,
  timezone and provider reconciliation before promising two-way synchronization.
- Documents remain tree entities; CRM notes remain notes. Copying a note into
  a document copies actual authorized content and records provenance; linking
  must not silently duplicate content. Share snapshots have a declared format,
  expiry/revoke/archive behavior and record-level authorization.
- File fields use attachment/file-storage primitives; source-app attribution
  is not ownership or permission. Stable record links open in the native side
  panel or full page and show a safe missing/removed state, never another tenant.
- Cross-app events/workflows need a documented logical contract: event ID/type/
  version, workspace, source record/app, actor and correlation/idempotency key.
  Implement with existing event-emitter/queue payload conventions, not a second
  event bus. Consumers recheck permissions/install state, deduplicate replay and
  expose failed jobs; publish only after durable writes. Recipes are opt-in,
  preview their writes and degrade safely when optional apps are absent.

### C6 — Finance, funding and AI contracts

- Deterministic money/rounding, currency and VAT rules; atomic numbering and
  provenance-keyed ledger upserts; duplicate/reordered events and period-close
  races cannot change closed books. Preserve `bookEntry.sourceKey` uniqueness.
  Authoritative server checks must also protect alternate API writes.
- Funding catalogue records carry source/source ID, freshness, eligibility,
  deadline, application link and retirement state. Search is usable without
  AI. Show partial source failure/stale or empty results honestly; never promise
  all French grants. Saved dossiers retain their source snapshot if an aid retires.
- **Scope decision pending:** keep current workspace catalogue or migrate to an
  instance service with workspace saved references. Review cost/permissions and
  an additive populated-data migration first; do not mark global storage done.
- “Following book” is provisionally mapped to observed **Livre / Journal
  automatique + customizable tracking sheets**, not asserted as an exact term.
  Keep the saved-subvention tracker and grant report separate; see R11–R13.
  CERFA identities/versions and retention need domain review before official
  exports. Do not conflate the grant-report wizard with donation receipts.
- Reuse native logic-function `toolTriggerSettings`, tool providers and assistant
  infrastructure. Tools obey caller permissions, validate inputs, show a draft
  and require confirmation for mutations; no AI auto-posting or auto-submission.
- Cache public catalogue-only results globally only if privacy-safe; private
  prompts, organization profiles, documents, dossiers and saved runs are scoped
  to workspace/access context with version/model keys and invalidation on
  permission/data changes. No cross-workspace cache leak. Saved-run re-open
  must incur no new provider call. AI consent, quota, outage and cancellation
  cannot prevent ordinary search/manual work.

### C7 — Feature-rich without configuration overload

Fresh Home offers one primary next action and only installed, ready modules.
Creation starts with blank or a short searchable template list; advanced fields,
workbench widgets, Gantt, finance settings and automation stay progressively
disclosed. No user must understand metadata, a dock or an AI prompt to create
a document/task, schedule an event or find an aid. Use Twenty navigation,
layouts, views and forms, not a parallel Notion/Huly shell.

Acceptance in every vertical slice: keyboard-accessible non-drag alternatives,
visible focus, labeled controls, recoverable empty/error states, light/dark,
fr/en and narrow-screen use; team features degrade cleanly for solo workspaces.
User tests in E12 must validate the flow before describing it as intuitive.

## Execution order and agent handoffs

1. **P0** reproducible checks and access/lifecycle containment (audit Stage A).
2. **P1.6a–c / P1.7a–b** template/setup/lifecycle contracts and connected flow;
   stabilize existing P1/P2 behavior, not replace it. Starter bundles/reuse
   (P1.6d/e) and cross-app acceptance (P1.7c) complete per safe vertical slice;
   they do not block implementation of the very apps they need to validate.
3. **P3 repair → P4 existing slice → P4C calendar**. P7 safety work can run once
   P0 passes; project-finance links require P4. P6 provides enhanced file UX,
   not a prerequisite for existing receipt storage.
4. **P5/P8** after real session auth, durable persistence and reconnect gates;
   **P7 expansion** after finance invariants and domain decisions.
5. **P9** per-domain actions only after that domain is safe; registration is
   already native. **P10** final usability/release regression; baseline UX
   and accessibility are required earlier, not deferred to polish.

For each task, the implementing agent hands off: ID, evidence paths, prerequisite
results, contract/input/output changes, permissions and data-lifecycle impact,
checks actually run, failed/unverified checks and next ready task. Use existing
phase reports; do not create another summary/backlog. Planning-only requests
update guidance without implementing or falsely ticking product work.

## Phase index

| # | Phase | Delivers | Depends on |
|---|---|---|---|
| P0 | Verification and safety | Reproducible gates, access/realtime/lifecycle repairs, release recovery | — |
| P1 | Templates, setup and lifecycle | Reusable presets/content, unified onboarding/install, customization and team entry | P0.1/4; starter content lands per app |
| P2 | Realtime and optional workbench | Existing gateway, presence, reconnect, dock/tabs/search repairs | P0.2/3 |
| P3 | Documents | Durable tree/editor/templates/history/share/export | P0.2, P1.6a–c; P2 for presence |
| P4 | Projects and tasks | Validate existing metadata; boards, subtasks, dependencies, retroplanning and time | P0, P1.6a–c; P3 for doc links |
| P4C | Full calendar | Local/provider ownership, day/week/month, recurrence, reminders, links | P4C.1 depends P0.1/P1.6a; P4 for task links; P8 for reminders |
| P5 | Live chat | Channels, threads, mentions, reactions, read cursors | P0.3/P2; P8 for notification UI |
| P6 | Drive | File/folder browser, previews, bulk actions, usage | P0.2/4, P1.7a |
| P7 | Bilan finance and funding | Safe books/budgets/invoices, eight fiches, grant reporting/discovery and privacy | P0, P1.6a–c; P4 for projects; P6 enhances existing receipts |
| P8 | Inbox and activity | Notifications, mentions, quiet hours and team feeds | P0.3/P2; contract can precede P5 UI |
| P9 | Unified AI | Native registry consumption, assistant actions, reviewed cross-app recipes | Each underlying domain's safety/acceptance |
| P10 | Usability and release polish | Solo/team journeys, accessibility, performance, regression | Relevant vertical slices; P0.5 for release |

P0 is a prerequisite repair gate, not a new product module. P4C is the full
calendar milestone alongside Projects; a task CALENDAR view alone cannot close
it. P9.1 consumes the existing native registry verified in P1.5.

---

# P0 — Verification and safety before expansion

Read the existing architecture audit findings F01–F14 for the diagnosis; this
checklist governs execution. No broad release of affected features until their
authorization and persistence checks pass.

- [ ] **P0.1 Platform/QA baseline:** provision repo-compatible Node 24/Yarn,
      dependencies, disposable PostgreSQL/Redis and Playwright. Run uncached
      shared build, server/front tests/builds and app-local build/typecheck/tests.
      Correct app CI script/lockfile discovery and verify SDK 2.31 app pins
      against server/SDK 2.39 before assuming compatibility. Decide authoritative
      GitLab release checks with maintainers (audit F08/F09).
- [ ] **P0.2 Backend access boundaries (after P0.1):** repair caller-scoped
      document search, record-level share authorization and consistent
      encrypted/plain snapshot validation. Test two workspaces, restricted
      member, guest, expiry/revoke/archive; no leaked titles or share tokens.
- [ ] **P0.3 Backend/front realtime (after P0.1):** reuse actual HTTP session
      and origin policy, revalidate revoked membership, enforce record/channel
      topic rights. Distinguish connection from subscription success; surface
      Redis failure and refetch durable state after reconnect. Never make
      HttpOnly cookies readable as a workaround (audit F02/F06).
- [ ] **P0.4 Platform/app lifecycle (after P0.1):** characterize native
      install/upgrade/uninstall on populated disposable workspaces, hook failure,
      job cleanup and data loss; implement C3 safeguards before presenting
      removal as safe. Verify published app artifacts are provisioned on a
      production-like server; source folders in Git are not installed apps.
- [ ] **P0.5 Release/recovery:** required migration failure blocks deployment;
      rehearse DB/file backup restoration and verify server/worker readiness
      (audit F10). Choose supported DB versions and CI source before release.

**Exit:** recorded real commands/artifacts and passing P0-specific tests for
existing auth/search/share/session/lifecycle boundaries; baseline failures have
owners and cannot be hidden. E02/E05/E08/E09 later extend these tests with new
product UI, so completing future Chat/Drive is not a P0 prerequisite. Blocked
environment means UNVERIFIED, not accepted. P0.5 additionally gates release.

# P1 — Foundations & Module Activation

**Goal.** The skeleton that makes "activate only what you need" real:
a workspace-level module system surfaced in Settings, onboarding presets per
persona, and the conventions every later phase relies on.

### P1.1 Conventions & scaffolding
- [x] Create `packages/twenty-apps/internal/a2e-documents` app scaffold;
      source now contains the full document app work described in P3.
- [x] Add `packages/twenty-apps/README-A2E.md`: local app authoring,
      publishing, naming and UUID discipline (historical completion).
- [ ] Verify app install/uninstall on a populated scratch workspace under C3.
      Historical verification was source audit only; records/files/relations,
      hook failure and reinstall still need real acceptance (P0.4/P1.7).

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
- [ ] Complete preset orchestration through existing server service (not a
      new logic-function): partial-state reporting, owned navigation and optional
      samples; current service logs install failures and has no sample seeder.
      P1.6 owns the repair.
- [ ] e2e: create workspace with `individual` preset → CRM nav hidden,
      Documents installed and usable. Existing spec was not browser-verified
      in the phase report; also test restoration to CRM and customized nav.

### P1.4 Search federation skeleton
- [x] Server: search provider interface in `search` core module +
      registry (keyed by app id)
- [x] Front: Cmd+K grouped results structure (group headers, frecency store)
- [x] Consume providers dynamically; core object search unchanged

### P1.5 AI registry seed (pre-work for P9)
- [x] Historical audit established native app logic-function tools via
      `toolTriggerSettings` and `LogicFunctionToolProvider`; see phase-01 report.
      No `registerAiTools` hook or new table is required.
- [x] Tool registration metadata already exists on app logic functions;
      installed/uninstalled behavior and caller permissions are P9 acceptance.

### P1.6 Reusable templates and unified setup (R01/R04/R06/R09)
- [ ] **P1.6a Contract task (after P0.1):** specify C1/C2 using actual SDK
      manifests, workflow definitions and existing template service. Inventory
      which metadata is app-owned versus workspace/user-owned. Deliver version,
      compatibility, inputs, provenance and preview fixtures; reject unknown
      IDs, cycles, unavailable requirements and cross-workspace content.
- [ ] **P1.6b Backend operation (after P1.6a/P0.4):** implement one authorized,
      resumable setup operation from preset + checkbox choices. Test same-key
      retries/concurrent requests, async post-install completion, registration
      failure and partial results; no fake completed preset or duplicate seeds.
- [ ] **P1.6c Front onboarding/Settings (after P1.6b):** preview apps,
      prerequisites, samples and customization; allow blank/CRM, optional app
      exclusion, continue with successful steps and retry later. Empty catalogue
      cannot discard template choice. Both entrypoints use the same operation.
- [ ] **P1.6d Starter bundles (after P1.6b and each app's safe slice):** meeting
      notes/project brief/PRD/one-on-one; project delivery/event retroplanning;
      Bilan cashflow/donation/grant/custom sheets and fiches. Add proposed
      student/journal/team/non-profit/small-business bundles with previewed
      contents and only compatible ready apps; keep CRM-only available. These
      persona bundle contents are proposals, not observed shipped presets.
- [ ] **P1.6e Workspace reuse (after P1.6c):** save/edit/duplicate authorized
      content templates, instantiate from first-open and later gallery, delete
      template without deleting copies; permission-aware attachment/ID remapping.
      Repeat on an existing customized workspace and verify no configuration loss.

### P1.7 Lifecycle and team entry (R07/R09/R15)
- [ ] **P1.7a App management (after P0.4/P1.6c):** install later, readiness,
      dependency impact, export/confirmation, hide versus uninstall labels and
      blocked-removal explanation per C3. Test upgrade, failure/retry/reinstall;
      no promise of data restoration from reinstall.
- [ ] **P1.7b Team entry (after P1.6c/P0.2):** invitations join the configured
      workspace; member/viewer/admin matrix, role changes and removed-member
      behavior apply to templates, projects, search, tools and shares. Preserve
      personal preferences across workspace switches without leaking records.
- [ ] **P1.7c First-use acceptance:** E01–E04 and E12 run with empty, populated
      and customized workspaces, no-AI configuration and missing optional apps.
      Demo content is optional and never becomes a financial transaction.

**Acceptance.** C1–C4 pass E01–E04 with recorded UI/API/database outcomes.
Explicitly rerun individual → CRM → individual navigation restoration and
verify user-hidden/custom items survive. Source audit alone cannot close P1.

---

# P2 — Realtime Gateway & Workbench Shell

**Goal.** Reliable session-aware realtime and a calm, optional workbench.
Existing code is partial; P0.3 and actual two-session checks gate acceptance.
Do not add Huly-like navigation density. See blueprint §4–§6.

### P2.1 Realtime gateway (server)
- [ ] Repair existing `/realtime` authentication to use the current HTTP
      session/origin contract; the old cookie-on-upgrade claim was not met.
      Preserve subscribe/unsubscribe and envelope protocol where compatible.
- [ ] Verify existing Redis fan-out across server/worker and multiple instances,
      including outage/recovery and rejected subscription acknowledgements.
- [ ] Enforce workspace, member, record and channel ACLs at subscribe and on
      revocation. Current workspace/inbox checks are insufficient for private
      document/chat topics (P0.3).
- [x] Heartbeat/ping-pong and dead-socket cleanup source exists; verify metrics
      emissions rather than only the declared counter keys.
- [ ] Real-session integration tests for auth, tenant/topic isolation,
      subscription failure and authoritative reconnect refetch. Per-socket
      sequence numbers are not durable replay cursors.
- [x] Unit tests for topic parsing/auth and envelope serialization exist;
      historical isolated harness results do not close the real-session gate.

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
- [ ] Run the existing dock/tab unit suites plus browser E2E: two records as
      tabs → switch/close → reload restores permitted context. Historical
      report says browser E2E was blocked, not passed.

### P2.5 Global search v1
- [ ] Validate existing records + real document provider through caller
      permissions; the document provider is no longer a stub. P0.2 repairs
      system-context bypass and verifies actual query/filter behavior.
- [x] Frecency ranking; keyboard navigation; deep links open side panel
- [ ] Performance budget: measure p95 < 150ms interaction latency on a
      10k-record workspace with stated hardware/network/query conditions.
      Historical 8ms synthetic grouping benchmark is not end-to-end latency.

**Acceptance.** Two browser sessions see presence + live widget updates;
killing the socket shows banner and queues; search feels instant; existing
pages render unchanged (no layout regressions).

---

# P3 — Documents (Full Note-Taking)

**Goal.** Notion-like document tree on the existing app-owned `document`
object, sharing the blocknote editor with CRM `note` without replacing it.
App: `a2e-documents`.

### P3.1 Document object model
- [x] Spike (report only): extend `note` vs new `document` object — decision
      criteria: note is polymorphic-target CRM surface; documents are
      first-class tree entities. Expected: keep `note` for record-attached
      notes; add `document` object for the workspace tree, sharing rich-text
      stack. Record decision + trade-offs
- [x] `document` metadata exists: title, icon, coverColor, content (RICH_TEXT),
      parent/children, fractional position, isFavorite, kind DOCUMENT/TEMPLATE,
      archivedAt, tags and company/person relations. Shared favorite semantics
      and inherited record-surface wiring still need acceptance.
- [x] Fractional indexing util in `twenty-shared/utils` (with tests)
- [x] Upgrade command (2-39) if any server-side columns needed beyond app
      metadata (none needed — all columns live in app metadata; see report)

### P3.2 Editor upgrades
- [x] Slash-command extensions: toggle/heading/code/quote/callout/divider/
      image (upload → FILES), @mention (users + objects), /link to records
- [ ] Persist inline comment threads/anchors under document permissions;
      current `EditorCommentsThreadStore` is in-memory. Reload and a second
      session must preserve contents, resolution and author permissions.
- [x] ToC/outline panel; word count; typewriter mode option
- [ ] Complete template instantiation + gallery composition: helper and LIST
      view exist, but browser does not select template content. Fetch authorized
      body, remap IDs/anchors and prove copy independence (C1, E04).
- [ ] Persist revision history; current `EditorVersionHistoryStore` is an
      in-memory ring buffer. Retention, block diff and restore-as-new-revision
      must survive reload and respect permissions (E05).
- [ ] Validate export of nonempty content with supported custom blocks:
      existing PDF path is browser print, DOCX/Markdown helpers exist. Define
      fidelity/fallback warnings; do not claim full PDF export from a button.
- [ ] Repair public snapshot sharing: record-level rights, validated plaintext
      or ciphertext-only representation, consistent guest format, display/copy
      URL, revoke, expiry and passphrase UX. P0.2 gates E05.
- [ ] Atomic expected-revision save with conflict feedback and preserved draft;
      presence and pure optimistic classification helper exist, but do not
      implement a server save/merge protocol. No OT/CRDT promise in v1.

### P3.3 Tree & navigation UX
- [ ] Finish existing document tree: lazy/paginated loading at every depth,
      server cycle validation, deterministic sibling ordering and accessible
      move controls. Verify favorites are personal rather than a shared flag;
      test archive/restore/purge across deep trees and more than one API page.
      Existing tree/drag/cron code is a starting point, not full acceptance.
- [x] Doc page: cover/icon/title/editor/outline; open in side-panel tab or
      full page (addressable URL)
- [x] Cmd+K: create/open document commands; search provider for docs
- [ ] Record integration: preserve existing company/person relation fields;
      implement actual selected-note body copy with source link and permission
      checks. Existing record command/title snapshot is not note-body copying.
      Test both record types and open from search/relation/side-panel.

### P3.4 Authoring and portability backlog (R01/R02/R06)
- [ ] After durable save/share acceptance: searchable built-in + workspace
      templates (C1), HTML import with sanitization, attachment/link mapping,
      unsupported-block warnings, progress and retry; validate before creating
      records. CSV import/export and JSON export for configurable databases
      reuse native import/export; validate escaping and field/permission mapping.
- [ ] After a native-primitive/license feasibility check: embedded native record
      views, charts, math/diagrams, multi-column authoring, text review accept/
      reject, font/page-layout/export controls. PDF/DOCX fidelity is required;
      reference ODT export is deferred pending this feasibility review, not
      overlooked. Stage behind advanced controls; never import reference
      packages or invent a JSON database engine.
      Each supported block must round-trip save/reload/export; unsupported
      features remain explicitly deferred, not silently accepted.
- [ ] Guest editing is **deferred**, despite reference schema support. V1 public
      links are read-only snapshots; richer guest collaboration needs a separate
      authorization/concurrency decision and acceptance, not a flag flip.

**Acceptance.** E04/E05: create → edit → move deep tree → reload → template
copy → share/unlock/revoke → populated export, with restricted roles and two
sessions. Stale saves cannot silently overwrite; comments/history persist.
Optional advanced authoring is not a prerequisite to this repair slice.

---

# P4 — Projects & Tasks 2.0

**Goal.** Accessible project planning on standard Twenty tasks. App:
`a2e-projects`; preserve the existing six object definitions and stable IDs.

### P4.1 Model and existing-slice repair (after P0/P1.6a–c)
- [ ] Validate/install existing `project`, `projectMember`, `milestone`, `label`,
      `taskLabel`, `timeEntry`, task fields and layouts as one manifest. Fix
      inverse relation ownership/label fields and add missing views/layouts
      before adding new entities. The old “no many-to-many” blocker is resolved
      conceptually by the **existing junction objects**, not a new SDK engine.
      Project budget/spent exists; wiring is P7.1c.
- [ ] Reconcile standard task `status` and app `projectStatus` so completion
      agrees across native tasks, boards, filters and project progress. Use
      select options with stable completion semantics, not a custom-status
      entity/parallel workflow engine. Preserve old values through migration.
- [ ] Validate existing task project/priority/estimate/labels/parent/milestone
      fields; enforce self/ancestor and cross-workspace rejection in APIs.
      `blockIssue` currently points to a **note**, not another task: retain its
      meaning and add real task dependencies through supported relation/junction
      metadata. Do not relabel it as a shipped blockedBy task relation.
- [ ] Replace non-atomic human-ID allocation with a narrow transactional,
      unique, retry-safe operation. Decide key changes/reassignment semantics;
      concurrent events, replay and failure between writes cannot duplicate IDs.
      No generic computed-field engine is required.
- [ ] Verify milestone date/completion and project/member/time-entry relations
      through installed API + UI. Add member permissions, timer/entry integrity
      and task label tests; source definitions alone are not accepted.
- [ ] Workflow template: "recurring task generator" (uses existing workflow
      engine)

### P4.2 Views & UX
- [ ] Board view (kanban by custom status — extend view types if needed;
      prefer existing kanban view on task with status grouping)
- [ ] Gantt/timeline view (front component; framer-motion-free, virtualized)
- [ ] Calendar view of tasks/due dates (link into existing calendar module
      surface)
- [ ] Retroplanning (R04, after P4.1/C1): choose a reusable project recipe,
      set deadline and timezone, preview task/subtask dates, durations,
      dependencies, assignees and overlap/past-date warnings; confirm creation
      into standard tasks. Persist generation provenance/idempotency. Reapply
      or move deadline previews only owned changes and protects manually edited
      dates/completed work. Append versus replace affects the draft unless an
      explicit destructive record-change preview is confirmed (E06).
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
- [ ] Calendar links: P4C.5 owns opt-in task/event synchronization and source
      of truth. Keep deadline overlays separate from provider events; do not
      implement a competing two-way link in this task.
- [ ] Documents: doc relation on project; project overview shows linked docs
- [ ] AI seed: "extract tasks from document" (P9 tool stub)
- [ ] Trash: 7-day restore + purge cron (mirror P3 pattern)

**Acceptance.** E06: template → project/member assignment → standard tasks/
subtasks → board → deadline/calendar → doc/file links → time rollup. Existing
board/My tasks/calendar definitions must be validated, not recreated. Test
cycles, read-only members, task reassignment, concurrent IDs, timer retry and
manual edits during replanning. Add CSV/bulk task import/export with validation
and partial-row error feedback (R03), reusing native import. Benchmark 1k-task
Gantt with recorded hardware and responsiveness; no “smooth” claim from source.

---

# P4C — Full calendar experience (R05, not just a task view)

**Goal.** A calendar usable without Projects or a connected provider, plus
opt-in external account capabilities. Extend existing calendar/connected-account
primitives; app packaging/name is decided in P4C.1, not inferred from Bureau.

- [ ] **P4C.1 Ownership/compatibility spike (after P0.1/P1.6a):** inspect
      standard calendarEvent/channel/participant metadata, existing creation
      drivers, import/sync and calendar UI. Decide a local-event path, app
      activation boundary, calendar sharing rights and provider capability
      matrix (create/update/delete/recurrence/attendee support). Record actual
      gaps before extending metadata/services; no parallel calendar backend.
- [ ] **P4C.2 Core UX (after P4C.1/P0.2):** day/week/month plus accessible
      agenda fallback, today/range navigation, all-day/multi-day/timed events,
      title/location/description/color, timezone-aware creation/edit/delete,
      slot selection/drag-to-create with keyboard equivalent. Save feedback,
      overlap layout and empty/error states; installable from C2 later too.
- [ ] **P4C.3 Recurrence (after P4C.2):** daily/weekly/monthly, interval,
      weekdays, monthly position, count/until and skipped/detached occurrences.
      Explicit “this occurrence” versus “whole series” edit/delete. Stable series
      and occurrence IDs; no duplicate detached events on retries. Test DST,
      month-end/leap-year, locale week start, long ranges and timezone changes.
      Future-series split is not promised without an additional decision.
- [ ] **P4C.4 Reminders/team (after P4C.3 and P8 notification contract):**
      configurable reminders with idempotent delivery, reschedule/cancel,
      quiet-hours/timezone rules; invite/response/visibility rights where
      supported. Keep unsupported provider actions visibly read-only. Declare
      attendee behavior a proposed requirement, not verified reference UI.
- [ ] **P4C.5 Task/project links (after P4.1/P4C.2):** overlay task due dates,
      quick-create a standard task from a day, opt-in event/time-block link,
      open project/task from event. Agree source of truth and confirm before
      moving linked deadlines or sending invitations. Provider reconciliation
      uses external IDs/idempotency; unlinking/deleting one side does not
      silently delete the task. No “two-way” claim without E07.

**Acceptance E07:** local create → repeat → detach one occurrence → reschedule
→ reminder → team response → task link → unlink/delete with reload and a second
session. Run supported provider cases separately with real adapters; blocked
credentials/services leave those cases UNVERIFIED. Removing optional calendar
UX leaves CRM calendar sync and standard tasks intact per C3. No P4C.4 block
prevents validating the P4C.2/3 core slice; notifications land after P8.

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
- [ ] Upload: drag-drop and keyboard picker; upload to folder with per-file
      progress, retry/cancel and quota failure feedback. From chat/docs use
      the same file identity with source attribution (R08).
- [ ] Bulk download/move/delete with per-item failure reporting and undo where
      retention allows; range selection must have an accessible alternative.
- [ ] Usage widget: storage by type/app; quota display if billing provides
- [ ] Cmd+K + search provider for files; AI stub: "find the invoice PDF
      from X" (P9)

**Acceptance.** Upload→folder→preview→share link flows; filters by source
app distinguish CRM/doc/chat uploads; e2e happy path.

---

# P7 — Bilan finance, books and funding discovery

**Goal.** Accessible small-business/non-profit finances inspired by Bilan:
books, budgets, invoices, reusable fiches, project/grant reporting, organization
profile and funding discovery. App: existing `a2e-accounting`; introduce narrow
server-domain behavior only where required for authoritative invariants.
No wholesale A2EMoney/Bilan port. Reference R10–R13 and C6 define the boundary.

**Current status:** substantial app-side implementation, **not acceptance-tested
release readiness**. Historical `[x]` entries below indicate earlier app-source
claims; they do not establish server enforcement or complete UI journeys.
No accounting server-domain module exists at baseline. Start with the existing
14-object manifest and repair, not a second finance implementation.

### P7.0 Safety gate (after P0; before P7 expansion)
- [ ] Verify schema/relations on fresh and populated installs; transactional
      ledger replay/uniqueness recovery, invoice numbering, money/rounding,
      period-close races and alternate API writes (audit F12, C6).
- [ ] Implement protected organization bank data and role/field access; review
      export/retention/uninstall behavior with finance/privacy reviewers.
      Field descriptions and UI locks are not security enforcement.
- [ ] Resolve catalogue storage scope and CERFA report/receipt terminology
      (C6/D03/D04). Financial compliance is not certified by reference code.

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
- [ ] Custom tracking sheets from cashflow/donations/grants/custom starters
      (R11): typed editable columns/cells, required/select fields, proofs,
      names/icons/colors and CSV/XLSX export/print. Reuse metadata/grid primitives;
      decide dynamic-column representation before building another table engine.
- [ ] Server-enforced managed rows/columns and period locks; scoped admin
      unlock/correction with audit trail. This “Livre / Journal automatique”
      is the observed book feature, not an invented follow-up notebook.
      Exports include proof names and reconcile to ledger totals (E10).

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
- [ ] Validate org-profile prefill and official form identity/version before
      fill/print. Current `lib/cerfa.ts` labels 15059 as a donation receipt,
      but the reference 15059 wizard is a grant financial/qualitative report.
      Preserve `recu_don` separately; domain review + PDF fixtures required.
- [ ] Grant report wizard (R12): qualitative outcomes/beneficiaries, forecast
      versus actual expenses/income, allocation/variance annex, signature and
      review/export. Prefill from authorized project entries with user review,
      never unreviewed heuristic allocation; persist drafts and report provenance.
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
- [ ] Catalogue scope decision + migration if approved: existing `subvention`
      and `subventionSource` are **workspace app objects**, not instance tables.
      Preserve source IDs, eligibility, financers/audiences/types, territory,
      deadlines, URLs, isLive, content hash/version and saved dossier history.
      Instance-shared ingestion is a proposal, not a shipped capability (D03).
- [ ] Harden existing `refresh-subventions` cron/post-install ingestion:
      paginate each enabled source, deduplicate, retain last good data on
      partial failure, record counts/freshness/errors and allow authorized retry.
      Aides-territoires/Carenews/curated adapters exist, but availability and
      coverage are unverified. Async post-install catches errors; empty/stale
      catalogue needs a truthful UI, not “never empty” or exhaustive-grants claims.
- [x] `savedSubvention` workspace object: status shortlisted/preparing/
      submitted/granted/rejected/abandoned, amountRequested/Granted,
      deadline, notes, aiScore/aiReason, projectId
- [x] Granted → auto-create income entry with provenance link
      (`grant-subvention-income` logic function)
- [x] Deterministic matching (rules, no LLM): score candidates against
      org profile with explained reasons (`subvention-matching.ts`,
      `score-subventions` logic function); AI matching via P9 on top
- [ ] Validate existing workspace `aiCacheEntry` model and saved-run design
      against C6 privacy, access/version invalidation and no-extra-call re-open;
      it is not a verified global LLM cache or complete P9 integration.
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

**Acceptance E10/E11.** Quote → invoice → send → partial payment → ledger →
report reconciles, with approved hand-calculated VAT/rounding fixtures; recurring
**finance entries** are the existing model (recurring invoices need their own
approved requirement). Replays/concurrent updates yield one provenance row;
closed periods reject unauthorized edits. Budget warnings and approved fiche/
report PDFs use real entries, not demo totals. Search → shortlist → linked
project/dossier → fiche → decision → reviewed income → journal works without
AI; optional AI shows consent/reasons and cached re-open makes no provider call.
Search includes R13 filters, pagination, source/freshness counts and useful
empty/error states. No duplicate grant income, cross-tenant data or unreviewed
financial automation. Notifications depend on P8; PDF form approval on D04.

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
- [ ] Consume existing `LogicFunctionToolProvider`/tool registry and app
      `toolTriggerSettings`; validate install/uninstall/permissions/context
      behavior. P1.5 established this native primitive; do not invent
      `registerAiTools`, a duplicate table or manual registration hooks.
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
- [ ] Permission/workspace-scoped private-result cache; only public-only
      catalogue results may be shared globally after review (C6). Include
      model/data/catalogue versions, expiry and deletion/role-change invalidation.
- [ ] Saved runs persist authorized results; reopening them makes zero provider
      calls. Test workspace switching, changed permissions and expired results;
      an explicit rerun is a separate user action with a visible cost estimate.

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
- [ ] Guided first-open help: contextual template/blank actions, dismissible
      explanations and searchable help; no forced overlay tour. Use R15's
      explanatory patterns, not its marketing/pricing claims or mock data.
- [ ] Optional focus/accessibility work: Pomodoro, density/easy-read and
      shortcut preferences with explicit user control (R09/R14). Music embeds
      and a native mobile client remain deferred (D07); no new player stack
      or copied prototype assistant behavior in the initial release.
- [ ] Performance: workspace switch latency, 10k-record views, cold start —
      profile and fix top 3 issues (document in report)
- [ ] Accessibility pass: keyboard nav for all new surfaces, focus traps in
      docks/modals, reduced-motion
- [ ] Docs: user-facing feature docs (README sections per app), self-host
      docs for gateway requirements (ws, Redis)
- [ ] Final regression: full e2e suite green; upgrade from clean 2.39 DB
      through all upgrade commands; uninstall-everything still leaves a
      working CRM

**Acceptance.** E01–E12 pass for declared release scope with regression
artifacts and explicit deferred features. A fresh individual workspace is
useful without CRM navigation; the core CRM remains accessible when chosen.
Legacy ticks or subjective “feels complete” alone do not satisfy acceptance.

---

## Cross-cutting risks & mitigations

| Risk | Mitigation |
|---|---|
| App sandbox limits for heavy UI (Gantt, chat) | First-party front components + feature-flagged front pages; decide per spike, record in phase report |
| Realtime at scale | Redis pub/sub + authoritative durable-record refetch; load-test actual sessions and multiple processes; socket seq is not replay history |
| Metadata drift between environments | Fixed UUIDs committed; app publish via CLI in CI for staging verify |
| Scope creep | This file is the contract; deviations need a phase-report entry + plan edit |
| i18n/catalog churn | Lingui extract locally to verify keys; never commit catalogs |
| Editor concurrency (no OT) | Version check + conflict banner; single-writer guidance in docs; full OT explicitly out of scope |

## End-to-end validation matrix (required, not yet executed)

Use fresh and populated disposable workspaces, admin/member/viewer plus guest
and removed-member sessions, and at least two tenants. Assert visible behavior
**and** persisted records/metadata/job outcomes. Capture server/worker failures;
a success toast or a unit mock cannot substitute for the integrated path.

| ID | Journey / dependencies | Required observable result |
| --- | --- | --- |
| E01 | Fresh workspace → blank/CRM or persona → app selection → setup → first content; P1.6 | Skip preserves CRM; optional apps can be deselected; required dependencies explained; selected apps ready before success; first useful doc/task/template opens without technical configuration. Zero app availability still permits meaningful setup |
| E02 | Missing registration, incompatible version, post-install failure, refresh/retry in another session; P0.4/P1.6 | Per-step partial state visible; permission rechecked; same operation produces one set of defaults, no duplicate apps/records; successful work remains; no secrets in errors |
| E03 | Existing customized workspace → change template → install later → individual/CRM switch; P1.6/P1.7 | Existing data, fields, views, roles, workflows and user nav edits remain; only owned defaults change; previously hidden CRM defaults restore appropriately; no unexpected sample rows |
| E04 | Built-in or workspace template → preview inputs → two instances → edit one → delete template; C1/P3/P4/P7 | Fresh IDs and valid same-workspace relations; independent populated copies; defaults versus samples distinguished; copied attachments/anchors safe; no private data in exported/shared template |
| E05 | Nested document > one API page → edit/comment → two-session stale save → restore revision → share/unlock/revoke → export; P0.2/P3 | Full tree/order survives reload; no silent lost updates; threads/history durable; protected content absent from plaintext response; guests cannot mutate; revoked/archived/uninstalled shares denied; nonempty PDF/DOCX/MD reflect documented fidelity |
| E06 | Project recipe → deadline preview → tasks/subtasks/dependencies → assignment/board/My tasks → reschedule → log time; P4 | Same task IDs and completion state in every surface; cycles denied; member rights applied; concurrent/replayed human IDs unique; replan preserves manual edits; timer retry does not double-count; project doc/file links work |
| E07 | Calendar install/local event → recurrence → detach/edit/delete occurrence → team/reminder → task/project link; P4C/P8 | Day/week/month agree after reload, DST/month-end fixtures correct, one detached event, no unsolicited invitations; supported provider sync has no duplicates; deleting/unlinking preserves task; test provider failures separately |
| E08 | Invite teammate → join existing workspace → mention/chat → inbox → open link → disconnect/reconnect → remove member; P0.3/P1.7/P5/P8 | No new workspace/preset reset; authorized two-session live updates and durable catch-up; private channels/records absent from search and events; unread/quiet hours correct; removed member loses access |
| E09 | Doc/project/finance shared file → Drive move/preview → removal preflight → uninstall/reinstall; P0.4/P1.7/P6 | Dependency blocker/impact counts accurate; export before destruction; surviving records/files retained; shares revoked and queued work stopped; no orphan links; reinstall does not claim to recover deleted data |
| E10 | Bilan install → profile → tracking-sheet template → expense/proof → budget → invoice/payment → ledger → grant report/fiche export; P7/P4 links | Real seeded defaults, no fake transactions; deterministic totals/provenance, editable versus managed columns, closed-period API enforcement; approved forms distinct from receipts; restricted member cannot read bank details; CSV/XLSX/PDF reconcile |
| E11 | Funding filters/pagination → shortlist → project/dossier/fiche → decision → reviewed income; P7; AI optional P9 | Source counts/freshness and limitations visible; retired source does not erase dossier; grant posted once; unavailable AI leaves search/manual flow working; consent/reasons/history/access-scoped cache and no-call re-open verified |
| E12 | Solo/team novice usability + no-AI/disabled-module + light/dark/fr/en/narrow screen/keyboard; P1 onward/P10 | A tester can create from template, find assigned work, schedule an event, find/save funding and locate install/remove/help without metadata terminology or opening advanced panels. Record steps, errors, assistance needed and agreed usability thresholds before claiming “intuitive”; verify unchanged CRM and native shortcuts |

Performance validation: state dataset sizes, pagination coverage, hardware,
network and p95 measurements for 10k-record search and 1k-task timeline. Test
empty, large, unauthorized, deleted and partially available dependencies as
well as happy paths. Actual production-like app publication/install, uncached
builds/tests, disposable DB upgrades and browser sessions are required before
release claims. E2E must exercise host + sandbox + server/worker composition.

## Unresolved decisions (do not invent certainty)

| ID | Decision / recommended boundary | Owner and blocking task |
| --- | --- | --- |
| D01 | Retention/exports/legal holds on app uninstall, and whether a true suspend mode is needed. Current native uninstall may destroy app data; default to refusal when required preservation is unsupported | Product + platform + privacy; P0.4/P1.7 release |
| D02 | Exact persona bundle contents and supported app/server/SDK version matrix; deliver only ready modules. Template descriptor representation must use actual SDK capabilities | Product + app/platform; P1.6a/d |
| D03 | Workspace versus instance funding catalogue, source permissions/licensing, freshness policy and supported geographic coverage. Do not migrate solely to mimic Bilan architecture | Backend + product; P7.1f expansion |
| D04 | “Following book” meaning beyond Livre/system journal/custom tracking sheets; authoritative CERFA identities/versions, receipt versus grant report, accounting retention and approval rules | Product + finance/legal reviewer; P7.1b/d official exports (ordinary bookkeeping not blocked by wording clarification) |
| D05 | Calendar local-event ownership, app packaging, per-provider edit/recurrence/attendee capabilities, timezone/quiet-hours rules | Calendar/platform + product; P4C.1, then P4C.4/5 |
| D06 | Canonical GitLab CI/release pipeline, runner/tooling provisioning and supported DB versions | Maintainers + platform; P0.1/P0.5 release |
| D07 | Advanced editor fidelity/licensing, guest editing, native mobile and music scope | Product + UX/platform; P3.4/P10 optional backlog, not initial safe slice |
| D08 | Standalone external Drive/Forms/CRM/core sources absent; request source if further feature extraction is desired | Product/source owner; no claim of exhaustive external-project features |

## Definition of done (program level)

A complete product journey, not merely ticked isolated features: reusable
workspace/content templates, truthful integrated onboarding, compatible ready
apps and configuration, customization, team collaboration, later installation
and explicitly safe removal all pass the matrix. Existing CRM stays functional.
Each release declares accepted scope, deliberately deferred options and remaining
limitations. Legacy ticks never substitute for new acceptance evidence.

### Validation of this planning revision

Source inventory/review and documentation checks are distinct from product
verification. Record the actual checks in the merge request. No implementation,
reference-app runtime, migration, browser journey or deployment is certified
by this planning-only change; all acceptance scenarios above remain pending.
