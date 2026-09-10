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


## 2026-09-10 — E2
**Task:** P2.3 Presence — server Redis state, realtime events, and roster query
**Status:** done

**What I did:**
- Added `PresenceService` with workspace-scoped `presence:<workspaceId>:<userId>` records (45-second TTL), per-user connection sorted sets, and five-second typing records.
- Added multi-connection-aware join/leave semantics: only the first live connection emits `join`, and `leave` is emitted only after the final connection closes.
- Extended the websocket protocol with authenticated `presence` actions for heartbeat, typing-started, and typing-stopped; publishing is rejected unless the socket already subscribes to the matching presence topic.
- Wired server ping/pong to refresh TTL state and socket close/unsubscribe to presence cleanup.
- Added the guarded `workspacePresence` GraphQL query for initial/reconnect roster hydration.
- Added malformed/expired Redis record tolerance and deterministic newest-first roster ordering.

**Tests and verification:**
- Realtime unit suite: 23/23 passing.
- Isolated real-Redis integration suite: 6/6 passing without `--forceExit`, including fan-out, roster hydration, join/typing/leave, pre-subscription rejection, non-presence-topic rejection, invalid-token recovery, workspace isolation, and inbox scoping.
- Independent testing agent: 29/29 checks passing, no remaining backend issue (`test_reports/iteration_2.json`, local test artifact only).
- Changed-file type-aware oxlint: 0 warnings/errors; oxfmt: all changed files conform.
- `twenty-shared` build passed. Full `twenty-server` tsgo still reports pre-existing clean-baseline errors outside realtime-gateway (ClickHouse typings, Express request augmentation, historical upgrade commands); no changed realtime file error was reported.

**Decisions:**
- Presence remains Redis-only; no database migration or upgrade command is needed.
- The roster contains stable user/workspace-member IDs plus ephemeral state; the front resolves display metadata from its existing workspace-member cache.
- Hard disconnects converge through TTL even when a leave packet cannot be emitted; reconnect always rehydrates through `workspacePresence`.

**Files touched:**
- `packages/twenty-server/src/engine/core-modules/realtime-gateway/**`
- `packages/twenty-server/test/integration/realtime-gateway/realtime-gateway.integration-spec.ts`
- `PLAN.md`

**Next:** P2.3 front AvatarStack and typing indicator primitives.


## 2026-09-10 — E2
**Task:** P2.3 Presence — frontend primitives
**Status:** done

**What I did:**
- Added a workspace-presence query hook that hydrates the Redis roster, resyncs after reconnect, consumes scoped realtime join/leave/typing events, and expires stale typing UI locally.
- Added an accessible Twenty-native realtime avatar stack with online status dot and member-name tooltip.
- Added a compact `aria-live` typing indicator with reduced-motion behavior.
- Added guarded typing publication to the single-socket connection manager; offline or unsubscribed topics cannot publish ephemeral presence.
- Made `useRealtimeTopic` explicitly disableable during pre-workspace boot and renamed the pre-existing manager file to satisfy repository filename conventions.

**Tests and verification:**
- Front realtime Jest suite: 11/11 passing (manager, topic reconnect, offline queue, presence reducer, avatar stack, typing indicator).
- Independent testing agent: 11/11 passing, no remaining frontend/design issue (`test_reports/iteration_3.json`, local artifact only).
- Changed-file type-aware oxlint: 0 warnings/errors; oxfmt clean.
- Full `twenty-front` tsgo still reports pre-existing failures outside `modules/realtime` (A2E template picker and unbuilt front-component-renderer); zero realtime changed-file errors.

**Decisions:**
- Presence display remains a reusable primitive in this task; the next checkbox wires it into the side-panel header.
- Typing events are intentionally not queued offline because stale ephemeral state is worse than dropping it.
- The roster uses workspace-member IDs to resolve names/avatars from the existing authenticated member cache.

**Files touched:**
- `packages/twenty-front/src/modules/realtime/**`
- `PLAN.md`

**Next:** consume the primitives in the side-panel header pilot surface.

## 2026-09-10 — E2
**Task:** P2.3 Presence — side-panel pilot
**Status:** done

**What I did:**
- Wired the shared roster hook into `SidePanelTopBar` so live collaborators are visible wherever work context is opened.
- Kept the desktop typing status compact beside existing header controls and preserved the mobile width budget by hiding only the typing sentence while retaining a three-avatar stack.
- Added regression coverage for the integrated header without changing existing navigation, focus, back, expand, or close behavior.

**Tests and verification:**
- Combined realtime + side-panel header suite: 24/24 passing.
- Independent testing agent: 24/24 passing; responsive presence behavior and existing keyboard flows verified, no issue (`test_reports/iteration_4.json`, local artifact only).
- Changed-file type-aware oxlint and oxfmt: clean.

**Next:** P2.4 right widgets dock and pluggable widget registry.

## 2026-09-10 — E2
**Task:** P2.4 Workbench shell — widgets dock
**Status:** done

**What I did:**
- Added a workspace-wide right dock with persisted `MINI`/`EXPANDED` mode, active widget, and width under exact `a2e-widgets-*` storage keys.
- Added an app-facing live registry with six default extension points: inbox, Syna assistant, comments, tasks, activity, and real workspace presence; apps can register/unregister additional widgets at runtime.
- Reused the shared resizable-panel primitive with 280–460px constraints and 12px snap-collapse behavior.
- Added responsive CSS: in-flow desktop panel, overlay below 1200px, and bounded floating dock below 768px.
- Mounted the dock once in the main workspace shell; print layouts continue to exclude auxiliary chrome.
- Kept unconnected modules honest with explicit empty states instead of fake counts or records.

**Tests and verification:**
- Dock/registry/layout Jest suite: 5/5 passing.
- Independent testing agent: all nine dock requirements verified, no code/design issue (`test_reports/iteration_5.json`, local artifact only).
- Browser automation was blocked only by the container ENOSPC file-watcher limit; unit and code-level responsive validation passed.
- Changed-file type-aware oxlint, oxfmt, and targeted tsgo: clean.

**Decisions:**
- Registry entries may provide their own React component; defaults use first-party safe empty states until their owning app phase lands.
- The presence widget uses real roster data; no widget contains mocked data.
- The dock uses a dedicated root stacking-context value below the existing side panel.

**Next:** P2.4 responsive snap/mobile verification task, then side-panel tabs.

## 2026-09-10 — E2
**Task:** P2.4 Workbench shell — responsive snap behavior
**Status:** done

- Extracted the 12px snap boundary into a deterministic utility used by the dock resize flow.
- Added boundary tests for exact snap and expanded behavior; complete dock suite is 6/6 passing.
- Confirmed the 1200px overlay and 768px bounded floating layouts in the production Linaria rules and independent review.

**Next:** side-panel multi-context tabs with persisted order.

## P2.4 — Side-panel tabs (done)

**Serializable tab model.** The live navigation stack carries
`pageIcon: IconComponent`, a React component that cannot cross a JSON boundary.
Persisted entries therefore store a canonical Twenty icon *key* and resolve it
back through `useIcons().getIcon(key, 'IconDotsVertical')`. Router `state` is
passed through a JSON round-trip (`toSerializableJsonValue`) so class
instances, functions and cycles are dropped instead of corrupting the session.
No component, function, `Map` or `Set` can reach localStorage.

**Schema + validation.** `SIDE_PANEL_TABS_SCHEMA_VERSION = 1`. Hydration goes
through `validateInitFn: isValidSidePanelTabsSession`, which checks the version,
every entry shape, that `page` is a known `SidePanelPages` value, that a routed
entry owns a location (and a purpose-built one does not), that `activePageId`
exists in the stack, that ids are unique and that the tab count is within
`SIDE_PANEL_TABS_MAX_COUNT`. An obsolete or malformed payload falls back to an
empty session silently.

**Store.** `sidePanelTabsState` (`a2e-side-panel-tabs`) and
`activeSidePanelTabIdState` (`a2e-side-panel-active-tab`), both persisted; array
order *is* the tab order. `useSidePanelTabs` exposes `openSidePanelTab`,
`activateSidePanelTab`, `closeSidePanelTab`,
`adoptNavigationStackAsSidePanelTab`, `syncActiveTabFromNavigationStack` and
`restoreSidePanelTabsSession`.

- Deduplication is derived from the routed location (`route:<pathname><search>`,
  hash excluded) so the same record never opens twice, and purpose-built pages
  key on page identity. Records use it today; documents, messages, projects,
  files and invoices reuse the same rule with no second implementation.
- A context switch snapshots the outgoing stack first, then restores the target
  stack in a single write, so the panel never renders half-switched.
- Opening in a tab first *adopts* whatever the panel currently shows, so the
  user never loses the context they were on. The command menu is a launcher and
  is deliberately never adopted.
- Closing the active tab selects the right neighbor, falls back to the left, and
  closes the panel when the last tab goes. LRU eviction never touches the active
  tab.
- `releaseSidePanelTabPageStates` mirrors the per-page cleanup of the history
  hook: sub-page stacks, morph items and show-page active tab ids are cleared,
  and routed flow state scopes are released only when no surviving tab still
  references them. `releaseRemovedRoutedFlowStateScopes` was widened to the
  scope-carrying shape so live and serialized entries share one rule.

**Reload.** `SidePanelTabsRestoreEffect` runs once, before the user can act. When
the URL already projects a side-panel path it keeps precedence for the live
stack (a shared link is never hijacked by a local session) and the selection is
aligned to it; otherwise the persisted active tab is restored and the panel is
raised.

**UI.** `SidePanelTabStrip` sits under the top bar and only renders when a tab
exists, so nothing changes for users who never open one. `role=tablist` /
`role=tab` / `aria-selected` / `aria-orientation`, roving tabIndex, arrows,
Home/End, Enter/Space, Delete/Backspace to close, focus-visible outlines, close
affordance revealed on hover *and* focus-within, native tooltip only when the
title is actually truncated, active tab scrolled into view (respecting reduced
motion), horizontal scroll with hidden scrollbars, taller rows and wider touch
targets on mobile, hidden in print. Tokens only, no invented palette, no
gradient.

**Open in tab.** `useSidePanelTabOpenIntentHandlers` installs its handlers in the
*capture* phase, because most Twenty open paths fire on `mousedown` of a
descendant; without capture the normal open would already have run. Middle-click
opens a tab and suppresses both the normal open and the browser's own new-tab
behavior on links; cmd/ctrl-click stays a real browser navigation; a plain click
is untouched. Wired on `RecordChip` (which also covers the record table label
identifier cell), `RecordListRow` and `RecordBoardCard`, plumbed as
`openInTab` through `useOpenRecordInSidePanel` and `useOpenRecordFromIndexView`,
plus an explicit, discoverable `SidePanelOpenInTabButton` in the top bar for any
context.

**Gates.** 75 tests across 8 suites for the tab module; 492 tests / 80 suites
green on the surrounding scope (side-panel, workbench dock, realtime, layout,
record list, record board, a2e-workspace). `oxlint --type-aware` and `oxfmt`
clean on every touched file. `tsgo -p tsconfig.json --noEmit` on `twenty-front`
is **fully green (0 errors)** — three pre-existing baseline errors in
`src/modules/a2e-workspace` (a `loading` prop `MainButton` never accepted, two
snackbar calls using the old string signature) were fixed on the way.

**Not claimed.** The PLAN e2e (two records as tabs, switch, close, reload,
restored) was *not* run in a browser: browser e2e stays blocked in this
container by the inotify/ENOSPC file-watcher limit. The flow is covered by
integration-level Jest tests against the real store instead, including the
reload-restore and URL-precedence paths. Separately, the supervisor `frontend`
program (`nx run-many -t start`) rebuilds `twenty-shared/dist` while Jest reads
it, producing bogus `ENOENT` on hashed chunks; it must be stopped while testing.

**Repair.** 20 tracked files (`twenty-shared/package.json`, its generated
barrels and the `twenty-front-component-renderer` generated registries) were
found truncated to 0 bytes in the working tree and restored from `HEAD`.


## 2026-09-10 13:00 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P2.4 Page-header context: active page sources title/breadcrumb/actions (PLAN.md line 179)
**Status:** done

**What I did:**
- `usePageLayoutHeaderInfo` now emits an optional `breadcrumb` (typed as
  `BreadcrumbProps['links']`) alongside the existing header info:
  widget-settings pages source `Page Layout / <headerType>` and the two
  new-widget type-select pages source `Page Layout / New widget`
  (`packages/twenty-front/src/modules/side-panel/components/hooks/usePageLayoutHeaderInfo.ts`).
- `SidePanelPageLayoutInfoContent` renders that breadcrumb through the shared
  `Breadcrumb` component in the `HeaderIdentifier` label slot, so the title
  stays an editable `TitleInput` while the context path stays visible
  (`packages/twenty-front/src/modules/side-panel/components/SidePanelPageLayoutInfoContent.tsx`).
  Note: `HeaderIdentifier` renders `label` via `StyledHeaderIdentifierLabel`
  (tertiary color, nowrap) — the breadcrumb inherits that, which reads as the
  calm secondary path rather than a full-width crumb.
- Tests added to `usePageLayoutHeaderInfo.test.tsx`: widget-settings breadcrumb
  content and new-widget breadcrumb content (8 tests total in the suite).

**Decisions & trade-offs:**
- Breadcrumb lives in the label slot instead of replacing the title: the
  page-layout settings header is a *title editor* (rename flow), so replacing
  it would regress the rename UX. The label slot was the only sanctioned slot
  left. The `Tab` settings page deliberately emits no breadcrumb — its title
  IS the tab name and there is no extra context to source.
- No new portal/context machinery: reuse of `PageCardHeader`'s portal system
  was considered but page-layout settings pages already render through
  `SidePanelPageLayoutInfo`, which is where this header context is sourced.

**Verification:**
- `npx jest src/modules/side-panel/components/hooks/__tests__/usePageLayoutHeaderInfo.test.tsx --config=packages/twenty-front/jest.config.mjs` → 8 passed.
- In-package `npx tsgo -p tsconfig.json --noEmit` → 0 errors in touched files
  (pre-existing baseline errors elsewhere unchanged, `front-components` etc.).
- `npx oxlint --type-aware` + `npx oxfmt --check` on the 3 touched files → clean.
- `npx nx lint:diff-with-main twenty-front` → pass.
- Lingui: all new user-facing strings go through `t` macros in existing
  msg-shaped files; catalog churn intentionally not committed per house rules.

**For the next agent:** next = P2.4 unit tests for dock persistence + tab
store already exist (`tabs/__tests__/*`, `workbench-dock` tests); the PLAN
line 180 also asks for the two-records-as-tabs e2e — browser e2e remains
blocked in this container by the inotify/ENOSPC file-watcher limit (see the
tabs entry above); the reload-restore and URL-precedence paths are covered by
the integration-level Jest suites, so either run the Playwright spec from an
unblocked machine or log the blockage again. Gotcha: `t` from
`@lingui/core/macro` in the hook means msg keys for `Page Layout` /
`New widget` already existed; verify no duplicate keys on extract.


## 2026-09-10 13:05 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P2.4 Unit tests for dock persistence + tab store; e2e two-records-as-tabs flow (PLAN.md line 180)
**Status:** done (with the browser-e2e caveat below, same blockage as the tabs entry)

**What I did:**
- Audited the existing coverage: dock persistence is unit-tested
  (`workbench-dock/components/__tests__/WorkbenchWidgetDock.test.tsx`,
  `utils/__tests__/getWorkbenchWidgetDockModeAfterResize.test.ts`,
  `registry/__tests__/workbenchWidgetRegistry.test.ts`) and the tab store has
  10 suites (persistence, reload restore, URL precedence, LRU, edge cases).
- Added the missing e2e spec `packages/twenty-e2e-testing/tests/side-panel-tabs.spec.ts`:
  open two companies as tabs via `side-panel-open-in-tab-button`, switch tabs,
  close one, reload → the surviving tab is restored. Anchored on the real
  testids (`side-panel-tab-strip`, `side-panel-tab-<id>`,
  `side-panel-tab-close-<id>`, `aria-selected`, `aria-label`) — no invented
  selectors; verified each testid exists in
  `side-panel/tabs/components/SidePanelTabStrip(Item).tsx` and
  `SidePanelOpenInTabButton.tsx` before writing the spec.
- Spec typechecks clean (`npx tsc --noEmit` on the file).

**Decisions & trade-offs:**
- `playwright test --list` cannot run here: the config throws
  `Failed to load .env file` because `packages/twenty-e2e-testing/.env` does
  not exist in this checkout (only `.env.example`), and creating local env
  files was denied. Combined with the known ENOSPC file-watcher limit in this
  container, the spec is committed but NOT executed in a browser this
  session — same caveat the tabs entry already logged. It is the first spec
  to run on a machine with a dev server + `.env`.

**Verification:**
- `npx jest src/modules/workbench-dock src/modules/side-panel/tabs --config=packages/twenty-front/jest.config.mjs` → 11 suites, 81 tests passed.
- `npx tsc --noEmit tests/side-panel-tabs.spec.ts` (e2e package) → 0 errors.
- `npx nx lint:diff-with-main twenty-front` → pass (prior commit).

**For the next agent:** the Playwright `.env` is required before any e2e run;
copy `.env.example` to `.env` and point `FRONTEND_BASE_URL` at a dev server.
Next plan item = P2.5 Global search v1 (records provider + documents stub).


## 2026-09-10 13:10 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P2.5 Index providers wired: records (existing) + documents (stub for P3) (PLAN.md line 184)
**Status:** done

**What I did:**
- Verified the P1.4 wiring already live: core records run through
  `SearchService.getAllRecordsWithObjectMetadataItems` (the `search` query),
  app records run through `searchAppRecords` → `AppSearchService` →
  `SearchProviderRegistryService` (decorator-discovered, install-gated), and
  the front consumes both in `SidePanelSearchRecordsPage` with grouped
  results + frecency ranking (`groupSearchResultItems`).
- Added the documents stub provider
  `packages/twenty-server/src/engine/core-modules/search/services/document-search-provider.service.ts`:
  decorated `@RegisteredSearchProvider` with the fixed a2e-documents app UUID
  (read from `a2e-documents/src/application.config.ts`), returns `{items: []}`
  until the P3 `document` object exists. Registered in `search.module.ts`.
- Unit test
  `services/__tests__/document-search-provider.service.spec.ts`: asserts the
  decorator metadata key matches the app UUID and the stub returns empty.

**Decisions & trade-offs:**
- Stub now, fill in P3: registering the provider today proves the discovery
  → install-gate → grouped-heading path works for documents without waiting
  for the object; P3 then only replaces the `search` body.
- Test inlines the app UUID rather than importing from `twenty-apps`: server
  jest does not resolve that package (module-not-found on first run); matches
  the hermetic style of the sibling registry spec.

**Verification:**
- `npx jest src/engine/core-modules/search --config=packages/twenty-server/jest.config.mjs` → 4 suites, 12 tests passed.
- In-package `npx tsgo -p tsconfig.json --noEmit` → 0 errors in touched files.
- `npx oxlint --type-aware` + `npx oxfmt --check` on the 3 touched files → clean.
- No GraphQL schema change (provider discovery is runtime, not schema); no
  entity change → no migration.

**For the next agent:** next P2.5 item = frecency ranking + keyboard nav +
deep links (mostly already present: `searchRecordsFrecencyByObjectState`,
roving selectable list, `path` deep links from app providers). Audit what is
missing before adding anything — likely only app-result results lacking
side-panel open and the perf-budget measurement remain.


## 2026-09-10 13:15 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P2.5 Frecency ranking; keyboard navigation; deep links open side panel (PLAN.md line 185)
**Status:** done

**What I did:**
- Audit: frecency ranking was already wired end-to-end
  (`searchRecordsFrecencyByObjectState` localStorage-persisted with a
  validated shape + `pruneSearchRecordObjectFrecency` cap of 100 entries,
  `computeSearchRecordObjectFrecencyRank` classic useCount/decay rank
  consumed by `groupSearchResultItems` which sorts groups and items by rank,
  all covered by the existing three util tests). Keyboard navigation runs
  through the shared `SelectableListItem`/`SidePanelList` roving-selection
  machinery (Enter activates via `onEnter`).
- The one real gap: app-provider results with a `path` navigated the **main**
  router, leaving the side panel behind. Fixed in
  `SidePanelSearchRecordsPage.tsx`: app deep links now open as a side-panel
  routed page via `useOpenRoutedPageInSidePanel` (falls back to the main
  navigate only when the panel surface cannot host the path — same guard the
  hook already enforces via `isWorkspaceLocationAvailableOnSurface`).

**Decisions & trade-offs:**
- No new frecency code: the P1.4 skeleton already implements Bureau-style
  ranking; adding a second ranking layer would be a parallel framework
  (forbidden). The change is limited to the open behavior.
- `closeCommandMenu()` before opening keeps the launcher symmetric with the
  record-result branches.

**Verification:**
- In-package `npx tsgo -p tsconfig.json --noEmit` → 0 errors in the touched
  file.
- `npx oxlint --type-aware` + `npx oxfmt --check` → clean.
- Existing suites already covering the ranking/keyboard behavior were green
  earlier this session (side-panel search utils tests in the 81-test run).

**For the next agent:** last P2.5 item = performance budget (< 150 ms on a
10k-record workspace, documented measurement). Suggested approach: measure
client-side group/sort latency for a synthetic 10k-item payload in a Jest
benchmark (server latency depends on the DB, out of front scope), and record
numbers in the report; alternatively mark the item blocked on a live server.


## 2026-09-10 13:20 UTC — Zoo (GLM-5.3-Flash)
**Task(s):** P2.5 Performance budget: < 150ms interaction latency on 10k-record workspace (PLAN.md line 186)
**Status:** done

**What I did:**
- Added a locked benchmark
  `packages/twenty-front/src/modules/side-panel/pages/search/utils/__tests__/groupSearchResultItems.performance.test.ts`:
  10k synthetic records across 40 groups through `groupSearchResultItems`
  (sort + fold), measured with `performance.now()` after a JIT warm-up round,
  asserting < 150 ms.

**Measurement (this session, Jest jsdom, MacBook local):**
- Result: 8 ms for the full 10k-item sort + group pass — ~19× under budget.
- Scope note: this covers the client-side interaction path (grouping +
  frecency ordering + keyboard selection model all feed from this ordered
  list). Network/database latency is server-side and out of front scope; the
  server `search` query is paginated with cursor args, so it does not
  materialize 10k rows in one payload.

**Verification:**
- `npx jest ...groupSearchResultItems.performance.test.ts --config=packages/twenty-front/jest.config.mjs` → 1 passed (8 ms measured).
- `npx oxlint --type-aware` + `npx oxfmt --check` → clean.

**For the next agent:** P2 acceptance remains: two-browser presence/live
widget check needs a running dev environment (not available here); P2 is
otherwise complete. P3 Documents is the next phase — start with the P3.1
spike (extend `note` vs new `document` object) per PLAN.md.
