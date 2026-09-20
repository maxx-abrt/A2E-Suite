# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Testing an onboarding page without Apollo/Jotai:** mock the data hook module (`jest.mock('@/marketplace/hooks/useMarketplaceApps')` + `jest.mocked(...).mockReturnValue(... as unknown as ReturnType<typeof hook>)`), mock the heavy child (`A2eWorkspaceTemplatePicker`) to a testid div, mock the mutation hook factory, and wrap the render in `I18nProvider i18n={i18n}` + `await dynamicActivate(SOURCE_LOCALE)` in `beforeAll`. Use `~/pages/...` (not `@/pages/...` — `@/` maps to `src/modules` only). See `src/pages/onboarding/__tests__/InstallApps.test.tsx`.

---

## 2026-09-20 - US-056
- Added a distinct catalogue load-failure subtitle to the onboarding InstallApps list, separate from the zero-apps-available empty state.
- Files changed: `packages/twenty-front/src/pages/onboarding/InstallAppsContent.tsx` (new optional `catalogueLoadFailed` prop + `catalogueEmptyStateSubtitle`), `packages/twenty-front/src/pages/onboarding/InstallApps.tsx` (passes `!hasLoadedAvailabilitySuccessfully`), new `packages/twenty-front/src/pages/onboarding/__tests__/InstallApps.test.tsx` (3 cases), `packages/twenty-front/src/pages/onboarding/__stories__/InstallApps.stories.tsx` (MarketplaceUnavailable now expects failure copy), `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - `@/` alias maps only to `src/modules`; pages must be imported through `~/pages/...`.
  - Onboarding pages (InstallApps) render in jest with just `I18nProvider` + `dynamicActivate(SOURCE_LOCALE)` — no Jotai/Theme/Apollo provider needed once data hooks are mocked.
  - The template picker element is always passed by InstallApps, so `shouldAutoSkipInstallAppsStep` never auto-skips in any catalogue state; the picker is retained during loading/empty/failure.
---

