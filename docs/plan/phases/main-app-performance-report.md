# Main app startup and sidebar responsiveness

## Source analysis — 2026-10-28

Scope: the requested main app startup and sidebar responsiveness slice. Public
landing changes already present in the working tree belong to separate work.

The workspace startup path is `DomainShell` → `WorkspaceAppProviders` →
`MinimalMetadataGate` → `DefaultLayout` → sidebar and routed page. User loading
precedes the minimal metadata request. Stale metadata collections load in
parallel, but `useLoadStaleMetadataEntities` applies their drafts after all
requested collections finish. The readiness gate requires objects, fields,
views and view fields. Previously the sidebar sections and requested page
started their lazy imports after that gate opened, adding another loading
stage. Browser/module caches make subsequent visits avoid those downloads;
this is a source-backed explanation consistent with the reported symptom,
not a measured production root cause.

The focused change overlaps the requested page and sidebar code downloads with
metadata loading. Route preload callbacks live on the existing route objects,
reuse `lazyWithPreload`, and select only the matching route (including the
special workflow route). Sidebar hover, keyboard focus and touch begin that
same preload without rendering the page or requesting its records. External
links and unmatched routes do not load a workspace page. Favorites and workspace
apps have independent Suspense boundaries. Syna history is loaded/mounted on
first opening and retained afterward; it previously mounted while hidden.
Hidden tab content also has an explicit accessibility state. The sidebar's
existing mouse-down navigation cancelled keyboard-only clicks; the item now
runs the same navigation handler for keyboard activation, preserving pointer
and modifier behavior.

The metadata/auth/permission gates and metadata consistency handling are
unchanged. There is no persistent record cache, server/schema change, catalog
regeneration, or dependency addition. No time-to-interactive percentage or
production latency improvement is claimed without browser measurements.

## 2026-10-28 16:52 UTC — Codex [executor]
**Task:** User-requested main app performance analysis · **Slice:** remove sidebar/page import waterfalls and unused hidden-tab work · **Claim:** done-for-review.
**Changed:** Workspace route preload callbacks/hook, metadata-gate preload effect, sidebar preload/independent section boundaries, deferred Syna history, sidebar navigation intent and keyboard activation; focused regression tests.
**Checks:** Final focused Jest run: 10 suites / 82 tests passed; final direct frontend `npx tsgo -p tsconfig.json --noEmit` passed; production `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=8192 npx vite build --outDir /tmp/a2e-workspace-performance-build` passed (8m 17s, existing dependency/plugin warnings); formatting passed on all 12 touched TypeScript files; documentation checker and scoped `git diff --check` passed. Final `npx oxlint --type-aware -c .oxlintrc.json` on all 12 touched TypeScript files passed with zero warnings/errors.
**Missing for tick:** Authenticated browser timing and device/network acceptance. No running stack was launched; executor verification remains Tier 0.
**Do not redo:** Keep route definitions shared between main app and side panel; preserve all existing data/permission gates and unrelated landing work.
**Next:** Measure cold/warm authenticated navigation under the orchestrator browser acceptance workflow, including Bureau, CRM, narrow screens, light/dark, and throttled network/CPU; attribute remaining waits to current-user, minimal metadata, stale collection requests and code execution before changing data coordination.

Verification environment: local checkout `e86579b3` plus this diff and unrelated
concurrent public-site edits; Node 24.20.0. Jest, tsgo, Vite, oxlint and oxfmt run
from `packages/twenty-front`; documentation/diff checks run from the root.
An overlapping repeat typecheck and lint were explicitly stopped to reduce
memory contention, then final checks were run again; stopped runs are not passes.
The built sidebar chunk was inspected and includes the final keyboard handler.
The production main entry remains approximately 4.15 MB raw / 1.24 MB gzip;
this slice changes loading order, not the total amount of application code.

Focused test command (all ten files, final run):

```sh
npx jest \
  src/modules/app/routing/hooks/__tests__/usePreloadWorkspaceRoute.test.tsx \
  src/modules/app/routing/utils/__tests__/createWorkspaceRouteObjects.test.tsx \
  src/modules/metadata-store/components/__tests__/MinimalMetadataGate.test.tsx \
  src/modules/navigation/components/__tests__/NavigationDrawerTabbedContent.test.tsx \
  src/modules/navigation/components/__tests__/MainNavigationDrawerScrollableItems.test.tsx \
  src/modules/navigation/components/__tests__/AppNavigationDrawer.test.tsx \
  src/modules/navigation/components/__tests__/MainNavigationDrawerModeSwitcher.test.tsx \
  src/modules/navigation/components/__tests__/FocusedAppNavigationDrawerContent.test.tsx \
  src/modules/ui/navigation/navigation-drawer/components/__tests__/NavigationDrawerItem.test.tsx \
  src/utils/__tests__/lazyWithPreload.test.tsx \
  --config=jest.config.mjs --runInBand --silent
```
