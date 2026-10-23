# Same-domain workspaces implementation

Baseline: `8e88f0e2`, 2026-10-22. Scope: the user's implementation handoff for
a hosted, Notion-like A2E Suite. Status: **partial**: request binding,
authentication polish and transactional email groundwork are implemented.
Evidence: [phase report](phases/same-domain-workspaces-report.md).

Email setup and its live provider/DNS evidence are recorded in the
[Resend email report](phases/resend-email-report.md) and
[configuration guide](../resend-email.md). Resend now reports the sending domain
as verified; REST delivery is tested against its simulator. Deployment/inbox
verification, routing and ownership/quota work remain incomplete.

## Product contract

One ordinary origin hosts global sign-in and a native workspace picker. People
see their owned and joined workspaces and use the existing sidebar, onboarding,
app installer, permissions and Bureau editor. Server administration remains a
separate privilege from workspace ownership or a workspace's admin role.

The free allowance is five active owned workspaces per account, and one owner
plus five additional human collaborators per workspace (six humans total).
Joined workspaces do not consume ownership slots. In-progress creation reserves
a slot; archived workspaces count. Distinct, normalized, unexpired invitations
reserve collaborator slots. Existing members and repeat invitations consume no
additional slot. These are required behavior, **not implemented by this slice**.

## Observed baseline

- `sign-in-up.service.ts` checks an instance-wide workspace count and enterprise
  validity. Multiworkspace and server-admin creation restrictions are separate
  settings. Changing one flag cannot satisfy the requested allowance.
- `WorkspaceEntity` and `UserWorkspaceEntity` have no authoritative owner field.
  Choosing any administrator as owner would manufacture an ownership claim.
- `WorkspaceDomainsService` builds subdomain/custom-domain URLs. `DomainShell`
  chooses the global or workspace router using hostname and multiworkspace
  configuration. A pathname change alone cannot implement same-domain routing.
- `UserSessionService` stores workspace-bound sessions; `AccessTokenService`
  authenticates cookie and bearer requests. Existing sessions and JWTs already
  establish an authorized workspace. The request must never replace that grant.
- `ApolloFactory` supplies GraphQL, upload, REST and streaming REST links and
  maintains the current workspace. Its workspace assertion is captured before
  the retry link, so retries retain the original request's intended workspace.

## Slice SDW-1: bind requests to their intended workspace

Implemented:

- Shared `WORKSPACE_REQUEST_HEADER` (`x-workspace-id`). Apollo sends the current
  workspace ID when one is loaded; global account clients omit the assertion.
- After cookie or bearer authentication, the server compares the assertion with
  the authorized context. A mismatch, empty value, list or combined duplicate
  fails before the request is hydrated or its operation executes.
- Stable `WORKSPACE_CONTEXT_MISMATCH` error: REST 403, GraphQL `FORBIDDEN` with
  that subcode. It reveals no target workspace details. A mismatch does not
  clear the valid cookie, sign the user out or retry a GraphQL operation. The
  frontend displays a translated message asking the user to sign in again.
- Omitted assertions retain the existing native authentication behavior for
  legacy clients. Headers cannot grant workspace access or retarget API keys
  and application tokens. Membership, roles, SSO, CSRF and billing still use
  their existing checks.

This is a guard against silent request retargeting, **not** the completed
two-workspace tab experience. No route, schema, quota or deployment setting
changes are included. Other fetch transports and realtime still need review.

## Dependency-ordered remaining slices

1. **SDW-2 — Authorized context per tab.** Keep the existing opaque session as
   identity evidence, but design workspace selection per request, with live
   membership/lifecycle checks, workspace SSO and 2FA policy validation, and
   impersonation constraints. Do not simply swap `session.workspaceId`, convert
   a workspace session into an unrestricted identity, or mutate a shared cookie
   when switching. Preserve workspace-bound API keys, application tokens and
   deletion cleanup tokens. Extend REST, upload, SSE and WebSocket context.
2. **SDW-3 — Native routing and cache boundary.** Target `/w/:workspaceId/...`
   with opaque existing workspace IDs; global auth/picker remain unprefixed.
   Implement through the existing domain URL builders and routers, preserving
   custom-domain mode and safe old-link resolution. Remount/clear native
   workspace caches, subscriptions and drafts at the boundary; flush Bureau
   writes to their original context. Cover reload, fresh tabs and Back/Forward.
3. **SDW-4 — Ownership and quotas.** Add the smallest native durable owner
   relation with generated migrations if no existing authoritative primitive
   is found. Backfill only where creator evidence is trustworthy; ambiguous
   legacy mappings require explicit operator resolution without granting new
   memberships. Do not guess from an admin role. Serialize quota checks with
   writes; cover every creation/join/invitation entry point and idempotency.
   Enforce the limits without Stripe or an enterprise key. Preserve over-limit
   data/access while blocking growth. Specify transfer, restoration, leave,
   removal and account deletion before exposing those actions.
4. **SDW-5 — Native account experience.** Add owned/joined labels, allowance
   counts and useful errors to the existing picker and onboarding. Test zero
   workspaces, pending/failed creation, session expiry, invitation acceptance,
   revoked membership, logout retry and another account signing in. Keep the
   server administration panel and workspace administration distinct.
5. **SDW-6 — Link and integration completion.** Audit OAuth/SSO state, email
   verification, reset/invitation URLs, notifications, record links, SDK and
   application URLs, uploads and public sharing. Keep public API/webhook paths
   and scoped guest grants intact. Exercise independent presets and installed
   app versions, Bureau autosave/import/attachments/tree/trash, CRM and Bilan.
6. **SDW-7 — Populated upgrade and release.** Rehearse on a disposable restored
   database and files. Update both Coolify Compose copies and DEPLOY.md only
   once same-domain routing works; one `SERVER_URL` must suffice. Verify image
   build, immutable revision, readiness, worker job, provisioning failure and
   recovery. Verify the actual target deployment separately from local checks.

Each slice requires a dated phase entry and its relevant negative/concurrency
tests. The full handoff's ten acceptance journeys remain the release gate.
Per [PROMPT.md](../../PROMPT.md), executors leave PLAN.md and commits to the
orchestrator; this document does not tick a milestone or certify a deployment.
