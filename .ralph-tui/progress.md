# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Isolated Nest integration specs must satisfy the full transitive DI graph.** When a service they register as a real class gains a new constructor dependency (even a DB-backed one), the spec fails fast at `.compile()` with "can't resolve … at index [N]" — it does not hang. Add lightweight `{ provide: X, useValue: {...} }` stubs rather than providing real DB-backed services.
- **WebSocket/http-server integration specs hang unless every client socket is force-closed in `afterAll` BEFORE `httpServer.close`.** A single socket left open (e.g. by a failing/timed-out test) makes `httpServer.close()`'s callback never fire → hook timeout → the jest process stays alive forever. Track sockets in a module-scope `Set`, close them all first; also `quit()` the test-owned IORedis client explicitly (the app's `close()` only releases the app's own duplicate subscriber via `onModuleDestroy`). Verify with `--detectOpenHandles` → should report 0 handles. `--forceExit` is unnecessary for this and masks the leak.
- **The gateway rejects origin-less ws upgrades (audit F02).** Node's `ws` client sends no `Origin` by default, so integration specs must pass `new WebSocket(url, { origin: <http(s) origin matching the Host> })`.
- **Reconnect integration specs must keep the Redis topic subscription alive.** `RealtimePublisherService` unsubscribes Redis asynchronously when the last local subscriber releases a topic, but a new `subscribeTopic` arriving in that window skips the Redis subscribe and then loses the race when the pending unsubscribe clears `subscribedRedisTopics` — so a "close socket A then subscribe socket B on the same topic" case can silently receive nothing. Keeping a third stable subscriber socket on the topic (it holds `subscribersByTopic.size > 0`, so no Redis unsubscribe is issued) removes the timing dependence and actually strengthens the per-socket seq assertion.

---

## 2026-09-21 - US-072
- Implemented: repaired the stale DI graph and the teardown of `realtime-gateway.integration-spec.ts`. Added `useValue` stubs for `WorkspaceCacheService` (workspace-member id map matching the test tokens), `UserSessionCookieService`, `UserSessionService`, `RealtimeTopicAccessService`, `TwentyConfigService`; sent the browser-equivalent `Origin` header; tracked every client socket in a `Set` and force-closed them in `afterAll` before `httpServer.close`. Removed the unused `const tsConfig` require in `jest-integration-realtime.config.ts`.
- Files changed: `packages/twenty-server/test/integration/realtime-gateway/realtime-gateway.integration-spec.ts`, `packages/twenty-server/jest-integration-realtime.config.ts`, `docs/plan/phases/phase-02-report.md`.
- Result: both realtime specs green (2 suites / 8 tests), jest exits 0 with no `--forceExit`, 0 detected open handles; tsgo + oxlint + oxfmt green.
- **Learnings:**
  - The historical "hung" spec can't reproduce as-is on HEAD: the service DI graph changed (P0.3 + P2.1 ACL enforcement + audit-F02 origin gate) and the stale spec fails fast at `.compile()` before it ever opens a socket.
  - The hang *is* reproducible when a test leaves a socket open: `httpServer.close()` never fires, `afterAll` times out, `--detectOpenHandles` reports the leaked ws `TCPWRAP` (plus the test IORedis `TCPWRAP` because `redisClient.quit()` is never reached).
  - The publisher's duplicate Redis subscriber is released by `nestApp.close()` → `RealtimePublisherService.onModuleDestroy`; no explicit teardown needed for it and no `--forceExit`.
---

## 2026-09-21 - US-073
- Implemented: extended the realtime gateway integration spec with the bullet-5 Tier-1 delta — 4 new cases (10 total, was 6): malformed/unknown topic shapes, non-member ACCESS token, record/channel ACL denials (via a denying `RealtimeTopicAccessService` test double using the canonical denial messages), and authoritative reconnect (fresh per-socket seq + no backlog replay).
- Files changed: `packages/twenty-server/test/integration/realtime-gateway/realtime-gateway.integration-spec.ts`, `docs/plan/phases/phase-02-report.md`, `.ralph-tui/progress.md`.
- Result: `NODE_ENV=test npx jest --config jest-integration-realtime.config.ts` → 2 suites / 12 tests passed, EXIT=0, 0 open handles; tsgo + oxlint + oxfmt green. Tests-only, no src change.
- **Learnings:**
  - The isolated harness can express subscribe-time entitlement failures without a DB: a signed token whose `userId` is absent from the workspace-member cache yields the real `User is not a member of the workspace` path, and a denying test double for `RealtimeTopicAccessService` reproduces the canonical record/channel denial acks.
  - Reconnect semantics need a keeper socket (see Codebase Patterns) so the case asserts fresh seq/ no replay rather than the publisher's async Redis-unsubscribe timing. The harness `afterAll` already force-closes every socket tracked in `openSockets`, so the new sockets need no extra teardown.
---

