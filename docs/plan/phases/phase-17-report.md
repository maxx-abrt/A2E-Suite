CLAIMED — US-163/m13a-create-chooser — deepseek-v4.1-flash — 2026-10-01T23:56:00Z — base db07c99f8efc36c11d6a5c91e8f78161c97cc8bf

## 2026-10-01 23:58 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-163 M13a: dual entry on every 'New' — Blank · 3 suggested templates · 'Browse all', Enter = blank · **Slice:** the reusable chooser (component + suggestion selector + tests) plus the first mount: the host document New surfaces (Cmd+K "Create… → New page" and the global New-page shortcut)
**Claim:** done-for-review
**Ready-to-tick:** yes — every Tier-0 gate green; the only absent evidence is the Tier-2 browser round-trip and the app-side (a2e-documents) New command, which is L-TPL app-lane and out of this twenty-front slice.
**Base:** db07c99f8efc36c11d6a5c91e8f78161c97cc8bf
**Changed:**
- NEW `packages/twenty-front/src/modules/template-gallery/utils/selectSuggestedTemplates.ts` — top-N (default 3) available `TemplateGalleryItem`s for the surface category, in descriptor order (no scoring list; the descriptor list is the single source of truth). Persona weighting intentionally omitted (PLAN: only where preset context exists; do not pre-empt D02).
- NEW `.../template-gallery/utils/__tests__/selectSuggestedTemplates.test.ts` — 5 tests incl. the drift guard (returned item is the input descriptor item, keys taken from source).
- NEW `.../template-gallery/components/CreateChooser.tsx` — presentational chooser (Blank · suggestions · Browse all), roving highlight defaulting to Blank (`Enter` = blank), `ArrowUp`/`ArrowDown` navigation, pointer activation; descriptor labels localized like the gallery; icons `IconSquarePlus`/`IconFileText`/`IconLayoutGrid` from `twenty-ui/icon`.
- NEW `.../template-gallery/components/__tests__/CreateChooser.test.tsx` — 6 tests: renders 3 suggestions + Blank + Browse all; Enter → blank; arrow keys reach each suggestion; pointer selects a suggestion / Browse all; labels from descriptors.
- NEW `.../template-gallery/components/CreateChooserModal.tsx` — the one wiring container a surface mounts: reads descriptors via `useTemplateGalleryItems`, selects suggestions, and sends both a suggestion and "Browse all" through the US-132 `useOpenTemplateGallery` seam (suggestion adds its `templateKey`); "Blank" runs the surface's untouched `onBlank`. Uses `ModalStatefulWrapper` + `useModal` and only loads descriptors while open.
- NEW `.../quick-create/components/QuickCreateRecordCommandWithChooser.tsx` — wraps a create command so activation opens the chooser; "Blank" forwards to the command's original create action.
- MOD `.../quick-create/components/QuickCreateRecordCommand.tsx` — the page command adopts the chooser (both the prelinked and unlinked branches keep their exact create logic as `onBlank`); every other create command is unchanged (incremental adoption).
- MOD `.../quick-capture/components/NewPageHotKeyGate.tsx` — Cmd/Ctrl+Shift+N now opens the same chooser (category Pages) instead of creating immediately; `NewPageHotKeyEffect` renamed `NewPageHotKeyChooser` to satisfy the effect-components lint rule.
- this report + `.ralph-tui/progress.md`
**Checks:**
- `cd packages/twenty-front && npx jest src/modules/template-gallery/utils/__tests__/selectSuggestedTemplates.test.ts src/modules/template-gallery/components/__tests__/CreateChooser.test.tsx --config=jest.config.mjs` → 2 suites / 11 tests pass
- `cd packages/twenty-front && npx jest src/modules/template-gallery src/modules/quick-create --config=jest.config.mjs` → 16 suites / 70 tests pass
- `cd packages/twenty-front && npx jest --findRelatedTests <6 changed non-test sources> --config=jest.config.mjs` → 5 suites / 23 tests pass
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `cd packages/twenty-front && npx oxlint --type-aware -c .oxlintrc.json <8 touched files>` → `Found 0 warnings and 0 errors`; `npx oxfmt --check <same paths>` → `All matched files use the correct format.`
- `npx nx lint:diff-with-main twenty-front` → exit 0 but "No changed files" (branch is `main`, reports on `main...HEAD`); the direct oxlint/oxfmt run above is the substantive evidence, matching convention.
- no `locales/**` touched (new strings use Lingui `t`; the pipeline extracts them) → no catalog churn; no `any`; no direct `@tabler/icons-react` import; no AI attribution.
**Missing for tick:**
- **Tier 2 (orchestrator):** browser — from Cmd+K → `Create…` → `New page` and from Cmd/Ctrl+Shift+N, confirm the chooser shows Blank + up to 3 Pages suggestions + Browse all; Enter creates a blank page; Browse all opens the gallery prefiltered to Pages; a suggestion opens the gallery with that descriptor key preselected.
- **Mounted surfaces recorded (AC5):** only the two host *document* New surfaces — (1) Cmd+K `Create… → New page` (`QuickCreateRecordCommandWithChooser`) and (2) the global New-page shortcut (`NewPageHotKeyGate`). The a2e-documents app's own `create-document` command is app-lane (cannot import twenty-front) and remains the documented L-TPL follow-up; task/project/event/invoice/expense/file commands still direct-create (incremental adoption).
- **Persona weighting:** not implemented by design (no preset context; the AC ties it to a context that does not exist yet, and D02 app-set expansion must not be pre-empted).
**Do not redo:** the US-132 `useOpenTemplateGallery` seam and `TemplateGallerySidePanelPage`/`TemplateGallery`; the US-118 data layer (`useTemplateGalleryItems`/`buildTemplateGalleryItems`); the quick-create create path (`useQuickCreateRecordCreate` + prelink) and `useCreateNewPage`. Extend the chooser's mount list rather than adding a second gallery open path or a second descriptor read.
**Remaining:** 6 other open tasks in batch 14B (US-164–US-169), all M13.
**Next:** orchestrator Tier-2 browser check, then tick US-163; the next executor slice is US-164 (M13b onboarding "Start from scratch").

CLAIMED — US-164/m13b-start-from-scratch — deepseek-v4.1-flash — 2026-10-02T00:10:17Z — base eab7cec3315ec55f842c6f5f67a74ca26942ca11

## 2026-10-02 02:15 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-164 M13b: onboarding 'Start from scratch' path — first-class next to personas, empty app catalogue · **Slice:** the whole M13b step: a first-class scratch card beside the persona cards, the five-app catalogue shown on selection, and completion with zero installs via the existing empty-selection path
**Claim:** done-for-review
**Ready-to-tick:** yes — every Tier-0 gate green; the only absent evidence is the Tier-2 browser journey.
**Base:** eab7cec3315ec55f842c6f5f67a74ca26942ca11
**Changed:**
- NEW `packages/twenty-front/src/modules/onboarding/constants/OnboardingAppCatalogue.ts` — the five D-N1 suite entries (Bureau · Agenda · Bilan · Syna · Archive). Each description is the shipped per-app doc copy (`twenty-docs/user-guide/a2e-suite/<app>.mdx` front matter), the only shipped one-liners that cover all five surfaces consistently (the installable-app list names 4/5 and calls Syna "Syna for CRM").
- NEW `.../onboarding/constants/__tests__/OnboardingAppCatalogue.test.ts` — asserts exactly the five D-N1 names in order, and that each English message equals the matching `.mdx` front-matter `description` (drift guard, fs read like the existing workspace-template truthfulness spec).
- NEW `.../onboarding/components/OnboardingStartFromScratchContent.tsx` — the catalogue panel: one intro line ("Nothing is installed… installed later from its landing page"), one row per app (name + description + per-row "Installable later from its landing page" hint = the M13c anchor), and the no-install confirm `Start with an empty workspace`.
- NEW `.../onboarding/components/__tests__/OnboardingStartFromScratchContent.test.tsx` — five rows present; confirm fires `onConfirm` once; disabled while `isCompleting`.
- MOD `.../a2e-workspace/components/A2eWorkspaceTemplatePicker.tsx` — optional `startFromScratch` prop: renders the scratch card **first in the same `StyledGrid`** (first-class parity, not a footnote) and swaps the template preview for the supplied content when chosen. Settings does not pass it → Settings picker unchanged.
- MOD `.../a2e-workspace/components/__tests__/A2eWorkspaceTemplatePicker.test.tsx` — new test: scratch card renders beside personas; selecting it shows content, hides preview; selecting a persona restores the preview (persona path unaffected).
- MOD `.../pages/onboarding/InstallApps.tsx` — passes `startFromScratch` (`IconPuzzle`, Lingui label/description) with `onConfirm={skip}`, reusing `useInstallOnboardingApps().skip` = `triggerStep([])`: the existing empty-selection path claims the step, pushes reversible history and credits 0 — no new server primitive.
- NEW `.../pages/onboarding/__tests__/InstallAppsStartFromScratch.test.tsx` — rendering the real `InstallApps` and clicking scratch → confirm calls `triggerInstallAppsOnboardingStep({ universalIdentifiers: [], isAutoSkipped: false })`, proving no app installs.
- this report + `.ralph-tui/progress.md`
**Checks:**
- `cd packages/twenty-front && npx jest src/modules/onboarding/constants/__tests__/OnboardingAppCatalogue.test.ts src/modules/onboarding/components/__tests__/OnboardingStartFromScratchContent.test.tsx src/modules/a2e-workspace/components/__tests__/A2eWorkspaceTemplatePicker.test.tsx src/pages/onboarding/__tests__/InstallAppsStartFromScratch.test.tsx src/pages/onboarding/__tests__/InstallApps.test.tsx --config=jest.config.mjs` → 5 suites / 15 tests pass
- `cd packages/twenty-front && npx jest src/modules/a2e-workspace src/pages/onboarding src/modules/onboarding --config=jest.config.mjs` → 45 suites / 252 tests pass (existing onboarding + picker entrypoint parity intact)
- `cd packages/twenty-server && npx jest src/engine/core-modules/onboarding --config=jest.config.mjs` → 12 suites / 107 tests pass (empty-selection enqueues nothing already covered)
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `cd packages/twenty-front && npx oxlint --type-aware -c .oxlintrc.json <8 touched files>` → Found 0 warnings and 0 errors; `npx oxfmt --check <same>` → all formatted
- `npx nx lint:diff-with-main twenty-front` → exit 0 but "No changed files" (branch is `main`); direct oxlint/oxfmt above is the substantive evidence (US-163 precedent)
- no `locales/**` touched (new strings use `t`/`msg`; pipeline extracts) → no catalog churn; no `any`; no direct `@tabler/icons-react`; no AI attribution.
**Missing for tick:**
- **Tier 2 (orchestrator):** browser — fresh-workspace scratch journey: the "Start from scratch" card shows first-class beside the personas; selecting it lists Bureau/Agenda/Bilan/Syna/Archive with one-line descriptions and the install-later hint; confirming completes the step and lands on the next step with **no app installed** and no seeded content beyond the CRM baseline.
- **M13c link:** rows reference "installable later from its landing page" as copy only; the clickable link lands with US-165/US-166 (M13c), as the AC allows.
**Do not redo:** the existing `useInstallOnboardingApps` no-install path (`skip`/`triggerStep([])` → server `triggerInstallAppsOnboardingStep` claim + reversible history + 0 credits) and the `A2eWorkspaceTemplatePreview`/operation contract; the shared picker's persona grid/preview flow (only an optional prop was added). Do not add a `SCRATCH` server `WorkspaceTemplate` — the task is satisfied by the empty selection, and the enum is a GraphQL change.
**Remaining:** 5 other open tasks in batch 14B (US-165–US-169).
**Next:** orchestrator Tier-2 browser check, then tick US-164; the next executor slice is US-165 (M13c-1 contextual empty states — Bureau + Agenda).
