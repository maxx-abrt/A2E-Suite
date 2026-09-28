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
