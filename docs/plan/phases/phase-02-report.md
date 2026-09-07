# Phase 02 Report — Realtime Gateway & Workbench Shell

## 2026-09-07 18:30 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P2.1 Realtime gateway (server) — all six subtasks; P2.2 Realtime
client (front) — all three subtasks (PLAN.md lines 144–162)
**Status:** done (P2.1 + P2.2 complete)

**What I did:**
- Server core module `packages/twenty-server/src/engine/core-modules/realtime-gateway/`:
  - `realtime-gateway.module.ts` — imports JwtModule + RedisClientModule; exports
    publisher + topic-authorization services; mounted once from
    `core-engine.module.ts` (queue worker inherits it harmlessly: no HTTP
    adapter → `RealtimeGatewayService.onModuleInit` no-ops with a warning).
  - `services/realtime-gateway.service.ts` — raw `ws` server mounted on the
    Nest HTTP server (same port) at `/realtime`; per-socket state in a WeakMap
    (auth context, subscriptions, per-topic seq); heartbeat ping/pong every
    15s with dead-socket terminate; `subscribe`/`unsubscribe` message
    protocol; error envelopes `type:'error'`; ack envelopes `type:'ack'`.
  - `services/realtime-topic-authorization.service.ts` — verifies the access
    token via `JwtWrapperService.verifyJwtToken` on subscribe; enforces
    workspace match between token and topic (topic grammar
    `workspace:<id>[:kind:scope]`), inbox topics scoped to the owning user,
    workspace-agnostic tokens rejected for all topics.
  - `services/realtime-publisher.service.ts` — Redis pub/sub fan-out on
    `a2e:rt:<topic>` (duplicate client, message routing back to local
    subscribers, lazy subscribe/unsubscribe of channels) — multi-instance
    safe per blueprint §4.
  - `utils/parse-realtime-topic.util.ts` + `utils/serialize-realtime-envelope.util.ts`
    — topic grammar parser (workspace/presence/chat/inbox/object kinds) and
    envelope serializer `{topic, seq, type, payload}`.
  - `types/` — envelope zod schemas + client-message type guards.
  - Metrics keys added: `realtime/socket/connected`, `realtime/socket/disconnected`,
    `realtime/message/published` in `metrics-keys.type.ts` (counters wired via
    enum; no custom meter code needed).
- Shared: `ApiPath.Realtime = 'realtime'` in `twenty-shared/src/types/ApiPath.ts`
  → vite dev proxy (`apiProxyPrefixes.ts` derives from `Object.values(ApiPath)`)
  and the front WS URL now both route `/realtime`. No AppPath collision
  (apiPathCollisions spec passes).
- Front module `packages/twenty-front/src/modules/realtime/`:
  - `utils/RealtimeConnectionManager.ts` — singleton, single socket, injectable
    socket factory (`setWebSocketFactoryForTesting`), exponential backoff
    reconnect (500ms→30s cap, 10 attempts), resubscribes all topics on open,
    pending-subscription queue while socket down, status listeners.
  - `states/realtimeConnectionStatusState.ts` — jotai atom
    (`connecting|connected|reconnecting|disconnected`).
  - `hooks/useRealtimeTopic.ts` — subscribe/unsubscribe on mount/unmount,
    `lastEnvelope` state + `onEvent` callback (stable-by-topic; consumers can
    hydrate missed messages on reconnect per blueprint §4 at-most-once).
  - `hooks/useRealtimeConnectionStatus.ts` — mirrors manager status into the atom.
  - `components/RealtimeReconnectBanner.tsx` — Lingui fr+en strings via `t`,
    uses `Banner` from `twenty-ui/feedback` (danger/blue only per its API),
    renders only while down/reconnecting.
  - `states/realtimeOfflineQueueState.ts` + `hooks/useRealtimeOfflineQueue.ts` —
    namespaced localStorage-backed queue (`enqueue/drain/clear`) for P5/P8
    composers; entries validated with zod on hydration.
  - `testing/RealtimeMockServerHarness.ts` — in-memory ws stand-in (jsdom-safe)
    driving the manager through its real open/message/close flow.
  - `constants/RealtimeConstants.ts` — `getRealtimeWsUrl()` honors
    `__REALTIME_TEST_WS_URL` for tests.
- Tests:
  - Server unit: `services/__tests__/realtime-topic-authorization.service.spec.ts`
    (8 cases), `utils/__tests__/realtime-envelope-serialization.spec.ts`
    (8 cases incl. topic parser).
  - Server integration: `test/integration/realtime-gateway/realtime-gateway.integration-spec.ts`
    — 4 cases: subscribe→publish fan-out→increasing seq (real Redis), invalid
    token rejection + socket reuse, cross-workspace topic isolation, inbox
    user scoping. Runs via new `jest-integration-realtime.config.ts`.
  - Front: `useRealtimeTopic.test.tsx` (3 cases: subscribe message + event
    receipt, wrong-topic filtering, reconnect resubscribe),
    `useRealtimeOfflineQueue.test.tsx` (2 cases).

**Decisions & trade-offs:**
- **Isolated integration harness** (`jest-integration-realtime.config.ts`): the
  shared `jest-integration.config.ts` globalSetup boots the full AppModule and
  currently fails on the clean baseline with `Cannot access
  'WorkspaceQueryHookModule' before initialization` (TDZ in the
  workspace-query-runner import graph — reproduced with `git stash`, not caused
  by this change). The realtime spec therefore boots a minimal Nest app
  (gateway services + Redis + ws on an ephemeral port). Trade-off: JWT
  verification is exercised through a thin `JwtWrapperService` stand-in that
  does a real `jwt.verify` with the same algorithm; full signing-key rotation
  logic stays covered by the jwt module's own suite. Once the shared harness
  TDZ is fixed, this spec should be migrated to it.
- **Auth model**: cookie on upgrade (same-origin) AND access token re-sent in
  each subscribe message (cross-origin safe). Authorization is evaluated only
  at subscribe; per-socket seq is per topic starting at 1 after the ack(0).
- **Front ws CJS interop**: jest's jsdom environment resolves `ws` through its
  `browser` export condition (no `WebSocketServer`), so the mock harness is an
  in-memory fake rather than a real ws server; the real wire protocol is
  covered by the server integration spec.
- `isNonEmptyString` comes from `@sniptt/guards` in front code (not
  twenty-shared) — followed local convention.
- No DB/entity changes → no migration or upgrade command needed. No GraphQL
  schema change. twenty-shared touched (ApiPath) → rebuilt with
  `--skip-nx-cache`.

**Verification:**
- `npx jest src/engine/core-modules/realtime-gateway --config=jest.config.mjs` →
  16 passed.
- `NODE_ENV=test npx jest --config=jest-integration-realtime.config.ts` → 4 passed
  (real Redis fan-out, ephemeral port).
- `npx jest src/modules/realtime --config=jest.config.mjs` (front) → 5 passed.
- `twenty-shared` apiPathCollisions spec → 29 passed; front apiProxyPrefixes
  spec → 58 passed.
- In-package `npx tsgo -p tsconfig.json --noEmit`: twenty-server → only the
  documented P1.3 baseline error (`workspaceTemplate` TS2322 in
  `from-workspace-entity-to-flat.util.ts`); twenty-front → 0 errors in
  new/changed files.
- `npx nx lint:diff-with-main twenty-server` and `... twenty-front` → pass.
- `npx nx build twenty-shared --skip-nx-cache` → success.
**For the next agent:** next = P2.3 Presence (server Redis TTL presence keys on
the `workspace:<id>:presence` topic — the topic the gateway already carries —
then front AvatarStack/typing primitives; consume in side panel header).
Gotchas: (1) the shared integration globalSetup TDZ must be fixed separately —
until then write isolated-harness integration specs like this one; (2) front
`ws` cannot be imported in jsdom tests (browser export condition) — use
`RealtimeMockServerHarness` with `setWebSocketFactoryForTesting`; (3) when
publishing from worker jobs, inject `RealtimePublisherService` (exported from
`RealtimeGatewayModule`, which `CoreEngineModule` already mounts) — no new
provider registration needed; (4) metrics keys exist but counters are not yet
incremented — wire `incrementCounterBy` in gateway connect/disconnect handlers
if observability needs them before P2.5.
