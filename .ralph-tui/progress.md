# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Host-side gallery template family (no app, e.g. Agenda M9c):** a host surface with no app ships its template family as a static `TemplateGalleryDescriptorGroup` constant (synthetic `applicationUniversalIdentifier`, e.g. `a2e-host-agenda`) merged into `useTemplateGalleryItems` BEFORE the per-app logic-function groups. The gallery install-gates it identically (`requiredApps: []` → always available). The apply path is a pure client-injected util reusing the host primitives; `useApplyTemplate` delegates those keys to a host hook before the app logic-function lookup. Idempotency with no app-owned field: deterministic per-operation `iCalUid` + uuid-v5 ids, pre-query by `iCalUid in [...]`, skip existing. `twenty/max-consts-per-file` (max 1, `**/constants/*.ts`) is NOT scope-aware — put finders in `utils/` and prefer literal expectations over extra module-level consts in `constants/__tests__`.
- **A2E app logic-function lint wall:** `**/logic-functions/**` and `**/*.logic-function.ts` may NOT import `twenty-shared/*` (oxlint `no-restricted-imports`; message: import runtime types/helpers from `twenty-sdk/logic-function` instead). Any code needing twenty-shared types/helpers must live in `src/lib/<name>.ts` (lib imports twenty-shared freely; the logic function imports the lib relatively). Business logic + an injectable client also belongs there so the `node --test` runner can exercise it without `twenty-sdk/define`.
- **A2E app per-app observability:** each app has its own `tsconfig`/oxlint config/test glob; `test:unit` globs differ (accounting only `src/lib/__tests__/*.test.ts`, others also `src/logic-functions/__tests__/*.test.ts`). `twenty dev:build .` writes `.twenty/output/manifest.json` (gitignored) — grep it to prove a function/field shipped.
- **Idempotent app apply = nullable provenance text field on the root record** (`templateApplyOperationId`), queried `filter: { field: { eq: operationId } }` before any write; the same pattern as `recipeCorrelationKey`/`templateKey`. App-owned fields can be inline in the object or a standalone `fields/*.field.ts` manifest — no server migration.
- **Adding a member to a shared enum (e.g. `SidePanelPages`) needs `npx nx build twenty-sdk --skip-nx-cache` too, not just `twenty-shared`.** `twenty-sdk` inlines `SidePanelPages` (and `AppPath`) into `dist/front-component/index.d.ts` via rollup; a stale sdk dist makes `twenty-front` tsgo fail with `Property '<NewMember>' is missing in type 'SidePanelPages'`. Both dists are gitignored per-branch build state.
- **The front `ExecuteOneLogicFunction` mutation requires `payload`** (`ExecuteOneLogicFunctionInput.payload: JSON!`). Even a read-only logic function must send `variables: { input: { id, payload: {} } }`; omitting it fails GraphQL validation in-browser. `useMutation<TData>` alone does not typecheck variables, so this bug is invisible to tsgo.
- **Cross-app nav folder nesting (M7c):** an app nests a managed nav row under another app's FOLDER by duplicating the owner's folder UUID as `folderUniversalIdentifier` (works on LINK and VIEW rows). The parent must exist at install time — `FlatNavigationMenuItemValidatorService` errors `NAVIGATION_MENU_ITEM_NOT_FOUND` otherwise — and there is no manifest app-dependency field, so the child app needs a transitive hard reference to the owner (a field pinned on one of the owner's objects) or a preset bundle that installs the owner first. Positions are sibling-scoped inside the folder (owner's Pages 0, Projets 1, chat Discussions 2).
- **Per-workspace config over an instance-cached singleton:** keep the instance cache and add a request-scoped `AsyncLocalStorage` view rather than mutating global maps (`AiModelRegistryService.runWithWorkspaceRegistry`). Two traps: (1) never populate a providerName-keyed cache with workspace secrets — use the uncached factory (`SdkProviderFactoryService.createTransientProvider`); (2) when the override set is empty, run the existing instance path untouched so cached instances and global-only lookups (e.g. `getRawProvider` for native tools) still work.
- **A view's GroupBy query complexity is app-modelable:** the server (common-group-by-query-runner) computes `1 + (1 + relationFieldsCount) * getGroupLimit(limit)` with `COMMON_QUERY_COMPLEXITY_LIMIT = 2000` and `DEFAULT_NUMBER_OF_GROUPS_LIMIT = 50`. A relation *column* on a calendar/table view adds exactly one relation field (the front's `useRelevantRecordsGqlFields` selects visible columns; the junction-leg expansions it always fetches are the constant baseline). At the default limit each relation field costs a full 50 complexity points, so a view whose baseline is already ~1950 can be tipped over by one relation column — remove the column, never raise the cap.
- **A2E app record action = `RECORD_SELECTION` command-menu item + headless `<Command>` front component.** Mount a record-scoped action with `defineCommandMenuItem({ availabilityType: 'RECORD_SELECTION', availabilityObjectUniversalIdentifier: <object uid, app-owned works too>, frontComponentUniversalIdentifier })`; `targetObjectReadPermissions.<objectNameSingular>` is populated for app-owned objects too. The front component reads `useSelectedRecordIds()` and returns `<Command execute={…} />` (runs once on mount then unmounts — renders nothing). Keep the write path in `src/lib/<name>-service.ts` with an injectable `Pick<CoreApiClient,'query'|'mutation'>` so `node --test` exercises it. Do NOT set `icon` on the command-menu item — it is deprecated and `twenty dev:build` warns ("icon will be ignored in favor of application icon"); the app icon is used.
- **A2E app save-time computed index (M8d mentions):** index document content through a `document.updated` + `databaseEventTriggerSettings.updatedFields: ['content']` database event (post-commit — the SDK has no pre-write hook; mirror `guard-document-revision-save`), calling a lib writer with an injectable `Pick<CoreApiClient,'query'|'mutation'>`. The writer extracts the body's nodes once and diffs them against the stored index rows by a unique `mentionKey` (`${documentId}:${objectNameSingular}:${recordId}`), writing only the delta (create/delete/update-label) so a save leaves no stale rows and an unchanged body writes nothing. The read model queries the index by a text target pair (`targetObjectNameSingular`+`targetRecordId`) with the nested source document's metadata only (`id,title,archivedAt`) — never `content`; a document the viewer cannot read comes back as a null relation and is dropped. Keep the polymorphic target as text fields, not a morph relation: the index is only ever read back as a filter. Assert "no full-text scan" in tests by checking the recorded query selection JSON contains no `content`.
- **BlockNote custom formatting toolbar (M10b selection toolbar):** set `formattingToolbar={false}` on `BlockNoteView` and render a `FormattingToolbarController` whose `formattingToolbar` component returns `<FormattingToolbar>{getFormattingToolbarItems()}<CustomButtons /></FormattingToolbar>`. `getFormattingToolbarItems()` (exported by `@blocknote/react`, blocknote 0.51.4) returns the *exact* default controls array, so default behavior/styles are preserved while app buttons are appended after them — never hand-replicate the button list from the `DashboardFormattingToolbar` precedent (that renders a context-specific subset and would drop file/table/comment buttons). Custom buttons use `useComponentsContext().FormattingToolbar.Button` (`label`/`mainTooltip`/`icon`/`onClick`) so they pick up the default toolbar styling; read `useBlockNoteEditor().getSelectedText()` in `onClick` (the controller's default floating options keep focus off the toolbar, so the range survives). Jest cannot import the blocknote dist — mock `@blocknote/react` wholesale (like `getSlashMenu.test.ts`) and drive gating through the ai hooks.
- **Zero-AI gate is workspace-scoped, not instance-wide:** `ClientConfig.aiModels` is built from the instance registry, so a BYOK-only workspace sees an empty list. Add a `hasConfiguredAiProvider` ResolveField on `WorkspaceResolver` (`ProviderConfigService.getResolvedProvidersForWorkspace` → `.some(isProviderConfigured)`, so workspace BYOK counts; `AiModelsModule` is `@Global` so no module import needed for it) and consume it through `useWorkspaceAiModelAvailability`. The hook returns `hasConfiguredAiProvider` with a `?? realModels.length > 0` fallback so pre-codegen/persisted workspaces and fixtures keep the old behavior; the shared pure gate is `isSynaAvailable({ hasAiPermissionFlag, hasConfiguredAiProvider })`. Admins (`AI_SETTINGS`) get a single "Connect a provider" slash item to `SettingsPath.AiProviders`; members get nothing.
- **Front field off a live codegen without the server:** `codegen-metadata.cjs` introspects `http://localhost:3000/metadata`, so a new server field cannot be regenerated when services are down. Bridge it by hand-editing `generated-metadata/graphql.ts` at exactly 5 spots — the `Workspace`/entity type (once) + the 2 query result types + the 2 `DocumentNode` occurrences (`UserQueryFragmentFragmentDoc` and the inline fragment inside `GetCurrentUserDocument`) — and add the field to the fragment source so the orchestrator's metadata codegen reproduces it. `useRecommendedModels: boolean`/its JSON field node are unique enough to `replaceAll`-anchor on (2 each). Non-null new fields force every `satisfies Workspace` mock (`testing/mock-data/users.ts`) to add them; declare nullable fields as `Pick` and wrap non-null ones in the `& { ... }` intersection as optional.
- **A2E slice tests use `~/` never relative-parent imports:** oxlint `no-restricted-imports` bans `../foo`, and jest maps `@/` → `src/modules/$1` only, so a test under `src/pages/**` must import its sibling via `~/pages/...` (the `~/` → `src/` alias), while a non-test sibling inside `src/pages/**` can import `./foo`.

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

## 2026-10-01 - US-134
- M7c-2 complete: a2e-chat's `Discussions` nav row (LINK `/discussions`) now nests under a2e-documents' `Bureau` FOLDER via the duplicated external UUID `c31a0000-0010-4000-8000-000000000002`, position 2 (after Pages 0, Projets 1). `Mes tâches` stays excluded (2-level depth cap).
- New `EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau` in a2e-chat constants; nav item reparented; `chat-navigation.test.ts` asserts nesting/position; `chat-object-integrity.test.ts` nav walk accepts the external folder. `package.json` 0.1.1→0.1.2; README documents the Documents→Projects→Chat install order (fixed the stale "not part of any workspace preset").
- Files changed: `packages/twenty-apps/internal/a2e-chat/src/constants/universal-identifiers.ts`, `src/navigation-menu-items/channels.navigation-menu-item.ts`, `src/lib/__tests__/chat-navigation.test.ts`, `src/lib/__tests__/chat-object-integrity.test.ts`, `package.json`, `README.md`.
- **Learnings:**
  - `defineNavigationMenuItem` accepts `folderUniversalIdentifier` on LINK rows too (not just VIEW); the manifest build passes it through (`from-navigation-menu-item-manifest-to-universal-flat-navigation-menu-item.util.ts`).
  - At install the folder must already exist: `FlatNavigationMenuItemValidatorService.validateFlatNavigationMenuItemCreation` rejects a missing parent with `NAVIGATION_MENU_ITEM_NOT_FOUND`. There is no manifest-level app-dependency field, so cross-app folder nesting is order-dependent.
  - No new prerequisite needed for chat: it already pins `project.discussions` on projects' `project`, and projects pins `project` on documents' `document`, so documents (folder owner) is transitively always installed first; the US-133 bundle also orders documents→projects→chat.
  - Verify a manifest row cheaply by loading `.twenty/output/manifest.json` (gitignored) with python3 and printing the `navigationMenuItems` fields.
---

## 2026-10-01 - US-135 (M10a-3)
- Wired workspace BYOK into `AiModelRegistryService` for generation time. New `runWithWorkspaceRegistry(workspaceId, fn)` installs a per-request AsyncLocalStorage view built from `ProviderConfigService.getWorkspaceProviderResolution`; all registry reads consult the active view.
- Workspace SDK instances use `sdkProviderFactory.createTransientProvider` (never the providerName-keyed cache) and `RegisteredAiModel.rawProvider` is carried so `AiModelConfigService.getNativeModelTools` uses the same BYOK provider.
- Wired chat (`ChatExecutionService`), `AgentAsyncExecutorService`, `AiGenerateTextController`, `AgentTitleGenerationService`, `AgentTurnGraderService`, `WorkspaceSetupChatService`, and `AgentChatResolver` availability.
- Files changed: `ai-models/services/{ai-model-registry,provider-config,ai-model-config}.service.ts`; `ai-chat/services/{chat-execution,agent-title-generation,workspace-setup-chat}.service.ts`; `ai-chat/resolvers/agent-chat.resolver.ts`; `ai-agent-execution/services/agent-async-executor.service.ts`; `ai-agent-monitor/services/agent-turn-grader.service.ts`; `ai-generate-text/controllers/ai-generate-text.controller.ts`; 2 chat-execution specs; new `ai-model-registry.service.spec.ts`; `provider-config.service.spec.ts`; `test/integration/ai/suites/workspace-ai-provider.integration-spec.ts`.
- **Learnings:**
  - `SdkProviderFactoryService.createProvider` caches by providerName only, so it leaks a BYOK key across workspaces; workspace resolution must use `createTransientProvider` or carry the instance on the model.
  - `ProviderConfigService` needed a `hasWorkspaceOverrides` signal so the registry can keep the exact instance path for key-less workspaces (preserves native raw-provider lookups).
  - Tier 1 integration spec was not run: Postgres/Redis are down in this environment (`pg_isready` exit 3, `redis-cli ping` refused).
  - The front `ClientConfig.aiModels` is still instance-wide — a BYOK-only workspace is invisible to the US-130 zero-AI gate until `getClientConfig` is workspace-scoped.
---

## 2026-10-01 - US-136 (P4.2 task-calendar complexity defect)
- Kept the a2a4932f compute-side repair (no `project` relation column in `task-calendar.view.ts`) and added the missing regression guard: a pure complexity model + test.
- New `a2e-projects/src/lib/task-calendar-complexity.ts` mirrors the server formula `1 + (1 + relationFieldsCount) * getGroupLimit(limit)`. Calibrated to the live 2026-09-24 defect: `OBSERVED_DEFECT_COMPLEXITY = 2001`, `NON_VIEW_RELATION_FIELD_COUNT = 38`, so the repaired view computes 1951 (≤ cap, headroom 49); re-adding the project column reproduces 2001 > cap.
- New `src/lib/__tests__/task-calendar-complexity.test.ts` (5 tests): no relation column, scalar `dueAt` group-by target, complexity ≤ 2000 with headroom, regression witness, and the US-059 OR completion group + `project IS_NOT_EMPTY` scope unchanged. `package.json` 0.1.18→0.1.19.
- Files changed: `packages/twenty-apps/internal/a2e-projects/src/lib/task-calendar-complexity.ts`, `src/lib/__tests__/task-calendar-complexity.test.ts`, `package.json`, `docs/plan/phases/phase-04-report.md`.
- **Learnings:**
  - The GroupBy error `Query complexity: 2001. Maximum complexity: 2000.` comes from `CommonGroupByQueryRunnerService.computeQueryComplexity` (not the graphql-query-complexity hook, whose messages differ), so a view's selected relation columns are the controllable input.
  - `DEFAULT_NUMBER_OF_GROUPS_LIMIT` is 50 and `COMMON_QUERY_COMPLEXITY_LIMIT` is 2000; the app can import the former from `twenty-shared/constants` in `src/lib/` (twenty-shared is only in the root `node_modules`; node resolves upward).
  - The manifest read-back (`.twenty/output/manifest.json`) is the cheap proof the view still ships title+projectStatus fields, dueAt calendarField, and the three filters.
  - Tier-2 gap: the calibration cannot see the front's junction-leg expansion, so only a live task-calendar render proves the real query stays under the cap.
---

## 2026-10-01 - US-137
- M9b-2 first slice (record-action mount): mounted a `Save as template` **record action** on the document, project and Bilan fiche record surfaces, each calling its US-119 payload builder and persisting a fresh template row (C1: no aliasing).
  - documents: `save-document-template-service.ts` reads the selected document, `buildSaveAsTemplatePayload` → `createDocuments` with `kind: TEMPLATE`.
  - projects: `save-project-template-service.ts` reads the project (+ tasks), `buildSaveProjectAsTemplatePayload` → `createProjects` (`isTemplate: true`) + `createTasks` (fresh rows).
  - accounting: `save-fiche-template-service.ts` reads the fiche, `buildSaveFicheAsTemplatePayload` → `createFiches` (`isTemplate: true`, layout-only).
  - Each app: new `command-menu-items/save-*-as-template.command-menu-item.ts` (`RECORD_SELECTION` on the app object), `front-components/save-*-as-template-command.front-component.tsx` (`<Command>` + `enqueueSnackbar`), uid constants, lib unit tests, one patch bump.
- Files changed: `packages/twenty-apps/internal/{a2e-documents,a2e-projects,a2e-accounting}/src/{lib/save-*-template-service.ts, lib/__tests__/save-*-template-service.test.ts, front-components/save-*-as-template-command.front-component.tsx, command-menu-items/save-*-as-template.command-menu-item.ts, constants/universal-identifiers.ts, package.json}`.
- **Learnings:**
  - Command-menu `icon` is deprecated → build warning only; omit it.
  - `RECORD_SELECTION` + `availabilityObjectUniversalIdentifier: <app object uid>` scopes a record action correctly; `targetObjectReadPermissions.<appObjectName>` works.
  - Still open for US-137: the **board view menu** mount (no view-availability primitive exists — needs a twenty-front core seam) and the **gallery** mount (list saved `isTemplate` rows), plus the Tier-2 round-trip.
---

## 2026-10-01 - US-138
- M8b-2 editable inline views: `resolveRecordViewEmbedState`'s ready state now carries `isUIEditable: objectPermissions.canUpdateObjectRecords`, and `RecordViewEmbedHost` passes it to `RecordTableWidgetRendererContent` (was hardcoded `false`). Denied-read still renders the US-123 safe stub; read-only is still the default when update rights are absent.
- No forked write path: raising `isUIEditable` clears `isRecordTableCellsNonEditableComponentState` in `RecordTableWidgetStatesEffect`, so cell edits flow through the widget's existing `RecordTableUpdateContext` → `useUpdateOneRecord` mutation.
- Files changed: `packages/twenty-front/src/modules/blocknote-editor/{utils/resolveRecordViewEmbedState.ts, components/RecordViewEmbedHost.tsx, utils/__tests__/resolveRecordViewEmbedState.test.ts, components/__tests__/RecordViewEmbedHost.test.tsx}`.
- **Learnings:**
  - The embedded view's persist path is entirely the shared record-table stack; the only host-level edit switch is the `isUIEditable` prop. `RecordTableWidgetStatesEffect` maps it to `isRecordTableCellsNonEditableComponentState`.
  - Unit-testing the prop flip: capture the mocked `RecordTableWidgetRendererContent` arguments (`expect(mock).toHaveBeenCalledWith(expect.objectContaining({ isUIEditable: true }))`) rather than a live mutation.
  - Tier-2 E14 browser round-trip still owed by the orchestrator.
---

## 2026-10-01 - US-139
- M8d first slice (mention index + read model): the save pipeline now persists a document's mention nodes into an app-owned `documentMention` index, and "Mentioned in" reads that index instead of the body.
  - `objects/document-mention.object.ts`: polymorphic text target (`targetObjectNameSingular`+`targetRecordId`), optional `targetLabel`, unique `mentionKey`, CASCADE relation to `document`; `document.object.ts` gets the `mentions` O2M inverse.
  - `lib/document-mentions.ts`: `extractDocumentMentionTargets` (recursive blocknote walk, dedupe, skip legacy metadata-id-only mentions, malformed JSON → []), `buildMentionIndexRows`, `diffMentionIndex`, `syncDocumentMentions` (query existing → create/delete/update delta), `listMentionedInDocuments` (index-only read, drops null/unauthorized document relations, dedupes, sorts).
  - `logic-functions/index-document-mentions.ts`: `document.updated` trigger with `updatedFields: ['content']`; reuses `readDocumentRevisionBody`.
  - 12 new unit tests; package 0.2.10→0.2.11.
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/{objects/document-mention.object.ts, objects/document.object.ts, constants/universal-identifiers.ts, lib/document-mentions.ts, lib/__tests__/document-mentions.test.ts, logic-functions/index-document-mentions.ts, package.json}`.
- **Learnings:**
  - A second logic function may subscribe to the same `document.updated`/`content` trigger as `guard-document-revision-save`; the manifest keeps both with their own handler.
  - Reusable index pattern recorded at the top of this file (Database-event trigger + app-owned index object + diff-based sync + index-only read model).
  - Still open for US-139: the AC3 `FRONT_COMPONENT` "Mentioned in" widget + page-layout tabs (the read seam `listMentionedInDocuments` is ready), and the Tier-2 E14/E17 browser leg.
---

## 2026-10-01 - US-140
- M10b-2 editor selection toolbar: replaced BlockNote's default formatting toolbar in the document editor with a custom `FormattingToolbarController` that renders the exact default controls (`getFormattingToolbarItems()`) and appends the Syna selection actions.
  - `SynaFormattingToolbar.tsx`: outer gate `useHasPermissionFlag(AI)` + `useWorkspaceAiModelAvailability().enabledModels` (identical to `SynaSlashMenuItem`); inner maps `getOfferedSynaActions(SYNA_DOCUMENT_AI_ACTIONS)` to `Components.FormattingToolbar.Button`s that stage a `PREFILL` draft via `useOpenAskAiPageWithPreprompt` reading `editor.getSelectedText()` at click.
  - `buildSynaSelectionPrompt(action, selectedText)` + new `selectionPrompt` MessageDescriptor on `SynaAiAction`/`SYNA_DOCUMENT_AI_ACTIONS`: draft quotes the selection; empty selection degrades to the document prompt.
  - `BlockEditor.tsx`: `formattingToolbar={false}` + render `<SynaFormattingToolbar />` when `!readonly` (same guard as `DashboardsBlockEditor`).
- Files changed: `packages/twenty-front/src/modules/blocknote-editor/components/{SynaFormattingToolbar.tsx (new), __tests__/SynaFormattingToolbar.test.tsx (new), BlockEditor.tsx}`, `packages/twenty-front/src/modules/ai/{types/SynaAiAction.ts, constants/synaDocumentAiActions.ts, utils/buildSynaSelectionPrompt.ts (new), utils/__tests__/{buildSynaSelectionPrompt.test.ts (new), getOfferedSynaActions.test.ts}}`.
- **Learnings:**
  - `getFormattingToolbarItems()` is the non-fragile way to preserve the default toolbar; do not copy the Dashboard subset.
  - New required field on `SynaAiAction` forced fixture updates in `getOfferedSynaActions.test.ts` (tsgo checks specs).
  - `continue` stays unbuilt: no backing registry tool, so `getOfferedSynaActions` would filter it anyway (US-128 deferral stands). Provider gate is still the `enabledModels` proxy (US-130/US-141 reconcile it later). Tier-2 browser select→action→draft is the orchestrator's.
---

## [2026-10-01] - US-141
- M10d-2 zero-AI gating + cap display (partial).
  - Server: `ProviderConfigService.hasConfiguredAiProvider(workspaceId)` (resolution order → `isProviderConfigured`, includes workspace BYOK) exposed as `Workspace.hasConfiguredAiProvider`; new `Workspace.aiMonthlyTokenUsage` ResolveField (null when no/zero cap, else `AiMonthlyTokenCapService.getMonthlyTokenUsage`). Exported `AiMonthlyTokenCapService` from `AiBillingModule`, imported it into `WorkspaceModule`.
  - Front: `useWorkspaceAiModelAvailability` now returns `hasConfiguredAiProvider` (fallback `realModels.length > 0`), new pure gate `isSynaAvailable`; `SynaSlashMenuItem` swaps its gate and adds the admin-only "Connect a provider" entry (→ `SettingsPath.AiProviders`), `SynaFormattingToolbar` swaps its gate; new `SettingsAiMonthlyTokenCapSection` wired into `SettingsAiUsageTab` above the enterprise/ClickHouse gate.
  - `userQueryFragment.ts` + `currentWorkspaceState.ts` + `testing/mock-data/users.ts` + hand-bridged `generated-metadata/graphql.ts` (5 spots for the 3 fields).
- Files changed: server `ai-models/services/{provider-config.service.ts, __tests__/provider-config.service.spec.ts}`, `workspace/{workspace.resolver.ts, workspace.module.ts}`, `ai-billing/ai-billing.module.ts`; front `ai/hooks/useWorkspaceAiModelAvailability.ts`, `ai/utils/{isSynaAvailable.ts (new), __tests__/isSynaAvailable.test.ts (new)}`, `blocknote-editor/components/{SynaSlashMenuItem.tsx, SynaFormattingToolbar.tsx, __tests__/*}`, `pages/settings/ai/components/{SettingsAiUsageTab.tsx, SettingsAiMonthlyTokenCapSection.tsx (new), __tests__/SettingsAiMonthlyTokenCapSection.test.tsx (new)}`, `auth/states/currentWorkspaceState.ts`, `users/graphql/fragments/userQueryFragment.ts`, `testing/mock-data/users.ts`, `generated-metadata/graphql.ts`.
- **Learnings:**
  - Zero-AI gate is now provider-based (no longer `enabledModels.length === 0`): a provider configured but all models disabled still shows entries (the assistant itself warns). BYOK-only model pickers stay empty until `ClientConfig.aiModels` is workspace-scoped (US-135 remaining).
  - Cmd+K "Ask AI" is a seeded command-menu item (`standard-command-menu-item.constant.ts`, `conditionalAvailabilityExpression: 'permissionFlags.AI and not isInSidePanel'`); gating it needs a new availability variable + an upgrade command, so it (and the record-page context buttons) remain ungated.
  - `SettingsAiUsageTab` was split into `SettingsAiUsageTab` (cap section + analytics) and `SettingsAiUsageAnalytics` to keep the cap visible without the enterprise/ClickHouse gate.
  - Pre-existing (untouched) failing test: `usePageChangeEffectNavigateLocation.test.ts` (stale `AppPath` count; AppPath changed after the test).
---

## 2026-10-01 - US-142
- Implemented the M9c Agenda template family (6 skeleton templates): a host-side C1 descriptor group (no app), a pure client-injected apply path writing `calendarEvent` rows through the host calendar primitives, and gallery registration + apply delegation.
- Files changed: `modules/calendar/constants/AgendaTemplateDefinitions.ts`, `.../AgendaTemplateDescriptors.ts`, `.../calendar/utils/applyAgendaTemplate.ts`, `.../calendar/utils/findAgendaTemplateDefinition.ts`, `.../calendar/utils/findAgendaTemplateDescriptor.ts`, `.../calendar/hooks/useAgendaTemplateApply.ts`, `.../template-gallery/constants/HostTemplateDescriptorGroups.ts`, `.../template-gallery/hooks/useTemplateGalleryItems.ts`, `.../template-gallery/hooks/useApplyTemplate.ts` + 3 test files.
- **Learnings:**
  - `twenty/max-consts-per-file` (max 1) applies to `**/constants/*.ts` AND `**/*.constants.ts`; an override there is most-specific-wins, so nothing else in `.oxlintrc.json` can raise the cap in that glob. Data + a finder in one constants file fails → put the finder in `utils/`.
  - The rule is **not** scope-aware: it flags its own closes/opens/reopens and even one const owned by a nested `describe` in a test file under `constants/__tests__`. So a test that asserts over `AGENDA_TEMPLATE_DESCRIPTORS.map((x) => x.key)` must use `expect(...).toEqual([...literals])` instead of a second module-level `const EXPECTED = [...]`.
  - Jest here does NOT auto-load the sibling `jest.setup.ts` → a test that renders/hooks dies on `jest is not defined`; tests importing only pure utils are fine, which is why `useAgendaTemplateApply` stays exercised through the pure `applyAgendaTemplate` module.
  - The recurring-series convention: anchor event carries `recurrenceRule` (e.g. `FREQ=DAILY`, `FREQ=WEEKLY;BYDAY=FR`) + `recurrenceTimezone` + `recurrenceSeriesId = calendar-series#<anchorId>`; `buildCalendarEventInputFromDraft` + `buildCalendarSeriesAnchorInputFromDraft` are the front primitives to reuse.
  - Agenda idempotency without an app-owned field: use a deterministic per-operation `iCalUid` (`a2e-agenda-template:<key>:<operationId>:<index>`) plus deterministic uuid-v5 event ids, then pre-query `calendarEvent` by `iCalUid in [...]` and skip existing rows. A host descriptor group merged into `useTemplateGalleryItems` is the pattern for any future no-app family.
---

## [2026-10-01] - US-142 (verification resume)
- Re-ran US-142 after a fresh Ralph iteration re-entered it: the 17:23 `done-for-review` artifacts were already present and uncommitted on base `d3c8f97`. Verified only — zero new changes.
- Re-ran checks, all green: calendar/template-gallery jest → 12 suites / 51 passed; `twenty-front` tsgo → exit 0; oxlint 0/0; oxfmt clean.
- Reported `done-for-review` again (no CLAIMED appended — the 17:11 claim and 17:23 report already own this slice).
- **Learnings:**
  - When a fresh iteration re-enters a task whose `done-for-review` report already exists and the working tree matches its `Changed` list, the contract is verify-then-report, not rebuild: no new `CLAIMED` line (an earlier one would win the race anyway).
---
