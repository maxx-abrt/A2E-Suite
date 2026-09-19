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
- Seeders must return the rows `createRecords`/`createRecords`-style helpers actually created (`result[createMutationName] ?? []`), never the requested missing count — a mutation the API accepts but returns 0 ids for would otherwise be reported as a seed. See `a2e-accounting/src/logic-functions/handlers/seed-starter-content.ts`.
- Mock a dynamic `await import('unzipper')` in a jest spec with `jest.mock('unzipper', () => ({ __esModule: true, default: { Open: { buffer: jest.fn() } } }))`; the service's `const { default: unzipper } = await import('unzipper')` resolves the mocked default. Construct `SdkClientArchiveService` via `Test.createTestingModule` with the `getRepositoryToken`/service providers (no constructor casts).
- Persona starter bundle data: ready app content lives in `WORKSPACE_TEMPLATE_DEFINITIONS[…].starterBundleContents` and previews as `samples` (filtered to `registered && versionCompatible`); content deferred behind an upstream product gate lives in `blockedStarterBundleContents` with a `blockedBy` key (e.g. `P7.0_SAFETY_GATE`) and always previews as `blockedSamples`, unfiltered by server readiness. Never put gated content in `starterBundleContents` (it would preview as seedable), and never filter `blockedSamples` by registration (the gate is upstream).

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

## 2026-09-19 - US-028
- Closed the P1.3 delegated-seeding truth gap. Server side (async hook → `failed`/`SEED_FAILED`) and the SDK-layer root-cause fix were already in the tree; this slice added their missing regression coverage and fixed the last over-report in the app hook.
- Implemented: (1) new SDK-archive staged-extraction spec reproducing the live 0-rows path (a dead extraction must leave the live SDK layer absent, never a package missing `dist/core.mjs`; a complete staged swap wins over a concurrent holder); (2) `seed-starter-content.ts` now returns the rows `createRecords` actually created, not the requested `missing.length`, so a 0-created write reports 0/false.
- Files changed: new `packages/twenty-server/src/engine/core-modules/sdk-client/__tests__/sdk-client-archive-staged-extraction.spec.ts`; `packages/twenty-apps/internal/a2e-accounting/src/logic-functions/handlers/seed-starter-content.ts`; `.../src/lib/__tests__/starter-content-seeding.test.ts`; phase report.
- **Learnings:**
  - The 0-rows incident's root cause is the SDK layer, not the seed payloads: `downloadAndExtractToPackage` now extracts to a staging sibling, verifies `package.json` + `dist/core.mjs`, then renames atomically. A consumer must never see a partial live layer.
  - `createRecords` returns the created rows (`result[createMutationName] ?? []`). Seeders that return `missing.length` instead over-report on a silent 0-row mutation — always count what was written.
  - Mock dynamic `await import('unzipper')` by `jest.mock('unzipper', () => ({ __esModule: true, default: { Open: { buffer: jest.fn() } } }))` and cast `unzipper.Open.buffer as unknown as jest.Mock`; the service's `{ default: unzipper }` destructure then resolves the mock.
---

## 2026-09-19 - US-029
- Closed the P1.6d persona-bundle gap: persona previews now include only ready-app content. Bilan (a2e-accounting) proposed contents were moved out of `starterBundleContents` into a new `blockedStarterBundleContents` field tagged `P7.0_SAFETY_GATE`, and the preview surfaces them as `blockedSamples` so a gated exclusion is visible, never silently dropped.
- Files changed: `twenty-server` onboarding `workspace-template-definitions.constant.ts` (+`WorkspaceTemplateBundleBlockReason`, `WorkspaceTemplateBlockedBundleContent`, required `blockedStarterBundleContents`), `types/apply-template-operation.types.ts` (+`TemplatePreviewBlockedSample`, `blockedSamples`), `dtos/apply-template-operation-result.dto.ts` (+DTO/field), `workspace-template.service.ts` (map blocked → preview); server specs/fixtures; `twenty-front` a2e-workspace types/resolver/query/component + specs; `docs/plan/05-template-contracts.md` §6/§7; phase report.
- **Learnings:**
  - The preview's `samples` filter (`registered && versionCompatible`) is a *server-readiness* gate, not a *product-readiness* gate. Bilan can be registered+compatible and still must not preview as seedable while P7.0 is open — that distinction needs the separate `blockedSamples` channel.
  - A required field added to `WorkspaceTemplateDefinition` breaks any hand-built definition literal in specs (e.g. `workspace-template.service.partial-failure.spec.ts`); update those first or `tsgo --noEmit` fails before jest runs.
  - No preset installs a2e-projects, so "Documents/Projects" cannot both be previewed without an app-set + `version` change touching two onboarding integration specs — recorded as a D02 product call, not faked.
---
