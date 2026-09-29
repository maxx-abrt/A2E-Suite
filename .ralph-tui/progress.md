# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

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
