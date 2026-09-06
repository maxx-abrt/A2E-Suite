# Phase 01 Report — Foundations & Module Activation

## 2026-09-06 14:35 UTC — Planning agent (architect/code)
**Task(s):** Phase setup (no P1.* task started yet)
**Status:** planning complete, implementation not started
**What I did:** Created the planning corpus this roadmap runs on:
`PLAN.md`, `PROMPT.md`, `docs/plan/01-codebase-map.md`,
`docs/plan/02-reference-analysis.md`, `docs/plan/03-integration-blueprint.md`,
and this report file. Next agents do not need to re-derive context.
**Decisions & trade-offs:**
- Port strategy: Texxel (local at `../Texxel`) + A2EMoney (cloned at
  `/tmp/A2EMoney` — re-clone shallow if missing) → Twenty-native apps +
  minimal server modules. Both schemas read in full and mapped in
  `docs/plan/02-reference-analysis.md`.
- A2EMoney full surface verified: books auto-journal (systemKey/locked/
  managed + provenance rows), budgets, org profile (encrypted IBAN/BIC),
  GDPR tables, **fiches with 8 official FR templates** (incl.
  budget_equilibre with PCG 60-65/70-76 lines, CERFA 12156 & 15059), and
  the **subventions open-data catalogue + AI matching with LLM cache** —
  all folded into P7 (P7.1–P7.1f).
- Realtime: new WebSocket gateway core module (`/realtime`, ws, Redis
  pub/sub fan-out) — none exists today (SSE only). Self-hosted constraints
  only (user confirmed: no Vercel).
- Accounting depth for small companies + non-profits (books, fiches, grant
  reports, VAT/TVA modes, quotes→invoices, recurring, dunning), fr + en.
- AI: one registry extending `tool`/`tool-provider`; assistant surface from
  existing ai-chat; every app ships AI tools; financial mutations always
  review-required.
**Verification:** investigation-only session; no code changed; no gates due.
**For the next agent:** start at PLAN.md → P1.1 first unticked task
(create `packages/twenty-apps/internal/a2e-documents` empty shell). Read
`packages/twenty-apps/README-A2E.md` task note and mirror
`packages/twenty-apps/internal/real-estate/src/application.config.ts`. Run
the kickoff protocol in PROMPT.md §1.

## 2026-09-06 15:00 UTC — Code agent (GLM-5.3-Flash)
**Task(s):** P1.1 — Create `packages/twenty-apps/internal/a2e-documents`
(empty app shell: config + default role)
**Status:** partial — files created; `yarn install` in the new package was
not run (user declined terminal install), so `twenty-sdk/define` imports
show unresolved-module TS errors until deps are installed. Everything else
done.
**What I did:**
- Created `packages/twenty-apps/internal/a2e-documents/` mirroring the
  `real-estate` reference app: `package.json` (same devDeps/engines/scripts,
  name `a2e-documents`, v0.1.0), `tsconfig.json`, `.gitignore`, `.nvmrc`,
  `.yarnrc.yml`, `.oxlintrc.json` (copied verbatim).
- `src/application.config.ts`: `defineApplication` with fixed UUID
  `19126a9c-7cc0-4368-aaba-c7e5a87b0c48`, displayName "A2E Documents".
- `src/roles/default-function.role.ts`: `defineApplicationRole` with UUID
  `1e0eda2a-8319-4211-93f7-e0e185ee35b1`, read/update/soft-delete-all grants,
  no hard-destroy (matches real-estate default-function role shape).
- Created empty `src/{objects,fields,views,page-layouts,navigation-menu-items,
  roles,logic-functions,command-menu-items}/` skeleton dirs (git ignores empty
  dirs; they materialize as P3 adds content).
- Ticked PLAN.md P1.1 first task.
**Decisions & trade-offs:**
- UUIDs freshly generated via `crypto.randomUUID()` this session (no
  collision with real-estate / twenty-partners checked).
- Kept `twenty-sdk`/`twenty-client-sdk` at `2.31.0` to match real-estate's
  known-good pin; upgrade both together later.
- Did NOT create `README-A2E.md` (that's the separate second P1.1 task).
- Pre-existing dirty tree (branding renames Twenty→A2E across ~30 files +
  untracked PLAN/PROMPT/docs) belongs to the planning session, not this
  task; left untouched, not reverted.
**Verification:** file structure compared side-by-side against
`packages/twenty-apps/internal/real-estate/` (read all template files first).
No gates runnable: package has no tests yet; `tsgo` typecheck blocked on
missing `node_modules` (after `yarn install`, expected clean — only two
files, mirroring real-estate's imports which typecheck today).
**For the next agent:** next task = P1.1 second item (`README-A2E.md`).
Before publishing/installing a2e-documents anywhere, run
`cd packages/twenty-apps/internal/a2e-documents && yarn install`, then
confirm `npx tsgo -p tsconfig.json --noEmit` passes. The two UUIDs in
`application.config.ts` / `default-function.role.ts` must never change once
the app is published to any workspace.

## 2026-09-06 15:45 UTC — Code agent (GLM-5.3-Flash)
**Task(s):** P1.1 items 2–3 (README-A2E.md; install/uninstall sync
verification) + P1.2 (module registry: server decision, Settings "A2E Suite"
section, nav visibility check) — PLAN.md lines 94–108
**Status:** done (see "partial" caveats under Verification)
**What I did:**
- `packages/twenty-apps/README-A2E.md`: authoring guide (skeleton layout,
  naming rules, UUID discipline, publish/install commands, anatomy minimums).
- Verified P1.1 install/uninstall sync by server-code audit (no running
  workspace available): `application-sync.service.ts`
  `uninstallApplication` deletes the app + all app-owned metadata via
  workspace migration (inferDeletion), `canBeUninstalled` guard,
  uninstall logic-function hook (`application-uninstall.service.ts`),
  post-install hook infra (`application-install.service.ts`). Findings
  recorded above; live scratch-workspace verification still recommended
  during P3 when a2e-documents has real objects.
- P1.2 server decision (with evidence): NO `workspaceModule` table. The
  per-workspace `application` row IS the enable/disable state — created on
  install (`application-install.service.ts installApplication`, per-workspace,
  version-guarded) and deleted on uninstall (`application-sync.service.ts
  uninstallApplication`); guards exist (`SettingsPermissionGuard(APPLICATIONS)`,
  `canBeUninstalled`, kill-switch). A second table would duplicate install
  state and drift. GraphQL surface already complete:
  `installApplication`/`uninstallApplication` mutations,
  `findManyApplications` query, `findManyMarketplaceApps(universalIdentifiers)`.
- Front module `twenty-front/src/modules/a2e-workspace/`:
  `constants/A2eSuiteApplicationUniversalIdentifiers.ts` (lists the apps'
  committed UUIDs — a2e-documents
  `19126a9c-7cc0-4368-aaba-c7e5a87b0c48`; extend as apps land),
  `hooks/useA2eSuiteApplications.ts` (installed = our UUIDs within
  `findManyApplications`; available = our UUIDs within marketplace catalog
  minus installed — marketplace card `id` IS the universal identifier, per
  `marketplace-catalog-cache-provider.service.ts`),
  `components/SettingsA2eSuiteSection.tsx` (H2Title + installed table +
  available cards; renders nothing when no A2E apps exist so stock Twenty is
  unchanged), `components/A2eSuiteApplicationCard.tsx` (install button via
  existing `useInstallMarketplaceApp`).
- Wired `SettingsA2eSuiteSection` into
  `pages/settings/applications/SettingsApplications.tsx` (hero + section +
  tabs).
- Nav visibility: verified no extension needed — nav items are DB rows owned
  by the app; uninstall deletes them with the metadata sync; no code change.
- Tests: `hooks/__tests__/useA2eSuiteApplications.test.tsx` (4 cases:
  none/split/available-only/no-data).
**Decisions & trade-offs:**
- Marketplace catalog vs workspace applications: `findManyApplications`
  returns only workspace installs, so "available but not installed" apps come
  from the catalog query filtered by our UUIDs. Catalog `MarketplaceApp.id`
  is the application universal identifier (server-side mapping), enabling
  `installApplication(universalIdentifier: id)` directly.
- Settings section lives in a new `a2e-workspace` front module (not inside
  `pages/settings/applications/`) so later P1.3 presets and P9 registry
  consumers can import the same constants/hooks; the page imports the
  section only.
- Screenshots placeholders: cards use the standard Avatar/logo fallback; no
  binary placeholder assets committed (they'd churn).
**Verification:**
- `npx jest .../a2e-workspace --config=packages/twenty-front/jest.config.mjs`
  → 4 passed.
- oxlint type-aware on `src/modules/a2e-workspace/` → 0 errors; oxfmt
  --check clean on all 5 files.
- In-package `npx tsgo -p tsconfig.json --noEmit` → 4304 errors, ALL
  pre-existing baseline (3819 = `twenty-ui/*` TS2307 across the whole repo,
  incl. untouched files; `twenty-ui` vite build itself fails with TS5042 in
  this checkout). Zero errors originate in files I touched. Baseline
  unrelated to this change; needs an environment fix (fresh yarn install /
  twenty-ui dist rebuild) tracked separately.
- `npx nx lint:diff-with-main twenty-front` → "No changed files" (diff vs
  committed main; my work is uncommitted) — hence direct oxlint run above.
- twenty-shared NOT touched (no rebuild needed despite building it once
  during diagnosis).
**For the next agent:** next = P1.3 first task (preset definitions). Add
future app UUIDs to
`packages/twenty-front/src/modules/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers.ts`
as each app is created. Do not trust `nx typecheck` for twenty-front until
the twenty-ui baseline is fixed; use in-package tsgo and diff against the
4304 baseline. Scratch-workspace install/uninstall e2e deferred to P3
acceptance (a2e-documents has no objects yet).
