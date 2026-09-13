# Phase 00 — P0 verification and safety

Append-only handoff log for P0. Entries are dated; corrections get their own
entry. Format per PROMPT.md §5.

## 2026-09-12 20:45 UTC — Zoo (code agent)

**Task(s):** P0.1 Platform/QA baseline (PLAN.md, execution order §1) — partial;
see UNVERIFIED below.

**Status:** partial. Environment, dependency and baseline-gate evidence
recorded; app lockfile/API-drift repairs implemented. Remaining: full
Playwright suite run, e2e/integration targets, authoritative CI/release
decision (F08/F09, maintainer-owned).

**What I did:**
- Environment: Node 24.20.0, Yarn 4.13.0 (committed release), PostgreSQL 16.15
  and Redis running locally (Homebrew; no Docker on this machine). Playwright
  1.60.0 + chromium/chromium-headless-shell installed into
  `~/Library/Caches/ms-playwright/`.
- Root `yarn install --immutable` clean (warnings only, no lockfile churn).
- Uncached gates: `npx nx build twenty-shared --skip-nx-cache` PASS;
  `npx nx test twenty-server --skip-nx-cache` 1093/1093 suites, 7786 tests
  PASS; `npx nx build twenty-server --skip-nx-cache` PASS;
  `npx nx build twenty-front --skip-nx-cache` PASS.
- **Front unit tests: 2 pre-existing fork-drift failures, NOT environment:**
  1. `src/modules/settings/mcp-and-apis/utils/__tests__/mcpSetup.test.ts`
     expects brand `Twenty`, but
     `src/modules/settings/mcp-and-apis/constants/McpSetup.ts:14` is
     intentionally rebranded `A2E Suite`. Stale test; fix = update the two
     assertions (not the constant).
  2. `src/hooks/__tests__/usePageChangeEffectNavigateLocation.test.ts:514`
     exhaustive matrix: expects 302 cases, has 292. `AppPath` has 27 keys
     (`twenty-shared/src/types/AppPath.ts`),
     `UNTESTED_APP_PATHS` excludes 3; the hand-written cases were not
     regenerated after a fork commit added a route/status. Totals: 1181/1183
     suites, 7022/7025 tests passed.
- **App-local repairs (a2e-documents, a2e-accounting, a2e-projects):**
  - `a2e-documents` had NO committed `yarn.lock`; `a2e-accounting` had a
    0-byte lockfile. Both would fail the CI `yarn install --immutable` step
    (`.github/workflows/ci-twenty-apps.yaml:61`) and masked API drift at
    authoring time. Regenerated both lockfiles; verified `--immutable`
    reinstall passes for both.
  - API drift vs pinned SDK 2.31.0 fixed:
    - `a2e-accounting/src/page-layouts/dashboard.page-layout.ts`: widget
      `position: { layoutMode: GRID, row, column, rowSpan, columnSpan }` →
      `gridPosition: { row, column, rowSpan, columnSpan }` (8 widgets).
      Verified `PageLayoutWidgetManifest` in installed
      `twenty-sdk@2.31.0/dist/define/index.d.ts`: `gridPosition` is the real
      property; `position` exists only on tabs.
    - `a2e-documents/src/front-components/document-page.front-component.tsx`:
      removed `pageTitle` from `openSidePanelPage` args (2.39-only optional
      field; not in 2.31 host API types).
  - Added `typecheck` script to all three apps and renamed accounting's
    `test` → `test:unit` in `package.json`. CI discovery
    (`.github/workflows/discover-apps.yaml:107`) only runs typecheck/unit/
    integration when those scripts exist; previously no A2E app declared
    `typecheck`, so CI silently skipped the exact check that would have caught
    this drift, and accounting's node unit tests were misread by CI as the
    `test` (integration) slot.
  - Post-repair gates, all three apps: `yarn typecheck` 0 errors,
    `yarn lint` 0 warnings/0 errors, `npx twenty dev:build .` succeeds
    (14/12/26 files). Accounting `yarn test:unit` 79/79.
- **SDK pin compatibility evidence:** all three apps pin
  `twenty-sdk`/`twenty-client-sdk` 2.31.0 (workspace SDK/server 2.39.0;
  upstream `examples/media-notes` pins 2.32.0). `npx twenty app:publish
  --private` for a2e-projects built the tarball and reached the live registry;
  the only rejection was `version must be higher than the currently deployed
  version 0.1.1` — i.e. the registry is reachable, the 2.31 publish path
  works, and 0.1.1 is already deployed. This corrects phase-04's earlier
  "upload fails without a dev server on :2020" observation.
- Preserved unrelated user changes: `PROMPT.md` (modified) and `OLD_PROMPT.md`
  (untracked) left untouched.

**Decisions & trade-offs:**
- Repaired lockfiles instead of bumping SDK pins: `twenty-client-sdk@2.32.0`
  does not resolve in these apps (`YN0082: No candidates found` — private
  registry evidently lacks it), and both drifts were fixable app-side with
  2.31-compatible shapes. Pin decision (2.31 vs 2.39 workspace) stays with the
  maintainer per audit F08/F09; this session only proves 2.31 builds and
  publishes.
- Removed `pageTitle` rather than upgrading types: it is cosmetic (side-panel
  tab title) and the 2.31-compatible call keeps one source of truth for the
  page title.
- Did not "fix" the two front test failures in this session: P0.1 is the
  baseline recording task; both are product-code/test repairs that belong to
  their owning slices (MCP settings UI, navigation matrix regeneration) and
  are now precisely documented for the next agent.

**Verification:** commands + results are inline above; each was run this
session from the repo root or the stated package. No test was weakened or
skipped; no AI attribution in commits; no i18n catalogs touched.

**UNVERIFIED (not claimed):**
- `npx nx test twenty-e2e-testing` (browser suites) — browsers installed;
  suites not run this session.
- `npx nx run twenty-server:test:integration:with-db-reset` — not run.
- App install/upgrade/uninstall on a populated scratch workspace (P0.4
  territory) — not attempted; publish version-bump requirement also means a
  fresh publish needs a version bump.
- Front 2 failing suites — reported, not repaired.

**For the next agent:**
1. Quick wins from this baseline: fix the two front test failures (assertions
   in `mcpSetup.test.ts` → `A2E Suite`; regenerate
   `usePageChangeEffectNavigateLocation` cases to match the matrix formula).
2. Decide and record the authoritative SDK pin (2.31 app-local vs 2.39
   workspace) before more app code lands; if staying on 2.31, keep the
   app-side `gridPosition`/host-API discipline shown here.
3. Run the remaining P0.1 items (e2e + integration targets) on the now-working
   baseline, then P0.2/P0.4 per execution order.
4. Suggested commit split (do not include `PROMPT.md`/`OLD_PROMPT.md`):
   `fix(apps): repair app lockfiles, SDK-2.31 API drift and CI script wiring`
   (app package.json/lockfiles + 2 src fixes) + this phase report + the
   PLAN.md annotation, same commit per PROMPT.md §2.3.

## 2026-09-12 21:15 UTC — Zoo (code agent)

**Task(s):** P0.1 follow-up — repair the two pre-existing front test failures
recorded in the entry above (quick wins #1 from "For the next agent").

**Status:** done (for those two suites; P0.1 itself remains partial — e2e,
server-integration and SDK-pin decision still open, unchanged).

**What I did:**
- Committed the previous session's baseline as
  `23632014 fix(apps): repair app lockfiles, SDK-2.31 API drift and CI script
  wiring` (9 files: 3 app package.json + 2 lockfiles + 2 src fixes +
  PLAN.md annotation + this report).
- `packages/twenty-front/src/modules/settings/mcp-and-apis/utils/__tests__/mcpSetup.test.ts`:
  updated the two hard-coded brand assertions (`connectorName`, Goose `name`)
  from `Twenty` to `A2E Suite`, matching `MCP_SETUP.server.displayName`
  (intentional fork rebrand in `constants/McpSetup.ts:14`). Product code
  untouched.
- `packages/twenty-front/src/hooks/__tests__/usePageChangeEffectNavigateLocation.test.ts`:
  the exhaustive-matrix guard expected 302 cases but the file had 292. Root
  cause: the hand-written matrix predates the fork-added `AppPath.DocumentShare`
  route and had no block for it. Added the standard 10-case DocumentShare block
  (plan-required, suspended→billing, logged-out→SignInUp, each onboarding
  status, completed→undefined). `DocumentShare` is in neither
  `ONGOING_USER_CREATION_PATHS` nor `ONBOARDING_PATHS`
  (`src/auth/constants/`), so it follows the regular-app-page pattern; the
  logged-out case relies on the not-ongoing-creation branch in
  `usePageChangeEffectNavigateLocation.ts:96-104` returning SignInUp.

**Verification (all run this session):**
- `npx jest .../mcpSetup.test.ts --config=packages/twenty-front/jest.config.mjs`
  → 10/10 passed.
- `npx jest .../usePageChangeEffectNavigateLocation.test.ts --config=...`
  → 306/306 passed (was 7022/7025 at baseline).
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → clean.
- `npx nx lint:diff-with-main twenty-front` → success.

**For the next agent:** remaining P0.1 UNVERIFIED items unchanged: e2e suites,
`twenty-server:test:integration:with-db-reset`, and the maintainer SDK-pin
(2.31 vs 2.39) decision. Front unit suite should now be fully green — rerun
`npx nx test twenty-front` once to confirm no other drift before relying on it.

---

## 2026-09-13 01:05 UTC — Zoo (code agent)

**Task(s):** P0.2 (backend access boundaries — audit F01/F03) + P0.1
integration-target provisioning.

**Status:** P0.2 done. P0.1 advanced (integration harness now proven on this
machine; full 621-spec sweep, e2e and the maintainer SDK-pin decision remain
open).

**What I did (P0.2 — F01, caller-scoped document search):**
- `search/services/document-search-provider.service.ts`: removed the system
  auth context + `shouldBypassPermissionChecks: true`; the query now runs under
  the caller's ambient AsyncLocalStorage context with the default permission
  pipeline, so Cmd+K results respect role/row permissions. Added
  `escapeForIlike` on the search input so `%`/`_` match literally.

**What I did (P0.2 — F03, share authorization/representation):**
- `document-share/document-share.service.ts`: create/list/delete now verify
  the caller can read the source document first (fail-closed try/catch →
  FORBIDDEN; archived documents rejected); added `DOCUMENT_SHARE_INVALID_INPUT`
  (mapped to UserInputError in the exception filter) enforcing one consistent
  representation — full ciphertext triple XOR plaintext, bounded lengths, and a
  caller-supplied plaintext body is nulled when the triple is complete;
  guest payload omits `bodySnapshot` for passphrase-protected shares.
- `document-share.module.ts`: added the missing `TwentyOrmModule` import
  (workspace-scoped repository was never injectable).

**Pre-existing blockers found and repaired while integration-testing the above:**
- `document-share.resolver.ts` had no `@CoreResolver()` decorator: the whole
  document-share GraphQL surface (including the guest endpoint the front share
  page calls) was silently absent from the schema. Registered it and moved
  auth guards from class level to per-method (WorkspaceResolver pattern) so
  `getGuestDocumentShare` is genuinely public while the rest require
  Workspace+User auth.
- `2-39-instance-command-fast-1789062772757-add-document-share-entity.ts`
  was never registered in
  `database/commands/upgrade-version-command/instance-commands.constant.ts`:
  fresh installs had no `core."documentShare"` table at all. Registered it;
  `database:migrate` now creates it.

**Verification (all run this session, NODE_ENV=test against the `test` DB):**
- Provisioned: created `test` database, `npx nx database:reset twenty-server`
  (init → migrate --include-slow → seed) → success; the document-share
  instance command applied (`executed successfully` in the log).
- `npx jest document-share search --config=packages/twenty-server/jest.config.mjs`
  → 32/32 passed (share 15 + search-provider 6 + adjacent suites).
- New `test/integration/graphql/suites/document-share/document-share.integration-spec.ts`
  → 4/4 passed (workspace-scoped listing, forbidden create without document
  read rights, partial ciphertext triple rejected pre-authorization, guest
  endpoint reachable with no Authorization header and not-found for unknown
  tokens).
- `npx tsgo -p tsconfig.json --noEmit` (twenty-server) → clean.
- `npx nx lint:diff-with-main twenty-server` → success.

**P0.1 progress this session:**
- `npx nx run twenty-server:test:integration:with-db-reset` (621 specs) was
  SIGKILLed after ~30 min on this 16 GB machine — memory, not a test failure.
  The harness itself is verified end-to-end (DB reset + app boot + suites).
  UNVERIFIED remains: the full sweep, e2e suites, maintainer SDK-pin decision.
- Front unit suite not rerun this session (previous entry left it green).

**For the next agent:** run the integration sweep in chunks
(`npx jest --config ./jest-integration.config.ts test/integration/graphql/suites/<area>`
per area, `NODE_ENV=test` set and the `test` DB reset once) instead of the
single nx target, or add swap/RAM. The guest 400 vs 200 lesson: a class-level
guard cannot be bypassed by a method-level `PublicEndpointGuard` — Nest
evaluates both.

## 2026-09-13 13:45 UTC — Zoo (code agent)

**Task(s):** P0.3 (backend/front realtime — audit F02/F06).

**Status:** P0.3 done.

**What I did (F02 — realtime aligned with the HTTP session contract):**
- `realtime-gateway/services/realtime-topic-authorization.service.ts`:
  `authenticate` now accepts real session tokens (`sess_` prefix via
  `isUserSessionToken`) and resolves them through
  `UserSessionService.resolveSession` (Redis-cached, revocation-aware, same
  source as the HTTP path); JWTs are still honored but restricted to
  `ACCESS` type (refresh/agnostic/API-key tokens rejected). Membership is
  revalidated on EVERY subscribe through
  `WorkspaceCacheService.getOrRecompute(workspaceId, ['flatWorkspaceMemberMaps'])`
  — the same pattern as `jwt.auth.strategy.validateAccessToken` — so a removed
  member is refused on the next subscribe, not at next reconnect.
- `realtime-gateway/services/realtime-gateway.service.ts`: the upgrade
  handshake now runs `isRequestOriginAllowed` (the exact HTTP util) against an
  express-`Request` shim built from the upgrade request headers
  (`x-forwarded-proto` honored for TLS-terminating proxies); disallowed or
  missing origins are logged and the socket destroyed before any ws handshake.
  The hand-rolled upgrade cookie parser was deleted — the cookie is now
  extracted with `UserSessionCookieService.extractSessionTokenFromRequest`,
  and it stays HttpOnly (no front cookie-reading path was introduced).
- `realtime-gateway.module.ts`: imports `UserSessionModule` +
  `WorkspaceCacheModule` to provide the two new dependencies.

**What I did (F06 — connection vs subscription success):**
- `realtime-publisher.service.ts`: a Redis `subscribe` failure no longer
  resolves a no-op unsubscribe; it propagates after cleanup, so the gateway
  rejects the subscribe instead of acking.
- `realtime-gateway.service.ts`: subscribe error envelopes now echo the
  requested `topic` (previously `topic: ''`), so failures are attributable;
  the client no longer receives a `subscribed` ack for a topic the server
  could not actually subscribe to.
- front `realtimeConnectionManager.ts`: `error` envelopes with a non-empty
  topic are delivered to that topic's listeners; topic-less envelopes are
  dropped. Connection status semantics unchanged — a rejected subscription
  reads as `connected` + per-topic error, not a transport failure.
- front `useRealtimeTopic.ts`: exposes `lastError` (topic-attributed
  rejection) separately from `lastEnvelope` (data events); consumers can now
  distinguish "the topic was refused" from "no data yet".

**Scope decision (recorded):** "record/channel topic rights" is enforced at
the level that exists today — workspace membership, workspace-scoped topics,
and per-user inbox scoping (only the owning user's inbox topic is allowed).
Object/chat publishers do not exist yet (only presence ships), so record-row
and channel ACL enforcement lands with those publishers (P2/P5); the topic
authorization seam (`assertTopicAuthorized`) is the single place to extend.

**Reconnect durability note:** `useWorkspacePresence` already refetches the
roster on the `connected` status event, which is the durable-state refetch
this task requires; no front change needed there.

**Verification (all run this session):**
- `npx jest realtime-gateway --config=packages/twenty-server/jest.config.mjs`
  → 26/26 passed (topic-authorization suite rewritten: session-token path,
  per-subscribe membership revalidation, non-ACCESS JWT rejection, agnostic
  rejection; assertTopicAuthorized coverage unchanged and green).
- `npx jest --config=packages/twenty-front/jest.config.mjs src/modules/realtime`
  → 12/12 passed, including the new "surfaces a subscription rejection
  distinctly from connection status" case (status stays `connected`,
  `lastError` populated, no data event emitted).
- `npx tsgo -p tsconfig.json --noEmit` in both `twenty-server` and
  `twenty-front` → clean.
- oxlint + oxfmt on the changed realtime directories → server clean; front
  has 8 pre-existing errors in committed files I did not touch
  (`RealtimeConstants.ts` naked-constant rule, `useRealtimeOfflineQueue.ts`
  duplicate imports) — left for the owning task, not masked.
- Not run: real two-process ws handshake against a live server (requires the
  dev environment); the upgrade-path origin check reuses the HTTP util by
  construction but has no integration test in this session.

## 2026-09-13 13:50 UTC — Zoo (code agent)
**Task(s):** P0.3 — independent re-verification of the uncommitted session above before committing.
**Status:** done (commit).
**What I did:** re-ran every gate from a clean shell against the working tree; no code changed.
**Verification:** realtime-gateway server suites 26/26; front `src/modules/realtime` 12/12; `tsgo --noEmit` clean in twenty-server and twenty-front; `nx lint:diff-with-main` clean for both packages. `.env.test` diff inspected: queue-URL isolation comment + `REDIS_QUEUE_URL`, no secrets.
**For the next agent:** next dependency-ready task is P0.4 (platform/app lifecycle characterization on disposable workspaces). The `.env.test` queue isolation note matters for any integration run alongside a dev worker.

## 2026-09-13 14:10 UTC — Zoo (code agent)
**Task(s):** P0.4 Platform/app lifecycle — characterization + first C3 safeguard (PLAN.md line ~443).
**Status:** partial (see "For the next agent" for the open remainder).

**What I did (characterization, code + real runs against the seeded `test` DB):**
- Mapped the native lifecycle surface: `application-install.service.ts`
  (lock-guarded install/upgrade with version-progression validation, failed
  fresh-install rollback without uninstall hook, post-install hook sync/enqueue
  paths), `application-sync.service.ts` `uninstallApplication` (UNINSTALLING
  state transition with revert, workspace-migration deletion, best-effort
  runtime-resource cleanup), `application-uninstall.service.ts` (best-effort
  hook per app; strict mode throws aggregated failures for workspace
  deletion), `application-stop.service.ts` + kill-switch command (cache-backed
  stop checked in `logic-function-executor.service.ts` before throttle).
- Confirmed upstream integration suites already cover: uninstall hook
  execution/absence/manifest drift (6 tests), hook best-effort failure,
  partial-progress retry and workspace-deletion hook deferral, install
  workspace-version/progression failures. Ran them for real (results below).

**C3 gap found and fixed (job cleanup after uninstall):**
- App uninstall deletes the application's logic functions through the
  workspace migration, but logic-function jobs already enqueued before the
  uninstall still reference them. `logic-function-trigger.job.ts` only skipped
  `LOGIC_FUNCTION_DISABLED` (stopped app) and `DEPENDENCIES_SIZE_EXCEEDED`;
  the executor's `LogicFunctionExecutionException` (`LOGIC_FUNCTION_NOT_FOUND`,
  thrown by `getFlatEntitiesOrThrow` for deleted functions) fell through to
  `throw error`, so BullMQ failed and retried those jobs to the retry limit —
  retrying work that can never succeed, violating C3 "drain/cancel safely;
  recheck app availability at queued execution".
- Fix: the job now drains (warn + `continue`) on any
  `LogicFunctionExecutionException` from the executor's own guard checks.
  Deliberately narrow: user-code failures (`error.error` inside a successful
  execute result) and `LogicFunctionException` from drivers still propagate.
- New unit spec `logic-function-trigger/jobs/__tests__/logic-function-trigger.job.spec.ts`
  (3 tests): drains missing-function errors, still rethrows unexpected
  crashes, regression-guards the stopped-app skip.

**Decisions & trade-offs:**
- Draining (silently completing) rather than cancelling: the queue driver has
  no per-job cancel API in `message-queue.service.ts`; drain matches the
  existing LOGIC_FUNCTION_DISABLED precedent and needs no new primitive.
- Fix scoped to `LogicFunctionExecutionException` (executor-internal guards),
  not all `LogicFunctionException`: GraphQL-facing codes are mapped in
  `logic-function-graphql-api-exception-handler.utils.ts` and reusing that
  enum here would conflate API semantics with queue semantics.

**Verification (all this session):**
- `npx jest logic-function-trigger --config=packages/twenty-server/jest.config.mjs`
  → 68/68 (incl. 3 new job-drain tests).
- `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit` → clean.
- `npx nx lint:diff-with-main twenty-server` → success.
- Integration (NODE_ENV=test, `--runInBand`, 6 GB heap): uninstall-hook suite
  6/6; workspace-deletion-hooks + uninstall-retry 3/3 — all green WITH the fix.
- UNVERIFIED: parallel (non-`--runInBand`) integration on this 16 GB machine
  OOMs (pre-existing, same as the earlier 621-spec sweep note); published-
  artifact provisioning on a production-like server not exercised.

**For the next agent:** P0.4 remainder = (1) verify published app artifacts
provision on a production-like server (source folders in Git are not installed
apps) — needs `app:publish` against a docker/coolify-like server; (2) upgrade
characterization on a populated workspace with real data-loss inspection (the
`successful-uninstall-application-with-package-file-fks` suite is a starting
point); (3) C3 dependency preflight for destructive removal (dependent
apps/views/workflows naming) is still unimplemented — that is the next code
task under P0.4, likely needing a new resolver input, not a flag on the
existing uninstall mutation. Integration runs on this machine: use
`--runInBand` + `NODE_OPTIONS=--max-old-space-size=6144`.
