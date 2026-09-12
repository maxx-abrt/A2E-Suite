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
