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
