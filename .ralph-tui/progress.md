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

---

## 2026-09-19 - US-026
- Implemented P1.6c preview resolution: pure `resolveTemplatePreview` maps apps to `install`/`keep`/`unavailable`, marks optional deselection as excluded, and derives blocking prerequisites (required + unavailable). `A2eWorkspaceTemplatePreview` now renders the resolved label per app, a prerequisites list, and the previously-unrendered `navigationChanges` customization (hide/restore); it also fixed blank dynamic step-kind labels.
- Files changed: new `twenty-front/src/modules/a2e-workspace/utils/resolveTemplatePreview.ts`; modified `.../components/A2eWorkspaceTemplatePreview.tsx`; new tests `.../utils/__tests__/resolveTemplatePreview.test.ts`, `.../components/__tests__/A2eWorkspaceTemplatePreview.test.tsx`, `.../components/__tests__/A2eWorkspaceTemplatePicker.test.tsx`, `.../__tests__/entrypoint-parity.test.tsx`; `docs/plan/phases/phase-01-report.md`.
- **Learnings:**
  - `TemplatePreview` apps carry `registered`/`versionCompatible`/`required`/`currentlyInstalled`; resolution is a front-only projection, no server change needed.
  - The `navigationChanges` wire shape exposes only `universalIdentifier` + `action` (no display names), so the customization preview shows identifiers by design.
  - Mock the `a2e-workspace` hooks (`useWorkspaceTemplatePreview`, `useApplyWorkspaceTemplateOperation`) with `jest.mocked(...)` + `jest.mock(module)` for component tests — no Apollo mock needed.
---
