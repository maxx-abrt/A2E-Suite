# Report 01 — A2E Suite Codebase Map

> Source-backed navigation guide, reconciled at `3e664c89` on 2026-09-12.
> Read the section relevant to your task, not every package. Current server
> version: `2.39.0`; recheck the version constant before migration work.

[Documentation home](../README.md) · [Applications runbook](../applications.md)

## Task → first source path

Paths below are relative to the repository root. Search within the listed
module before widening to the monorepo; exclude inspiration trees/generated
output from ordinary product searches.

| Task / symptom | Start here | Follow through |
| --- | --- | --- |
| Missing Bilan / A2E installation cards | `packages/twenty-front/src/modules/a2e-workspace/` | `twenty-server/src/engine/core-modules/application/` (under `packages/`): registration → marketplace → install → manifest sync |
| Workspace preset or onboarding | `packages/twenty-server/src/engine/core-modules/onboarding/` | Front `a2e-workspace`, `src/pages/onboarding/` and Settings General |
| Documents / Bureau knowledge features | `packages/twenty-apps/internal/a2e-documents/src/` | Front `blocknote-editor`; server core `document-share` and `search` |
| Projects / task fields | `packages/twenty-apps/internal/a2e-projects/src/` | Server `src/modules/task/`; native object-record views and page layouts |
| Bilan finance / grants / fiches | `packages/twenty-apps/internal/a2e-accounting/src/` | `objects`, `lib`, `logic-functions`, `front-components`; no server accounting domain module yet |
| Navigation / previews / workbench | `packages/twenty-front/src/modules/navigation/` | `navigation-menu-item`, `side-panel`, `command-menu`, `object-record`, `page-layout` |
| Permissions / tenant isolation | `packages/twenty-server/src/engine/twenty-orm/` | Workspace auth context, roles and metadata permissions; do not use system-context bypasses for user queries |
| Realtime / presence | `packages/twenty-server/src/engine/core-modules/realtime-gateway/` | Front `src/modules/realtime/`; HTTP `user-session` contract |
| Files / future Drive | `packages/twenty-server/src/engine/core-modules/file-storage/` | `src/modules/attachment/`, FILES metadata and existing previews |
| Metadata entity change | `packages/twenty-server/src/engine/workspace-manager/workspace-migration/` | Validation/build → flat maps/cache → runner; relevant syncable-entity guides |
| SDK build / publish / install | `packages/twenty-sdk/src/cli/commands/` | `operations/`, app-local manifests/lockfiles; not deprecated `twenty-cli` |
| Deployment / release | `packages/twenty-docker/twenty/Dockerfile` | Entrypoint, Coolify Compose, `.github/workflows/`; GitLab delivery policy still needs confirmation |

Use [verification](../verification.md) for executable checks and the
[architecture audit](../repository-architecture-audit.md) for known boundary
failures. This map identifies code, not runtime readiness.

## 1. What this repo is

A2E Suite is a fork of Twenty (open-source CRM). Package directories and npm
names intentionally stay `twenty-*`; only user-facing brand strings say
"A2E Suite". It is an Nx + Yarn 4 monorepo.

Primary packages:

| Package | Stack | Role |
|---|---|---|
| `twenty-server` | NestJS 11, TypeORM, PostgreSQL, Redis, GraphQL Yoga | API server + background worker |
| `twenty-front` | React 19, Jotai, Linaria, Vite, Apollo client, Lingui | SPA frontend |
| `twenty-shared` | TypeScript | Isomorphic types/utils (`twenty-shared/utils` guards) |
| `twenty-ui` | React + Linaria | Design system, icon dictionary (`src/icon/icon-dictionary.md`) |
| `twenty-sdk` | TypeScript | App SDK (`defineApplication`, `defineObject`, …) + publish/install CLI |
| `twenty-apps` | TypeScript | First-party and example apps (the extension format reference) |
| `twenty-e2e-testing` | Playwright | E2E suites |
| `twenty-emails` | React email templates | Transactional email |

## 2. Server architecture (`twenty-server`)

Two layers:

- **Engine core modules** — `src/engine/core-modules/*` (workspace, auth, jwt,
  file-storage, event-emitter, message-queue, redis-client, search, billing,
  feature-flag, tool/tool-provider (AI tools), onboarding, upgrade, i18n…).
  Cross-cutting infrastructure lives here.
- **Domain modules** — `src/modules/*` (company, person, opportunity, note,
  task, calendar, timeline, messaging, workflow, dashboard, workspace-member…).
  Each module follows the same anatomy: `standard-objects/` (workspace
  entities), services, GraphQL resolvers, query-hooks.

Key facts:

- **Metadata engine**: every workspace has its own schema; objects/fields/views
  are rows in metadata tables, materialized into per-workspace Postgres
  schemas. Standard objects are declared once as `*.workspace-entity.ts` files
  (e.g. `src/modules/note/standard-objects/note.workspace-entity.ts`) and
  provisioned per workspace.
- **Polymorphic activity targets**: `noteTarget`, `taskTarget`,
  `timelineActivity`, `attachment` are polymorphic junction objects; the 2-33 →
  2-38 upgrade commands show how carefully these are treated. Any new object
  automatically gains `notes/tasks/timelineActivities/attachments` relations.
- **Upgrade commands**: `src/database/commands/upgrade-version-command/<X-Y>/`
  — instance commands touch `core` schema; workspace commands run per
  workspace. Rules (enforced by CI): only edit under the CURRENT version
  directory (`2-39`), epoch-ms timestamps strictly increasing, always `up` +
  `down`, never rewrite committed commands. See
  `packages/twenty-server/docs/UPGRADE_COMMANDS.md`.
- **Entity changes need a generated migration**: `npx nx run
  twenty-server:database:migrate:generate --name <name> --type <fast|slow>`.
- **Realtime today**: SSE (`engine/api/mcp`, front `sse-db-event`) coexists
  with the A2E `realtime-gateway` WebSocket server and front client. The
  gateway's session authentication, authorization and reconnect contracts
  still need repair (audit F02/F06); code existence is not reliable co-editing.
- **Background jobs**: BullMQ worker via `message-queue` + Redis; server and
  worker run the same codebase (`yarn start` runs front+server+worker).
- **Feature flags**: `feature-flag` core module + `FeatureFlagGuard`; lab
  features gated via `lab` module and ` twentyConfigService`.

## 3. Front architecture (`twenty-front`)

- Routing: `src/modules/app/components/*.tsx` (AppRouter, SettingsRoutes) with
  lazy page imports; pages live in `src/pages/*`.
- State: Jotai atoms in feature modules (`src/modules/<module>/states/`);
  component state via contexts in `context-store`.
- Navigation: `src/modules/navigation/components/` — the main drawer
  (`MainNavigationDrawerContent`) renders navigation menu items that come from
  the **database** (workspace-level `navigationMenuItems`, editable in
  Settings → Experience), including folders. Apps can contribute nav items.
- Side panel: `src/modules/side-panel/` — right dock opening entity views,
  front components, note editor; context-store keyed.
- Command menu: `src/modules/command-menu/` + `command-menu-item` — Cmd+K
  palette; apps can pin commands (see media-notes example).
- Front components (app sandbox): `src/modules/front-components/` — renders
  app-provided React components from the `frontComponents` GraphQL table, with
  token refresh, checksums, skeleton loaders, media session support.
- Editors: `blocknote-editor` (BlockNote wrapper storing ProseMirror-ish JSON
  in rich-text fields) and `advanced-text-editor` (legacy). Notes are records
  of the `note` object with a rich text `body`.
- Dashboards: `dashboards` module + page layouts; widget types enum includes
  VIEW, IFRAME, FIELD(S), GRAPH, STANDALONE_RICH_TEXT, TIMELINE, TASKS, NOTES,
  FILES, EMAILS, CALENDAR, WORKFLOW…, FRONT_COMPONENT, RECORD_TABLE, FORM_FIELD.
- i18n: Lingui (`i18n` module; locales under
  `twenty-server/src/engine/core-modules/i18n/locales`). Never commit catalog
  churn unless translations are the task.
- Styling: Linaria (zero-runtime, styled-components pattern) + twenty-ui
  tokens/themes (`theme-light.css`, `theme-dark.css`). Icons from
  `twenty-ui/icon` only; canonical names in
  `packages/twenty-ui/src/icon/icon-dictionary.md`.

## 4. The app/extension system (the load-bearing fact)

First-class apps are the intended way to add product surface:

- Format reference: `packages/twenty-apps/internal/real-estate/` (objects,
  fields incl. relations, views, page-layouts, navigation-menu-items, roles,
  logic-functions incl. post-install) and `packages/twenty-apps/examples/*`
  (hello-world, media-notes with front component + pinned command, …).
- SDK: `twenty-sdk/define` exports `defineApplication`, `defineObject`,
  `defineField`, `defineView`, `defineNavigationMenuItem`,
  `definePageLayout`, `defineRole`, `defineLogicFunction`,
  `defineCommandMenuItem`, `defineFrontComponent`, `FieldType`,
  `NavigationMenuItemType`, etc.
- Publishing and installation are separate operations against a confirmed
  server/workspace; both require the app directory or an explicit app path.
  See the [applications runbook](../applications.md) for exact commands,
  SDK compatibility, catalog visibility and lifecycle verification. Source
  folders and Docker platform builds do not automatically install apps.
- Front components run sandboxed with an SDK client (`uploadFile`, records
  access…), rendered by `front-components` module.
- Marketplace UI: Settings → Applications (tabs: marketplace / installed /
  developer).

What this means for the roadmap: **new modules (Docs, Projects, Chat, Drive,
Accounting, Inbox) ship as first-party apps** — installable, per-workspace,
never breaking core — while cross-cutting primitives (realtime gateway, AI
orchestration, search federation) are server core modules.

## 5. Existing product surface to build on (do not duplicate)

- **CRM core**: companies, people, opportunities, pipeline views, workflows,
  messaging (email/SMS campaigns + messaging-webhooks), timeline activities.
- **Notes**: `note` object + noteTargets, notes tab on records, standalone
  notes nav item; note export-to-PDF command exists.
- **Tasks**: `task` object + taskTargets, per-record tasks tab, GO_TO_TASKS.
- **Calendar**: full calendar module with Google/Microsoft/CalDAV drivers,
  connected-account sync. Recurrence handled by providers, not locally.
- **Files**: attachment polymorphic object + file-storage core module (S3-
  compatible). No standalone drive/browser UI.
- **Search**: `search` core module (workspace search service powering Cmd+K).
- **AI**: `tool`/`tool-provider` core modules (AI tool registry used by
  workflows/AI features), `ai-chat` page, `code-interpreter` module.
- **Dashboards**: charts, page layouts, per-object record pages, EDIT_RECORD
  page layout editing.
- **Onboarding**: `onboarding` core module (workspace creation flow).

## 6. Commands cheat-sheet

Run from the root after [tooling setup](../verification.md). Database reset and
integration reset targets are destructive: use disposable test databases only.
Apps under `twenty-apps` are independent packages, not root workspaces.

```bash
bash packages/twenty-utils/setup-dev-env.sh          # Postgres/Redis + DB init
yarn start                                            # front + server + worker
npx nx test twenty-server                             # package unit tests
npx jest path/to/file.spec.ts --config=packages/<pkg>/jest.config.mjs
npx nx run twenty-server:test:integration:with-db-reset
npx nx lint:diff-with-main twenty-server              # + typecheck after changes
npx nx fmt <pkg>
npx nx build twenty-shared --skip-nx-cache            # after editing twenty-shared
npx nx run twenty-front:graphql:generate              # after GraphQL schema changes
npx nx run twenty-server:database:migrate:generate --name <name> --type <fast|slow>
npx nx database:reset twenty-server
```

Gotchas (from CLAUDE.md, binding): `twenty-shared/dist` staleness, Nx stale
cache (verify with `npx tsgo -p tsconfig.json --noEmit`), never commit i18n
catalogs, upgrade-command timestamp monotonicity, no AI attribution in commit
messages.
