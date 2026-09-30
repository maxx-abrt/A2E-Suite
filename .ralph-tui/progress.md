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
- Embedding a native object view outside a page layout is a solved seam: reuse
  `page-layout/widgets/record-table/components/RecordTableWidgetRendererContent`
  (dispatches TABLE/KANBAN/LIST/CALENDAR, defaults `isUIEditable=false`) wrapped in
  `PageLayoutEditModeProviderContext value={{ isInEditMode: false }}` — that's a
  **Provider component** from `createRequiredContext`, so `<X value=...>`, never
  `<X.Provider>` — plus a `PageLayoutComponentInstanceContext` with a **unique
  `instanceId` per embed** (its draft component-family selector throws otherwise).
  `RecordIndexContainerGater` is the full index page, not the embed seam;
  `getObjectPermissionsForObject` defaults to allowed for unknown ids, so check
  object-metadata existence before the permission check, and note this fork has no
  `GALLERY` ViewType (the 4th layout is `LIST`).
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
- Bureau editor (`twenty-front/src/modules/blocknote-editor`): the slash-menu
  content seam is `utils/getSlashMenu.ts` (called by `BlockEditor.tsx`). Default
  items come from `getDefaultReactSlashMenuItems` and are localized with the
  global `i18n._(msg\`…\`)` + fr aliases, then reassigned to `SuggestionItem.groupKey`
  (Basic/Media/Bureau/Links/Syna). Extra block specs go in `blocks/Schema.ts`:
  multi-column via `withMultiColumn` (`@blocknote/xl-multi-column`, 2/3 only —
  build 4 by hand), custom blocks via `createReactBlockSpec`. A custom block's
  `toExternalHTML` is what feeds the Markdown/DOCX export (markdown =
  external-HTML → `htmlToMarkdown`), and an inline custom block's live UI must fit
  the existing `SelectableList` (index-based keyboard nav over the flat item
  array, so group headers are non-selectable siblings). Jest specs touching this
  tree must mock `@blocknote/react` and `@blocknote/core/extensions` (the core
  dist cannot be loaded under Jest).
- _Update (US-122):_ a `createReactBlockSpec` render callback's `editor` is
  narrowed to that block's schema and is NOT assignable to
  `typeof BLOCK_SCHEMA.BlockNoteEditor`; cast when passing it to a separately
  typed child (`editor as unknown as typeof BLOCK_SCHEMA.BlockNoteEditor`).
  Hooks work inside the render component. The testable seam for a custom block
  is a pure `unknown`-input util under `utils/` (tests can't load the blocknote
  dist). Record mention for any object already ships via `MentionInlineContent`
  + `useMentionMenu` + `LinkToRecordPicker` — do not rebuild it.
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
- Workspace save-as-template (M9b) mirrors a2e-documents'
  `save-document-as-template.ts` in every app: a prefix-once title helper +
  ONE persisted marker on the app object (documents' `kind=TEMPLATE`; the new
  `project.isTemplate`/`fiche.isTemplate` BOOLEANs — `bookSheet.isTemplate`
  already existed), and an instantiate direction that deep-clones and mints
  fresh nested ids (tasks, view fields/filters/groups) and drops unknown
  references, so edits/deletes never alias the template (C1). The core `view`
  object has NO app-owned column and is absent from
  `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS`, so a board-view template's marker
  lives in the payload + name prefix — never add a core `view` column from an
  app slice.
- Persona presets (`WORKSPACE_TEMPLATE_DEFINITIONS[].starterBundleContents`) are
  preview-only proposals; seeding stays in each app's post-install hook. A
  preset bundle item can reference a US-117 gallery key via the optional
  `templateKey` on `WorkspaceTemplateBundleContent`/`...BlockedBundleContent`
  (the `bundleContent`/`blockedBundleContent` helpers take it as a last arg).
  Validate the references in the *owning app* with a spec that source-scrapes
  the twenty-server constant and compares against `build*Descriptors()` keys —
  but the server constants put the UUID on the next line after `=`, so the
  name→UUID map regex must be `const (\w+) =\s*'([0-9a-f-]{36})'`, and a
  document key is the slug of its French title (`notes-de-reunion`), NOT the
  (stale) `DOCUMENT_TEMPLATE_EN_LABELS` map keys.
- App front components DO have an i18n seam: `t`/`msg`/`Trans`/`useTranslate`
  from `twenty-sdk/front-component` (same `generateMessageId` as Lingui), catalogs
  in `<app>/locales/<locale>.json` (readable context-group shape) extracted by
  `twenty dev:translations-extract --locale fr-FR` and compiled by `dev:build`.
  `SOURCE_LOCALE` is `en`, another locale is `fr-FR`. But the executor contract
  forbids touching `locales/**`, and no internal app ships catalogs — so app
  front-component strings stay French-only (documented deviation, US-103…107).
- Adding fields to an **app-owned** object follows the same standalone
  `defineField` manifest path as external ones: `objectUniversalIdentifier:
  OBJECT_IDS.document` under `src/fields/`, no generated server migration
  (a2e-projects pins fields on a2e-documents' `document` this way). `dev:build`
  merges them into the manifest's top-level `fields` array; identifiers continue
  the object's own-field UUID sequence. Bump the app patch version to upgrade.
- The document page chrome is an app **front component** (`document-page`),
  not host code: it reuses pure lib seams (`extractOutline`, `countDocumentWords`,
  `buildBreadcrumbTrail`, `buildDocumentChromeUpdatePayload`,
  `resolveDocumentCover`) and the personal `documentFavorite` path. The sandbox
  cannot import `twenty-ui`, so page icons are emoji + verbatim name fallback;
  light/dark comes from `var(--t-*)` CSS variables.
- `home-dashboard` cards self-gate on app install: `useObjectMetadataItem`
  (inside `useFindManyRecords`) THROWS `ObjectMetadataItemNotFoundError` for an
  absent object before `skip` is read, so a widget must branch on
  `useObjectMetadataItems().some(o => o.nameSingular === '<object>')` and render
  its `*WidgetContent` empty state before mounting the fetch child. Bilan
  installs as a unit, so one object (`invoice`) is the gate for both invoice and
  grant-deadline queries. Card see-all links use
  `getAppPath(AppPath.RecordIndexPage, { objectNamePlural })`; `IconFileInvoice`
  is NOT exported from `twenty-ui/icon` (only via `AllIcons`), so app-object
  cards pick an exported icon (`IconCoins`, `IconNotes`).
- Workspace BYOK provider settings (US-127, M10a-2): the metadata schema can carry
  a key-safe provider surface — `workspaceAiProviders` query +
  `{upsert,remove}WorkspaceAiProvider` (return the fresh `WorkspaceAiProvidersDTO`,
  so the front needs no refetch) + `testWorkspaceAiProvider`, all under
  `SettingsPermissionGuard(AI_SETTINGS)` and projected by
  `WorkspaceAiProviderAdminService` (presence + fixed `••••••••` mask + catalog
  `apiKeyConfigVariable`; never the key). "Test key" is a `generateText` 1-token
  call on a **transient** provider (`SdkProviderFactoryService.createTransientProvider`
  — the cached instance would test the OLD key) returning a typed
  `WorkspaceAiProviderTestErrorCode`; never echo the provider error body (it can
  contain key material). Register the resolver in a module imported by
  `MetadataEngineModule` — `@Global` alone does not put it in the
  `include: [MetadataGraphQLApiModule]` schema graph. New front operations under
  `src/pages/**/graphql/**` are codegen inputs; until codegen runs (needs the live
  `/metadata` endpoint), hand-type `useQuery<T>(PLAIN_GQL_DOC)` (same as
  `useUpdateWorkspaceMemberSettings`) so `tsgo` is green without regenerating
  `generated-metadata/graphql.ts`. Caveat: a saved workspace key is not yet used at
  generation time — `AiModelRegistryService.buildModelRegistry` is still
  instance-wide, so `getResolvedProvidersForWorkspace` only backs the new read path.

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

## 2026-09-30 - US-118 (M9a-2: template gallery surface — module + install-gated data layer)
- Built the new front module `packages/twenty-front/src/modules/template-gallery/`: the gallery's install-gated data layer + a presentational host surface. **Partial** — entry-points and the app-side apply path are the next slice.
- Data layer: `buildTemplateGalleryItems` (install-gating: a descriptor is `available` iff every `requiredApps` is installed; missing ⇒ safe state), `collectTemplateDescriptorLogicFunctions` (resolve each installed app's `list-template-descriptors` by name+applicationId), `filterTemplateGalleryItems` (category + diacritic-insensitive search over fr/en labels, key, app name), and `useTemplateGalleryItems` (executes each app's descriptor fn via `ExecuteOneLogicFunctionDocument`, validates with `isTemplateDescriptor`, degrades a failing app to skipped).
- Surface: `TemplateGallery` renders search, category tabs, list, descriptor preview pane (`preview` + `inputs`), locale-aware fr/en label pick, `Use template`/`Blank` host callbacks, unavailable → safe state + disabled apply.
- Files changed: 13 new files under `template-gallery/` (types ×2, constants ×2, utils ×3, hook ×1, component ×1, tests ×4); `docs/plan/phases/phase-13-report.md`; this file.
- **Learnings:**
  - `twenty(max-consts-per-file)` is scoped to `**/constants/*.ts` (`.oxlintrc.json:144-148`), so one-export-per-constants-file is compliant; the "max 1 const per file" note is narrower than the literal rule.
  - The front has **no existing example** of invoking an app logic function: the only path is the `executeOneLogicFunction` mutation, wrapped by `useExecuteLogicFunction` which is settings/workflow-specific and takes no payload. `useTemplateGalleryItems` calls `useMutation(ExecuteOneLogicFunctionDocument)` directly with `{ input: { id, payload? } }`.
  - `applicationId` on a `LogicFunction` is `string | null | undefined` — guard with `isNonEmptyString` from `@sniptt/guards` (`twenty-shared/utils` does NOT export `isNonEmptyString`).
  - `useLingui()` from `@lingui/react/macro` returns `{ i18n, t }`; use `i18n.locale` to pick fr vs en from the descriptor's plain-string labels (descriptors are not Lingui messages).
  - Icons follow the dictionary's "no concept matches → existing `twenty-ui/icon`" rule (no Template concept): `IconFileText/IconBriefcase/IconCoins/IconArchive/IconCalendarEvent/IconSettingsAutomation`.
  - `JSX.Element` is not available globally; use `ReactNode` for render-helpers.
  - Gates: tsgo exit 0; oxlint 0/0 (13 files); oxfmt clean; jest `src/modules/template-gallery` 4 suites / 18 tests green.
  - **PITFALL:** `Write` overwrites files — appending to the shared phase report with `Write` clobbered all prior entries; recovered with `git checkout --` then `cat >>`. Always append phase reports with a shell append, never `Write`.
- Missing (Tier 2 orchestrator): E15 gallery browser journey; live execution of each app's `list-template-descriptors`.
- Next: (1) four app-side `applyTemplateByKey` logic functions (additive, app patch bump); (2) mount the surface (`SidePanelPages.TemplatesGallery` + side-panel page + Cmd+K `TemplatesCommand` + `New`-surface openers).
---

## 2026-09-30 - US-119 (M9b: workspace templates — save-as-template payload builders)
- Built the three missing save-as-template payload builders following a2e-documents' `save-document-as-template.ts` pattern, and added the persisted `isTemplate` marker to the app-owned objects.
- a2e-projects: NEW `src/lib/save-project-as-template.ts` (prefix-once title, project+tasks snapshot keyed by `sourceId`, instantiate mints fresh task ids and remaps parent/blocked-by to the copy, links tasks to the fresh `projectId`, deep-copies arrays) + NEW `src/lib/save-board-view-as-template.ts` (view-manifest template; instantiate re-mints view/field/filterGroup/filter/group/sort universal identifiers, rewrites group refs, drops dangling refs) + 15 tests; `project.object.ts` + `PROJECT_FIELD_IDS.isTemplate`; 0.1.16→0.1.17.
- a2e-accounting: NEW `src/lib/save-fiche-as-template.ts` (layout-only payload, deep-cloned `data`, instantiate marker off + prefix stripped) + 8 tests; `fiche.object.ts` + `FIELD_IDS.fiche.isTemplate`; 0.1.2→0.1.3.
- Files changed: 6 new + 4 modified app files (above) + both `package.json` + `docs/plan/phases/phase-13-report.md` + this file.
- **Learnings:**
  - The dependency US-118 is `partial` in its own report (gallery module built, entry-points/apply path not) yet Ralph committed it and advanced the queue; US-119's first buildable bullet (pure payload builders) does not need the gallery mounted, so I built it and left the mount leg to the US-118 entry-point slice.
  - Core `view` cannot carry an app-pinned field (absent from `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS`), so the board-view template marker is payload-side (`isTemplate: true` + name prefix) — do not attempt a `view` column.
  - App node tests use `node --test --experimental-strip-types`; enum-typed manifest literals must be imported from `twenty-sdk/define` (string literals are not assignable to the string enums), and optional-chain assignment (`x?.[0].y =`) is rejected — guard first.
  - Gates all green: projects typecheck/lint(0 err, 1 pre-existing task-labels warning)/test:unit 357/357/dev:build 50 files; accounting typecheck/lint 0-0/test:unit 121/121/dev:build 30 files; documents contract suites 31/31; manifests carry project+fiche `isTemplate` BOOLEAN; no locales churn.
  - Missing (Tier 2 orchestrator): gallery/record mount + save→instantiate round-trip and non-aliasing proof in a browser.
---

## 2026-09-30 - US-120 (M9d: persona presets reference gallery template keys)
- Wired each persona preset's proposed bundle item to the US-117 gallery descriptor key it references, and added per-app drift-guard specs that fail when a referenced key stops resolving to a shipped descriptor.
- `workspace-template-definitions.constant.ts`: added an optional `templateKey` to `WorkspaceTemplateBundleContent`/`WorkspaceTemplateBlockedBundleContent` (and the `bundleContent`/`blockedBundleContent` helpers); documents items now carry the real slugs (`notes-de-reunion`, `brief-de-projet`, `specifications-produit-prd`, `entretien-individuel`), blocked Bilan items carry `BUDGET_EQUILIBRE`/`DEMANDE_SUBVENTION`. Comment records that Agenda/Archive/Projects/Syna app-set expansion is D02-gated, not pre-empted.
- NEW `a2e-documents/src/lib/__tests__/persona-template-bundle-keys.test.ts` + `a2e-accounting/.../persona-template-bundle-keys.test.ts`: read the server constant (source-scrape), extract the app's `bundleContent(...)`/`blockedBundleContent(...)` keys by app UUID, assert each ∈ shipped descriptor keys.
- Files changed: the server constant + 2 new app specs + phase report + this file. No app `package.json` bump (test-only change).
- **Learnings:**
  - Resumed a dead prior US-120 run (uncommitted, no report) that died on an external-directory permission rejection while running the app tests. The two new specs were buggy: their `const (\w+) = '...uuid...'` map regex missed the server constants because those put the UUID on the **next line** after `=`; `=\s*'...'` is required (the US-090 `A2eWorkspaceTemplates.test.ts` already used `\s*`).
  - The prior run copied keys from `document-template-descriptors.ts`'s `DOCUMENT_TEMPLATE_EN_LABELS` map, which itself has stale keys (`notes-reunion`, `brief-projet`, …) — the real keys are the slug of the French title (`notes-de-reunion`, `brief-de-projet`). Derive the key from `buildDocumentTemplateDescriptors()`, never trust the en-label map.
  - `starterBundleContents` is preview-only (seeding stays in each app's post-install hook), so the key reference is declarative; `templateKey` is intentionally not yet surfaced through the preview DTO/service.
  - Gates green: server tsgo 0 + onboarding jest 11 suites/97 tests; twenty-front tsgo 0 + US-090 spec 13/13; docs typecheck/lint 0-0/test:unit 229/229; accounting typecheck/lint 0-0/test:unit 123/123; oxlint/oxfmt 0-0 on the server constant; no locales churn.
- Missing (Tier 2 orchestrator): apply each persona in a browser and observe seeded content rows > 0 (M2b).
- Next: orchestrator Tier-2, or US-121 (M8a-1 slash-menu structural blocks).
---

## 2026-09-30 - US-121 (M8a-1: slash menu core/structural blocks)
- Implemented the structural block set + grouped/localized slash menu. Toggle list, toggle heading, divider, quote, code-with-language and the BlockNote table already shipped via `defaultBlockSpecs`, so the real gaps were **columns (2–4)** and a **table of contents** block, plus the Basic/Media/Bureau/Links/Syna grouping.
- Files changed: `blocks/Schema.ts` (wrap in `withMultiColumn`, register `tableOfContents`); NEW `blocks/TableOfContentsBlock.tsx`; NEW `utils/getColumnListBlock.ts`; NEW `utils/slashMenuGroups.ts`; NEW `utils/slashMenuItemDefinitions.ts`; `utils/getSlashMenu.ts` (localized + grouped + custom items); `components/CustomSlashMenu.tsx` (group headers); `components/LinkToRecordSlashMenuItem.tsx` (Links group); `types/types.ts` (+`groupKey`); `utils/__tests__/getSlashMenu.test.ts` (rewritten) + NEW `utils/__tests__/getColumnListBlock.test.ts`.
- **Learnings:**
  - Multi-column is `withMultiColumn` from `@blocknote/xl-multi-column` (already hoisted as a transitive dep of the docx/pdf exporters). It only ships **2/3** columns, so 4 columns is built by hand with `getColumnListBlock` + `insertOrUpdateBlockForSlashMenu` from `@blocknote/core/extensions`.
  - A custom ToC block is `createReactBlockSpec({ type:'tableOfContents', content:'none' })`; its `toExternalHTML` drives **Markdown and DOCX** export (markdown = `createExternalHTMLExporter` → `htmlToMarkdown`), so emitting a `<ul>` of headings keeps the ToC in the Markdown export while the live React render shows the clickable outline.
  - Grouping/localization goes through `i18n._(msg\`Basic\`)` / `i18n._(descriptor)` (global `i18n`, like `getWidgetTitle`), not `useLingui`, so `getSlashMenu` stays hook-free and jest-loadable without an `I18nProvider` (`@lingui/swc-plugin` compiles the macros and `i18n._` falls back to the source string). The `SelectableList` keyboard nav is index-based over the flat `items` array, so group headers are non-selectable siblings and ordering must happen in `getSlashMenu` before it returns.
  - `insertOrUpdateBlockForSlashMenu` lives in `@blocknote/core/extensions`; jest specs that touch `getSlashMenu` must mock both `@blocknote/react` and `@blocknote/core/extensions` (the core dist cannot be loaded under Jest).
  - `twenty(max-consts-per-file)` only applies to `**/constants/*.ts` and `**/*.constants.ts`, so grouping/definition maps can live together in `utils/`.
- Missing (Tier 2 orchestrator): E14 browser round-trip of ToC/columns save→reload→export; AC4 storybook light/dark stories not written.
- Next: storybook stories for the new blocks, then the E14 browser legs.
---

## 2026-09-30 - US-122 (M8a-2: slash menu interactive/linking blocks)
- Implemented 4 of the 6 interactive/linking block families + their slash-menu registration, export serializers and unit tests.
- Files changed: NEW `blocks/TodoTaskBlock.tsx` (checkbox + inline content + "Convert to task" → native `task` via `useCreateOneRecord`, stores the id in block props for provenance; converted state renders `MentionRecordChip`), NEW `blocks/BookmarkBlock.tsx`, NEW `blocks/PageLinkBlock.tsx` (creates a child `document` under `BlockEditorDocumentContext`), NEW `contexts/BlockEditorDocumentContext.ts`; `blocks/FileBlock.tsx` (category-aware inline image/video/audio vs download link); `blocks/Schema.ts`; `components/BlockEditor.tsx` (provider); `utils/getSlashMenu.ts` + `utils/slashMenuItemDefinitions.ts`; `export/utils/exportFidelity.ts` + `export/components/BlockEditorExportMenu.tsx`; NEW pure utils `buildTaskFromTodoBlockInput`, `buildChildDocumentInput`, `buildBookmarkCardFromUrl`, `getFileEmbedKind`, `getInlineContentPlainText` + 5 tests; updated `getSlashMenu.test.ts` + `exportFidelity.test.ts`.
- **Learnings:**
  - **Record mention for any object already ships** (`MentionInlineContent` + `useMentionMenu` over readable/searchable objects + `LinkToRecordPicker`; existing `RecordChip`/`MentionRecordChip`). Do not rebuild it.
  - A `createReactBlockSpec` render callback's `editor` is **narrowed to that block's schema** and is NOT assignable to `typeof BLOCK_SCHEMA.BlockNoteEditor`; pass it to a separately-typed child with `editor as unknown as typeof BLOCK_SCHEMA.BlockNoteEditor` (casts are the established precedent — see `TableOfContentsBlock`). Hooks (`useState`, `useCreateOneRecord`) work fine inside the render component.
  - The testable seam for custom blocks is a **pure `unknown`-input structural util** (the `getBlockOutline`/`getBlockWordCount` pattern): the blocknote dist can't load under Jest, so serializers/builders live in `utils/*.ts` and get the unit tests.
  - Media embeds all insert the single `file` block; FileBlock picks the renderer from the attachment category. Slash defaults for Image/Video/Audio/File are dropped via a `DEFAULT_ITEM_TITLES_REPLACED_BY_CUSTOM` set (the default block specs stay registered so existing documents still render).
  - "Creates an Agenda reminder" is not a chip: `CreateCalendarEventInput` requires a `connectedAccountId` and the composer owns account resolution — a real sub-slice, deferred.
  - `npx oxlint` (not `nx lint:diff-with-main`) is the only way to lint uncommitted work; `no-script-url` rejects a literal `javascript:` string in a test fixture.
- Missing (Tier 2 orchestrator): date/reminder mention + live reminder creation; storybook light/dark stories (blocks need app providers); E14 interactive-block browser legs; Syna group has no M8a member.
- Next: date/reminder inline content + calendar-event creation slice, then provider-free presentational views for stories.
---

## 2026-09-30 - US-123 (M8b: inline views/databases in pages, read-only first)
- Implemented the read-only half of the embedded-view block: a `recordView` atom block that renders a live native view (table/kanban/list/calendar) of any object inside a page, with a safe permission stub and an object→view picker.
- Files changed: NEW `blocks/RecordViewBlock.tsx`; `blocks/Schema.ts`; NEW `components/RecordViewEmbedHost.tsx`, `components/RecordViewEmbedStub.tsx`, `components/RecordViewEmbedViewPicker.tsx`; NEW `constants/RecordViewEmbedPickerDropdownId.ts`; NEW `utils/resolveRecordViewEmbedState.ts` + `utils/getRecordViewEmbedExportText.ts`; `utils/getSlashMenu.ts` + `utils/slashMenuItemDefinitions.ts`; `export/utils/exportFidelity.ts` + `export/components/BlockEditorExportMenu.tsx`; NEW/updated tests `utils/__tests__/resolveRecordViewEmbedState.test.ts`, `utils/__tests__/getRecordViewEmbedExportText.test.ts`, `components/__tests__/RecordViewEmbedHost.test.tsx`, `utils/__tests__/getSlashMenu.test.ts`, `export/utils/__tests__/exportFidelity.test.ts`.
- **Learnings:**
  - Reuse `RecordTableWidgetRendererContent` (`page-layout/widgets/record-table`) as the embed host: it already dispatches TABLE/KANBAN/LIST/CALENDAR and defaults `isUIEditable=false`. Its required providers are `PageLayoutEditModeProviderContext` (a **Provider component** from `createRequiredContext`, so `<X value=...>`, NOT `<X.Provider>`) and a `PageLayoutComponentInstanceContext` with a **unique `instanceId` per embed** (the draft component-family selector throws without it). Give each embed a distinct id and it resets read-only flags on unmount (no leakage between embeds).
  - `RecordIndexContainerGater` is the full `/objects/:plural` page, not the embed seam.
  - `getObjectPermissionsForObject` **defaults to allowed** for unknown ids, so check object-metadata existence *before* the permission check; `useObjectMetadataItem`/`useObjectMetadataItemById` throw when absent.
  - There is **no `GALLERY` ViewType** in this fork; the fourth layout is `LIST`.
  - Keep custom blocks free of `@blocknote/react` in their testable seams: the block wrapper delegates to `components/RecordViewEmbedHost.tsx` (no blocknote import), which the host unit test renders with `I18nProvider` (the stub uses `useLingui`).
- Missing (Tier 2 orchestrator): editable embed (edit → reflects on `/objects/tasks`); E14 embedded-view browser proof incl. permission stub.
- Next: make the host editable under `canUpdateObjectRecords` and wire the view draft/persist path; then the E14 browser leg.
---

## 2026-09-30 - US-124 (M8c: page chrome — icon, cover, reading toggles, breadcrumbs, word count, lock)
- Implemented the document page chrome as the app's `document-page` front component plus 4 new app-owned fields.
- Files changed: `a2e-documents/src/fields/document-cover-image.field.ts`, `document-is-full-width.field.ts`, `document-is-small-text.field.ts`, `document-is-locked.field.ts` (NEW standalone `defineField` manifests on `OBJECT_IDS.document`); `src/constants/universal-identifiers.ts` (+`DOCUMENT_CHROME_FIELD_IDS`); NEW `src/lib/document-breadcrumbs.ts`, `document-word-count.ts`, `document-chrome.ts`, `document-page-icons.ts`; NEW tests `document-breadcrumbs.test.ts`, `document-word-count.test.ts`, `document-chrome.test.ts`, `document-page-icons.test.ts` (23 tests); `src/front-components/document-page.front-component.tsx` (chrome surface); `package.json` (0.2.7→0.2.8).
- **Learnings:**
  - App `fields/*.field.ts` standalone manifests work on an **app-owned** object too (`objectUniversalIdentifier: OBJECT_IDS.document`) — the same path a2e-projects uses to pin fields on a2e-documents' object. No generated server migration; `dev:build` merges them into the manifest's top-level `fields`.
  - App front components have an i18n seam (`t`/`msg`/`Trans` from `twenty-sdk/front-component`, catalogs in `locales/`), but the executor contract forbids `locales/**` and no internal app ships catalogs → strings stay French-only (recorded deviation, same as US-103…107).
  - The front-component sandbox cannot import `twenty-ui`, so page icons are emoji + verbatim name fallback; themes come from `var(--t-*)`. Keep every testable seam pure under `src/lib/` (node `--test` can't render the component).
  - Reuse the personal `documentFavorite` path (`buildDocumentFavoriteToggle`) for the page star; never write the deprecated `document.isFavorite` boolean. The lock is an app-owned BOOLEAN gating only the chrome's own write controls — it never touches `content`/`contentRevision`, so the P3.2 save contract is preserved.
- Missing (Tier 2 orchestrator): browser rendering pass on real pages; fr+en catalog; cover-image upload button (URL field for now).
- Next: orchestrator browser pass; optional `uploadFile` cover button.
---

## [2026-09-30] - US-125 (M11a-spike: universal link picker & 'Related' panel — pattern decision, report-only)
- Decided the generic cross-app linking pattern in `docs/plan/phases/phase-15-report.md` (no product code, no metadata).
- **Decision D-M11A-LINK:** app-owned `a2eLink` junction with morph targets, owned by a new internal `a2e-links` app, reusing the native `MORPH_RELATION` primitive. Consumer owns both sides (per P4.3): `a2e-links` declares the morph legs AND the inverse O2M on every target object. Provider apps install first; C3 `computeCrossAppDependents`/`assertUninstallAllowed` already blocks their removal (no code change). Backlinks read the persisted inverse relation (no read-time scan); M8d mention backlinks should land in the SAME junction under a `linkType` discriminator.
- Search reuse: core `search` via `useObjectRecordSearchRecords` (`SearchDocument`) + existing `SingleRecordPicker`. `searchAppRecords` cannot create links (its DTO has only an opaque `path`, no `objectNameSingular`). Related surface: app `FRONT_COMPONENT` widget in an app-declared standalone page-layout tab (native widget type is a closed enum / not app-syncable); per-direction lists can reuse the native junction resolver (`resolveJunctionConfig`/`resolveReverseJunctionConfig`).
- Rejected: reusing `attachment` (FILES-widget pollution, file semantics, no source endpoint); discriminator-pair junction (forks a parallel system); host-owned holder (out of the app-file lane, recorded as fallback).
- Files changed: `docs/plan/phases/phase-15-report.md` (new), `.ralph-tui/progress.md`.
- **Learnings:**
  - Native morph = one `MORPH_RELATION` field row per target sharing one `morphId`; the inverse `RELATION` O2M must exist on each target. App manifests express it with `morphId` (`fieldManifestType.ts:48-64`; `packages/twenty-apps/public/last-contact` precedent). No stored discriminator column.
  - The host auto-provisions an inverse morph for **every** new object only for the four holders `DEFAULT_RELATIONS_OBJECTS_STANDARD_IDS` (attachment/noteTarget/taskTarget/timelineActivity) — the only truly-open morph targets; an app-owned junction cannot be added to that list.
  - `search` returns `objectNameSingular` (link-addressable) while `searchAppRecords` returns only `path` (display-only) — never build link creation on the app-provider search.
  - `WidgetType` is a closed host enum and `SyncableEntity` has no `PageLayoutWidget`; an app's only code-backed widget is `FRONT_COMPONENT`, nested in a layout/tab it declares (standalone tab on a standard page layout = the additive pattern, `a2e-chat`).
- Missing (Tier 2 orchestrator): install in prerequisite order + E17 browser proof of a link surviving reload and optional-app removal.
- Next: the M11a implementation legs (a2e-links scaffold → picker wiring → Related front-component tab).
---

## [2026-09-30] - US-126 (M11b: Today view — recent pages + pending Bilan cards)
- Extended the existing 7-card `HomeDashboard` with two install-gated cards + a
  "Today" eyebrow label, reusing `HomeDashboardCard`/`HomeWidgetList`:
  `RecentPagesWidget` (Bureau `document`, newest updated first, templates
  excluded, opens in side panel, see-all `/objects/documents`) and
  `PendingBilanWidget` (merges unpaid `invoice` + active `savedSubvention` grant
  deadlines, overdue flagged, see-all `/objects/invoices`).
- Pure testable seams: `hasObjectMetadataItem` (install-gate),
  `selectRecentPages`, `selectPendingBilanItems` (+ unit tests); pure
  `*WidgetContent` empty-state tests; `HomeDashboard.test.tsx` extended to 9
  cards + 4 deep links.
- Files changed: `packages/twenty-front/src/modules/home-dashboard/{components,utils}/**`
  (+ tests), `docs/plan/phases/phase-15-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - Install-gating MUST be a render branch, not a `skip`: `useFindManyRecords` →
    `useObjectMetadataItem` throws for an absent app object before `skip`.
    Self-gate in the widget and delegate the fetch to a child component.
  - `twenty-ui/icon` exports a curated set — `IconFileInvoice` is not among them
    (only in `AllIcons`, used by object metadata); consumer cards must choose an
    exported icon.
  - See-all links for app objects: `getAppPath(AppPath.RecordIndexPage, {
    objectNamePlural })` (no `AppPath` member for app objects).
- Missing (Tier 2 orchestrator): browser pass on a workspace with Bureau + Bilan
  installed; empty states without the apps.
- Next: optional Syna-digest card (hidden without the AI permission) or US-127.
---

## 2026-09-30 - US-127 (M10a-2: Settings → Syna → Providers UI)
- Implemented the key-safe server GraphQL surface the UI needs (US-102 shipped the
  entity/resolution but no resolver): `workspaceAiProviders` read (resolution-order
  + masked provider projection), `upsert`/`remove` (return the fresh overview), and
  `testWorkspaceAiProvider` (typed `success/errorCode`, a 1-token `generateText`
  call on a transient provider; provider error bodies never echoed). Wired a new
  `WorkspaceAiProviderModule` into `MetadataEngineModule`.
- Built Settings → Syna → Providers: nav sub-item + `/settings/ai/providers` route,
  a provider list (source badge + masked key + Configured/No-key), an add/edit form
  (API key password field with masked placeholder, base URL only for
  OpenAI-compatible, default+fast model picks), Test-key states
  (idle/testing/success/typed failure), Remove with documented fallback to
  instance → catalog, and the D-N4 billing-gating copy.
- Files changed: server `ai-models/{dtos,resolvers,services,utils}` + module +
  metadata-engine + a new spec; `twenty-shared/src/types/SettingsPath.ts`;
  front `pages/settings/ai/**` (page, components, hook, graphql, types, utils,
  2 specs) + `SettingsRoutes.tsx` + `useSettingsNavigationItems.tsx`.
- **Learnings:**
  - Metadata resolvers are only in the schema if their module is in the
    `MetadataEngineModule` graph (`include: [MetadataGraphQLApiModule]`); a
    `@Global` module is not traversed.
  - `SdkProviderFactoryService.createProvider` caches by provider name — a key
    test must use the new transient variant or it re-tests the stored key.
  - The metadata codegen endpoint (`/metadata`) needs the running app and returned
    non-JSON for introspection here; hand-typed Apollo generics over plain `gql`
    documents keep `tsgo` green and the next codegen folds the documents in.
  - A stale Ralph claim from a dead iteration of the same session can be refreshed
    and resumed; `npx jest --findRelatedTests` + direct `oxlint`/`oxfmt` are the
    working-tree lint path (`lint:diff-with-main` sees only commits).
- **Open:** workspace keys are addable/testable but not yet consumed by
  `AiModelRegistryService` (still instance-wide) — the remaining M10a/M10b server leg.
---
