# Implementation handoff — same-domain, multi-user A2E Suite

Copy this document into a new Codex session opened at this repository root.
This is an implementation request, not a request to produce another proposal.

## User objective

Turn A2E Suite into a hosted, Notion-like workspace product accessible from one
ordinary domain. A person signs up/signs in, sees only their own and joined
workspaces, creates a workspace or accepts an invitation, and switches between
workspaces without needing a subdomain, DNS change, custom domain or a separate
installation. Each workspace retains its own apps, permissions, data and native
Twenty experience. Different people can use different app selections/presets
and workflows on the same deployment.

Free allowance:

- Each account may own up to **5 active workspaces**. This is per account,
  never a five-workspace cap across the entire server.
- Each workspace may have **5 additional collaborators**, besides its owner:
  **6 human members total**. This is the explicit working interpretation of
  “5 collaborators”; state it in the product and tests.
- Joined workspaces do not consume an account's owned-workspace allowance.
  A collaborator may own their own five workspaces independently.
- These allowances work without payment, Stripe setup, trial activation or an
  enterprise key. Preserve unrelated licensed features and license notices;
  do not disable billing, authorization or enterprise checks globally.

Deliver this using the existing architecture, not a replacement identity,
workspace, membership, editor, app installer or sidebar system. Preserve CRM,
Bureau/BlockNote, Bilan, other apps, invitations, document sharing and existing
features. Do not claim production readiness until the journeys below pass.

## Start here and establish the actual baseline

Read root AGENTS.md/CLAUDE.md and PROMPT.md, docs/README.md,
docs/product-experience.md, docs/applications.md, docs/verification.md and the
relevant PLAN.md sections. Inspect nested rules before changing files. Check
Git status/history; preserve unrelated changes. Follow repository branch/commit
policy and the human's explicit instructions. Do not reset a populated database.

This handoff is scoped to the whole feature. Break it into dependency-ordered,
reviewable slices using the repository's executor/orchestrator workflow. Record
acceptance criteria, decisions and evidence in PLAN.md and dated phase reports
as appropriate to the active role. Do not divert to unrelated unchecked tasks.

Source observations on 2026-10-22; recheck rather than treating them as verified
behavior of a future checkout:

- Native Twenty core User, Workspace, UserWorkspace, workspaceMember and roles
  already exist. Workspaces have separate PostgreSQL schemas and metadata.
- `sign-in-up.service.ts` gates signup/creation with
  `IS_MULTIWORKSPACE_ENABLED`,
  `IS_WORKSPACE_CREATION_LIMITED_TO_SERVER_ADMINS` and an **instance-wide**
  count checked against `MAX_WORKSPACES_WITHOUT_ENTERPRISE_KEY = 5`.
  Neither that constant nor simply setting the multiworkspace flag satisfies
  this request.
- Existing frontend domain-manager hooks derive workspace context and redirects
  from hostname. Trace their server equivalents and every API transport.
- Cookie sessions, workspace-agnostic login, workspace selection, invitations,
  app provisioning, native navigation and permission primitives exist: reuse
  them, and inspect their actual contracts before editing.
- Bureau full-page routes currently use `/bureau` and `/bureau/:documentId`.
  Preserve IDs, content, native editor and existing links during routing changes.
- Recent Coolify fixes include production LOCAL function execution, startup
  grace periods, worker readiness, app provisioning failure propagation and
  exact-version bundle collection. Do not regress them. A previous source
  revision's image build failed; verify the current build independently.
- Deployment is image-based. A source push does not update a Compose file pasted
  into Coolify; failed CI does not publish a new `latest` image.

Useful starting paths (all relative to this repository):

- Front: `packages/twenty-front/src/modules/auth/`, `src/pages/auth/`,
  `src/modules/domain-manager/`, `src/modules/app/`, `src/modules/navigation/`,
  `src/modules/apollo/`, `src/modules/realtime/`, `src/modules/sse-db-event/`,
  `src/modules/a2e-workspace/`, `src/modules/bureau/`.
- Server, under `packages/twenty-server/src/engine/core-modules/`:
  `auth/services/sign-in-up.service.ts`,
  `auth/constants/max-workspaces-without-enterprise-key.constants.ts`,
  `auth/`, `user-session/`, `user-workspace/`, `workspace/`,
  `workspace-invitation/`, `domain/workspace-domains/`,
  `domain/subdomain-manager/`, `onboarding/`, `application/`,
  `file-storage/`, `realtime-gateway/`, `twenty-config/config-variables.ts`.
- Also trace server API guards/middleware, workspace auth-context construction,
  Twenty ORM permissions, metadata caches, jobs and workspace-member hooks.
- Deployment: `docker-compose.coolify.yml`, its identical packaged copy,
  `packages/twenty-docker/twenty/{Dockerfile,entrypoint.sh}`, DEPLOY.md,
  `.github/workflows/cd-docker-image.yaml`.

## Required design and behavior

### 1. One origin, explicit workspace context

Design a canonical URL scheme such as `/w/:workspaceId/...`, with stable opaque
workspace IDs, a global sign-in/workspace picker and workspace-scoped app routes.
Confirm the exact scheme against existing router/API contracts before adoption.
No wildcard DNS or workspace hostname is required for normal usage. Reloads,
bookmarks, copied links, browser Back/Forward and links opened in a fresh tab must
resolve the correct workspace and document.

Inventory all hostname assumptions: routing, public workspace lookup, redirects,
OAuth/SSO callbacks and state, email verification, password reset, invitation
links, notifications, native record links, app/frontend component URLs, share
links, file URLs, SDK/REST/GraphQL/metadata, WebSocket/SSE and background jobs.
Use central URL/context helpers rather than scattered string replacements.
Do not indiscriminately prefix public API endpoints or break webhook routes.
Existing API keys and application tokens must remain bound to their workspace.

A URL or client-supplied workspace selector is only a request for context. The
server must authenticate and validate membership, role and workspace lifecycle
state before granting access. Never trust a header/path/query ID by itself.
Do not replace tenant resolution with “first workspace” or a system-auth bypass.
Preserve intentional public-share access through its existing scoped grants.
Return useful unauthenticated/forbidden/not-found states without disclosing
private workspace details to unrelated users.

Reuse existing sessions. Explicitly design whether workspace selection is per
request/tab or stored in a session; two tabs open to different workspaces must
not silently retarget each other's requests. Cancel/discard stale requests on
switch, isolate Apollo/Jotai/record/metadata caches, drafts, subscriptions and
search results, and flush/save pending Bureau edits to their original workspace.
Reconnect realtime with authorized context. A removed collaborator must lose
access, including through already-open tabs and subscriptions.

### 2. Identity, creation and workspace switching

A new user can create an account, verify email where configured, create their
first workspace and land in a useful native experience. Returning users can
choose joined/owned workspaces or create another within their allowance. Provide
clear owner/member labels, counts and limit messages. Use the native workspace
switcher/sidebar and onboarding primitives; keep the focused app navigation,
All apps/back flow and cross-app features.

Logout must end the actual server session and allow a different account to sign
in on the same origin. Cover refresh, remember-last-workspace behavior, session
expiry, revoked membership, pending signup and failed sign-out retry. Do not
require users to clear browser storage. Keep configured SSO restrictions within
their legitimate scope, without forcing every account onto the prior workspace.

Each workspace can have an independent preset, app installation, navigation,
members and content. Handle zero-workspace accounts and recoverable failed or
pending workspace creation without trapping them in onboarding.

### 3. Durable ownership and concurrency-safe free allowances

Reuse an existing authoritative ownership concept if it genuinely provides the
needed invariant. Otherwise add the smallest native ownership model with generated
migrations and deterministic backfill. An admin role alone is not ownership.
Document how legacy owners are selected; do not arbitrarily assign populated
workspaces or grant users access. Preserve all existing data and memberships.

Enforce allowances on the server at every creation/membership entry point,
including alternate APIs, OAuth/signup flows, templates, invitations and admin
operations. Specify any legitimate server-admin override explicitly and test it;
never create a client-controlled bypass. Reject atomically with stable error codes
and translated user-facing messages. A count-then-insert without serialization
is insufficient. Test parallel requests and retry/idempotency behavior.

Define the lifecycle policy before implementation:

- Active owned workspaces and in-progress creations reserve one of five slots.
  Failed creations must release/recover their reservation safely. Archived
  workspaces still count unless the product has an explicit safe policy.
- Pending, unexpired invitations to distinct nonmembers reserve collaborator
  slots. Re-inviting the same normalized email or an existing member consumes no
  extra slot. Expired/revoked invitations release their reservation.
- Acceptance is atomic with membership creation and rechecks authorization and
  capacity; it must not double-count the reservation. Repeat acceptance is safe.
  Invitation links cannot bypass capacity or become an open workspace join path.
- Deletion, restoration, leaving, member removal, owner transfer and account
  deletion have explicit rules. Restoration/transfer cannot exceed the owner's
  allowance. Ownership cannot become ambiguous or orphaned. Existing over-limit
  installations keep their data/access; block growth and explain remediation
  rather than deleting members or workspaces.
- App/service principals, bots and system identities do not consume human seats
  or become a way to grant uncounted human access. Existing guest/public-share
  grants retain their actual permission semantics.

Use existing entitlements/configuration patterns for these free limits where
possible; one authoritative policy, not duplicated magic numbers in UI and APIs.
No unrelated paid-plan implementation is requested.

### 4. Preserve the integrated application experience

New and existing workspaces must provision the required bundled apps using the
existing native lifecycle, with observable progress, actionable errors and safe
retry. Source presence or a sidebar link is not proof of installation. Verify
catalog → installed version → metadata/roles/views/navigation → real actions.
Keep installation/upgrade/uninstall behavior and cross-app dependencies intact;
do not use uninstall/reinstall to repair populated workspaces. Respect existing
uninstall impact warnings and data-retention constraints.

Verify Bureau writing/autosave/reload, nested pages, favorites, search, trash/
restore, Notion import and attachments under the new routing/context. Verify a
neighboring CRM flow and Bilan or another installed app. Keep personal favorites
and drafts correctly scoped. No second sidebar/editor or mock app cards.

### 5. Migration and deployment

Support upgrading the populated single-workspace deployment on its current
ordinary domain without changing IDs, losing records/files, resetting volumes,
rotating encryption secrets or inviting all users again. Generate migrations for
entity changes; follow current-version timestamp/up/down rules. Back up and
rehearse on a disposable restored database and file store before production.

Define backward-compatible handling for old unprefixed links, domain-based links
and existing custom-domain installations. Preserve supported legacy deployment
modes or provide an explicit migration path; do not silently break other users.
Keep user-provided return paths and OAuth state validated against open redirects.
Retain same-origin cookie/CORS/CSRF protections; no wildcard credentialed CORS or
disabled authentication as a routing workaround.

Update both Coolify Compose copies, configuration examples and DEPLOY.md. A
single SERVER_URL should suffice for the new normal mode. Keep worker/server
configuration consistent, durable uploads, readiness and startup gates. Verify a
clean image build, immutable revision tag and populated upgrade. Never claim
Coolify updated without checking the deployed revision and real journeys.

## Mandatory acceptance evidence

Use real accounts and disposable workspaces; behavior tests and integration tests,
not only helper mocks. Minimum matrix:

1. Accounts A and B sign up on one origin without wildcard DNS. Each creates
   five owned workspaces; each sixth is rejected. B can still create five after
   A has five, proving the old server-wide cap is gone. Concurrent fifth/sixth
   creation attempts cannot exceed the allowance.
2. Owner plus five collaborators succeeds. Another invitation/join is refused.
   Test pending reservations, mixed-case emails, duplicate invites, expiry,
   revocation, simultaneous sends/acceptances, removal and re-invitation.
3. A joins B's workspace without consuming A's ownership allowance. Correct
   native roles apply; members cannot install apps or invite beyond their role.
4. A and B cannot access each other's unjoined workspaces by altering route,
   workspace selector, record ID, file URL, search, GraphQL/REST/metadata request,
   app function or WebSocket/SSE topic. Exercise actual API negative cases.
5. One account uses two different workspaces in separate tabs; edits, metadata,
   results, caches and events stay isolated. Switch during autosave/import/request
   completion; no write or stale render lands in the other workspace.
6. Invitation acceptance works for existing and new accounts, email verification,
   expired/reused links and a user currently viewing another workspace. Password
   reset and enabled OAuth/SSO callbacks return to authorized destinations.
7. Logout, another-account login, session expiry and membership revocation work
   without storage cleanup. Refresh/back/bookmarks/deep links resolve correctly.
8. Independently install/use apps and presets in two workspaces. Bureau creates,
   edits and reloads a page with a stored image; verify import, hierarchy and
   trash/restore. Exercise CRM and another app, worker jobs and live events.
9. Upgrade a populated legacy database plus files: preserve ownership mappings,
   memberships, app versions, document IDs, attachments and valid links. Test
   over-limit legacy data, rollback/recovery and repeated migrations/startup.
10. Fresh Compose deployment using only one routed domain becomes ready, worker
    processes a job, bundled apps are usable, and image revision matches source.
    Test an intentional provisioning failure and recovery; no false healthy pass.

Run focused tests for changed areas, type-aware lint and direct uncached tsgo in
both affected packages. Rebuild twenty-shared after its changes/branch switches.
Generate GraphQL clients when needed. Run relevant database integration, real
browser and production build checks; do not mark missing checks as passed. Avoid
translation-catalog churn unless translations are the specific delivery task.

## Delivery and final report

Implement the feature through completion, with focused commits and an updated
plan/report. Include the chosen route/context and ownership model, precise free
quota semantics, migration/backfill decisions, tests actually run, deployment
instructions and remaining concrete blockers. State separately what is verified
locally, in a clean container and on the target deployment. No credentials or
production data in prompts, fixtures, logs or commits. Ask only when a real
unresolved product decision or access requirement prevents further safe work;
continue independent authorized work while waiting.
