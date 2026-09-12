# Phase 04 — Projects & Tasks 2.0

## 2026-09-12 13:55 UTC — OpenHands (P4 agent)
**Task(s):** P4.1 `project` object (create `a2e-projects` app + project object)
**Status:** done (see DEVIATION below re: members relation)
**What I did:**
- Created `packages/twenty-apps/internal/a2e-projects/` mirroring the
  `a2e-documents` skeleton (package.json, tsconfig, .gitignore/.nvmrc/.yarnrc.yml/
  .oxlintrc.json, empty yarn.lock for named-project yarn 4 install).
- `src/application.config.ts`: APP id `4f759655-84f8-434d-9c76-ee1850e8c1a4`
  (freshly generated, committed forever).
- `src/constants/universal-identifiers.ts`: namespace `c31a0200` (object index
  02 = project, app-level `c31a0000` families ≥ 003 to avoid any reuse of
  a2e-documents identifiers); relation ids grouped by FK owner.
- `src/constants/field-vocabulary.ts`: status pipeline (`PLANNING/ACTIVE/
  ON_HOLD/COMPLETED`) + health (`ON_TRACK/AT_RISK/OFF_TRACK`) select options
  with stable option ids, colors; manyToOne/oneToMany helpers.
- `src/objects/project.object.ts` (14 fields): name (label identifier), key,
  status, health, startsAt, dueAt, color, description (RICH_TEXT), budget +
  spent (CURRENCY, declared for P7.1c), lead (M2O → workspaceMember with
  inverse oneToMany `projects` on workspaceMember side), company (M2O → company
  with inverse). Notes/tasks/timeline/attachments inherited polymorphically.
- `src/views/all-projects.view.ts`: TABLE view "Tous les projets"
  (name/status/health/lead/dueAt/budget, openRecordIn SIDE_PANEL, sort by name).
- `src/page-layouts/project.page-layout.ts`: RECORD_PAGE (Home: FIELDS +
  FIELD_RICH_TEXT description; Timeline tab) — overview FRONT_COMPONENT widget
  deferred to P4.2 per plan.
- `src/navigation-menu-items/projects.navigation-menu-item.ts` (VIEW type,
  position 110, IconKanban).
- `src/command-menu-items/`: create-project + go-to-projects ("Create <thing>"
  and "Go to <app>" anatomy rule), backed by two sandbox front
  components (`front-components/`) reusing the a2e-documents Command +
  navigate pattern (RecordShowPage / RecordIndexPage).
- `src/roles/default-function.role.ts`: default function role
  (`9b6621c5-0521-4421-b97c-d10b1b9da38d`), read/update/soft-delete, no destroy.
- `yarn install` (empty yarn.lock, separate project per Yarn 4), `app:publish`
  build validated: manifest.json extracts all 8 families; publish upload
  skipped (no dev server running — untouched P1 verification path).

**DEVIATION REQUEST — `members` on project (partially deferred):**
PLAN says "members (relation)". The SDK RelationType only exposes
MANY_TO_ONE/ONE_TO_MANY (verified in `twenty-sdk/dist/define/index.mjs` and
`twenty-server/.../relation-type.interface.ts`); there is no many-to-many
primitive as of 2.39. Members-as-M2O on one arbitrary FK makes no sense.
Options: (a) a junction object `projectMember` (project × workspaceMember +
role) declared in the app — matches how the rest of P4 extends tasks; (b)
reformulate the field as `projectMembers` M2O to a new members view. Recommend
(a) as a dedicated `projectMember` object bullet added under P4.1. Stopped
short of inventing it inside this task; `lead` relation is shipped in the
meantime. Needs plan amendment decision.
**Decisions & trade-offs:**
- Board/kanban deferred: the board view needs a per-object status grouping
  surface; P4.2 owns view-type work.
- No post-install logic function yet (nothing to seed at install time until
  P4.2's My-tasks; a stub would just add install surface without value).
- IconKanban used as the project icon (canonical name from twenty-ui).
- Milestone object + task extensions remain separate P4.1 bullets, and the
  milestone relation field on project will ship with the milestone bullet
  (avoids dangling relation target now).

**Verification:** `yarn tsc --noEmit -p tsconfig.json` exit 0;
`yarn lint` (oxlint) 0 warnings 0 errors; `app:publish` manifest build
succeeded with complete manifest (1 object/14 fields, 1 view, 1 page layout,
1 nav item, 2 command menu items, 2 front components, 1 role). Upload to a
server not possible (none running) — noted for the next agent running
`yarn start`.

**For the next agent:**
- Decide the members-model deviation above before P4.1's task-extensions
  bullet (task→project relation field belongs to `a2e-projects/src/fields/`).
- Publish/install: `yarn start` then
  `node packages/twenty-sdk/dist/cli.cjs app:publish --private packages/twenty-apps/internal/a2e-projects && node ... app:install` —
  verify install/uninstall + Settings → Objects rendering per native law §5.
- Position 110 leaves room for P4.2 My-tasks nav item at 120.
