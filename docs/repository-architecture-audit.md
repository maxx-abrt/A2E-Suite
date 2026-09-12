# Repository architecture audit and implementation plan

Issue: [#1](https://gitlab.com/rfrfrfr-group/A2E-Suite/-/work_items/1)

Audit date: 2026-09-12

Source baseline: `54802efe192c1f4de1c35bef14ed64cf9d53dab9`

## 1. Executive summary

A2E Suite is a metadata-driven, multi-tenant CRM evolving into a modular
workspace product. Its strongest architectural asset is Twenty's existing
application and metadata engine: objects, fields, permissions, views, layouts,
commands and background functions can be added without another backend or UI
framework. Retain that architecture.

The main problem is not the absence of infrastructure. It is the gap between
isolated feature implementations and verified end-to-end contracts. Examples
include a WebSocket authentication path that does not use the current session
model, document search that explicitly bypasses permissions, editor history
that disappears on reload, and app actions that do not fetch their inputs.
Existing phase checkboxes are not a reliable release-readiness indicator.

**Recommendation:** first establish reproducible verification and close access
control, persistence and deployment gaps. Then finish the existing Documents,
Projects and Accounting vertical slices before expanding into Chat, Drive,
Inbox and additional AI actions. Do not replace NestJS, introduce microservices,
port the reference applications' backends, or implement CRDT collaboration as
part of the initial stabilization work.

This MR is **documentation-only**, honoring the issue's explicit request not to
modify code yet. All implementation work below is proposed, not delivered.

## 2. Scope, method and confidence

### Coverage

- Inventoried all **31,304 tracked paths** at the baseline, including all **20
  top-level package directories** and all **18 root Yarn workspaces**.
- Examined package manifests and Nx targets across the package inventory;
  traced representative server, frontend, application, authentication,
  document, realtime, search, onboarding and deployment paths in depth.
- Inventoried **48 GitHub workflow files**; read the server CI, app discovery,
  app CI and fork Docker release workflows in detail. This is not a claim to
  have reviewed every job in all 48 workflows.
- Included the **816 tracked paths** under `Inspiration apps (bureaubilan)` in
  the inventory and examined their package boundaries and existing reference
  analysis. Did not audit every reference application's implementation.
- Reviewed the existing master plan, codebase map, integration blueprint and
  Documents/Projects phase reports against current code rather than accepting
  historical completion claims as verification.

This is a repository-wide architecture assessment, **not a line-by-line review
of all source files**, a penetration test, a dependency vulnerability scan or
production performance certification. Generated files, translations, assets
and fixtures contribute to the counts; file counts are not code complexity or
coverage metrics. Credentials, private runtime configuration and customer data
were not inspected.

### Evidence labels

- **Observed:** directly visible in the checked-out source or configuration.
- **Risk:** a plausible consequence of observed code requiring runtime or
  failure-injection tests to establish its actual behavior and reachability.
- **Historical:** a statement in an earlier report, not verified in this audit.
- **Proposed:** a future implementation or acceptance criterion.

The environment lacks installed workspace dependencies and a suitable Node
runtime. Application tests could not start; see section 8 for exact attempts.
No historical test result is presented as a pass from this session.

## 3. Current architecture

### 3.1 Package and module map

Paths in this table are relative to `packages/`. Dependencies describe primary
relationships, not an exhaustive generated Nx graph.

| Package/directory | Responsibility and important relationships |
| --- | --- |
| `twenty-front` | React **19** SPA, Vite, Jotai, Apollo client, Linaria and Lingui. Uses shared contracts, UI primitives and the front-component renderer. |
| `twenty-server` | NestJS **11** modular monolith: API, metadata engine, domain services and CLI commands; same codebase supplies a separate queue worker. Uses shared, emails and client SDK. |
| `twenty-shared` | Isomorphic types, metadata constants, guards, utilities and application contracts; high-fan-out dependency with generated/built exports. |
| `twenty-ui` | Shared components, themes and canonical icon dictionary; consumed by the product, SDK, renderer and website. |
| `twenty-front-component-renderer` | Host/remote rendering boundary for sandboxed app components; also depends on SDK/shared/UI. A platform capability, not a second product shell. |
| `twenty-sdk` | App definition APIs, build/publish/install tooling and current CLI implementation; depends on client SDK/shared/UI. |
| `twenty-client-sdk` | Generated metadata client and core API client; shared dependency and API compatibility boundary. |
| `create-twenty-app` | Scaffolding and app templates, using SDK/shared. |
| `twenty-cli` | Small deprecated package: its start script explicitly reports deprecation. Do not treat it as the primary place for new CLI features. |
| `twenty-apps` | Independently packaged internal/public apps, examples and fixtures; **not** a root workspace. See the A2E inventory below. |
| `twenty-emails` | React transactional-email templates built for server consumption. |
| `twenty-e2e-testing` | Playwright scenarios and page objects against a running frontend/backend. Current config uses setup plus Chromium and one worker. |
| `twenty-oxlint-rules` | Custom lint rules and tests; lint targets depend on its build. |
| `twenty-utils` | Developer setup, release/review utilities and translation-normalization tests. |
| `twenty-docker` | Image builds, entrypoints, Compose and self-hosting assets; **not** a root workspace. |
| `twenty-zapier` | External automation integration with its own build/test/validation targets. |
| `twenty-website` | Separate Next.js **16** marketing/documentation-adjacent application; not the CRM runtime. |
| `twenty-docs` | Mintlify documentation and generation/validation scripts; separate from root `docs/plan`. |
| `twenty-codex-plugin` | Developer tooling, skills and MCP setup/validation scripts. |
| `twenty-claude-skills` | Packaged assistant skill content; not a product service. |

Other root areas:

- `.github/`: inherited and fork-specific automation; the checked-out baseline
  has no tracked `.gitlab-ci.yml` or `.gitlab/` configuration.
- `docs/plan/` and `PLAN.md`: product roadmap and historical implementation
  reports, not executable specifications.
- `Inspiration apps (bureaubilan)/`: A2EMoney and Texxel/Bureau reference trees,
  including Next.js applications, shared packages and mobile code. These are
  outside root workspace membership and the reviewed product Docker build.
  Reuse domain ideas, not their independent identity/database/deployment stack.

Manifest sources: [root package.json](../package.json),
[Nx configuration](../nx.json), [frontend manifest](../packages/twenty-front/package.json),
[server manifest](../packages/twenty-server/package.json).

### 3.2 Runtime and data flow

```text
Browser: twenty-front + twenty-ui + sandboxed app components
   | HTTP / GraphQL / REST / MCP       | SSE        | /realtime WebSocket
   v                                  v            v
NestJS server (twenty-server)
   authentication + workspace context + permission enforcement
   | core / metadata / admin APIs      | CRM/domain modules
   | application install + manifest sync
   v
Metadata validation/build/runner -> workspace metadata + schema changes
   |
TwentyORM / workspace repositories -> PostgreSQL core + workspace schemas
   |
Workspace events -> BullMQ / Redis -> separate queue-worker process
                                      -> workflow, sync and logic functions

Redis also supports cache, locks, session caching and realtime pub/sub.
File storage uses local volumes or configured object-storage drivers.
ClickHouse/telemetry integrations are additional configured capabilities,
not required services in the reviewed Coolify four-container stack.
```

**HTTP boundary.** [AppModule](../packages/twenty-server/src/app.module.ts)
composes core, metadata and admin GraphQL, REST and MCP. The GraphQL server uses
**Yoga**, not Apollo Server (Apollo is used in the browser). Cookie-session
CSRF middleware runs before authenticated routes; workspace hydration and
request context are applied to the relevant APIs. `main.ts` configures CORS,
session middleware, parsers, uploads, logging and the listener.

**Tenant/data boundary.**
[WorkspaceOrmManager](../packages/twenty-server/src/engine/twenty-orm/workspace-orm.manager.ts)
loads workspace metadata, role maps and row-level permission predicates and
selects the workspace repository/data source. The `core` schema holds platform
entities; workspace schemas hold standard and app-defined records. Tenant
selection is necessary but not sufficient authorization: system contexts and
permission bypass options must not replace a requesting user's permissions.

**Metadata boundary.**
[Workspace migration](../packages/twenty-server/src/engine/workspace-manager/workspace-migration/)
separates operation validation/building, flat entity maps and execution.
[Application installation](../packages/twenty-server/src/engine/core-modules/application/application-install/application-install.service.ts)
adds package/version validation, a per-workspace/app lock, manifest application,
file storage and logic-function execution. Preserve stable universal IDs and
this migration path rather than editing workspace tables directly.

**Async boundary.**
[QueueWorkerModule](../packages/twenty-server/src/queue-worker/queue-worker.module.ts)
loads the core engine, job discovery, events and TwentyORM without the HTTP
server. API success, job completion and downstream effects are separate
states. Retry, idempotency and failure reporting therefore belong in domain
contracts, not only in UI behavior.

**Main business modules.** Under `twenty-server/src/modules`, companies,
people and opportunities provide the CRM core; notes, tasks, attachments and
timeline supply record-linked activity. Messaging, connected-account sync,
calendar and provider webhooks integrate external communications. Workflow,
dashboard, emailing and call-recording modules extend the product. Under
`engine/core-modules`, auth/workspace/user-session, file storage, application
management, search, tools/tool providers, billing/usage and observability are
shared platform capabilities. Keep app-specific finance/project rules out of
unrelated CRM modules while reusing their records and activity relations.

**Frontend boundary.**
[App](../packages/twenty-front/src/modules/app/components/App.tsx) provides state,
i18n, error handling and domain shell composition. Feature modules own routing,
records, metadata, views, settings, workflows, AI, the command menu and side
panel. Metadata-driven records/views/layouts should remain the default UI;
front components are appropriate for genuinely different interactions such as
the document tree.

**Realtime boundary.** SSE database-event/MCP paths coexist with an A2E raw `ws`
gateway. Redis pub/sub provides fan-out, not durable message history. Current
sequence numbers are generated per socket/topic and cannot serve as a durable
replay cursor. Presence is ephemeral; durable business changes must remain
recoverable from records.

**Deployment boundary.** The
[Dockerfile](../packages/twenty-docker/twenty/Dockerfile) builds shared/client/email
and server artifacts plus the frontend; the combined image serves the SPA from
`dist/front`. Coolify runs server, worker, PostgreSQL and Redis, sharing local
file storage between server and worker. A2E app source directories are not
copied into this production image: app registration/publication/installation
is a separate provisioning concern.

### 3.3 A2E feature inventory: implemented surface versus readiness

| Surface | Observed implementation | Readiness assessment |
| --- | --- | --- |
| Activation/onboarding | Workspace templates, app installation reuse, navigation migration, settings integration. | Installer failures can be logged and ignored; requested template state is not proof all apps installed. |
| Workbench/realtime | Dock, side-panel tabs, reconnect/presence UI and gateway; onboarding/tab E2E files exist. | Authentication and catch-up contracts need repair and live tests. |
| Documents | 37 tracked files; 1 app object, 5 local test files, browser/page components, commands, templates and purge function; core editor/share/search additions. | Persistence, API selection, sharing and concurrent-save gaps remain. |
| Projects | 47 tracked files; **6 object definitions**, 0 local test files. Project, member junction, milestone, label, task-label junction and time entry; task extensions, board/calendar views, overview and human-ID function. | More code exists than the phase report records. Presence of definitions does not prove successful install, UI wiring or concurrency safety. |
| Accounting | 98 tracked files; **14 object definitions**, 9 local test files. Invoices/lines, quotes, finance entries/categories, books, budgets, fiches, organization profile, subventions and AI cache; scheduled/event functions. | Substantial implementation already exists despite P7 being later in the plan. Needs retry, financial invariant and lifecycle integration tests. |
| Chat/Drive/Inbox/expanded AI | Described by the master plan; supporting messaging, file, workflow and tool infrastructure already exists. | Do not equate email messaging with the proposed live-chat app or existing files with a completed Drive product. Inventory alone does not establish these planned vertical slices. |

The counts above are tracked file inventories, not executed-test counts. The
[Projects report](plan/phases/phase-04-report.md) still defers junctions,
milestones and identifiers that now have source files. Conversely,
[PLAN.md](../PLAN.md) marks document history/comments/co-editing complete while
the gaps below remain. Reconcile in both directions; do not simply untick or
retick everything.

## 4. Technical debt and risk register

Priority meanings: **P0** = investigate/contain before broad release; **P1** =
next stabilization work; **P2** = planned improvement after safety gates.
Priorities express remediation order, not independently verified exploit severity.

### F01 — Document federation discards caller permissions (P0, observed/risk)

Evidence: [document search provider](../packages/twenty-server/src/engine/core-modules/search/services/document-search-provider.service.ts)
creates a system auth context and uses `shouldBypassPermissionChecks: true`.
[App search](../packages/twenty-server/src/engine/core-modules/search/services/app-search.service.ts)
passes workspace ID but no caller permission context. The resolver install-gates
providers; installation is not per-user document-read permission.

Risk: titles/IDs of documents hidden from a role may appear in Cmd+K within its
workspace. Cross-workspace disclosure is **not** established by this observation.
Retain the caller's workspace auth context and normal repository permissions.
Reproduce with a restricted user, row-restricted documents and an uninstalled
app; assert absence from search, not merely denial when opening a result.
Also test the provider's custom filter shape against a real repository rather
than only its hand-written repository type/mock.

### F02 — Realtime is not aligned with current session authentication (P0, observed/risk)

Evidence: [gateway](../packages/twenty-server/src/engine/core-modules/realtime-gateway/services/realtime-gateway.service.ts)
accepts the upgrade before authentication and authenticates at the first
subscription. [Topic authorization](../packages/twenty-server/src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service.ts)
passes the token to JWT verification; subsequent subscriptions reuse cached
socket auth context. In contrast,
[UserSessionService](../packages/twenty-server/src/engine/core-modules/user-session/services/user-session.service.ts)
stores a hash of a generated session token and resolves it through the session
repository/cache. [Cookie service](../packages/twenty-server/src/engine/core-modules/user-session/services/user-session-cookie.service.ts)
sets **both** cookie variants HttpOnly, while the
[frontend token helper](../packages/twenty-front/src/modules/realtime/utils/getRealtimeAuthToken.ts)
tries to read the insecure variant through `document.cookie`.

The gateway is therefore wired to a different credential contract from HTTP.
Its topic checks cover workspace identity and inbox ownership, not record/chat
membership; no explicit origin check or authenticated-upgrade deadline appears
in this gateway. Risks include unusable ordinary browser sessions, stale
permissions on long-lived sockets and insufficient authorization for future
record/chat payloads. Runtime reachability must be tested, not inferred from
comments claiming upgrade authentication.

Reuse existing session resolution and origin policy; define revocation/expiry
handling and explicit per-topic permissions. Do not make cookies readable to
JavaScript as a workaround. Test actual login cookies, rejected origins,
expired/revoked sessions, tenant switching and restricted records.

### F03 — Share security and lifecycle contracts are incomplete (P0, observed/risk)

Evidence: [share resolver](../packages/twenty-server/src/engine/core-modules/document-share/document-share.resolver.ts)
and [service](../packages/twenty-server/src/engine/core-modules/document-share/document-share.service.ts)
use workspace/user guards but do not look up document-level read/share rights
in the inspected create/list/delete methods. Listing returns workspace share
tokens. Create accepts caller-supplied snapshots; the
[input DTO](../packages/twenty-server/src/engine/core-modules/document-share/dtos/create-document-share.input.ts)
accepts optional ciphertext, IV and salt independently. The service stores
`bodySnapshot` even when encryption fields are supplied and returns both to
the guest path.

Do not claim that protected snapshots cannot contain plaintext until the
server enforces that invariant. Define who may create/list/revoke links,
validate the referenced document, enforce one consistent encrypted or plaintext
representation, bound inputs and make archive/delete/uninstall behavior
explicit. Snapshot sharing is reasonable; changing it to live public record
access would increase authorization complexity. Add real API tests for limited
roles, malformed encryption combinations, expiry, revocation and deletion.

### F04 — Document comments/history are session-local; merge helper is not a save protocol (P1, observed)

[Comments](../packages/twenty-front/src/modules/blocknote-editor/comments/EditorCommentsThreadStore.ts)
use an in-memory map; [history](../packages/twenty-front/src/modules/blocknote-editor/version-history/EditorVersionHistoryStore.ts)
uses an in-memory ring buffer. Reload loses thread bodies and snapshots even
though document comment anchors may persist.

[resolveOptimisticDocumentUpdate](../packages/twenty-front/src/modules/blocknote-editor/co-editing/utils/resolveOptimisticDocumentUpdate.ts)
classifies changed block IDs but neither merges content nor writes it. A search
of frontend source found only its declaration and tests, not a production save
caller. Do not advertise durable history or lost-update protection based on
these unit-testable pieces alone.

Persist threads and revisions under document permissions and connect saving to
an atomic expected-revision check. Initially reject conflicting stale writes
and preserve the user's draft; that is simpler and safer than CRDT/OT. Only add
disjoint-block merge once the server save contract and ordering/deletion cases
are specified and tested.

### F05 — Document browser is not fetching its action inputs or a complete tree (P1, observed)

The [browser](../packages/twenty-apps/internal/a2e-documents/src/front-components/document-browser.front-component.tsx)
loads roots plus one child level without pagination. The selection omits
`content`, but template duplication and share creation consume it. Share
creation falls back to an empty body, requests a token but does not present it,
and sends BlockNote content while the
[guest page](../packages/twenty-front/src/pages/document-share/DocumentShareGuestPage.tsx)
renders Markdown. Passphrase support in host utilities is not a complete
share-management flow in this browser. Recursive render helpers do not make a
two-level query recursively complete.

The [document page](../packages/twenty-apps/internal/a2e-documents/src/front-components/document-page.front-component.tsx)
also creates every child with an append position computed from `undefined`,
not the last sibling. Navigation calls use plural `documents` in a parameter
named `objectNameSingular`; validate this against the installed app's routes.

Use paginated/lazy per-parent loading and fetch a document's current body on
share/duplicate. Define one snapshot format, display/copy/manage the share URL,
and test deep trees, more than one API page, sibling order and populated
exports/shares. Keep pure helper tests but add tests of actual component/API
composition; type casts cannot validate missing selections.

### F06 — Realtime delivery can report transport success without subscription success (P1, observed/risk)

[Publisher](../packages/twenty-server/src/engine/core-modules/realtime-gateway/services/realtime-publisher.service.ts)
logs Redis subscription errors and returns an unsubscribe function, allowing
the gateway to acknowledge a subscription after the underlying failure. It
also catches publish failures. The
[client manager](../packages/twenty-front/src/modules/realtime/utils/realtimeConnectionManager.ts)
marks the connection connected on socket open, ignores non-event envelopes and
resubscribes without a durable catch-up cursor. Gateway sequence numbers reset
for new sockets.

Make subscription failure visible, distinguish socket-open from authorized
subscription state, and refetch authoritative records after reconnect. Keep
pub/sub for ephemeral notifications; durable chat/inbox recovery must use
stored records and cursors. Add Redis outage/recovery, repeated subscribe,
unsubscribe races and reconnect tests with server and worker logs captured.

### F07 — Project task numbering is non-atomic (P1, observed/risk)

[Task human-ID function](../packages/twenty-apps/internal/a2e-projects/src/logic-functions/task-human-id.logic-function.ts)
reads `taskCounter`, calculates the next value, updates the task and then
updates the project via separate API mutations. Two jobs can read the same
counter; failure between writes can leave counter and task inconsistent.
The existing `humanId` check does not provide atomic allocation or retry safety.

Prefer a narrow server operation using a transaction/row lock or supported
atomic allocation primitive, plus a uniqueness invariant and retry key. Keep
app-owned metadata. Do not build a new generic computed-field engine for this
one requirement. Test simultaneous allocations, duplicate events, crash
between writes, project reassignment and empty/duplicate project keys.

### F08 — App CI contracts differ from actual app manifests (P1, observed)

[Discovery](../.github/workflows/discover-apps.yaml) uses `test:unit` for unit
coverage and the existence of `test` as the integration-test signal.
[App CI](../.github/workflows/ci-twenty-apps.yaml) installs each app independently
with `yarn install --immutable` and caches its `yarn.lock`.

- Documents and Projects declare neither `typecheck` nor `test:unit`/`test`.
  Documents has five test files despite exposing no test script; Projects has
  no local test files in the tracked inventory.
- Accounting's `test` runs pure Node TypeScript unit tests, so discovery treats
  unit tests as integration capability instead of recognizing that distinction.
- Documents has no tracked app-local `yarn.lock` at this baseline.
- All three A2E app manifests pin SDK/client SDK **2.31.0**, while workspace SDK
  and server current version are **2.39.0**. This is a compatibility matrix to
  test, not proof that every older SDK is broken.

Standardize explicit unit/typecheck/integration scripts, lockfile ownership,
manifest validation and installation tests. Run app compatibility tests when
SDK/server/shared contracts change, not only when an app directory changes.

### F09 — GitLab delivery is not represented by the inherited GitHub workflows (P1, observed/unknown)

No tracked GitLab CI configuration exists. A read-only project API check
returned an empty `ci_config_path` and `mirror: false`. A latest-pipelines query
with `per_page=5` returned one running `duo_workflow` pipeline; that is agent
execution, not evidence that product build/test gates run. This was a bounded
query, not an audit of all historical pipelines or external automation.

[DEPLOY.md](../DEPLOY.md) and the
[image workflow](../.github/workflows/cd-docker-image.yaml) describe GitHub/GHCR
and a different repository owner. Decide whether GitLab becomes the canonical
CI/release source or whether an explicitly documented external pipeline posts
required checks. Prefer a minimal GitLab pipeline invoking existing Nx/app
commands; do not blindly port all 48 workflows before identifying required
release gates. Confirm runner capacity, registry and branch protection with
maintainers.

### F10 — Deployment can become healthy after an unsuccessful upgrade (P1, observed/risk)

[Entrypoint](../packages/twenty-docker/twenty/entrypoint.sh) catches upgrade and
cron-registration failures, continues startup, and prints a successful
migration message. A health endpoint alone cannot attest workspace migration
completion. The image workflow is independently triggered by main pushes and
does not wait for the other CI workflows in its own job graph.

Use an explicit migration/release gate that fails deployment on required
upgrade failure; separate readiness from process liveness. Establish a single
migration owner for multi-instance deployment, immutable image references and
rollback/forward-repair procedures. The Compose defaults use `latest`, an
unversioned Redis image and PostgreSQL 16, whereas server CI uses PostgreSQL
18. Test the supported database versions rather than assuming parity.

The deployment guide's tar example copies a database data volume without
establishing quiescence or a database-consistent backup. Replace it in a later
MR with documented logical or physical PostgreSQL backups and a restore drill,
including file storage and recovery of required encryption keys. Do not run
backup experiments against production during this audit.

### F11 — Preset application can silently become partial (P1, observed)

[WorkspaceTemplateService](../packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts)
logs and skips unregistered apps, catches install failures, and later writes
`workspaceTemplate`. Sample-content requests only emit a warning in this
service. Navigation restoration is implemented inside a helper, but the caller
only invokes it for templates with a nonempty hidden-navigation list; test the
reverse transition to CRM explicitly.

Represent requested versus applied status and per-app errors; make retries
idempotent and visible. A single failure need not roll back unrelated installed
apps, but the UI must not describe partial setup as complete. Verify registration
and installation on a clean production-like server, not merely the presence
of source folders in the repository.

### F12 — Finance needs transactional/replay verification, not just arithmetic tests (P1, observed/risk)

[Ledger handler](../packages/twenty-apps/internal/a2e-accounting/src/logic-functions/handlers/ledger-handler.ts)
performs find-then-create/update via separate requests and checks period lock
before writing. [Book entry metadata](../packages/twenty-apps/internal/a2e-accounting/src/objects/book-entry.object.ts)
**does** declare `sourceKey` unique, an existing safeguard worth preserving.
Thus the concern is not simply missing uniqueness: test competing jobs,
uniqueness-conflict recovery, event replay and period-close races. Verify that
managed/locked rows cannot be changed through alternate API paths and that
retiring a source preserves the agreed accounting audit trail.

Prioritize deterministic money/rounding, provenance, numbering and closed-period
invariants before more finance UI or AI write actions. Domain/accounting review
is needed; this audit does not certify legal or accounting compliance.

### F13 — Documentation and abstraction drift increase integration cost (P2, observed)

The [existing map](plan/01-codebase-map.md) still describes React 18, Apollo
server and no WebSocket server. Phase reports both overstate completion and
lag newly added files. The [app authoring guide](../packages/twenty-apps/README-A2E.md)
still calls Documents an empty shell. Keep historical reports, but add dated
current-state evidence and explicit pending acceptance tests.

A [local fractional-index implementation](../packages/twenty-apps/internal/a2e-documents/src/lib/fractional-position.ts)
duplicates a shared utility for a documented sandbox dependency reason. Do not
remove it blindly: first add cross-implementation contract tests, then choose a
supported SDK/shared export. Numerous `as never` API shapes and hand-written
result types in A2E components hide schema drift; replace incrementally with
supported generated clients at touched boundaries. Hard-coded French component
strings also need an app-compatible localization solution, not an assumption
that metadata translations cover arbitrary JSX.

### F14 — High-fan-out build and dependency maintenance require focused ownership (P2, observed/unknown)

Root resolutions and server patches are substantial and contain documented
upstream compatibility/security rationales. They are not evidence of a current
vulnerability scan. Nx target dependencies, generated clients and shared `dist`
artifacts make seemingly small shared changes expensive and susceptible to
stale local state. Preserve justified overrides until their upstream blockers
are resolved; add owners, review dates and focused compatibility tests.

Measure build time, memory, bundle size, API latency and query plans before
restructuring packages or adding search infrastructure. App search's parallel
provider calls isolate thrown errors but have no visible per-provider timeout;
a hung provider can still delay the whole query. Add budgets and timeouts once
permissions and query correctness are fixed. Benchmark the plan's 10k-record
search and 1k-task scenarios; no latency claim is verified here.

## 5. Architectural decisions and tradeoffs

| Decision | Simplest recommended approach | Alternative and why not first |
| --- | --- | --- |
| Overall structure | Keep the modular monolith, separate worker and metadata-driven apps. | Microservices add deployment, authorization and consistency boundaries without measured need. |
| App versus core | App metadata/UI for domain features; small shared/server primitives for authorization, durable persistence and atomic mutations. | Copying complete reference backends duplicates identity, tenancy and storage. |
| Documents collaboration | Persist revisions and reject stale saves atomically; preserve drafts. | OT/CRDT needs a dedicated protocol, migration and editor compatibility project. |
| Realtime delivery | Session-aware authorized topics, visible subscription state, durable-record refetch after reconnect. | Redis pub/sub is not a replay log; adopting another broker is unnecessary before actual durable-message requirements. |
| Project membership | Validate/complete the existing member junction object and permissions. | Do not wait for a generic many-to-many SDK feature or create another membership system. |
| Counters/finance invariants | Narrow transactional operations with uniqueness and idempotency. | More client-side checks cannot make multiple API writes atomic. |
| CI | Reuse existing commands in a minimal authoritative GitLab pipeline, unless maintainers confirm an external source of required checks. | An unverified mirror or wholesale workflow conversion obscures the initial safety gates. |
| Documentation | Add this dated audit, then reconcile status with linked evidence. | Rewriting the master plan now would mix assessment with unapproved product-scope changes. |

## 6. Detailed implementation roadmap

Work packages below can become separate issues/MRs after review. Owner names
are **roles to assign**, not commitments. Estimates are rough engineering
person-days excluding review, infrastructure lead time and product decisions;
re-estimate after the first baseline run. They are not delivery dates.

### Stage A — Establish a trustworthy baseline and contain access risks

| Work package | Scope, sequence and dependencies | Owner / estimate | Exit criteria |
| --- | --- | --- | --- |
| A1: reproducible baseline | Provision Node 24 matching repo requirements, bundled/Corepack Yarn 4.13, dependencies, PostgreSQL/Redis and browsers. Record uncached builds/tests. Reconcile app scripts/lockfiles (F08); decide canonical CI and add required gates (F09). No prior dependency. | Platform + QA / 3–5 days | Clean checkout installs immutably; server/front/shared checks run; each A2E app has explicit unit/typecheck/build/install results; failing gates block merge. Existing failures remain visible with owners. |
| A2: search/share authorization | Add failing real-API tests for F01/F03 first; retain caller permissions in federation; specify share rights, representations and lifecycle; regenerate affected clients. Depends on A1 test environment. | Backend + security reviewer / 4–7 days | Authorized users still search/share; unauthorized roles see no titles/tokens; tenant isolation, encrypted-input validation, expiry/revoke/archive cases pass. |
| A3: session-aware realtime | Repair F02 using HTTP session/origin helpers; define token types, expiry/revocation and per-topic ACLs; enforce resource bounds. Depends on A1; coordinate with A2 permission contracts. | Backend + frontend / 4–7 days | Actual HTTP/HTTPS browser login can subscribe; forbidden origins/records/workspaces and revoked sessions fail; no readable-cookie workaround; worker/CLI boot still works. |
| A4: release/recovery gate | Address F10: fail required migrations, distinguish readiness, pin release artifacts, confirm DB support and rehearse backup/restore. Depends on A1 CI decision. | Platform + backend / 3–5 days | Injected upgrade failure prevents rollout; previous data is recoverable; DB and uploads restore in a scratch environment; release can be traced to a tested commit/image. |

**Stage gate:** no broad release of affected sharing/search/realtime features
until A2/A3 tests pass. Feature containment, if needed, must be an explicit
maintainer-approved follow-up change, not a change hidden in this audit MR.

### Stage B — Make the existing workspace features reliable

| Work package | Scope, sequence and dependencies | Owner / estimate | Exit criteria |
| --- | --- | --- | --- |
| B1: durable document state | Design document revision/thread storage under existing permission/migration machinery; implement server persistence, history retention and atomic expected-revision save; wire editor (F04). Depends on A2. | Backend + frontend / 6–10 days | Comments/history survive reload and second-device access; unauthorized reads/writes fail; two concurrent edits never silently lose data; restore creates a new revision; unrelated note/rich-text editors still work. |
| B2: complete document journeys | Paginate/load tree levels, fetch action inputs, fix snapshot format/link management and sibling positioning (F05); verify record/side-panel routes, PDF/DOCX/Markdown output and locales. Depends on A2; final acceptance with B1. | Frontend/app + QA / 4–7 days | Create → edit → deep-tree move → reload → template copy → share/unlock/revoke → export succeeds with real nonempty content. More-than-one-page, trash and archive-parent cases pass. |
| B3: recovery and preset status | Propagate Redis failures, implement resubscription/refetch protocol (F06); expose partial app-install/preset state and retry (F11). Depends on A3 and A1 app packaging. Split into two small MRs. | Full-stack / 4–6 days | Redis restart converges to stored state; UI never equates rejected subscription with success; individual → CRM → individual transitions work; missing app registration has a visible recoverable outcome. |
| B4: Projects vertical slice | Validate the six existing objects/relations/layouts first; add atomic human-ID allocation (F07), task/member permissions, labels/subtasks/dependency validation and time-entry integrity before additional timeline UX. Depends on A1/A2. | App + backend / 6–10 days | Install/upgrade/uninstall tested on disposable workspaces; concurrent task IDs unique and retry-safe; membership/board/calendar/task links correct; dependency cycles rejected; timer retries do not duplicate time. |
| B5: finance correctness | Validate schema/install, unique source keys, atomic/retriable ledger operations and period locks (F12); verify currency/rounding and restricted API writes. Depends on A1/A2; project rollups depend on B4. | Backend/app + finance reviewer / 6–10 days | Concurrent/replayed events yield one correct ledger result; locked periods reject prohibited updates; numbering/rounding fixtures approved; restore/recovery preserves audit trail; no AI auto-posting. |

For B1/B4/B5, introduce new metadata through the existing builder/validator/
runner path. New server entity changes need generated instance commands;
upgrade commands go only under the current version directory (currently
`2-39`), with new monotonic timestamps and explicit up/down behavior. Never
rewrite already-applied upgrade logic. Test fresh installation **and** upgrade
from an existing populated workspace. Uninstall tests must clarify whether data
is destroyed, retained or exportable before users rely on module toggling.

### Stage C — Reduce recurring maintenance cost

1. **C1 — Contract and documentation hygiene (2–4 days, platform + app owners;
   after A1 and alongside B work).** Reconcile the master plan and reports with
   actual installed behavior; publish a current architecture map; document
   supported server/SDK versions; replace unsafe API casts in touched code;
   add fractional-index parity tests before deduplicating. Acceptance: every
   completed product bullet links to executable checks and states remaining
   limitations; app upgrade tests cover the advertised compatibility range.
2. **C2 — Observability/performance (3–5 days, platform + frontend; after A2/B3).**
   Reuse existing logger, metrics and event-log modules. Measure provider
   latency/timeouts, queue age/retries, failed installs/migrations, realtime
   rejects/reconnects and document save conflicts; establish bundle/build
   baselines and large-record test fixtures. Acceptance: alerts distinguish
   partial failure from success; reproducible p95 measurements and query plans
   support any optimization proposal; logs do not contain credentials or
   document bodies.
3. **C3 — Dependency and fork ownership (2–3 days initial, recurring thereafter;
   platform/security).** Inventory root overrides, package patches, licensing
   boundaries and upstream divergence; give each an owner and removal condition.
   Decide whether reference trees remain in-tree or become a separately managed
   design resource. Acceptance: a current dependency scan and focused patched-
   dependency tests are recorded; no package rename or bulk lockfile churn is
   bundled into feature fixes.

### Stage D — Resume product expansion only after the relevant gates

Map future work to [PLAN.md](../PLAN.md), not to a second competing backlog:

- **P4 completion:** finish existing Projects acceptance before adding a Gantt
  surface. Prefer existing views; benchmark large task sets first.
- **P5 Chat + P8 Inbox:** depend on A3/B3, durable message/notification storage,
  channel/user ACLs, read cursors and retry-safe writes. Begin with one complete
  send → receive → disconnect → catch-up → read-state scenario; postpone rich
  chat extras until that passes.
- **P6 Drive:** reuse file storage/attachments; decide folder and retention
  semantics, quotas and permission inheritance. Depends on A4 recovery and A2
  access policy. Do not build another upload/storage service.
- **P7 Accounting expansion:** extend the existing 14-object app after B5 rather
  than starting a new finance port. Resolve catalogue scope (current app objects
  versus planned instance-wide catalogue), profile encryption and compliance
  requirements with product/domain reviewers before migration.
- **P9 AI:** extend existing tool/workflow infrastructure with the same caller
  permissions, explicit user confirmation for writes, auditability and budgets.
  Depends on each underlying domain contract; AI must not bypass A2/B5.
- **P10 polish:** responsive layouts, accessibility, French/English user journeys,
  onboarding and measured performance. Apply basic accessibility/localization
  during every earlier feature, not exclusively at the end.

No calendar estimates for Stage D are credible until Stage A establishes a
working baseline and product owners choose the minimum release scope.

## 7. Verification strategy for the proposed implementation

Use real integration boundaries in addition to pure utility tests:

| Boundary | Required scenarios |
| --- | --- |
| Permissions | Two workspaces, administrator, restricted member, removed member and guest; search results and share tokens are checked as well as record reads. |
| App lifecycle | Clean register/install, re-install, populated upgrade, missing registration, partial failure/retry, uninstall and documented data retention. |
| Documents | Host rich-text editor plus app browser and guest route; populated nested documents, more than one API page, two sessions, reload, stale write, revision restore and populated downloads. |
| Realtime | Real login cookies, origin policy, expired/revoked sessions, Redis interruption, multiple server processes, resubscribe and authoritative catch-up. |
| Projects/finance | Concurrent jobs, duplicate events, process failure between writes, deletion/reassignment, locked periods, currency/rounding and rollback/recovery. |
| Deployment | Clean DB bootstrap, current populated upgrade, intentional migration failure, readiness, worker startup and database/file restore. |
| UI/platform regression | Existing CRM create/search/task/note flows, side panel, dashboard rich text and workflows; light/dark, keyboard use and narrow viewports. |

Typical existing commands once tooling is provisioned (run from repository root
unless stated otherwise):

```sh
node .yarn/releases/yarn-4.13.0.cjs install --immutable
npx nx build twenty-shared --skip-nx-cache
npx nx test twenty-server --skip-nx-cache
npx nx test twenty-front --skip-nx-cache
npx nx run twenty-server:test:integration:with-db-reset
npx nx test twenty-e2e-testing
npx nx lint:diff-with-main twenty-server
npx nx lint:diff-with-main twenty-front
npx nx build twenty-server --skip-nx-cache
npx nx build twenty-front --skip-nx-cache
```

Run `npx tsgo -p tsconfig.json --noEmit` directly **inside each changed package**
after dependency builds; do not use a cached Nx pass as the only typecheck.
Focused Jest tests should use the package's `jest.config.mjs`. App tests/install
commands run in their own package context, after correcting F08. Database-reset
commands are destructive: only use disposable development/test databases.
Capture command, commit, outcome and artifacts; generated clients must be
updated for schema changes, while unrelated translation-catalog churn stays
out of implementation MRs.

## 8. Checks actually performed in this audit

| Check | Observed result |
| --- | --- |
| Tracked inventory/manifests/Nx target extraction | Completed using Git's tracked-path inventory and JSON parsing; counts reported above are baseline counts. |
| Documentation integrity | A Python standard-library check passed: 44/44 local Markdown links resolve, all 9 sections and 14 findings exist, all 18 workspaces are represented, and reported inventory counts match Git. This checks document integrity, not application correctness. |
| Whitespace and change scope | `git diff --staged --check` passed after removing Markdown hard-break trailing spaces; staged changes contain only this audit document. |
| GitLab issue and project inspection | Read issue #1 and its comment; read project CI-path/mirror fields and the bounded latest-pipeline query described in F09. |
| Environment | Node `v20.20.2`; no `yarn` executable on PATH, no installed root `node_modules`, no Docker executable found. The committed Yarn bundle runs and reports `4.13.0`. |
| `npm exec --offline --yes=false -- nx test twenty-server --skip-nx-cache` | Could not start: `ENOTCACHED` for Nx. No implicit package download was permitted by this offline invocation. |
| `node .yarn/releases/yarn-4.13.0.cjs nx test twenty-server --skip-nx-cache` | Could not start: Yarn could not find the `node_modules` state file. Using bundled Yarn fixes the missing executable, not the absent dependencies. |
| `node --test --experimental-strip-types packages/twenty-apps/internal/a2e-documents/src/lib/__tests__/*.test.ts` | Could not start: Node 20 rejects `--experimental-strip-types` (exit 9). |

**Application tests, typechecks, builds, migrations, browser scenarios and
performance are UNVERIFIED in this audit.** No application code was changed.
The fallback is source/configuration analysis plus documentation integrity
checks, not a substitute claim of test success. Maintainers can provision Node
24, dependencies and test services through `.gitlab/duo/agent-config.yml` for a
follow-up verification session. A full monorepo dependency installation or live
app startup was not attempted for this documentation-only change.

## 9. Decisions requested from maintainers

1. Confirm GitLab as canonical CI/release source, or identify the authoritative
   external pipeline and how its required checks reach merge requests.
2. Approve the Stage A/B stabilization order and assign platform, backend,
   frontend/app, QA and finance-review owners.
3. Define document sharing/retention rights and whether durable comments/history
   are prerequisites for the first Documents release (recommended: yes).
4. Confirm supported server/SDK/PostgreSQL versions and module-uninstall data
   policy before promising compatibility or reversible activation.
5. Select the first complete product release slice after stabilization rather
   than advancing all remaining master-plan phases at once.

These decisions should drive follow-up implementation issues; this audit does
not change product scope, existing code, app registrations or deployment state.
