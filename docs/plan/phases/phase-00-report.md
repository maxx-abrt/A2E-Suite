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

## 2026-09-13 15:31 UTC — Zoo (code agent)
**Task(s):** P0.4 — C3 data-loss preflight for app uninstall (finishing the uncommitted session found in the tree).
**Status:** done (P0.4 remains partial overall; see previous entry's open items).
**What I did:**
- Verified every primitive the uncommitted
  `application-manifest/services/application-uninstall-preflight.service.ts`
  uses is real: `ObjectRecordCountService.getApproximateRecordCountByTableName`
  (pg_class reltuples, same source as `getRecordCounts`),
  `WorkspaceCacheService.getOrRecompute` flat maps, `applicationId` as a
  scalar survivor on flat entities (only the relation object is omitted),
  `objectMetadataUniversalIdentifier` as declared universal FK for
  fieldMetadata/view, `computeObjectTargetTable` ('_'-prefixed live table),
  `ApplicationExceptionCode.FORBIDDEN`. Call-site audit: resolver uninstall
  → preflight on; failed fresh-install rollback → `shouldRunDataLossPreflight:
  false` (deadlock guard); workspace deletion uses the hooks-only path
  (`runUninstallHooksForWorkspaceDeletion*`), unaffected.
- Fixed the unit spec: count-map mocks were keyed by `nameSingular` but the
  service derives the live table name (`_invoice`), so data-holding objects
  read as empty; also added `applicationUniversalIdentifier` to the flat
  object fixtures (required by `computeObjectTargetTable`).
- Fixed the integration spec to be rerunnable and non-polluting: run-unique
  object name (aborted runs leave non-transactional enum/table leftovers;
  `coupon` collided on every rerun), records via schema-qualified SQL
  (per-object GraphQL mutations are not in the booted app's static schema;
  `createdByName`/`updatedByName` have no defaults), and the refused-uninstall
  test now completes the real recovery path (delete records → uninstall
  succeeds) so it never orphans metadata in the shared workspace.
**Decisions & trade-offs:**
- Refusal (FORBIDDEN naming the objects) rather than a confirmation flag:
  C3 says no supported export/retention path exists, so removal of an app
  holding data must be refused, not presented as safe. Hide remains the
  containment. A future confirmation/export flow can relax this at the
  resolver level.
- Preflight counts only app-owned objects' tables. App-owned fields/views on
  other apps' objects are computed and returned in the impact payload but do
  not block (column data loss with zero owned-object records is a metadata
  concern, not the data-loss refusal this task targets).
**Verification (all this session):**
- `npx jest application-uninstall-preflight --config=packages/twenty-server/jest.config.mjs` → 5/5.
- `npx jest application-manifest --config=packages/twenty-server/jest.config.mjs` → 29 suites, 148/148.
- Integration (NODE_ENV=test, `--runInBand`, 6 GB heap, seeded `test` DB):
  new `uninstall-data-loss-preflight.integration-spec.ts` → 3/3; adjacent
  uninstall suites (logic-function-hook, retry, workspace-deletion hooks,
  package-file FKs) → 4 suites, 10/10.
- `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit` → clean.
- `npx nx lint:diff-with-main twenty-server` → success.
- UNVERIFIED: full 621-spec integration sweep (machine OOM limit, pre-existing);
  published-artifact provisioning and populated-workspace upgrade remain open.
**For the next agent:** P0.4 leftovers are (1) production-like
published-artifact provisioning, (2) populated-workspace upgrade with
data-loss inspection, (3) naming cross-app dependents (apps referencing this
app's fields/views) in the preflight refusal — the impact payload already
computes owned fields/views on foreign objects, so (3) is a small extension.
Then P0.5 or P1.6a per execution order.

## 2026-09-13 17:40 UTC — Zoo (code agent)
**Task(s):** P0.4 leftovers (1)(2)(3) closed → P0.4 ticked; P0.1/P0.2 ticked.
**Status:** done. P0.1, P0.2 and P0.4 are ticked in PLAN.md; P0.5 remains open
(gates release).
**What I did:**
- Cross-app dependents naming (P0.4 leftover 3): preflight impact now
  names applications whose relation fields target the uninstalling app's
  owned objects (`computeCrossAppDependents`); the refusal message lists
  the dependent apps. Unit 8/8, integration 4/4 (new dependent-manifest
  case), adjacent uninstall suites 10/10, tsgo + diff-lint clean.
- Published-artifact provisioning (P0.4 leftover 1): rebuilt
  `twenty-sdk/dist/cli.cjs` (previous dist was browser-externalized and
  crashed), then on the running local server (remote "scratch", ~/:3000
  server + :2020 registry) ran `dev:build` → `app:publish --private` →
  `app:install` for `a2e-documents`. Two real manifest defects surfaced
  and fixed: (a) a custom TEXT `position` field collided with the
  auto-derived system position field (position name is reserved);
  (b) both relation sides were declared on the document object — the
  validator requires the target field to point back, and the framework
  auto-creates the inverse; inverse sides on foreign standard objects
  (company, person) must be declared as standalone
  `src/fields/*.ts` `defineField` manifests. Install of 0.1.2 from the
  uploaded tarball succeeded; DB shows the application row, the document
  object and both inverse RELATION fields. Source folders in Git were
  never the installed app — acceptance used the published artifact only.
- Populated-workspace upgrade (P0.4 leftover 2): created a record via
  GraphQL on the installed workspace, bumped the app to 0.2.0 adding an
  additive nullable `summary` field, published + installed the upgrade.
  The record survived (id/title/position preserved, column added
  nullable, no duplicate seeds); probe record deleted afterwards.
- P0.1 e2e: fixed `packages/twenty-e2e-testing` login.setup.ts — A2E
  auto-selects the single workspace, so the "Choose a workspace" step is
  now conditional. Created `.env` from `.env.example` (vite dev front on
  :3001 via `npx nx start twenty-front`; `nx serve` serves a stale static
  build). Result: 4/11 pass (login.setup, return-to-path deep link,
  signup_invite_email + 1). The 7 failures are pre-existing A2E-vs-upstream
  drift, not regressions: onboarding, return-to-path query params,
  workspace-template-preset, create-kanban-view (Industry field),
  create-record ("Intro" field), side-panel-tabs (needs 2 company
  records), workflow-creation (no "Workflows" nav button). Fixing the
  specs is a follow-up, not a P0.1 gate.
- Full 621-spec integration sweep stays UNVERIFIED on 16 GB hardware
  (OOM, pre-existing); chunked runs remain the local path.
**Decisions & trade-offs:**
- Maintainer confirmed (2026-09-13) ticking P0.1 with annotations:
  prod-composition checks (D06, F08/F09 GitLab release checks) are
  deferred behind the first production deployment and stay in the
  "Unresolved decisions" table; the e2e drift list is recorded as
  follow-up rather than blocking P0.1.
- Inverse-relation fields on foreign objects belong in top-level
  manifest `fields` (`ManifestEntityKey.Fields`), not in
  `defineObject`'s field array — this matches how the accounting app
  declares only the FK-owning side.
- `.env` for e2e-testing is local-only (matches `.env.example`
  pattern); verify it is gitignored before committing.
**Verification (all this session):**
- SDK CLI: `npx nx build twenty-sdk --skip-nx-cache`; `dev:build`,
  `app:publish --private --remote scratch`, `app:install --remote scratch`
  → "✓ Application installed" (0.1.2, then upgrade 0.2.0).
- DB (psql `default`): application A2E Documents 0.2.0, document object
  + `documents` RELATION fields on company/person present; record
  survival checked in `workspace_1wgvd1injqtife6y4rvfbu3h5."_document"`.
- Preflight: unit 8/8, integration 4/4, adjacent 10/10; tsgo clean,
  `npx nx lint:diff-with-main twenty-server` clean.
- e2e: `npx playwright test` → 4 passed / 7 failed (drift, see above).
**For the next agent:** P0 is complete except P0.5 (release/recovery,
gates release). Follow-ups worth a ticket: fix the 7 drifted e2e specs;
run the 621-spec sweep in chunks on beefier hardware; run D06/F08/F09
checks on the first production deployment.

## 2026-09-13 18:05 UTC — GLM-5.3-Flash [executor]
**Task:** P0.5 Release/recovery · **Slice:** first bullet — required migration failure blocks deployment (F10) · **Claim:** partial
**Changed:** `packages/twenty-docker/twenty/entrypoint.sh` — `yarn command:prod upgrade` failure now `exit 1` (container aborts) instead of warn-and-continue; the misleading "Successfully migrated DB!" after a failure is unreachable. Verified the server-side upgrade command already exits non-zero on workspace failure (`upgrade.command.ts` throws on `totalFailures > 0`), so the defect was purely the entrypoint swallowing it.
**Checks:** `sh -n entrypoint.sh` → OK; shell shim proving failed upgrade exits 1 before exec. Compose variants setting `DISABLE_DB_MIGRATIONS=true` (server-coordinated migrations) unaffected.
**Missing for tick:** real docker boot with an injected failing upgrade (needs built image + running Docker, heavy); readiness-vs-liveness split, backup/restore rehearsal, supported-DB-version pinning — later F10 bullets.
**Do not redo:** entrypoint gate is in place; do not re-add warn-and-continue on upgrade.
**Next:** rehearsal of DB/file backup restore in a scratch environment, then readiness/liveness separation.

## 2026-09-13 20:25 UTC — GLM-5.3-Flash [executor]
**Task:** P0.5 Release/recovery · **Slice:** second bullet — rehearse DB/file backup restoration (F10) · **Claim:** partial
**Changed:** `DEPLOY.md` only — new "Restore drill — rehearsed procedure" section (additive; docs check PASS).
**Checks:** `pg_dump -Fc default` → 1.4 MB / 105 table-data entries; `pg_restore` into isolated `default_restore_drill_2` → exit 0; parity vs source: workspaces/users, role/roleTarget 1005, apiKey 1, signingKey 1, A2E Documents 0.2.0, _document 1, workflow 2, file 35 — all match. Upgrade gate on the copy: refused without `--force` (workspace mid-upgrade detection working), no-op pass with `--force`, exit 0. File rows verified to be workspace/application-scoped relative paths; physical files exist under `.local-storage/{workspaceId}/{applicationId}/…`. `node docs/scripts/check-docs.mjs` → PASS.
**Missing for tick:** drill not repeated on a production-like server/DB version matrix (local PG16 only); readiness-vs-liveness split still open — `/healthz` is `health.check([])` (liveness only, no DB/Redis/migration checks) and the worker compose service has no healthcheck at all; supported-DB-version pinning decision outstanding.
**Do not redo:** the restore drill procedure and DEPLOY.md section are done and accurate for dev PG16; do not re-add the "No backup/restore drill has been performed" sentence — replace it when a prod drill runs.
**Next:** readiness/liveness split — give `/healthz` real indicators (DB, Redis) or add a separate `/readyz`, and a worker healthcheck; then DB-version pinning decision.
**Cleanup note:** scratch DB `default_restore_drill_2`, `/tmp/a2e-backup-drill-20260913.dump` and `/tmp/drill-upgrade.log` were left in place (user denied the combined cleanup command) — safe to drop/delete.

## 2026-09-13 18:55 UTC — GLM-5.3-Flash [executor]
**Task:** P0.5 Release/recovery · **Slice:** third bullet — readiness-vs-liveness split + worker healthcheck (F10) · **Claim:** done-for-review
**Changed:** `packages/twenty-server/src/engine/core-modules/health/services/readiness.service.ts` (new: DB `SELECT 1` + Redis `PING`, 3s deadline via existing `withDeadline`, failures reported `indicator.down()` so probes get deterministic 503, never a throw); `controllers/readiness.controller.ts` (new, `/readyz` public guards, Terminus); `health.module.ts` (mounts both controllers; imports `TypeORMModule` so the worker context has a DataSource); `queue-worker/start-worker-health-server.ts` (new: node:http on `WORKER_HEALTH_PORT` default 3099, `/readyz` → `isReady()`); `queue-worker.ts` (starts it); `twenty-shared/src/types/ApiPath.ts` (additive `Ready = 'readyz'`); both `docker-compose.coolify.yml` copies (root + `packages/twenty-docker/`, kept identical): server probe `/healthz` → `/readyz` (timeout 10s), worker gets its own healthcheck; `DEPLOY.md` F10 paragraph updated. `/healthz` stays liveness-only on purpose (restart signal), readiness failures stop routing without killing the process.
**Checks:** jest health suite 7/7 (readiness 6 + controller 1); `tsgo -p tsconfig.json --noEmit` clean (twenty-server); `nx build twenty-shared --skip-nx-cache` (ApiPath touched); `nx lint:diff-with-main twenty-server` clean; `node docs/scripts/check-docs.mjs` PASS; YAML parse of both compose files OK (`docker` CLI absent locally, compose config not runnable).
**Missing for tick:** real docker boot exercising `/readyz` 503 during a DB outage and the worker probe on the built image (needs Docker — not on this machine); prod DB-version drill items from the 20:25 entry remain open (PG version matrix, supported-DB pinning decision).
**Do not redo:** readiness service/controller, worker health server, compose probes, DEPLOY.md paragraph are in place and tested at unit level; do not add dependency checks to `/healthz` (split is intentional).
**Next:** supported-DB-version pinning decision (needs maintainer input), then prod-composition rehearsal (already deferred behind first production deployment).

## 2026-09-13 19:05 UTC — GLM-5.3-Flash [executor]
**Task:** P0.5 Release/recovery · **Slice:** fourth bullet — supported DB versions (F10; CI-source decision excluded, maintainer-owned D06) · **Claim:** done-for-review
**Changed:** `database/typeorm/database-version-check.service.ts` (new: `SHOW server_version` at OnModuleInit, throws below PG major 14 — boot fails fast in both server and worker before any migration); registered in `typeorm.module.ts` providers; `packages/twenty-docker/docker-compose.yml` + both `docker-compose.coolify.yml` copies: bare `redis` → `redis:7` (postgres:16 already pinned everywhere); `DEPLOY.md`: supported matrix stated (PG16 target / 14 floor / Redis 7). Floor is 14 because existing deployments may run <16; only composes pin 16.
**Checks:** jest `src/database/typeorm` 4/4 (version-check 3 + core.datasource 1); `tsgo --noEmit` clean; `nx lint:diff-with-main twenty-server` clean (exit 0); `check-docs.mjs` PASS; YAML parse of all three composes OK.
**Missing for tick:** prod-composition rehearsal on real infra (deferred behind first production deployment, maintainer-confirmed); D06 CI-source decision (owner decision, not executor scope).
**Do not redo:** version gate + redis pins + DEPLOY.md matrix are in place; do not raise the runtime floor to 16 without a migration story for existing deployments.
**Next:** P0.5 is now executor-complete except Tier-2/prod items; next dependency-ready task per execution order is P1.6a (template contracts).
