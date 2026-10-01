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
