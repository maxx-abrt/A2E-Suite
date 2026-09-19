# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

---

## Codebase Patterns (Study These First)

- twenty-front `a2e-workspace`: both setup entrypoints (onboarding `~/pages/onboarding/InstallApps` and Settings `SettingsA2eWorkspaceTemplateSection`) delegate to the one `A2eWorkspaceTemplatePicker` → `A2eWorkspaceTemplatePreview` → `useApplyWorkspaceTemplateOperation` chain. Keep new setup UI inside that chain; never add a second preview/apply surface.
- Lingui `@lingui/react/macro` `t` only renders when used as a tagged template (`t`text``). Calling it as `t({ id, message })` renders an empty node in this codebase — use small components with inline tagged-template branches for dynamic labels (see `ResolutionLabel`/`StepKindLabel`).
- `twenty-ui` `Checkbox` (base-ui) constructs a `PointerEvent` on click; jsdom lacks it. Front component tests that click a checkbox need the `window.PointerEvent = MouseEvent` shim used in `packages/twenty-ui/src/input/Checkbox/__tests__/Checkbox.test.tsx`.
- `A2eWorkspaceTemplatePreview` per-app resolution and per-step outcome are both pure front projections beside each other: `resolveTemplatePreview` (previews) and `getApplyTemplateResultOutcome` (operation result). Do not merge either into the server or into the other. Retry correctness depends on NOT calling `resetOperation` on a partial result — the hook instance's reused idempotency key is what resumes the same server operation.

---

## 2026-09-19 - US-026
- Implemented P1.6c preview resolution: pure `resolveTemplatePreview` maps apps to `install`/`keep`/`unavailable`, marks optional deselection as excluded, and derives blocking prerequisites (required + unavailable). `A2eWorkspaceTemplatePreview` now renders the resolved label per app, a prerequisites list, and the previously-unrendered `navigationChanges` customization (hide/restore); it also fixed blank dynamic step-kind labels.
- Files changed: new `twenty-front/src/modules/a2e-workspace/utils/resolveTemplatePreview.ts`; modified `.../components/A2eWorkspaceTemplatePreview.tsx`; new tests `.../utils/__tests__/resolveTemplatePreview.test.ts`, `.../components/__tests__/A2eWorkspaceTemplatePreview.test.tsx`, `.../components/__tests__/A2eWorkspaceTemplatePicker.test.tsx`, `.../__tests__/entrypoint-parity.test.tsx`; `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - `TemplatePreview` apps carry `registered`/`versionCompatible`/`required`/`currentlyInstalled`; resolution is a front-only projection, no server change needed.
  - The `navigationChanges` wire shape exposes only `universalIdentifier` + `action` (no display names), so the customization preview shows identifiers by design.
  - Mock the `a2e-workspace` hooks (`useWorkspaceTemplatePreview`, `useApplyWorkspaceTemplateOperation`) with `jest.mocked(...)` + `jest.mock(module)` for component tests — no Apollo mock needed.
---

## 2026-09-19 - US-027
- Implemented P1.6c partial-failure UX: new pure `getApplyTemplateResultOutcome` classifies a setup result as `applied`/`partial`/`failed` (applied requires `appliedTemplateKeyVersion` AND no failed/pending/running step). `A2eWorkspaceTemplatePreview` renders a per-step status label truthfully (pending/in progress/succeeded/failed/skipped), a partial/failed outcome banner, and a `Retry remaining steps` button; it only calls `resetOperation`/`onApplied` on a fully applied run, so a retry reuses the same hook idempotency key. The operation hook shows a success snackbar only on `applied`. `shouldAutoSkipInstallAppsStep` now requires the catalogue to be *proven* empty (`hasLoadedAppsSuccessfully && count === 0`), so an errored/network-failed catalogue can never auto-skip past the template picker.
- Files changed: new `a2e-workspace/utils/getApplyTemplateResultOutcome.ts` + its spec; modified `.../components/A2eWorkspaceTemplatePreview.tsx` + spec; `.../hooks/useApplyWorkspaceTemplateOperation.ts` + spec; `onboarding/utils/shouldAutoSkipInstallAppsStep.ts` + spec; `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - The server's `set-workspace-template` step is `skipped` when a required install failed, so `appliedTemplateKeyVersion` is already a reliable "template row set" signal; combining it with "no failed/in-flight step" is what makes the classifier honest for seed/navigation failures too.
  - Distinct *no apps / network error / permission denial* UI at the apply level is blocked on a server error-code contract (`ApplyTemplateErrorCode` has no permission code and the preview query carries no discriminator) — recorded under `Missing for tick`, not faked front-side.
---
