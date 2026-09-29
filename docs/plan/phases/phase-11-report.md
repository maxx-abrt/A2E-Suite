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
