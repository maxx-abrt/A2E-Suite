# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **A2E app logic-function lint wall:** `**/logic-functions/**` and `**/*.logic-function.ts` may NOT import `twenty-shared/*` (oxlint `no-restricted-imports`; message: import runtime types/helpers from `twenty-sdk/logic-function` instead). Any code needing twenty-shared types/helpers must live in `src/lib/<name>.ts` (lib imports twenty-shared freely; the logic function imports the lib relatively). Business logic + an injectable client also belongs there so the `node --test` runner can exercise it without `twenty-sdk/define`.
- **A2E app per-app observability:** each app has its own `tsconfig`/oxlint config/test glob; `test:unit` globs differ (accounting only `src/lib/__tests__/*.test.ts`, others also `src/logic-functions/__tests__/*.test.ts`). `twenty dev:build .` writes `.twenty/output/manifest.json` (gitignored) — grep it to prove a function/field shipped.
- **Idempotent app apply = nullable provenance text field on the root record** (`templateApplyOperationId`), queried `filter: { field: { eq: operationId } }` before any write; the same pattern as `recipeCorrelationKey`/`templateKey`. App-owned fields can be inline in the object or a standalone `fields/*.field.ts` manifest — no server migration.
- **Adding a member to a shared enum (e.g. `SidePanelPages`) needs `npx nx build twenty-sdk --skip-nx-cache` too, not just `twenty-shared`.** `twenty-sdk` inlines `SidePanelPages` (and `AppPath`) into `dist/front-component/index.d.ts` via rollup; a stale sdk dist makes `twenty-front` tsgo fail with `Property '<NewMember>' is missing in type 'SidePanelPages'`. Both dists are gitignored per-branch build state.
- **The front `ExecuteOneLogicFunction` mutation requires `payload`** (`ExecuteOneLogicFunctionInput.payload: JSON!`). Even a read-only logic function must send `variables: { input: { id, payload: {} } }`; omitting it fails GraphQL validation in-browser. `useMutation<TData>` alone does not typecheck variables, so this bug is invisible to tsgo.

---

## 2026-10-01 - US-131
- Implemented the M9a-3 per-app template apply write path: one `apply-template` logic function per content app (documents/projects/accounting/drive), keyed by the US-117 descriptor key.
- Added a shared `TemplateApplyResult` contract + structural guards + pure `resolveTemplateApplyRequestError` (required apps by name or universal id, required inputs) in `twenty-shared/application`; regenerated the barrel via `nx build`.
- Documents reuses `buildTemplateCopyPayload` over `STARTER_DOCUMENT_TEMPLATES`; projects extracted `createStarterProject` out of `post-install`; accounting reuses `FICHE_TEMPLATES` + `withTemplateDefaults`; drive extracted `createFolderStructureTree` out of the seeder. All fresh ids, no aliasing (C1).
- Idempotency: new nullable `templateApplyOperationId` on document/project/fiche/driveFolder root; re-apply with the same id returns the existing root and writes nothing. Required apps validated before any write; rejections are typed (`UNKNOWN_TEMPLATE_KEY`/`MISSING_REQUIRED_APP`/`MISSING_INPUT`/`APPLY_FAILED`).
- Files changed: `packages/twenty-shared/src/application/{templateApplyType,templateApplyGuards,index}.ts` + spec; per app: `src/lib/apply-template.ts` + spec, `src/logic-functions/apply-template.ts`, object/constants field+function ids, extracted creator lib (projects/drive), `package.json` patch bumps (docs 0.2.9, projects 0.1.18, accounting 0.1.4, drive 0.1.4).
- **Learnings:**
  - oxlint restricts `twenty-shared` imports inside `logic-functions/**`; move logic to `src/lib/`.
  - `MetadataApiClient().query({ findManyApplications: { name, universalIdentifier } })` is the installed-app read used by app logic functions.
  - `npx nx lint twenty-shared` is red on a pre-existing unformatted `template-descriptor.spec.ts` (US-117); `lint:diff-with-main` has no twenty-shared target.
  - Tier-2 E15 browser leg still blocked on US-132 wiring `Use template` to `apply-template`.
---


## 2026-10-01 - US-132
- Mounted the M9a template gallery: added `SidePanelPages.TemplateGallery`, a `TemplateGallerySidePanelPage` host (items from every installed app's `list-template-descriptors`, `Use template` via each app's `apply-template`, typed rejection banner), and registered it in `SidePanelPagesConfig`.
- Cmd+K now shows a `Templates` entry (`TemplatesCommand` + `useTemplatesCommand`, mirrored on `QuickCaptureCommand`) in `SidePanelCommandMenuItemDisplayPage`'s "Other" group, included in the selectable list and no-match logic.
- Exported install-gated `TemplateGalleryEntryPoint` (renders nothing when no required app is installed) plus the single `useOpenTemplateGallery({ category })` open seam; `TemplateGallery` gained an `initialCategory` soft preselect the user can clear (AC5).
- Wired the write path: `useApplyTemplate` resolves the descriptor's source app's `apply-template` function, calls `ExecuteOneLogicFunction` with `{ key, inputs: null, operationId }` (one id per session), validates with `isTemplateApplyResult`.
- Fixed a latent US-118 bug: `useTemplateGalleryItems` omitted the GraphQL-required `payload` field on `ExecuteOneLogicFunction`; now sends `payload: {}`.
- Files changed: `packages/twenty-shared/src/types/SidePanelPages.ts`; `packages/twenty-front/src/modules/template-gallery/**` (new: constants/TemplateApplyLogicFunctionName, utils/collectTemplateApplyLogicFunctions, states/templateGalleryCategoryPreselectState, hooks/useOpenTemplateGallery + useTemplatesCommand + useApplyTemplate, components/TemplatesCommand + TemplateGalleryEntryPoint + TemplateGallerySidePanelPage, 5 new test files; modified TemplateGallery + useTemplateGalleryItems); `command-menu-item/display/components/SidePanelCommandMenuItemDisplayPage.tsx`; `side-panel/constants/SidePanelPagesConfig.tsx`.
- **Learnings:**
  - Adding a `SidePanelPages` member requires rebuilding both `twenty-shared` and `twenty-sdk` dists before front tsgo passes.
  - Front custom lint rules: a state-driven variable must be named after the state (`templateGalleryCategoryPreselect`), and `useRef` cannot hold state (`no-state-useref`) — use `useState(() => …)` for a stable session value.
  - `conditional` test setup: mock `SelectableListItem`/`CommandMenuItem` to plain buttons to render a command without the full component-state context (pattern from `SidePanelPageLayoutRecordPageWidgetTypeSelect.test.tsx`).
---

## 2026-10-01 - US-133
- Executed D-B1 option (a) for M7e: added `A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS` (documents + projects + chat, install order documents-first) and pointed all five Bureau personas (INDIVIDUAL/STUDENT/TEAM/NON_PROFIT/SMALL_BUSINESS) at the spread bundle, template version 1→2.
- New `workspace-template-definitions.bureau-bundle.spec.ts`; updated onboarding service specs/idempotency fixtures for three install steps; front picker copy now Bureau pages/Projects/Discussions (no G14 remnant); front truthfulness spec expands bundle constants; template-contracts doc examples refreshed.
- Files changed: `packages/twenty-server/src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant.ts` + 4 `__tests__` files; `packages/twenty-front/src/modules/a2e-workspace/constants/A2eWorkspaceTemplates.ts` + its test; `docs/plan/05-template-contracts.md`.
- **Learnings:**
  - A preset's `applicationUniversalIdentifiers` may now reference a spread bundle constant; the front truthfulness spec is source-text based, so it must expand `export const X = [...]` bundle constants one level or it checks the constant name instead of real UUIDs.
  - Three install steps shift every onboarding call-count assertion (`installApplication` once → 3) and the step-status arrays; the incompatible-app case now has only the first app flagged so the other two still install.
---
