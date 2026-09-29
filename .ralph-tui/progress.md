# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- Realtime topic ACLs live in ONE seam: `realtime-topic-authorization.service.ts`
  `assertTopicAuthorized` → `RealtimeTopicAccessService` (`assertCanAccessObjectRecord`
  / `assertCanAccessChatChannel`). Channel rule: `chatChannel.visibility === 'PUBLIC'`
  ⇒ any workspace member; otherwise a `chatChannelMember` row keyed
  `{ membershipChannelId, membershipWorkspaceMemberId }`; unknown/uninstalled ⇒ deny.
  The publisher names it `workspace:<id>:chat:<channelId>` (`buildChatChannelTopic`).
  Heartbeat revocation is the one `revalidateSocketAuthorizations` path — never add a
  second ACL path. The `object:` half is implemented but latent (no `object:` publisher).
- twenty-front enforces a custom oxlint rule `twenty(max-consts-per-file)` (max 1
  top-level `const` per file). Put a new exported constant in its own file, not
  appended to an existing constants module. Run `npx oxlint --type-aware -c
  .oxlintrc.json <files>` from inside `packages/twenty-front` (there is no root
  `.oxlintrc.json`; the config is per package).
- `npx nx lint:diff-with-main <pkg>` only sees *committed* changes
  (`git diff main...HEAD`); on the uncommitted working tree it prints "No changed
  files". Use direct `oxlint`/`oxfmt` on the touched paths instead.
- Lingui macro `t`/`msg` fall back to the source string when the key is absent
  from `locales/generated/en`, so renaming a source message does not require
  touching catalogs (do not commit catalog churn).
- `packages/twenty-shared/src/utils/index.ts` is an auto-generated barrel:
  `npx nx build twenty-shared` runs `generateBarrels` and rewrites it. After
  adding a new util under `src/utils/`, build and let the barrel pick it up —
  hand edits are reordered/merged, and dependents only see the export once the
  build (and `--skip-nx-cache` when switching branches) has run.
- `packages/twenty-apps/internal/*` are not Nx projects; they resolve
  `twenty-sdk` from their own pinned published version (currently 2.31.0), whose
  `NavigationMenuItemManifest.link` is a plain `string`. App source can adopt an
  allow-listed relative `link` with no repin — only the host needs the server
  allow-list + front pass-through to open it in-app.
- Integration specs run in their own module graph: `global.app.get(ControllerOrServiceClass)`
  throws "not found in the current context" even for a live provider, and
  `{ strict: false }` only fixes repository tokens resolved by the app's own
  classes (see `getCoreRepository`). To reach an app singleton from a spec, read
  it out of the module container by name (`test/integration/utils/get-app-provider-by-name.util.ts`).
- `npx nx run twenty-server:database:migrate:generate` diffs the *whole* schema
  against the dev DB, so stale constraint names produce unrelated DDL
  (FK renames, NOT NULL drops). Always diff the generated command and keep only
  the statements for the entity being added.
- Entity changes need a generated instance command, but a **brand-new table**
  needs no `@WasIntroducedInUpgrade` (that decorator is only for columns added
  to existing entities).
- Internal A2E app content (starter templates, fiches, projects) is
  code-data in the app's own `src/lib/*template*` constant and seeded by the
  app's post-install logic function through a data-driven delta
  (`findMissingStarterTemplates` by title / `findMissingStarterProjects` by key).
  Extending a family = extending the constant only — no seeder logic change. The
  content is French-only (no i18n layer in `twenty-apps/internal/*`); the
  `key/version/labels fr+en/category` descriptor contract is US-117's scope. The
  seeder's read page size must exceed the shipped bundle with headroom or a
  reinstall can re-seed a duplicate.
- a2e-accounting Bilan templates are `FICHE_TEMPLATES` descriptors keyed by
  `FicheTemplateKey` and backfilled through `withTemplateDefaults`; the paired
  editor contract is the fiche object's `templateKey` SELECT, so a new descriptor
  key must also land as a select option in `objects/fiche.object.ts` (append at
  the next position — never renumber the existing options).
- An app's `post-install` hook is auto-discovered from
  `src/logic-functions/post-install.ts` (default export of
  `definePostInstallLogicFunction`) — no `application.config.ts` wiring and no
  manifest reference is needed; `npx twenty dev:build .` picks it up. Keep the
  seeding write-path in a separate `logic-functions/handlers/*.ts` with an
  injectable `Pick<CoreApiClient,'query'|'mutation'>` so the node test runner can
  exercise it without importing `twenty-sdk/define`.
- a2e-drive folder-structure templates tag every seeded folder with its
  descriptor key in the driveFolder `templateKey` TEXT provenance field and delta
  on `filter: { templateKey: { is: 'NOT_NULL' } }`; the root folder's `name` is
  user-editable, so never delta on names. Child folders are created after their
  parent and reference the fresh parent id via the `parentId` write scalar.
- A `twenty-apps/internal/*` workflow recipe is four files: a pure `lib/*.ts`
  (deterministic C5 correlation key + preview writes plan), a
  `workflow-templates/*.workflow.ts` (DATABASE_EVENT/CRON trigger + LOGIC_FUNCTION
  step + validator), a `logic-functions/*.logic-function.ts` whose inline-typed
  handler (first/only function in the file) is what `dev:build` parses into the
  workflow-action `inputSchema`, and an injectable `logic-functions/handlers/*.ts`.
  Idempotency lives on the target row: query the persisted provenance
  (`project/task/document.recipeCorrelationKey`, or `calendarEvent.iCalUid`) before
  creating. App-owned fields pinned on standard/external objects are standalone
  `defineField` manifests (no server migration). Core API generic writes are
  `create<Plural>(data: [...])` (`createTasks`, `createDocuments`), while the
  internal workspace GraphQL factory names `create<Singular>(data)`.
- `packages/twenty-docs/docs.json` is GENERATED. Never hand-edit it: add the
  tab/group/page to `navigation/base-structure.json`, add the locale label to
  `l/<lang>/navigation.json`, then run `yarn docs:generate` (and
  `yarn docs:generate-navigation-template` to keep the Crowdin template in
  sync). A non-default-language page only appears in `docs.json` if its
  `l/<lang>/<slug>.mdx` exists (`formatPageSlug` returns null otherwise). Docs
  pages are `user-guide/a2e-suite/*.mdx` (en) + `l/fr/user-guide/a2e-suite/*.mdx`
  (fr). Relevant gate: `node docs/scripts/check-docs.mjs` plus
  `npx tsx scripts/lint-mdx.ts`; path-based `prettier --check` flags some
  committed JSON (`docs.json`, `base-structure.json`) at HEAD too, so judge
   formatting churn against the base, not the current tree.
- The inbox (`packages/twenty-front/src/modules/inbox`) deep-links by returning a
  URL string that `InboxPage` `navigate()`s — a store-driven side-panel open is
  not URL-expressible, so native records use `AppPath.RecordShowPage` with
  `CoreObjectNameSingular`. The server `CALENDAR_REMINDER` payload shape is
  `{ calendarEventId, title, startsAt, reminderMinutes, userId, timezone }`.
- twenty-front component tests of anything using `useLingui` must wrap the render
  in `I18nProvider` with `i18n.load({ [SOURCE_LOCALE]: messages })` /
  `i18n.activate(SOURCE_LOCALE)` (pattern: `chat/components/__tests__/ChatSidebar.test.tsx`);
  `@lingui/swc-plugin` is already in the jest transform. Tabler icons emit a
  `tabler-icon-<kebab-name>` class, so icon mapping is asserted with
  `container.querySelector('.tabler-icon-calendar-event')`.
- `twenty-apps/internal/*` front components and logic-function handlers share the
  one generated `CoreApiClient`, and twenty-sdk 2.31 has no front→logic-function
  execution API (`executeOneLogicFunction` is a WORKFLOWS-permission settings
  mutation). So a front screen that must run the same work as a logic function
  imports the function's **handler** (`logic-functions/handlers/*.ts`, already
  injectable/testable) directly — never the `twenty-sdk/define`
  `*.logic-function.ts` file — and passes it `new CoreApiClient()`. That keeps a
  single preview/write path instead of forking a second one in the screen.
- An internal app's page-layout tab icon is a string name resolved by the host
  from `twenty-ui/icon` (tabler); pick an existing export (e.g.
  `IconCalendarRepeat`) rather than adding a package.
- Ralph's prd queue can regenerate a task for work already committed under the
  older `US-0xx` tracking scheme, with a stale "starting state: partial"
  description. Before implementing an assigned task, `git log --oneline -- <the
  feature paths>` (and grep the phase report for the task's own id); if the
  feature is already on HEAD, report `done-for-review` and only close the one
  unmet non-Tier-2 bullet (usually the patch version bump).
- `NavigationMenuItemType.FOLDER` nav nesting is capped at two levels
  (`NAVIGATION_MENU_ITEM_MAX_DEPTH = 2` in `flat-navigation-menu-item-validator.service.ts`):
  a root folder → leaf child is fine, but a folder cannot contain another folder
  that has children. So "Mes tâches" (a folder of 3 smart-list views) cannot move
  under a suite folder. Cross-app nesting works like cross-app object relations
  (`all-many-to-one-metadata-relations.constant.ts` maps `folderUniversalIdentifier`):
  the parent folder resolves from the *installed* app's metadata, so a child app
  may point at a sibling app's folder **only if that app is a hard install
  prerequisite** (a2e-projects → a2e-documents via the `document` relation is safe;
  a2e-chat, optionally installed alone, is not). Duplicate the parent folder UUID
  as a constant in the child app — apps import neither `twenty-shared` nor each
  other (`twenty-sdk` 2.31 pinned). The app-local integrity test that checks
  folder refs must add the external folder id to its `folderIds` set.
- Host (standard) nav rows live in `STANDARD_NAVIGATION_MENU_ITEMS` and are
  provisioned for every new workspace by `buildStandardFlatNavigationMenuItemMaps`;
  a host page gets a `NavigationMenuItemType.LINK` row built by
  `createStandardNavigationMenuItemLinkFlatMetadata` targeting an allow-listed
  path (US-101). Preset flags that toggle a standard row (`agendaEnabled`) feed
  `getHiddenStandardNavigationMenuItemUniversalIdentifiers`, which the apply,
  the preview and the legacy-provenance inference all share; the restore builder
  must branch on the row type (LINK vs OBJECT) or a hidden host row cannot come
  back.
- Workspace upgrade commands have NO `down()`: the runner only calls
  `runOnWorkspace` (registered by `@RegisteredWorkspaceCommand(version, ts)`).
  A "down" acceptance line cannot be satisfied literally at the workspace level —
  make the command additive + idempotent and say so, rather than adding dead code.
- The A2E content-template descriptor contract (C1) lives once in
  `packages/twenty-shared/src/application/templateDescriptorType.ts` (+
  `templateDescriptorGuards.ts`, exported via the generated `application/index.ts`
  barrel). Apps import it as a **type-only** `twenty-shared/application`; keep that
  import in `src/lib/`, NOT under `src/logic-functions/` — the app `.oxlintrc.json`
  override forbids `twenty-shared` imports there. The type import is erased, so the
  built `.twenty/output/*.mjs` inlines no twenty-shared runtime, but `tsc` and
  `node --test` resolve `twenty-shared/dist` (untracked) → run
  `npx nx build twenty-shared --skip-nx-cache` before any app typecheck/test.
  Per-app projection goes in `lib/*descriptors.ts` (over the existing family
  constant) with a thin read-only `logic-functions/list-template-descriptors.ts`
  returning `{ templates }` and no `toolTriggerSettings` (a data source, not an
  AI tool). The contract's `preview` is `{ object, summary fr+en, count }[]`; the
  guard rejects `count: 0`, so only push a write the family actually creates.

---


## 2026-09-29 - US-100 (M7a-2: host strings → Agenda / Syna / Archive)
- Renamed the remaining host display strings to the five-app naming. Calendar:
  Home card "Open the calendar" → "Open Agenda", toolbar "Calendar view" →
  "Agenda view", and `/calendar` browser page title → "Agenda" via
  `getPageTitleFromPath`. Syna: AiChatPageHeader, SidePanelAskAiInfo,
  useOpenAskAiPageInSidePanel, EngineComponentKeyHeadlessComponentMap,
  useNavigationDrawerModes, SettingsAI title/breadcrumb, settings nav item, and
  the 6 AI-settings sibling breadcrumbs. Archive: DRIVE_FOLDER_ROOT_LABEL,
  DriveToolbar source-app option, DrivePage error, and the drive Cmd+K mapper.
  Cmd+K a2e-projects group heading now resolves to "Bureau" through a new
  `A2E_SUITE_APPLICATION_GROUP_HEADINGS` map consumed by useAppSearchResultItems.
  Docs updated: applications.md, product-experience.md, README-A2E.md, 5 app READMEs.
- Files changed: 30 front ts/tsx (incl. 2 new), 2 server comments, 6 docs/READMEs.
- **Learnings:**
  - The Cmd+K app-provider group heading is resolved client-side from
    `application.name` in `useAppSearchResultItems.ts`; the server provider has
    no heading field. To read "Bureau" for a2e-projects (displayName "Bureau
    Projets") the override must live in that resolution path, not in a rename of
    the provider's universal-identifier constant.
  - Generic `AI` (roles/permission flags, workflow action type, admin/usage tabs)
    is intentionally left untouched; only the settings-section title/breadcrumbs
    and the assistant's own surfaces become `Syna`.
  - There is no host Cmd+K entry for the calendar in the codebase, so the M7a
    note's "Cmd+K entries" bullet has no code to change.
---

## 2026-09-29 - US-101 (M7b: internal-route nav items, resolves D09)
- Added a shared allow-list mechanism in twenty-shared: `INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS` (`/calendar /chat /discussions /drive /home /inbox`), `isInternalNavigationMenuItemRoute` (host-relative only; rejects `//`, schemes, `..`, unknown paths) and `isAllowedNavigationMenuItemLink` (external `isValidUrl` OR allow-listed internal, explicitly rejecting protocol-relative `//evil.com`).
- Server: the app-sync manifest validator now accepts `LINK` when `isAllowedNavigationMenuItemLink(link)`; the AI create/update tool schemas share a new `navigationMenuItemLinkSchema` using the same predicate. Extended `LINK` validation instead of adding a nav type.
- Front: `getLinkNavigationMenuItemComputedLink` returns an allow-listed relative path unchanged so `NavigationDrawerItem` renders an in-app `<Link>` (no `https://` prefix, no new tab); the external arrow is hidden for internal rows. External links keep the old behaviour.
- SDK: `defineNavigationMenuItem` now build-time-validates LINK targets against the allow-list; `twenty-sdk/define` exports `AppPath`, the route-path const and type.
- Apps: repointed `a2e-chat` Discussions (VIEW→LINK `/discussions`) and `a2e-drive` Archive (VIEW→LINK `/drive`) + their READMEs, so the rows open the native pages in-app.
- **Learnings:**
  - `isValidUrl('/drive')` is false but `isValidUrl('//evil.com')` is **true** (the parser resolves it to `https://evil.com`), which is why the combined allow-list adds an explicit `//` rejection: the plain `isValidUrl || isInternal…` OR alone would accept protocol-relative targets.
  - The published app SDK (2.31.0) already types `link?: string`, so repointing app nav items to relative targets needs no SDK repin to compile; the SDK-source typing/validation only matters to future app builds.
  - Repinning requires a coordinated `nx version:bump` (server `TWENTY_CURRENT_VERSION` must match the SDK version) plus an npm publish — recorded as deferred, not attempted.
  - `npx jest --findRelatedTests` runs a large, partly flaky front batch (`SidePanelPathRestore` passed in isolation); prefer the narrow path-scoped jest run for the touched module.
---

## 2026-09-29 - US-102 (M10a-1: workspace BYOK server core)
- Added `WorkspaceAiProviderEntity` (`core."workspaceAiProvider"`, unique on `(workspaceId, provider)`, `encryptedApiKey` text) and `WorkspaceAiProviderService` (encrypt-on-write via `SecretEncryptionService.encryptVersioned`, decrypt-on-read with a safe `AiException(API_KEY_NOT_CONFIGURED)` on failure; `upsertProvider`/`removeProvider`/`resolveProviders`).
- `ProviderConfigService.getResolvedProvidersForWorkspace` merges workspace rows last (never template-resolved) over instance `AI_PROVIDERS` over catalog; workspace entries are kept even when `includeCustomProviders` is false (explicit D-N4 entitlement bypass).
- Generated fast instance command `2-39-instance-command-fast-1790711712877-create-workspace-ai-provider.ts` (auto-registered); the generator emitted unrelated drift that was stripped.
- Files: 1 new entity, 1 new service, 1 edited service, 1 edited module, 1 migration, 1 constant file, 2 unit specs (12 tests), 1 integration spec (5 tests), 1 test util.
- **Learnings:**
  - `global.app.get(ServiceClass)` in an integration spec fails with "does not exist in the current context" because the spec's module graph is a distinct copy of the app's; `strict: false` only rescues repository tokens (see `getCoreRepository`). Look the provider up from the module container by name instead — new util `test/integration/utils/get-app-provider-by-name.util.ts`.
  - `database:migrate:generate` diffs the whole schema, so a dev DB with stale FK names produces unrelated statements; always diff and prune to the intended table before committing the generated command.
  - New core tables are created by instance commands (legacy TypeORM migrations are frozen); a brand-new entity needs no `@WasIntroducedInUpgrade` (that decorator is only for added columns on existing entities).
---

## 2026-09-29 - US-103 (M9c family: 20 curated Bureau page templates)
- Added the 15 missing page templates to `a2e-documents/src/lib/starter-templates.ts` (weekly review, daily note, OKR, team wiki home, onboarding guide, recurring agenda, decision log/ADR, retrospective, brainstorm, reading list, Cornell course notes, thesis planner, recipe book, travel plan, personal CRM) — 20 total in the existing `{title, markdown}` shape.
- Extended `starter-templates.test.ts`: 20-title bundle assertion, uniqueness test, one `descriptor « … » is shaped and instantiable` test per descriptor (loop) → 221 unit tests pass.
- Raised the post-install template read `first: 30`→`200` so the missing-titles delta stays exhaustive at 20 shipped titles (otherwise a workspace with >10 user templates could re-seed a duplicate).
- Bumped `a2e-documents` 0.2.1→0.2.2; updated README + `docs/features.md` five→twenty; created `docs/plan/phases/phase-13-report.md`.
- Files changed: `starter-templates.ts`, `starter-templates.test.ts`, `post-install.ts`, `package.json`, `README.md`, `docs/features.md`, `phase-13-report.md`.
- **Learnings:**
  - US-103's AC names a descriptor shape `(key, version, labels fr/en, category, content)` that does not exist; the real shape is `{title, markdown}` and every A2E app content family is French-only. The richer contract is US-117's deliverable — do not invent it in a content slice. Report the deviation explicitly.
  - Extending a content family needs no seeder logic change: `findMissingStarterTemplates` is data-driven. Only the seeder's read page size needs headroom over the bundle size.
  - `docs/plan/phases/phase-13-report.md` is the M9 report file (per PLAN's milestone→report table) and did not exist before this slice — create it on first M9 slice.
---

## 2026-09-29 - US-104 (M9c family: 12 curated Bureau project templates)
- Added the 10 missing project templates to `a2e-projects/src/lib/starter-projects.ts` (sprint board SPR, content calendar CNT, hiring pipeline REC, client onboarding ONB, website redesign WEB, student semester SEM, association AG AGA, grant application SUB, bug tracker BUG, personal goals/habits OBJ) — 12 total in the existing `{name, key, status, health, description, tasks, milestones}` shape, 5 tasks + 3 milestones each.
- The `SUB` grant-application description notes its Bilan link as text only ("le volet financier … se prépare dans Bilan ; ce projet ne l'installe ni ne le requiert") — no install, no required app.
- Extended `starter-projects.test.ts`: 12-key list assertion, Bilan-link assertion, one `descriptor « … » is shaped and instantiable` test per descriptor (loop), a delta-keys-on-key-not-name test, delta expectation updated → 297 unit tests pass.
- Raised the post-install project read `first: 30`→`200` so the missing-keys delta stays exhaustive at 12 shipped keys.
- Bumped `a2e-projects` 0.1.11→0.1.12; updated README + `docs/features.md` two→twelve. Appended to `docs/plan/phases/phase-13-report.md`.
- Files changed: `starter-projects.ts`, `starter-projects.test.ts`, `post-install.ts`, `package.json`, `README.md`, `docs/features.md`, `phase-13-report.md`.
- **Learnings:**
  - The Projects seeder delta is by project `key` (the short human-id prefix), unlike Documents' by title. Extending the family is constant-only; the only seeder edit needed is the read page size.
  - The existing descriptor field is `name`, not `title`; the AC's `(title/key fr+en)` matches US-103's phantom descriptor contract — match the real shape and report the fr+en deviation, don't invent a parallel one.
  - `oxfmt` excludes `packages/twenty-apps/internal/**` (reports "all matched files may have been excluded by ignore rules"), so formatting is not gated there; `yarn lint` + `dev:build` typecheck are the real gates.
---

## 2026-09-29 - US-105 (M9c family: Bilan templates — personal monthly budget + freelancer invoicing kit)
- Added two `FICHE_TEMPLATES` descriptors to `a2e-accounting/src/lib/fiche-templates.ts`: `BUDGET_MENSUEL_PERSONNEL` (personal monthly budget, reuses the existing `budgetGridSection` charges/produits shape with new `PERSONAL_BUDGET_CHARGES`/`PERSONAL_BUDGET_PRODUITS`, every amount 0) and `KIT_FACTURATION_INDEPENDANT` (issuer → client → devis → facture → relances → notes, all amounts/unit prices 0; no invoice-builder logic — P7-gated).
- Extended the fiche object's `templateKey` SELECT with the two new options (positions 8/9, additive) so the editor accepts the keys.
- Extended `fiches.test.ts`: shape test 8→10 + one test per new descriptor (zeroed budget posts; quote→invoice→reminders section order) → 108 tests pass.
- Bumped `a2e-accounting` 0.1.0→0.1.1; updated README Fiches row + `docs/features.md` Bilan paragraph; appended to `docs/plan/phases/phase-13-report.md`.
- Files changed: `fiche-templates.ts`, `objects/fiche.object.ts`, `fiches.test.ts`, `package.json`, `README.md`, `docs/features.md`, `phase-13-report.md`.
- **Learnings:**
  - Bilan's "gallery family" is the `FICHE_TEMPLATES` descriptor record; the install seeds (`STARTER_FICHES`) are a separate, smaller set (2 draft fiches). US-105 ships descriptors only — do not extend `STARTER_FICHES` (C6 keeps install from pre-filling finance content).
  - A descriptor key that is absent from the fiche `templateKey` SELECT is unusable in the editor, so descriptor additions in this app pair with an additive select option in `objects/fiche.object.ts`.
  - `Turquoise`/`pink` are valid `TagColor`s (`packages/twenty-shared/src/types/FieldMetadataOptions.ts`), usable for new select options.
  - `yarn test:unit` (node --test) is the app test entry; `yarn lint` is oxlint-only (106 files, 0 warnings).
---

## 2026-09-29 - US-106 (M9c family: Archive folder-structure templates ×4 — a2e-drive)
- Added `src/lib/folder-structure-templates.ts`: `FolderStructureTemplate` descriptors (`key`, `version`, `labels` fr+en, `category`, `requiredApps`, `tree`) for `CLIENT`, `ASSOCIATION`, `ETUDIANT`, `ADMINISTRATION_ENTREPRISE`, plus `findMissingFolderStructureTemplates` (delta by key) and `flattenFolderStructureTemplate` (parent-before-child drafts).
- Added a nullable `templateKey` TEXT provenance field to the `driveFolder` object + its id in `universal-identifiers.ts`; every seeded folder carries its descriptor key, so re-apply deltas on `templateKey` and never duplicates a subtree.
- Added `src/logic-functions/handlers/seed-folder-structures-handler.ts` (injectable client, creates folders only — roots then children via `parentId`, fresh DB ids) and `src/logic-functions/post-install.ts` (auto-discovered hook).
- Tests: 8 in `folder-structure-templates.test.ts` (family + one per descriptor + ordering + delta + unknown key) and 4 in `seed-folder-structures-handler.test.ts` (fresh seed / child parenting / re-apply no-op / partial delta) → 87 pass (was 75).
- Bumped `a2e-drive` 0.1.1→0.1.2; updated README; appended to `docs/plan/phases/phase-13-report.md`.
- Files changed: `folder-structure-templates.ts`, `folder-structure-templates.test.ts`, `seed-folder-structures-handler.ts`, `seed-folder-structures-handler.test.ts`, `post-install.ts`, `objects/drive-folder.object.ts`, `constants/universal-identifiers.ts`, `package.json`, `README.md`, `phase-13-report.md`.
- **Learnings:**
  - a2e-drive had no post-install hook despite the brief saying one existed; adding `definePostInstallLogicFunction` under `src/logic-functions/post-install.ts` is enough (auto-discovered, no app-config wiring).
  - The AC's descriptor contract (`key/version/labels fr+en/category/requiredApps`) is implemented here per US-106's explicit AC, unlike US-103/104/105 which deferred it to US-117. `requiredApps` is `[]`: a folder tree only uses Archive's own object.
  - `npx twenty dev:build .` regenerated `.twenty/output` (gitignored) and confirms the field + post-install in the manifest (12 files, was 10).
---

## 2026-09-29 - US-107 (M9c family: cross-app workflow recipes ≥6)
- Added `src/lib/workflow-recipes.ts`: the C1 family registry (6 entries — 2 existing, 3 new, 1 P7-deferred) with `key/version/labels fr+en/category/requiredApps/preview` writes and `validateWorkflowRecipeDescriptors` (≥6, bilingual labels, ready recipes have previews, no invoice/accounting write while P7 blocked, deferred has reason + no preview).
- Added the three non-P7 recipes end to end: pure `meeting-notes-recipe.ts` / `file-review-recipe.ts` / `task-due-reminder-recipe.ts` (+ shared `recipe-correlation.ts`), builders/validators `workflow-templates/{meeting-notes,file-review,task-due-reminder}.workflow.ts`, logic functions + idempotent handlers `logic-functions/{...}.logic-function.ts` + `handlers/*.ts`.
- Meeting event → notes page (`calendarEvent.created` → `createDocuments`), file in project → review task (`document.created` → `createTasks`, `SKIPPED` when no project), task due → Agenda reminder (`task.updated` → `createCalendarEvents` with native `reminderMinutes`).
- Idempotency: new nullable `recipeCorrelationKey` TEXT on task + document (mirrors `project.recipeCorrelationKey`); calendar reminder uses `iCalUid`. Invoice-paid recipe recorded `DEFERRED` gatedBy P7, never built.
- Tests: 27 new (lib recipe/descriptor/workflow + handler stubs) → 335 pass total. Bumped `a2e-projects` 0.1.12→0.1.13. Appended to `docs/plan/phases/phase-13-report.md`.
- Files changed: 5 new lib files + 1 lib edit, 3 new workflow templates, 3 new logic functions + 3 handlers, 2 new fields, 1 constants edit, 10 new specs, `package.json`, `phase-13-report.md`.
- **Learnings:**
  - The workflow-action `inputSchema` is inferred by parsing the inline-typed handler in the `.logic-function.ts`; keep it the first and only function in the file (no exported helpers) or the manifest builder can't see it.
  - `npx twenty dev:build .` is the authoritative check that the inline schema + new fields + workflow actions all register (46 files this run).
  - `createCalendarEvents` (generic plural core-API create for the standard `calendarEvent`) is unit-tested against a stub only — Tier-2 must confirm the running core API accepts a local channel-less calendar event.
---

## 2026-09-29 - US-108 (M12a: docs info architecture — user-guide/a2e-suite + docs.json nav)
- Added the 11-page A2E Suite guide skeleton (Overview · Getting started · Bureau · Agenda · Bilan · Syna · Archive · Templates · Working across apps · Admin & self-host · FAQ/Troubleshooting) in en (`packages/twenty-docs/user-guide/a2e-suite/*.mdx`) and fr (`l/fr/user-guide/a2e-suite/*.mdx`); every page states `Suite A2E 0.2.1 · Twenty 2.39.0` and lists the exact real screens with their source labels.
- Registered the group in `navigation/base-structure.json` (`a2eSuite`, icon `rocket`), the fr label in `l/fr/navigation.json`, then regenerated `docs.json` + `navigation/navigation.template.json`.
- No TS/entity/schema touched; no app version bump.
- **Learnings:**
  - `docs.json` is generated from `base-structure.json` + `l/<lang>/navigation.json` via `yarn docs:generate`; non-default-language pages are only emitted when the localized `.mdx` exists.
  - `mintlify validate` fails repo-wide on a pre-existing parse warning in `l/ar/.../implementation-services.mdx` (untouched) — the docs AC gate `node docs/scripts/check-docs.mjs` passes.
  - `prettier --check` flags `docs.json`/`base-structure.json` at HEAD too (path-based config), so those warnings are not introduced here.
---

## 2026-09-29 - US-109 (US-092: inbox CALENDAR_REMINDER label/icon/deep-link — P4C.4 front leg)
- Inbox now renders `CALENDAR_REMINDER`: Lingui label "Calendar event reminder", `IconCalendarEvent` (no Calendar concept exists in the icon dictionary → selection rule 5, and it is already the event icon across the P4C surfaces), and a deep link to the native `calendarEvent` record page.
- Added `parseCalendarReminderNotificationPayload.ts` (defensive title/startsAt/reminderMinutes/calendarEventId read; nulls on missing keys) and `formatCalendarReminderStart.ts` (ISO→local, invalid→null). The item shows the event title, "Starts …" and "N min before" / "At the time of the event".
- Added one additive server payload key: `reminderMinutes` in `buildCalendarReminderNotificationPayload` (the acceptance names it; only title/startsAt existed).
- Files changed: `InboxNotificationItem.tsx`, `resolveNotificationDeepLink.ts`, 2 new utils, 3 new/extended spec files, server `calendar-reminder.util.ts` + spec, phase-04-report.
- **Learnings:**
  - `icon-dictionary.md` has no Calendar/Event row — rule 5 says reuse an existing `twenty-ui/icon` icon; `IconCalendarEvent` is the sibling-surface choice.
  - The inbox row preview already returned `title` (it is in `PREVIEW_PAYLOAD_KEYS`), so the calendar leg only had to add the start/lead lines.
  - All Tier-0 gates green (inbox 44, server calendar+notification 126, tsgo both packages, oxlint 0/0); Tier-2 live click-through is the orchestrator's.
---

## 2026-09-29 - US-110 (P4.2 retroplanning screen)
- Built the missing user-facing P4.2 retroplanning screen in `a2e-projects` and registered it on the project record page.
- Files changed: NEW `packages/twenty-apps/internal/a2e-projects/src/front-components/project-retroplanning.front-component.tsx`; `src/lib/retroplanning-screen.ts` (+`buildRetroplanningDestructiveSubtitle`); `src/logic-functions/handlers/apply-retroplanning-handler.ts` (`previewRetroplanning` +additive `pendingRemovals: {id,title}[]`); `src/constants/universal-identifiers.ts` (+`projectRetroplanning c31b0000-0013-…000d`); `src/page-layouts/project.page-layout.ts` (+tab `c31b0200-0009-…0008`, +widget `c31b0200-000a-…0010`); tests `retroplanning-screen.test.ts`, `apply-retroplanning-handler.test.ts`; `package.json` 0.1.13→0.1.14; `README.md`.
- Screen: recipe `<select>` (delivery/event v1), deadline date+time+IANA timezone form, per-role assignee mapping (project `members.workspaceMember`, read via `buildFindOneByIdArgs`), preview table (dates/durations/dependencies/assignees/warnings) from `previewRetroplanning` + `buildRetroplanningPreviewRows`, stale-preview guard on `buildRetroplanningInputKey`, APPEND/REPLACE draft, and an explicit `openCommandConfirmationModal` destructive confirmation naming the recipe-owned rows REPLACE would delete.
- **Learnings:**
  - No front→logic-function execution API in twenty-sdk 2.31: reuse the handler as the single preview/write path (see Codebase Patterns).
  - `npx twenty dev:build .` bundles a front component's imported handler + `CoreApiClient` fine; manifest picked up the new widget id.
  - `yarn test:unit` now 336/336; `yarn typecheck`/`yarn lint` clean; oxfmt check clean on non-lib touched files.
  - The retroplanning provenance/idempotency + manual-edit/DONE protection live entirely in the engine/handler and were reused untouched.
- Missing (Tier 2 orchestrator): live install + E06 journey proof.
---

## 2026-09-29 - US-111 (P3.2 persist revision history — durable storage/retention/block-diff/restore)
- Verified the durable revision-history path already shipped on HEAD (prior US-031 cycle): `documentRevision` app object + `useDocumentRevisionPersistence` transport + `EditorVersionHistoryStore` optional-adapter seam (retention 20 oldest-first) + `getBlockLevelDiff` + append-on-restore, wired from `RichTextFieldEditor` → `BlockEditor` only for `objectNameSingular === 'document'`.
- Closed the one unmet non-Tier-2 acceptance bullet: bumped `a2e-documents` 0.2.2 → 0.2.3.
- Files changed: `packages/twenty-apps/internal/a2e-documents/package.json`; `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - Ralph regenerated a prd task (US-111) for work already committed under the older `US-0xx` tracking scheme; always grep `git log` for the feature paths before implementing — the description ("starting state: partial") can be stale relative to HEAD.
  - The app `yarn.lock` uses `workspace:.` resolution, so a patch `version` bump needs no lockfile edit; `.twenty/output` is gitignored.
  - Gates: a2e-documents typecheck/test:unit (221/221)/lint/dev:build all green; twenty-front version-history jest 29/29 + tsgo exit 0.
- Missing (Tier 2 orchestrator): E05 reload + second-session + restricted-role browser proof.
---

## 2026-09-29 - US-112 (P3.2 atomic expected-revision save + conflict banner)
- Verified the atomic expected-revision save already shipped on HEAD (prior US-032 cycle, committed `e5824205`): app `document-revision-cas.ts` (`resolveDocumentSaveCas` repairs a stale committed write, never rejects — SDK has no pre-write hook) + `guard-document-revision-save.ts` (`document.updated` trigger, `updatedFields:['content']`, `repair-` sentinel for loop termination) + additive `contentRevision`/`contentBaseRevision` fields; front token helper, `classifyDocumentSaveConflict` (single caller of the pre-existing pure `resolveOptimisticDocumentUpdate`), `useDocumentSaveConflictGuard` (typed `DocumentSaveConflict`, draft preserved), `BlockEditorSaveConflictBanner`, `RichTextFieldEditor` wiring.
- Closed the one unmet non-Tier-2 acceptance bullet: bumped `a2e-documents` 0.2.3 → 0.2.4.
- Files changed: `packages/twenty-apps/internal/a2e-documents/package.json`; `docs/plan/phases/phase-03-report.md`; this file.
- **Learnings:**
  - Duplicate-task class confirmed again (US-112 == US-032): grep `git log` for the feature paths before implementing.
  - `resolveOptimisticDocumentUpdate` has exactly one definition and one caller — the "reuse, not fork" AC is structural; keep it that way.
  - Tier-0 gates: a2e-documents typecheck/lint/test:unit (221/221)/dev:build all green; twenty-front co-editing 4 suites/28, related 16 suites/135, tsgo exit 0, oxlint 0/0.
- Missing (Tier 2 orchestrator): reinstall a2e-documents (fields + guard register; until then CAS is inert) then the two-session E05 stale-save banner proof.
---
## 2026-09-29 - US-113 (P3.3 record→document note-body copy + source link + permission checks)
- Verified the real note-body copy already shipped on HEAD (prior US-033 cycles, committed `992d6c03`/`1e71b258`): `lib/record-note-copy.ts` (authorized `noteTargets` read → linked "Source :" block + per-note linked heading + `remapTemplateBlockIds` anchor re-key; `buildRecordNoteCopyPayload` fails closed with `null` on an unreadable record and sets `companyId`/`personId`), `save-record-as-document-command.factory.tsx` (findOne `filter` read + `createDocuments`), and the two `save-company/person-as-document` command-menu items gated on record/note/document read permissions.
- Closed the one unmet non-Tier-2 acceptance bullet: bumped `a2e-documents` 0.2.4 → 0.2.5.
- Files changed: `packages/twenty-apps/internal/a2e-documents/package.json`; `docs/plan/phases/phase-03-report.md`; this file.
- **Learnings:**
  - Duplicate-task class confirmed a third time (US-113 == US-033): grep `git log --oneline -- <feature paths>` before implementing; the prd "starting state: not started" description is stale.
  - The whole record-note-copy feature is a pure lib + front-component payload path, so Tier 0/1 cover it fully; only the E04 browser legs are Tier 2.
  - Gates: a2e-documents typecheck exit 0 / lint 0-0 on 77 files / test:unit 221/221 / record-note-copy 18/18 / `npx twenty dev:build .` Build succeeded (28 files) before and after the bump.
- Missing (Tier 2 orchestrator): open-from-search/relation/side-panel browser legs for both record types.
---
## 2026-09-29 - US-114 (P2.1 channel ACLs at subscribe for chat topics)
- Verified the channel half of P2.1 bullet 3 already shipped on HEAD (3c8d6b35): `assertTopicAuthorized` delegates `chat:` topics to the single `RealtimeTopicAccessService.assertCanAccessChatChannel` seam; PUBLIC ⇒ any workspace member, otherwise a `chatChannelMember` row keyed `{ membershipChannelId, membershipWorkspaceMemberId }`; unknown/uninstalled ⇒ deny.
- Closed the 2026-09-18 "runtime resolution not verified" caveat: checked the where-keys/object names against the now-real P5 model in `a2e-chat` (`chatChannel.visibility` PUBLIC/PRIVATE; `chatChannelMember` relations → `membershipChannelId`/`membershipWorkspaceMemberId`; publisher topic `workspace:<id>:chat:<channelId>`).
- Files changed: `docs/plan/phases/phase-02-report.md`; this file. No source/test touched.
- **Learnings:**
  - Duplicate-task class again (US-114 == old P2.1-acl-enforcement/subscribe-record-channel-acl, 2026-09-18): a previous executor implemented record+channel ACL, but the phase report flagged the app-owned object names as unverified until P5 landed. When the model lands, the task is verification-only — do not rebuild.
  - The record (`object:`) half stays deferred because no `object:` publisher exists yet (only chat/workspace/inbox/presence); `assertCanAccessObjectRecord` is latent but unexercised. Note it, don't delete it.
  - Gates: realtime unit 6 suites/60 green; isolated real-Redis integration 2 suites/12 green exit 0; tsgo exit 0; oxlint 0/0 and oxfmt clean on the 5 touched services/specs.
- Missing (Tier 2 orchestrator): live revoked-member socket journey (topic dropped / socket 4403 / no further events) + multi-session handshake on an installed a2e-chat workspace.
---

## 2026-09-29 - US-115 (M7c: grouped app sections — one folder nav item per app)
- Slice: app-side **Bureau** folder. `a2e-documents` owns a `Bureau` FOLDER nav item (`c31a0000-0010-4000-8000-000000000002`) per docs/applications.md ("Bureau (Pages) → a2e-documents"); its own row nests under it (renamed `Documents`→`Pages`, position 100→0). `a2e-projects` nests `Projets` under the same folder via a duplicated external UUID constant (`EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau`), safe because `document` makes a2e-documents a hard prerequisite; keep `Mes tâches` top-level (depth limit).
- Files changed: `a2e-documents` (`src/constants/universal-identifiers.ts`, new `src/navigation-menu-items/bureau-folder.navigation-menu-item.ts`, `src/navigation-menu-items/documents.navigation-menu-item.ts`, new `src/lib/__tests__/bureau-navigation.test.ts`, `package.json` 0.2.5→0.2.6`); `a2e-projects` (`src/constants/universal-identifiers.ts`, `src/navigation-menu-items/projects.navigation-menu-item.ts`, `src/lib/__tests__/project-object-integrity.test.ts`, new `src/lib/__tests__/project-navigation.test.ts`, `package.json` 0.1.14→0.1.15`); `docs/plan/phases/phase-11-report.md`; this file.
- **Learnings:**
  - Nav folder nesting is max 2 levels (`NAVIGATION_MENU_ITEM_MAX_DEPTH`) — a folder of views cannot nest under a suite folder; `Mes tâches` therefore stays top-level and M7c's "Mes tâches under Bureau" is not app-side expressible without flattening/deleting.
  - Cross-app folder refs resolve against installed metadata (same path as cross-app object relations) but only when the owner app is a hard prerequisite; `a2e-chat` is optional, so its Bureau nesting is blocked on the M7e bundle decision (or a host-seeded standard folder).
  - `a2e-drive`'s only row is already named `Archive` (app displayName `Archive`), so wrapping it in an `Archive` folder is a redundant one-child folder until M7f adds Archive landing-page rows.
  - Gates: a2e-documents typecheck/lint clean + test:unit 222/222 + `npx twenty dev:build .` success (28 files); a2e-projects typecheck clean, lint 0 errors (1 pre-existing warning in `src/fields/task-labels.field.ts`), test:unit 337/337 + dev:build success (48 files). `.twenty/output` regenerated but gitignored.
- Missing (Tier 2 orchestrator): fresh/upgraded browser sidebar shows one collapsible `Bureau` folder (Pages + Projets) and ≤7 top-level rows once the remaining legs land.
---

## 2026-09-29 - US-116 (M7d: Agenda host entry without an app)
- Host-seeded Agenda: added a `NavigationMenuItemType.LINK` standard row (`agenda`, UUID `20202020-b00c-4b0c-8b0c-c0aba11c000c`) pointing at `/calendar`; new `createStandardNavigationMenuItemLinkFlatMetadata` builder + wiring in `buildStandardFlatNavigationMenuItemMaps`, so every new workspace gets it without an app. US-101's `getLinkNavigationMenuItemComputedLink` already renders it in-app — no twenty-front change.
- Preset flag: added `agendaEnabled` to `WorkspaceTemplateDefinition` (all 6 presets `true`); the template flow's hide-list, preview and legacy provenance now go through `getHiddenStandardNavigationMenuItemUniversalIdentifiers`, and the restore builder handles LINK rows.
- Upgrade: 2-39 workspace command `upgrade:2-39:add-agenda-navigation-menu-item` @1790720500000 (> max 1790711712877), insert-only-if-absent, registered in the 2-39 module.
- Files changed: 7 modified + 6 new server src/test files (see phase-11-report) + `docs/plan/phases/phase-11-report.md`; this file.
- **Learnings:**
  - Workspace commands have no `down()` (only `runOnWorkspace`); the M7d "up/down" wording is not literally satisfiable for a workspace command — documented as a deviation instead of adding dead code.
  - All presets kept `agendaEnabled: true` on purpose: `workspace-template.service.spec.ts` encodes "CRM hides nothing" and the upgrade command seeds Agenda unconditionally, so a preset-hide would contradict both. The flag's false branch is implemented + unit-tested with a synthetic definition.
  - Running the whole `test/integration/metadata/suites/navigation-menu-item` directory OOMs the Node heap after 3 suites (pre-existing); run the target spec file instead. The aborted run left a duplicate `Test Role` that breaks `application/successful-manifest-update-navigation-menu-item` until a DB reset.
  - Gates: tsgo clean; oxlint 0/0 + oxfmt clean on 13 files; onboarding 13 suites/102 + 2-39 7 suites/39 green; integration idempotency spec 1/1 pass (delete → run → 1 row → rerun → still 1).
- Missing (Tier 2 orchestrator): fresh + upgraded browser proof that Agenda shows once and hiding persists.
---

## 2026-09-29 - US-117 (M9a-1: C1 template descriptor contract + per-app descriptor logic functions)
- Defined the C1 content-template descriptor contract once in `twenty-shared/src/application/` (`TemplateDescriptor` = key, version, labels fr+en, category, preview writes, requiredApps, inputs; pure types + structural guards + `validateTemplateDescriptors` cross-descriptor checks), exported through the generated `application/index.ts` barrel.
- Shipped a read-only `list-template-descriptors` logic function in each of the four content apps, projecting the existing lib constants onto C1: documents (20 pages, slug keys), projects (12 templates, existing short keys, preview counts = real task/milestone counts), accounting (10 fiches, editor keys), drive (4 folder structures, preview count = flattened tree length). No new engine/table/field; no `toolTriggerSettings`.
- Files changed: `twenty-shared` (`templateDescriptorType.ts`, `templateDescriptorGuards.ts`, `__tests__/template-descriptor.spec.ts`, generated `application/index.ts`); each app (`lib/*descriptors.ts`, `logic-functions/list-template-descriptors.ts`, `constants/universal-identifiers.ts`, `lib/__tests__/*descriptors.test.ts`, `package.json` patch bump 0.2.6→0.2.7 / 0.1.15→0.1.16 / 0.1.1→0.1.2 / 0.1.2→0.1.3); deleted the dead-run `__twenty-shared-probe.ts`; `phase-13-report.md`.
- **Learnings:**
  - Resumed two dead Ralph iterations (00:31/00:35) that left this task's partials uncommitted with no `CLAIMED` line: they are this task's own artifacts (per §0), so resume + clean the probe; the prior `description` field was dropped so the contract matches the AC's seven fields exactly.
  - App `.oxlintrc.json` blocks direct `twenty-shared` imports under `logic-functions/**`; keep the type-only import in `lib/` (the logic function imports the local projection). Built bundles carry no twenty-shared runtime.
  - App `tsc`/`node --test` resolve `twenty-shared/dist` (untracked) — build twenty-shared first, or app tests/typecheck fail even though the import is type-only.
  - `preview` guard rejects `count: 0`, so previews list only writes the family actually performs.
  - Gates all Tier-0 green: twenty-shared build+tsgo+spec 7/7; documents 227/227, projects 342/342, accounting 113/113, drive 91/91; dev:build all succeed; each manifest has the descriptor fn without `toolTriggerSettings`; lint 0/0 (projects keeps its pre-existing task-labels warning); check-docs PASS.
- Missing (Tier 2 orchestrator): invoke each descriptor function on an installed workspace (documents 20 / projects 12 / accounting 10 / drive 4).
---

