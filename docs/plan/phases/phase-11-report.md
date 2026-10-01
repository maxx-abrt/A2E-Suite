# Phase 11 Report — Suite identity & navigation (M7)

## 2026-09-27 21:15 UTC — claude-opus [maintainer]
**Task:** M7a Rename display surfaces · **Slice:** app-side names · **Claim:**
done-for-review
**Changed:** `a2e-{documents,projects,chat,drive,crm}/src/application.config.ts`
(displayName + description), all `command-menu-items/*.ts` labels
(`A2E X : …` → `Bureau : …`), `a2e-projects` nav `Projets`, `a2e-drive` nav
`Archive`, post-install welcome doc + descriptions, deal-won recipe copy,
`package.json` patch bumps (documents 0.2.1, projects 0.1.11,
chat/drive/crm 0.1.1); `twenty-front/src/modules/onboarding/constants/OnboardingInstallableApps.ts`
labels.
**Checks:** per app `yarn typecheck && yarn lint && yarn test:unit` → 5/5
green (200+283+60+75+22 pass); `npx jest packages/twenty-front/src/modules/{a2e-workspace,onboarding} packages/twenty-front/src/pages/onboarding`
→ 41 suites / 239 tests pass.
**Missing for tick:** host Agenda/Syna/Archive strings (PLAN M7a remaining
list); Tier-2 re-publish + Settings → Applications + sidebar proof.
**Do not redo:** universal IDs, package names, function-role labels (internal,
asserted by `project-object-integrity.test.ts`) intentionally unchanged.
**Next:** M7a-2 host strings per PLAN M7a note.

CLAIMED — US-100/M7a-2 — deepseek-v4.1-flash — 2026-09-29 18:50 UTC — base 0f25aceda30dc6dc18d186c62d77e09d2522f340

## 2026-09-29 19:20 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-100 M7a-2: host strings → Agenda / Syna / Archive · **Slice:** all four host bullets + docs
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0 all green; only the Tier-2 re-publish/Settings proof is absent
**Base:** 0f25aceda30dc6dc18d186c62d77e09d2522f340
**Changed:** front: `home-dashboard/{components/HomeDashboard.tsx,components/__tests__/HomeDashboard.test.tsx}` (`Open the calendar`→`Open Agenda`), `calendar/components/CalendarToolbar.tsx` (`Calendar view`→`Agenda view`), `utils/title-utils.ts`+test (`/calendar` page title → `Agenda`), `ai/components/AiChatPageHeader.tsx`, `side-panel/components/SidePanelAskAiInfo.tsx`, `side-panel/hooks/useOpenAskAiPageInSidePanel.ts`+test, `command-menu-item/engine-command/constants/EngineComponentKeyHeadlessComponentMap.tsx`, `navigation/hooks/useNavigationDrawerModes.ts`, `pages/settings/ai/SettingsAI.tsx`, `settings/hooks/useSettingsNavigationItems.tsx` + 6 settings breadcrumb files (`Settings{Tool,Skill,Agent,AgentTurn}*`, `SettingsAiPrompts.tsx`, `logic-functions/SettingsLogicFunctionDetail.tsx`) → `Syna`; `drive/constants.ts` (`DRIVE_FOLDER_ROOT_LABEL`), `drive/components/DriveToolbar.tsx` (source-app option), `pages/drive/DrivePage.tsx` (`Could not load Archive`), `drive/utils/mapDriveSearchRecordsToResultItems.ts`+test, `drive/components/__tests__/DriveBreadcrumb.test.tsx` → `Archive`; new `a2e-workspace/constants/A2eSuiteApplicationGroupHeadings.ts`+test + `side-panel/pages/search/hooks/useAppSearchResultItems.ts` (a2e-projects group heading resolves `Bureau`); server comments in the two search providers. Docs: `docs/applications.md`, `docs/product-experience.md`, `packages/twenty-apps/README-A2E.md`, 5 app READMEs.
**Checks:** `npx tsgo -p tsconfig.json --noEmit` (twenty-front) → exit 0; `npx oxlint --type-aware -c .oxlintrc.json` on all 23 front + 2 server touched files → 0 warnings/0 errors; `npx oxfmt --check` on all 30 touched ts/tsx → clean; `npx jest <6 touched specs>` → 6/6 suites, 18/18 tests; `npx jest --findRelatedTests <10 changed sources>` → 11/11 suites, 82/82 tests; `npx jest --findRelatedTests <6 settings breadcrumb files>` → 2/2 suites, 41/41 tests; `node docs/scripts/check-docs.mjs` → PASS (26 docs, 214 links).
**Missing for tick:** Tier 2 (orchestrator): re-publish the 5 bumped apps and see `Bureau Projets` / `Archive` / `Syna CRM` in Settings → Applications + sidebar, and the a2e-projects Cmd+K group reading `Bureau`. No host Cmd+K *calendar* entry exists in the codebase to rename (the M7a note's "Cmd+K" is not implemented).
**Do not redo:** generic `AI` kept on purpose in roles/permission flags, workflow action type/header, usage/audit labels, admin-panel tab and object-level permission rows; universal IDs, package names, object API names and `locales/**` untouched.
**Remaining:** M7b (internal-route nav), M7c (grouped folders), M7d (host Agenda nav), M7e, M7f.
**Next:** orchestrator tick M7a-2; no executor work left in this slice.

CLAIMED — US-101/M7b — deepseek-v4.1-flash — 2026-09-29 19:11 UTC — base 21fc6ec432adceff457aca64671d99b8c8e5ef09

## 2026-09-29 21:40 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-101 M7b: internal-route nav items — server allow-list validation + front pass-through (resolves D09) · **Slice:** host allow-list mechanism (shared + server + front), SDK typing/validation, app nav repoint
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0 green in all four packages + both apps; only the Tier-2 browser/publish leg is absent
**Base:** 21fc6ec432adceff457aca64671d99b8c8e5ef09
**Changed:** shared: new `utils/navigation/{internalNavigationMenuItemRoutePaths,isInternalNavigationMenuItemRoute,isAllowedNavigationMenuItemLink}.ts` + 2 specs, regenerated barrel `utils/index.ts`; server: `flat-navigation-menu-item/validators/utils/validate-navigation-menu-item-type-required-properties.util.ts` (+spec), `navigation-menu-item/tools/{create,update}-navigation-menu-item.tool.ts`, new `tools/schemas/navigation-menu-item-link.schema.ts`; front: `navigation-menu-item/display/link/utils/getLinkNavigationMenuItemComputedLink.ts` (+new spec), `.../link/components/NavigationMenuItemLinkDisplay.tsx`; sdk: `sdk/define/navigation-menu-items/define-navigation-menu-item.ts` (+new spec), `sdk/define/index.ts`; apps: `a2e-chat/src/navigation-menu-items/channels.navigation-menu-item.ts` (VIEW→LINK `/discussions`), `a2e-drive/src/navigation-menu-items/drive.navigation-menu-item.ts` (VIEW→LINK `/drive`), both READMEs.
**Checks:** shared `npx jest src/utils/navigation --config=packages/twenty-shared/jest.config.mjs` → 4 suites/59 pass; `npx nx build twenty-shared --skip-nx-cache` → success; `tsgo` clean. server validator spec `npx jest <spec> --config=jest.config.mjs` → 1 suite/25 pass; `npx tsgo -p tsconfig.json --noEmit` → clean. front `npx jest src/modules/navigation-menu-item/display/link --config=jest.config.mjs` → 2 suites/13 pass; `npx tsgo` → clean. sdk `npx vitest run src/sdk/define/navigation-menu-items/__tests__/define-navigation-menu-item.spec.ts --config=vitest.unit.config.ts` → 1 file/9 pass; `npx tsgo` → clean. oxlint `--type-aware -c .oxlintrc.json` + `oxfmt --check` → 0/0 and clean on every touched file (fixed 4 formatting nits). apps: a2e-chat `yarn typecheck && yarn lint && yarn test:unit` → clean, 60 pass; a2e-drive `yarn typecheck && yarn lint` → clean; both `npx twenty dev:build .` → success with manifest `{type: LINK, link: '/discussions'|'/drive'}`. `node docs/scripts/check-docs.mjs` → PASS.
**Missing for tick:** Tier 2 (orchestrator): publish/reinstall a2e-chat + a2e-drive on a workspace, then Archive → `/drive` and Bureau Discussions → `/discussions` open in-app (no new tab) and reorder/hide still work. Also note: a front `--findRelatedTests` batch reported 1 failure in `SidePanelPathRestore.test.tsx` that passes in isolation (flaky under parallel workers, no side-panel file touched).
**Do not redo:** external/absolute links keep the existing `https://` prefixing and `<a target=_blank>`; `NavigationMenuItemType.LINK` was extended rather than adding a new nav type (per PLAN — recorded choice); the `allChannels`/`allDriveFolders` views and all non-nav app behaviour are unchanged; generic nav-item validation for other types untouched.
**D09 annotation:** D09's host blocker ("host `NavigationMenuItemType` LINK is external-only") is resolved by the server allow-list (`isAllowedNavigationMenuItemRoute`) + front pass-through (`getLinkNavigationMenuItemComputedLink`), and the `a2e-chat channels.navigation-menu-item.ts` repoint is done in source. The second half of D09's resolution — a published SDK version carrying `AppPath.Discussions` — is still pending; it does not block the feature because the app already targets the allow-listed literal path.
**SDK repin deferral (bullet 5):** the workspace `twenty-sdk` is pinned at the release version `2.39.0`, which must match the server's auto-generated `TWENTY_CURRENT_VERSION` (`2.39.0`); bumping it standalone would desync the app/server compatibility checks that a coordinated `nx version:bump` owns. Repinning also needs an npm publish + app-local lockfile re-resolve (no publish/network step in an executor session). The source-side extension is in place (`twenty-sdk/define` now exports `AppPath`, `INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS` and the route-path type, plus build-time LINK validation); no app source depends on the unpublished symbol because the repointed rows use string literals, so the repin can ride the next release safely.
**Remaining:** M7c (grouped folders), M7d (host Agenda nav), M7e (Bureau packaging), M7f (landing pages).
**Next:** orchestrator tick after packaging a Tier-2 browser leg (or accept the source-level proof and defer the browser leg); release run `nx version:bump` → npm publish → repin a2e-chat/a2e-drive to carry the new SDK exports.

CLAIMED — US-115/M7c-bureau-folder — deepseek-v4.1-flash — 2026-09-29T22:01:18Z — base 7a265762b958a379da28e6eada00ab71e72b5965

## 2026-09-29 22:20 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-115 M7c: grouped app sections — one folder nav item per app · **Slice:** app-side Bureau folder (a2e-documents owns it; a2e-documents Pages + a2e-projects Projets nest under it)
**Claim:** partial
**Ready-to-tick:** no — only the Bureau half of the app-side regroup bullet is done; task-wide Tier-2 browser leg + the remaining legs (chat, drive, Bilan reduction, CRM folder) are open
**Base:** 7a265762b958a379da28e6eada00ab71e72b5965
**Changed:** `a2e-documents`: `src/constants/universal-identifiers.ts` (+`bureauFolder` `c31a0000-0010-4000-8000-000000000002`), new `src/navigation-menu-items/bureau-folder.navigation-menu-item.ts` (FOLDER `Bureau`, IconStack2, pos 100), `src/navigation-menu-items/documents.navigation-menu-item.ts` (name Documents→Pages, pos 100→0, `folderUniversalIdentifier` = Bureau), new test `src/lib/__tests__/bureau-navigation.test.ts`, `package.json` 0.2.5→0.2.6. `a2e-projects`: `src/constants/universal-identifiers.ts` (+`EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau`), `src/navigation-menu-items/projects.navigation-menu-item.ts` (pos 110→1, nested under Bureau), `src/lib/__tests__/project-object-integrity.test.ts` (folderIds accepts the external Bureau folder), new test `src/lib/__tests__/project-navigation.test.ts`, `package.json` 0.1.14→0.1.15.
**Checks:** a2e-documents `yarn typecheck && yarn lint && yarn test:unit` → clean, `ℹ pass 222 / fail 0`; `npx twenty dev:build .` → success (28 files, manifest shows `Pages`→`Bureau`). a2e-projects `yarn typecheck && yarn lint && yarn test:unit` → typecheck clean, lint 0 errors (1 pre-existing unused-import warning in `src/fields/task-labels.field.ts`, untouched), `ℹ pass 337 / fail 0`; `npx twenty dev:build .` → success (48 files, manifest shows `Projets`→`folderUniversalIdentifier` = documents' Bureau folder). Builds regenerated `.twenty/output` only (gitignored).
**Missing for tick:** Tier 2 (orchestrator): fresh/upgraded workspace sidebar shows a single collapsible `Bureau` folder holding `Pages` + `Projets` in a browser; ≤7 top-level rows after the remaining legs land. Cross-app folder resolution is install-order-dependent (Documents is a hard prerequisite of Projects), so the live install is the real proof. **Not done in this slice:** a2e-chat nesting (optional standalone install → a cross-app folder ref would break install; blocked on the M7e Bureau-bundle dependency decision); a2e-drive `Archive` folder (redundant one-child folder — the app displayName and its only row are both `Archive`; needs the M7f Archive landing-page rows to be worth wrapping); `Mes tâches` under Bureau (impossible: nav hierarchy max depth is 2, so a folder of 3 smart lists cannot itself nest — `NAVIGATION_MENU_ITEM_MAX_DEPTH`); Bilan ≤6 rows + rest reachable from landing page (needs M7f dashboard links; no hidden-row primitive exists, only deletion, which would break the additive rule); CRM folder + collapse-per-user + managed-provenance (bullet 4, host/standard-nav side).
**Do not redo:** a2e-accounting already owns its `Bilan` folder; a2e-projects `Mes tâches` folder + its 3 views stay as-is; `a2e-chat`/`a2e-drive` nav rows are unchanged. Do not hand-edit `.twenty/output`.
**Remaining:** M7d (host Agenda nav), M7e (Bureau packaging), M7f (landing pages) + the US-115 legs above.
**Next:** a2e-chat Bureau nesting once M7e fixes the dependency (or the host seeds a standard Bureau folder); then a2e-drive Archive folder + Bilan reduction with its landing-page links (M7f).

CLAIMED — US-116/M7d — deepseek-v4.1-flash — 2026-09-29T22:12:00Z — base 7ace29e51dfaf9dd3f6d3ed95b1063f14bfbfa67

## 2026-09-29 22:35 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-116 M7d: Agenda host entry without an app · **Slice:** host-seeded /calendar standard nav row + `agendaEnabled` preset flag + 2-39 upgrade command + idempotency test
**Claim:** done-for-review
**Ready-to-tick:** yes — all implementable Tier 0/1 checks green; only the Tier-2 browser proof and the workspace-command `down` caveat below are open
**Base:** 7ace29e51dfaf9dd3f6d3ed95b1063f14bfbfa67
**Changed:** `standard-navigation-menu-item.constant.ts` (new `agenda` LINK row `20202020-b00c-4b0c-8b0c-c0aba11c000c` → `/calendar`, icon `IconCalendarEvent`, pos 8; exported `AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER` + default color), new `create-standard-navigation-menu-item-link-flat-metadata.util.ts`, `build-standard-flat-navigation-menu-item-maps.util.ts` (seed the link row); `workspace-template-definitions.constant.ts` (`agendaEnabled` on all 6 presets, all `true`; `getHiddenStandardNavigationMenuItemUniversalIdentifiers`; managed set now derives from it), `workspace-template.service.ts` (hide-list/preview/legacy-provenance all use the helper; restore builder handles LINK + OBJECT), `workspace-template.service.partial-failure.spec.ts` (fixture gains the field); new 2-39 command `2-39-workspace-command-1790720500000-add-agenda-navigation-menu-item.command.ts` + module registration; tests: new `create-standard-navigation-menu-item-link-flat-metadata.util.spec.ts`, new `build-standard-flat-navigation-menu-item-maps.util.spec.ts`, new `workspace-template-definitions.agenda.spec.ts`, new command spec; new integration spec `test/integration/metadata/suites/navigation-menu-item/add-agenda-navigation-menu-item-upgrade-command.integration-spec.ts`.
**Checks:** `npx tsgo -p tsconfig.json --noEmit` (twenty-server) → clean; `npx oxlint --type-aware -c .oxlintrc.json` + `npx oxfmt --check` on all 13 touched ts files → 0 warnings/0 errors, all formatted; `npx jest src/engine/core-modules/onboarding src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/__tests__ src/database/.../2-39/__tests__ --config=jest.config.mjs` → 13 suites / 102 tests + 7 suites / 39 tests pass; `node` (via spec) `computeTwentyStandardApplicationAllFlatEntityMaps` proves the standard maps carry the LINK row; `standard-metadata-label-catalog.spec.ts` → pass (Agenda id authored through `i18nLabel`, no catalog churn); `NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/metadata/suites/navigation-menu-item/add-agenda...` → 1/1 pass: it deletes any existing `/calendar` row, asserts 0, runs the command, asserts exactly 1 (LINK/`/calendar`/`Agenda`), reruns, still exactly 1 — real test DB, real migration path.
**Missing for tick:** (1) Tier 2 orchestrator — fresh (no preset) + upgraded workspace show Agenda once and hiding it persists, in a browser. (2) **`up/down` deviation:** workspace commands in this framework have no `down()` — the upgrade runner only calls `runOnWorkspace` (version+timestamp registration); the command is additive + idempotent, so a reverse would be a new forward command if ever needed. (3) A whole-directory run of `test/integration/metadata/suites/navigation-menu-item` OOMs after 3 passing suites (Node heap, pre-existing; each suite passes individually) and that aborted run left a stale duplicate `Test Role` in the seed workspace which fails the unrelated `application/successful-manifest-update-navigation-menu-item` spec until `database:reset`.
**Do not redo:** US-101 internal-route pass-through (`getLinkNavigationMenuItemComputedLink`/`isAllowedNavigationMenuItemLink`) already handles `/calendar` — no front change needed; the standard nav row is app-owned by the twenty-standard application. Do not set `agendaEnabled: false` on CRM: `workspace-template.service.spec.ts`'s restore/CRM no-op tests encode "CRM hides nothing" (PLAN M7c), and the upgrade command seeds Agenda unconditionally, so a CRM hide would contradict it.
**Remaining:** M7c remaining legs (chat nesting, drive Archive folder, Bilan reduction, CRM host folder), M7e (Bureau packaging), M7f (landing pages).
**Next:** orchestrator tick + Tier-2 browser leg; if the `down` bullet is judged mandatory, the follow-up is an instance command or a documented waiver — workspace commands cannot express `down`.

## 2026-10-01 — orchestrator verification (M7: US-100/101/115/116)
- Verified at HEAD (no code changed): host display renames (US-100), internal-route
  nav allow-list across twenty-shared/server/front/SDK + a2e-chat/drive repoint
  (US-101), Bureau folder for Pages+Projets (US-115), and the host-seeded
  `/calendar` Agenda row + preset flag + 2-39 upgrade command (US-116).
- Checks run this pass: `npx nx build twenty-shared --skip-nx-cache` green;
  twenty-front + twenty-server `npx tsgo -p tsconfig.json --noEmit` clean;
  twenty-front `template-gallery`+`home-dashboard` 27 suites/101, `blocknote-editor`+`ai`
  92 suites/643, twenty-server `ai`+`onboarding` 63 suites/429 all green;
  a2e-documents 252 / projects 357 / accounting 123 / drive 91 (`yarn test:unit`).
- PLAN: M7a/M7b/M7d `[x]`, M7c `[~]` (Bureau folder only), M7 milestone row
  `partial`. D09 resolved at code level. Browser legs remain Tier-2.
- Orchestrator fix: refreshed the stale `get-standard-object-metadata-related-entity-ids`
  snapshot (standard `calendarEvent` reminder fields added by auto-commit
  `a2a4932f` shifted the deterministic UUIDs; test was red at HEAD).

CLAIMED — US-133/bureau-bundle — deepseek-v4.1-flash — 2026-10-01T15:44:00Z — base 2b3d7781c945366035f9db23390cd90746e3846c

## 2026-10-01 16:00 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-133 M7e: Bureau packaging decision executed (D-B1) — preset bundle 'Bureau' installing all three Bureau apps · **Slice:** execute option (a) + decision record + drift-guard specs
**Claim:** done-for-review
**Ready-to-tick:** yes
**Base:** 2b3d7781c945366035f9db23390cd90746e3846c
**Changed:** `packages/twenty-server/src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant.ts` (new `A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS` = documents+projects+chat, install order documents-first; all five Bureau personas install the bundle, version 1→2); `.../__tests__/workspace-template-definitions.bureau-bundle.spec.ts` (new); `.../__tests__/workspace-template.service.spec.ts`; `.../__tests__/workspace-template.service.idempotency.spec.ts`; `.../__tests__/fixtures/apply-template-operation.fixtures.ts`; `packages/twenty-front/src/modules/a2e-workspace/constants/A2eWorkspaceTemplates.ts` (Bureau/Bilan copy, no G14 remnant); `.../__tests__/A2eWorkspaceTemplates.test.ts` (bundle-constant expansion so truthfulness spec still reads the real app set); `docs/plan/05-template-contracts.md` (preview/apply examples now show the 3-app bundle).
**Checks:** `npx jest src/engine/core-modules/onboarding --config=packages/twenty-server/jest.config.mjs` → 12 suites/107 passed; `packages/twenty-server npx tsgo -p tsconfig.json --noEmit` → exit 0; `npx jest .../A2eWorkspaceTemplates.test.ts --config=packages/twenty-front/jest.config.mjs` → 13 passed; `packages/twenty-front npx tsgo -p tsconfig.json --noEmit` → exit 0; `npx oxlint --type-aware -c .oxlintrc.json <touched files>` server (5 files, 0/0) + front (2 files, 0/0); `node docs/scripts/check-docs.mjs` → PASS.
**Decision:** D-B1 option (a) executed — keep 3 apps, add a preset bundle entry. Option (b) (thin a2e-bureau app with SDK app-dependencies) explicitly left to a maintainer decision once the SDK supports declared app dependencies.
**Missing for tick:** Tier 2 (orchestrator): live persona apply on a running app observing the three apps installed and one Bureau folder row (US-115-owned), not three top-level groups.
**Do not redo:** bundle constant, persona version bump, front copy, fixtures, and all onboarding specs — green as listed.
**Remaining:** US-134 (chat Discussions row nests into the Bureau folder) unlocked by this; US-164 M13b catalogue copy; M7f landing pages.
**Next:** a2e-chat Bureau nesting (US-134) now that the bundle fixes the install-order dependency.

CLAIMED — US-134/M7c-chat-bureau-folder — deepseek-v4.1-flash — 2026-10-01T16:01:23Z — base 6a29449c514947be8735ccfcbf5702dc9309375a

## 2026-10-01 16:20 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-134 M7c-2: a2e-chat Discussions nested under the Bureau folder · **Slice:** nest the app-managed Discussions nav row under a2e-documents' Bureau folder (duplicated external UUID), position 2
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0 all green; the sidebar browser leg is explicitly the Tier-2 remainder
**Base:** 6a29449c514947be8735ccfcbf5702dc9309375a
**Changed:** `a2e-chat` `src/constants/universal-identifiers.ts` (new `EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau` = `c31a0000-0010-4000-8000-000000000002`), `src/navigation-menu-items/channels.navigation-menu-item.ts` (pos 130→2, +`folderUniversalIdentifier`=Bureau, LINK `/discussions` kept), `src/lib/__tests__/chat-navigation.test.ts` (new nesting test), `src/lib/__tests__/chat-object-integrity.test.ts` (nav walk resolves the external folder), `package.json` 0.1.1→0.1.2, `README.md` (nesting + install-order prerequisite; fixed stale "not part of any workspace preset"). a2e-documents untouched → no version bump.
**Checks:** `yarn typecheck && yarn lint && yarn test:unit` → clean, oxlint 0/0, `ℹ tests 61 / pass 61 / fail 0`; `npx twenty dev:build .` → success (12 files), manifest row `{name: Discussions, type: LINK, position: 2, link: /discussions, folderUniversalIdentifier: c31a0000-0010-4000-8000-000000000002}`; `node docs/scripts/check-docs.mjs` → PASS.
**Missing for tick:** Tier 2 (orchestrator): after (re)installing a2e-chat the sidebar shows `Discussions` inside the single `Bureau` folder (after Pages/Projets), and an upgrade of an already-installed workspace reparents only the app-managed row (user-created rows untouched). No Tier-0 browser/upgrade proof.
**Prerequisite reasoning:** no new dependency is introduced — a2e-chat already pins `project.discussions` on A2E Projects' `project` (chat→projects) and projects pins `project` on documents' `document` (projects→documents), so documents is a hard prerequisite and its Bureau folder exists before chat installs. The US-133 bundle already orders documents→projects→chat.
**Do not redo:** the a2e-documents `Bureau` folder (US-115), a2e-projects nesting, and the a2e-chat `go-to-chat` command/LINK target are unchanged and green. Do not add a documents relation to chat, and do not nest `Mes tâches` (2-level depth cap).
**Remaining:** M7c drive Archive folder + Bilan reduction + CRM host folder are open; M7f landing pages; US-164 M13b catalogue copy.
**Next:** orchestrator tick + Tier-2 browser/upgrade leg; then the drive/Bilan/CRM M7c legs.

CLAIMED — US-150/bureau-landing — deepseek-v4.1-flash — 2026-10-01T20:44:35Z — base 305a60d850bdc01d7ae0ef160624c3966de3a30f

## 2026-10-01 20:59 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-150 M7f-1: Bureau landing page — one primary action, recent items, template links · **Slice:** the host Bureau landing (route + primary action + 3 gallery template links + recent pages) and the a2e-documents nav repoint that makes it the Bureau home
**Claim:** done-for-review
**Ready-to-tick:** yes — every Tier 0/1 check I own is green; only the Tier-2 browser render/empty-state leg is the orchestrator's
**Base:** 305a60d850bdc01d7ae0ef160624c3966de3a30f
**Changed:**
- twenty-shared: `src/types/AppPath.ts` (+`Bureau = '/bureau'`); `src/utils/navigation/internalNavigationMenuItemRoutePaths.ts` (+`/bureau` allow-list for app LINK rows); +2 navigation specs.
- twenty-front: NEW `src/modules/bureau/constants/BureauLandingTemplateCategory.ts` (`'Pages'`) and `BureauLandingTemplates.ts` (3 featured C1 keys + Lingui labels), `src/modules/bureau/components/BureauLanding.tsx` (install-gated via `useIsDocumentApplicationInstalled`; primary `useCreateNewPage`; 3 links via `useOpenTemplateGallery({category:'Pages', templateKey})`; reuses `RecentPagesWidget`; "All pages" → documents index), NEW `src/pages/bureau/BureauPage.tsx`, `src/modules/app/routing/utils/createWorkspaceRouteObjects.tsx` (route), `src/utils/title-utils.ts` (+Bureau title); template gallery seam: NEW `states/templateGalleryTemplateKeyPreselectState.ts`, `hooks/useOpenTemplateGallery.ts` (+`templateKey`), `components/TemplateGallery.tsx` (+`initialTemplateKey`), `components/TemplateGallerySidePanelPage.tsx`, +tests; `src/testing/constants/UntestedAppPaths.ts`; +tests.
- a2e-documents: `src/navigation-menu-items/documents.navigation-menu-item.ts` (Pages VIEW → LINK `/bureau`), `src/lib/__tests__/bureau-navigation.test.ts`, NEW `src/lib/__tests__/bureau-landing-template-links.test.ts` (M7f drift guard: reads the host constant, asserts every featured key resolves to a shipped `Pages` descriptor), `package.json` 0.2.11→0.2.12.
**Checks:**
- `npx nx build twenty-shared --skip-nx-cache` → success; `npx nx build twenty-sdk --skip-nx-cache` → success (SDK inlines the route allow-list).
- twenty-shared `npx tsgo -p tsconfig.json --noEmit` → exit 0; `npx jest src/utils/navigation src/types/__tests__/apiPathCollisions.spec.ts` → 5 suites/96 pass.
- twenty-front `npx tsgo -p tsconfig.json --noEmit` → exit 0; `npx jest src/modules/bureau src/modules/template-gallery src/utils/__tests__/title-utils.test.ts src/modules/app/routing src/hooks/__tests__/usePageChangeEffectNavigateLocation.test.ts src/config/__tests__/apiProxyPrefixes.test.ts src/modules/a2e-workspace` → all green (46 suites, 800+ tests); `npx jest --findRelatedTests <10 changed front sources>` → 11 suites/377 pass.
- oxlint `--type-aware -c .oxlintrc.json` + `oxfmt --check` on all touched front/shared/a2e files → 0 warnings/0 errors, formatted (one `max-consts-per-file` fix: split the category const into its own file).
- a2e-documents `yarn typecheck` exit 0; `yarn lint` 0/0 (108 files); `yarn test:unit` → 275/275 pass (was 261; the new drift guard's 2 tests included); `npx twenty dev:build .` → `Build succeeded (36 files)`, manifest row `{name: Pages, type: LINK, link: /bureau, folderUniversalIdentifier: …0002}`.
- `node docs/scripts/check-docs.mjs` → PASS; no `locales/**` touched; no AI attribution.
**Missing for tick:** Tier 2 (orchestrator): on a fresh workspace with a2e-documents installed, `/bureau` renders the header + "New page", the 3 starter links open the gallery on the right template, recent pages list, and the sidebar `Bureau > Pages` row opens `/bureau`; and with the app absent `/bureau` renders nothing (no broken widget).
**Pre-existing test fix (not mine):** `usePageChangeEffectNavigateLocation.test.ts` "tests should be exhaustive" was already red at HEAD — `AppPath.{Drive,Calendar,Discussions,Inbox}` had no matrix rows and were not exempted, so the count formula expected (35−3)×10+22 = 342 vs the 302 literal rows. Adding `AppPath.Bureau` shifted the expected count by +10. I added the five native home pages to `UNTESTED_APP_PATHS` (they genuinely have no onboarding/auth special-case) so the invariant matches its 302 rows again; no production behavior changed.
**Do not redo:** the US-132 `useOpenTemplateGallery` seam is extended, not forked (category + new optional `templateKey`); `RecentPagesWidget`/`useCreateNewPage`/`useIsDocumentApplicationInstalled` are reused, not rebuilt; the US-131 apply functions and gallery surface are untouched; the a2e-documents `allDocuments` view still exists (the landing's "All pages" links to the documents index).
**Remaining:** M7f siblings US-151 (Agenda), US-152 (Syna), US-153 (Archive + drive folder); M7c drive/Bilan/CRM legs; then US-165/US-167 consume this landing.
**Next:** US-151 reuses this exact pattern (host page + route + `TemplateGalleryEntryPoint`/`useOpenTemplateGallery`); when M13c lands, swap the landing's inline sections for the shared empty-state primitive rather than adding a second one.

CLAIMED — US-151/agenda-landing — deepseek-v4.1-flash — 2026-10-01T21:04:00Z — base e5d2db849d5cb78b803ded75770a09b6ee24b812

## 2026-10-01 21:15 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-151 M7f-2: Agenda landing page — calendar week as the app home · **Slice:** the whole task — enrich the existing `/calendar` host page with the Agenda landing header (primary "New event" + 3 featured Agenda gallery links) and open on the week view
**Claim:** done-for-review
**Ready-to-tick:** yes — every Tier 0 check I own is green; only the Tier-2 browser render (E13 leg) is the orchestrator's
**Base:** e5d2db849d5cb78b803ded75770a09b6ee24b812
**Changed:**
- twenty-front `src/pages/calendar/CalendarPage.tsx` — no new route; defaults `mode` to `'week'`, renders `<AgendaLanding onCreateEvent={handleCreateEvent} />` above the existing toolbar, and adds `handleCreateEvent` that opens the existing composer in create mode with a `buildDefaultCalendarEventDraft` draft (single write path unchanged).
- NEW `src/modules/calendar/components/AgendaLanding.tsx` — host landing strip: title + subtitle, primary "New event" (`agenda-new-event`), 3 featured M9c template links (`agenda-template-<key>`) that open the shared gallery via `useOpenTemplateGallery({ category: 'Agenda', templateKey })`. Props-typed `AgendaLandingProps { onCreateEvent }`; no calendar state.
- NEW `src/modules/calendar/constants/AgendaLandingTemplateCategory.ts` (`'Agenda'`) and `AgendaLandingTemplates.ts` (3 keys: blocage-temps-semaine, rituels-equipe, calendrier-editorial + Lingui labels).
- NEW `src/modules/calendar/utils/buildDefaultCalendarEventDraft.ts` — blank 1h event at the next full hour in the workspace time zone (never in the past), reusing `buildCalendarEventDraftFromSlot`.
- NEW tests: `components/__tests__/AgendaLanding.test.tsx` (3: composition, primary action → `onCreateEvent`, gallery entry → `{category:'Agenda', templateKey}`), `constants/__tests__/AgendaLandingTemplates.test.ts` (2: exactly 3 links, each key resolves to a shipped `Agenda` descriptor), `utils/__tests__/buildDefaultCalendarEventDraft.test.ts` (2: next full hour 1h duration, never in the past).
**Checks:**
- `npx jest <3 new specs> --config=packages/twenty-front/jest.config.mjs` → 3 suites / 7 pass.
- `npx jest src/modules/calendar --config=packages/twenty-front/jest.config.mjs` → 27 suites / 257 pass.
- `cd packages/twenty-front && npx jest --findRelatedTests src/pages/calendar/CalendarPage.tsx src/modules/calendar/components/AgendaLanding.tsx src/modules/calendar/utils/buildDefaultCalendarEventDraft.ts` → 4 suites / 46 pass (incl. `createWorkspaceRouteObjects`).
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0.
- `npx oxlint --type-aware -c .oxlintrc.json <8 touched>` → 0 warnings / 0 errors; `npx oxfmt --check <same>` → clean after formatting the test file.
- `npx nx lint:diff-with-main twenty-front` → "No changed files." (tree uncommitted; direct oxlint/oxfmt is the real gate).
- `node docs/scripts/check-docs.mjs` → PASS; no `locales/**` touched; no app package touched (host-only slice, no `package.json` bump); no AI attribution.
**Missing for tick:** Tier 2 (orchestrator) browser E13 leg — fresh workspace: the `Agenda` nav row lands on `/calendar` which opens on the **week** view under the landing strip (title + "New event" + 3 starter links); "New event" opens the composer pre-filled at the next full hour; each starter opens the gallery on the **Agenda** category with its template preselected; no second sidebar/nav appears.
**Do not redo:** the US-142 `AGENDA_TEMPLATE_DESCRIPTORS`/`applyAgendaTemplate`/host apply wiring, the US-132 `useOpenTemplateGallery({category,templateKey})` seam, the US-101/116 `/calendar` standard LINK nav row and its allow-list, and the calendar write path (`handleComposerSubmit`, `buildCalendarEventInputFromDraft`, `buildCalendarSeriesAnchorInputFromDraft`). Agenda reuses all of them — do not fork a second gallery or calendar-write path.
**Remaining:** M7f siblings US-152 (Syna), US-153 (Archive + drive folder); M7c drive/Bilan/CRM legs; then US-165/US-167 consume this landing.
**Next:** US-152 (Syna landing) reuses this exact host-enrichment shape; when M13c lands, swap the landing's inline strip for the shared empty-state primitive rather than adding a second one.
