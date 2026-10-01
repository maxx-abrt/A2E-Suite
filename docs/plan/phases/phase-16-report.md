# Phase 16 report — M12 Product documentation (user-facing, from the real UI)

CLAIMED — US-108/M12a — deepseek-v4.1-flash — 2026-09-29T23:05:00Z — base f43b8a7555100b249e556dfbd1791763d383f130

## 2026-09-29 23:25 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-108 M12a: product documentation information architecture (user-guide/a2e-suite + docs.json nav) · **Slice:** the M12a bullet — 11 stub pages (fr+en) + A2E Suite nav group registered in docs.json
**Claim:** done-for-review
**Ready-to-tick:** yes — the docs gate (`node docs/scripts/check-docs.mjs`) and `lint-mdx` are green; no package source/spec/schema touched, so lint/tsgo/tests are N/A by design (US-048 precedent)
**Base:** f43b8a7555100b249e556dfbd1791763d383f130
**Changed:**
- new `packages/twenty-docs/user-guide/a2e-suite/{overview,getting-started,bureau,agenda,bilan,syna,archive,templates,working-across-apps,admin-and-self-host,faq-troubleshooting}.mdx` (11 en pages)
- new `packages/twenty-docs/l/fr/user-guide/a2e-suite/*.mdx` (11 fr pages)
- edit `packages/twenty-docs/navigation/base-structure.json` (new `a2eSuite` group, icon `rocket`, 11 slugs)
- edit `packages/twenty-docs/l/fr/navigation.json` (`a2eSuite` → "Suite A2E")
- generated `packages/twenty-docs/docs.json` (+34 lines: en "A2E Suite" + fr "Suite A2E" groups) and `packages/twenty-docs/navigation/navigation.template.json` (via `yarn docs:generate` / `docs:generate-navigation-template`)
- `docs/plan/phases/phase-16-report.md`, `.ralph-tui/progress.md`
**Checks:**
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 217 local inline links, balanced code fences` (exit 0)
- `cd packages/twenty-docs && npx tsx scripts/lint-mdx.ts` → `No angle bracket placeholders in 217 MDX files.` (exit 0)
- `npx prettier --check <the 22 new a2e-suite mdx>` → `All matched files use Prettier code style!`
- `yarn docs:generate && yarn docs:generate-navigation-template` → re-run leaves `docs.json` diff stable; `git diff` is only the two 17-line groups (regeneration is deterministic)
- `npx nx run twenty-docs:validate` → fails on **1 pre-existing warning** `l/ar/user-guide/getting-started/capabilities/implementation-services.mdx:10:18 - Could not parse expression with acorn` (file untouched, not in this change); no a2e-suite page produces an error. Path-based `prettier --check` also flags committed `docs.json`/`base-structure.json` at HEAD, so those are not regressions.
- lint / `tsgo` → **N/A, no `.ts`/`.tsx` touched** (docs-only; US-048 precedent)
- Screen labels verified by source grep: nav/view/command-menu/fiche labels all match `packages/twenty-apps/internal/a2e-*` + `twenty-front` source; labels that are not yet shipped (`Ask Syna`, `Connect a provider`, `Browse all`, gallery, Related) are explicitly listed under "Planned" and never claimed as existing.
**Missing for tick:** nothing for M12a. `twenty-docs:validate`'s sole failure is a pre-existing unrelated ar-locale warning; no Tier-2/browser check applies.
**Do not redo:** the 11 en + 11 fr stubs, the `a2eSuite` base-structure group, the fr label and the regenerated `docs.json`. M12b+ only fills these pages in.
**Remaining:** M12b–M12g (6 other [ ] bullets in the M12 milestone)
**Next:** orchestrator ticks M12a; executor may then start M12b (Getting started) once its cited screens are confirmed, or M12d's descriptor-driven catalogue script.

## 2026-10-01 — orchestrator verification (M12a: US-108)
- Verified at HEAD (no code changed): 11 en + 11 fr `user-guide/a2e-suite/*.mdx`,
  `a2eSuite` nav group, regenerated `docs.json`; report already stated "nothing
  missing for tick". PLAN M12a `[ ]`→`[x]`; M12 milestone row `partial`.
- Orchestrator pass also refreshed the stale standard-metadata snapshot (see
  phase-11 entry) and ran the cross-package checks listed there.

CLAIMED — US-159/M12b — deepseek-v4.1-flash — 2026-10-01T22:42:01Z — base a75536e7e8f6400d89259c571dcaa83dc44abd40

## 2026-10-01 22:5x UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-159 M12b: Getting started documentation — workspace creation, personas, sidebar tour, Cmd+K, Home/Today · **Slice:** fill the `getting-started` page (en + fr) with the real walkthrough + screenshot placeholders
**Claim:** done-for-review
**Ready-to-tick:** yes — docs gates green; the only `twenty-docs:validate` failure is the pre-existing unrelated `l/ar/.../implementation-services.mdx:10:18` warning already recorded under M12a; no code/schema/spec touched
**Base:** a75536e7e8f6400d89259c571dcaa83dc44abd40
**Changed:**
- `packages/twenty-docs/user-guide/a2e-suite/getting-started.mdx` (en, stub → full page)
- `packages/twenty-docs/l/fr/user-guide/a2e-suite/getting-started.mdx` (fr mirror)
- this report; `.ralph-tui/progress.md`
**Checks:**
- `cd packages/twenty-docs && npx prettier --check user-guide/a2e-suite/getting-started.mdx l/fr/user-guide/a2e-suite/getting-started.mdx` → `All matched files use Prettier code style!`
- `cd packages/twenty-docs && npx tsx scripts/lint-mdx.ts` → `No angle bracket placeholders in 217 MDX files.`
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 219 local inline links, balanced code fences`
- `npx nx run twenty-docs:lint` → `Successfully ran target lint` (16 pre-existing `scripts/` oxlint warnings, 0 errors)
- `npx nx run twenty-docs:validate` → fails on the single pre-existing ar-locale warning (`l/ar/...:10:18`), untouched; no warning from any a2e-suite page. `twenty-docs` has no `build` target (project.json exposes dev/validate/lint/fmt/test), so the documented check wins.
- Label grep-verify (`grep -rIlF` over twenty-front/twenty-apps/twenty-server, excluding node_modules/locales): every quoted UI label matched source — sign-in (`Continue with Email`), workspace form (`Name`/`Subdomain`/`Upload logo`/`Create workspace`), persona picker (`Install your first apps`, `Beta`, `Apply template`, `Navigation customization`, `Add sample content`, `Deferred content`, six preset labels + descriptions, Bureau bundle names, seeded French labels), sidebar (`Workspace`/`Favorites`, folders `Bureau`/`Bilan`/`Archive`, standard rows, `Move up`/`Move down`/`Remove from sidebar`/`Rename`/`Delete`, `Add menu item`/`New menu item`, `Collapse sidebar`/`Expand sidebar`), Cmd+K (`Command Menu`, `Type anything...`, `Pinned`/`Create…`/`Other`/`Fallback`, `No results found`, app commands), side panel (`Side panel`/`Full page` + descriptions, `Member preference`, `Close side panel`/`Open in full page`/`Open in tab`/`Back`), Home (`Today`, all nine card titles + deep links). The only non-matching term is the planned `Start from scratch` (0 source hits) — documented explicitly as not-yet-shipped (M13b).
**Missing for tick:** Tier-2 screenshots only — the E13 captures are represented by `{/* TODO: E13 screenshot … */}` placeholders (per M12b: screenshots stay Tier-2), no fabricated images.
**Do not redo:** both `getting-started.mdx` pages; the six-preset table derives from `A2eWorkspaceTemplates.ts` + `workspace-template-definitions.constant.ts`, the sidebar from `navigation-menu-item/**`, Cmd+K from `useCommandMenuHotKeys.ts`/`command-menu-item/**`, side-panel from `OpenRecordInPreferencePicker.tsx`, Today from `HomeDashboard.tsx`. Do not add a nav entry (already wired in M12a).
**Remaining:** M12c–M12g (5 other [ ] bullets in the M12 milestone)
**Next:** orchestrator ticks M12b; next executor can start M12c (one page per app) or M12d (descriptor-generated catalogue).

## 2026-10-02 UTC — deepseek-v4.1-flash [executor] — contract v4 (re-verification)
**Task:** US-159 M12b · **Slice:** fill the `getting-started` page (en + fr) — already `done-for-review`
**Claim:** done-for-review
**Ready-to-tick:** yes — no new changes; re-ran the docs gates on the existing uncommitted pages
**Base:** a75536e7e8f6400d89259c571dcaa83dc44abd40
**Changed:** none in code; this report + `.ralph-tui/progress.md` only
**Checks:**
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 219 local inline links, balanced code fences`
- `cd packages/twenty-docs && npx prettier --check user-guide/a2e-suite/getting-started.mdx l/fr/user-guide/a2e-suite/getting-started.mdx` → `All matched files use Prettier code style!`
- `cd packages/twenty-docs && npx tsx scripts/lint-mdx.ts` → `No angle bracket placeholders in 217 MDX files.`
- Spot label grep-verify (10 labels over twenty-front/server/apps): all match source except planned `Start from scratch` (0 hits, documented as M13b)
- Wiring: `docs.json` lines 381 (en) / 867 (fr); 5 `{/* TODO: E13 screenshot … */}` placeholders per page
**Missing for tick:** Tier-2 screenshots only (E13 captures), as before
**Do not redo:** both `getting-started.mdx` pages and their prior report entry; nav already wired
**Remaining:** M12c–M12g (5 other [ ] bullets in the M12 milestone)
**Next:** orchestrator ticks M12b; next executor starts M12c or M12d.

CLAIMED — US-160/template-catalogue-script — deepseek-v4.1-flash — 2026-10-01T22:57:00Z — base 479979e2e1a88351cac5ff4524f0ac056f0aded6

## 2026-10-01 23:05 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-160 M12d: templates catalogue page generated from the M9 descriptors by a script · **Slice:** the M12d bullet — generator script + regenerated en/fr catalogue pages
**Claim:** done-for-review
**Ready-to-tick:** yes — docs gates and the regeneration drift test are green; no i18n catalogs, no `locales/**`, no AI attribution; the only `mintlify validate` failure is the pre-existing unrelated `l/ar/...implementation-services.mdx:10:18` warning already recorded under M12a
**Base:** 479979e2e1a88351cac5ff4524f0ac056f0aded6
**Changed:**
- new `packages/twenty-docs/scripts/generate-template-catalogue.ts` (entry: collect → render → Prettier → write en+fr)
- new `packages/twenty-docs/scripts/template-catalogue/{collect-template-catalogue,render-template-catalogue}.ts` + `libphonenumber-js.shim.ts` + `tsconfig.json`
- new `packages/twenty-docs/scripts/__tests__/template-catalogue.spec.ts` (determinism + every-key-resolves + committed==regeneration)
- regenerated `packages/twenty-docs/user-guide/a2e-suite/templates.mdx` (en) and `packages/twenty-docs/l/fr/user-guide/a2e-suite/templates.mdx` (fr)
- edit `packages/twenty-docs/vitest.config.mts` (`@` → twenty-front modules alias for the host-descriptor import) and `package.json` (`docs:generate-template-catalogue`)
- this report; `.ralph-tui/progress.md`
**Checks:**
- `npx tsx --tsconfig packages/twenty-docs/scripts/template-catalogue/tsconfig.json packages/twenty-docs/scripts/generate-template-catalogue.ts` → writes both pages; re-run leaves the committed bytes identical (idempotent)
- `npx vitest run --config packages/twenty-docs/vitest.config.mts` → 2 files / 20 tests pass, including `committed catalogue pages match regeneration (en|fr)` (the CI-able drift assertion)
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 219 local inline links, balanced code fences`
- `cd packages/twenty-docs && npx tsx scripts/lint-mdx.ts` → `No angle bracket placeholders in 217 MDX files.`
- `cd packages/twenty-docs && npx oxlint -c .oxlintrc.json .` → `Found 19 warnings and 0 errors` (16 pre-existing + 3 script `console` lines, warnings only)
- `npx prettier --check` on all new/changed files + both generated pages → `All matched files use Prettier code style!`
- `npx nx run twenty-docs:validate` → fails only on the pre-existing `l/ar/...:10:18` acorn warning; no warning/error from either catalogue page
- Descriptor sources read live: `buildDocumentTemplateDescriptors` (20), `buildProjectTemplateDescriptors` (12), `buildFicheTemplateDescriptors` (10), `buildFolderStructureDescriptors` (4), `HOST_TEMPLATE_DESCRIPTOR_GROUPS` (Agenda 6 + Syna READY 7) = 59 rows; app names read from each `application.config.ts` `displayName` (no hand list)
**Missing for tick:** `twenty-docs` has no `build` target (`npx nx build twenty-docs` → "Cannot find configuration for task twenty-docs:build"), so the documented docs gate is `check-docs.mjs` + `lint-mdx` + the vitest drift check — same situation recorded for M12a/M12b. Tier-2 screenshots remain placeholders (`Pending (Tier-2)` cell) per PLAN.
**Do not redo:** the generator/renderer/spec, both generated `templates.mdx`, the vitest `@` alias, the root `docs:generate-template-catalogue` script. The deferred Syna recipe `syna-facture-depuis-temps` (DEFERRED, P7-gated) is intentionally absent because the catalogue mirrors the gallery's READY-only host group; do not add it as an available row.
**Remaining:** M12c, M12e, M12f, M12g (4 other [ ] bullets in the M12 milestone)
**Next:** orchestrator ticks M12d; next executor starts M12c (one page per app) or M12f (admin & self-host).

CLAIMED — US-161/M12f-admin-self-host — deepseek-v4.1-flash — 2026-10-01T23:06:54Z — base 054a6203bfadbf83abdcf21ee4207a70fc1afc94

## 2026-10-01 23:32 UTC — deepseek-v4.1-flash [executor] — contract v4 (resumed after stall)
**Task:** US-161 M12f: Admin & self-host documentation — provisioning, app lifecycle data policy, roles, BYOK, backups · **Slice:** the M12f bullet — both `admin-and-self-host.mdx` pages (en + fr)
**Claim:** done-for-review
**Ready-to-tick:** yes — docs gates green, pages complete and label-verified. `npx nx build twenty-docs` has no build target (package documents `dev`/`validate`/`lint`), same situation recorded for M12a/M12d; `validate` fails only on the pre-existing unrelated `l/ar/...implementation-services.mdx:10:18` warning.
**Base:** 054a6203bfadbf83abdcf21ee4207a70fc1afc94
**Changed:** `packages/twenty-docs/user-guide/a2e-suite/admin-and-self-host.mdx`, `packages/twenty-docs/l/fr/user-guide/a2e-suite/admin-and-self-host.mdx`; this report; `.ralph-tui/progress.md`
**Checks:**
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 219 local inline links, balanced code fences`
- `cd packages/twenty-docs && npx tsx scripts/lint-mdx.ts` → `No angle bracket placeholders in 217 MDX files.`
- `cd packages/twenty-docs && npx prettier --check user-guide/a2e-suite/admin-and-self-host.mdx l/fr/user-guide/a2e-suite/admin-and-self-host.mdx` → `All matched files use Prettier code style!`
- `npx nx build twenty-docs` → `Cannot find configuration for task twenty-docs:build` (no build target; documented gate is check-docs + lint-mdx + vitest, as recorded for M12a/M12d)
- `npx nx run twenty-docs:validate` → fails only on pre-existing `l/ar/user-guide/getting-started/capabilities/implementation-services.mdx:10:18`; no finding on either admin page
- GitHub links resolve: `curl -L -o /dev/null -w %{http_code}` → `200` for `DEPLOY.md` and `docs/applications.md`
- Label grep-verify vs source: `Part of A2E Suite` / `The all-in-one workspace modules built into this suite…` / `Not registered on this server` / `Incompatible server version` → `A2eSuiteApplicationCard.tsx`, `SettingsA2eSuiteSection.tsx`; `Uninstall Application?` / `Checking what will be deleted...` / `Will be deleted:` → `SettingsApplicationDetailAboutTab.tsx`; `Remove from sidebar` → `SidePanelEditOrganizeActions.tsx`; `Monthly token cap` / `Metered AI tokens used this calendar month…` / `No cap set` / `Add OpenAI-compatible provider` → `SettingsAi*`; `Connect a provider` → `SynaSlashMenuItem.tsx` / `SynaLanding.tsx`; `All roles` / `Create Role` / `Assign roles to specify access permissions` / `Delete Role Permanently` / `Confirm deletion of…` / applicability labels → `settings/roles/**`; `Manage Members` / `Invite by link` / `Invite by email` / `Approved Domains` → members tabs. Provisioning symbols `app:provision-bundled`, `install-pre-installed-apps`, `BUNDLED_APPS_DIR`, `DISABLE_BUNDLED_APP_PROVISIONING` → `database/commands/**`; `aiMonthlyTokenCap` → `workspace.entity.ts`; `canAccessFullAdminPanel` → user/admin-panel.
- No AI attribution in either page; `git status` shows no `locales/**`.
**Missing for tick:** Tier-2 E13 screenshots only (4 `{/* TODO: E13 screenshot … */}` placeholders per page); the `nx build twenty-docs` target does not exist, so the applicable docs gate is check-docs + lint-mdx (both green).
**Do not redo:** both `admin-and-self-host.mdx` pages — complete and grep-verified; `docs.json` (lines 389/875) and `navigation/base-structure.json` (line 385) already wire the en/fr pages from M12a.
**Remaining:** M12c, M12e, M12g (3 other [ ] bullets in the M12 milestone)
**Next:** orchestrator ticks M12f; next executor starts M12c (one page per app) or M12g (in-app help wiring).

CLAIMED — US-162/M12g-in-app-help-wiring — deepseek-v4.1-flash — 2026-10-02T02:01:00Z — base 16d37da2deac676df6c43c8300c430f0043f7b78

## 2026-10-02 02:45 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-162 M12g: in-app help wiring — FirstOpenHelpWidget, empty states and Cmd+K 'Help: <topic>' link to the matching doc pages · **Slice:** the M12g bullet — reusable 'Learn more' slot on the app empty states, FirstOpenHelpWidget Getting-started link + per-topic doc links, Cmd+K 'Help: <topic>' entries
**Claim:** done-for-review
**Ready-to-tick:** yes — typecheck/lint/tests/docs gates green; link targets verified to exist (en+fr) by reading the shipped docs nav
**Base:** 16d37da2deac676df6c43c8300c430f0043f7b78
**Changed:**
- new `packages/twenty-front/src/modules/a2e-help/constants/A2eHelpDocPages.ts` (single source of doc slugs, mirrors `twenty-docs` `a2eSuite` nav; `A2eHelpAppKey`, `A2eHelpDocPageKey`, `getA2eHelpDocUrl`)
- new `packages/twenty-front/src/modules/a2e-help/components/A2eLearnMoreLink.tsx` (the M12g 'Learn more' slot; `appKey` undefined → renders nothing)
- new tests `a2e-help/components/__tests__/A2eLearnMoreLink.test.tsx` + `a2e-help/constants/__tests__/A2eHelpDocPages.test.ts` (reads real `base-structure.json`)
- `first-open-help/constants/FirstOpenHelpTopics.ts` (each topic gains a real `docPageKey`)
- `first-open-help/types/FirstOpenHelpTopic.ts` (optional `docPageKey`)
- `first-open-help/components/FirstOpenHelpPanel.tsx` (Getting-started doc link + per-topic "Read the <app> guide" link, hidden without a key)
- `first-open-help/hooks/useHelpSearchResultItems.ts` (Cmd+K 'Help: <topic>' per shipped page via `i18n._`, deep-linked to published URLs)
- `first-open-help/components/__tests__/FirstOpenHelpPanel.test.tsx` (+2 doc-link tests), new `hooks/__tests__/useHelpSearchResultItems.test.tsx`
- `bureau/components/BureauLanding.tsx`, `calendar/components/AgendaLanding.tsx`, `drive/components/ArchiveLanding.tsx`, `ai/components/SynaLanding.tsx` (A2eLearnMoreLink in the app empty/home state; Syna connect-provider state too)
- `home-dashboard/components/PendingBilanWidget{,Content}.tsx` (Bilan link, install-gated on `isBilanInstalled`)
- `side-panel/pages/search/utils/groupSearchResultItems.ts` (+`externalUrl`), `side-panel/pages/search/components/SidePanelSearchRecordsPage.tsx` (`window.open` for external results)
- this report; `.ralph-tui/progress.md`
**Checks:**
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `npx jest src/modules/a2e-help src/modules/first-open-help src/modules/home-dashboard --config=packages/twenty-front/jest.config.mjs` → 31 suites / 113 tests pass
- `npx jest --findRelatedTests <6 changed landing/widget/search files> --config=packages/twenty-front/jest.config.mjs` → 40 suites / 242 tests pass
- `npx jest src/modules/side-panel/pages/search --config=...` → 5 suites / 14 tests pass
- `cd packages/twenty-front && npx oxlint --type-aware -c .oxlintrc.json <18 changed/new files>` → 0 warnings, 0 errors; `npx oxfmt --check <same>` → all formatted
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 219 local inline links, balanced code fences`
- `cd packages/twenty-docs && npx tsx scripts/lint-mdx.ts` → `No angle bracket placeholders in 217 MDX files.`
- Link targets exist: all 9 slugs present as `twenty-docs/user-guide/a2e-suite/*.mdx` **and** `l/fr/user-guide/a2e-suite/*.mdx` (checked individually); the doc-pages unit test asserts each slug is in the real `a2eSuite` nav group
- `npx nx build twenty-docs` → `Cannot find configuration for task twenty-docs:build` (no build target; documented gate is check-docs + lint-mdx, same as recorded for M12a/M12b/M12d/M12f)
- `npx nx lint:diff-with-main twenty-front` → "No changed files." (compares `main...HEAD`; uncommitted work invisible) — linted the working tree directly with oxlint/oxfmt instead
- no `locales/**` in `git status`; no AI attribution in any page/comment
**Missing for tick:** Tier-2 browser check only (widget/empty-state links render and open the docs tab; Cmd+K shows the Help group) — orchestrator runs it. `npx nx build twenty-docs` has no target, so the applicable docs gate is check-docs + lint-mdx (both green).
**Do not redo:** the `a2e-help` module (doc-slug source + `A2eLearnMoreLink`), the topic `docPageKey`s, the panel doc links, the Cmd+K Help entries + `externalUrl` plumbing, and the five app-surface link insertions. US-165/166 must reuse `A2eLearnMoreLink` (M13c slot) rather than adding another.
**Remaining:** M12c, M12e (2 other [ ] bullets in the M12 milestone)
**Next:** orchestrator ticks M12g; then M12c (one page per app) / M12e (cross-app recipes).
