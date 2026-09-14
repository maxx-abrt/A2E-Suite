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


## 2026-09-12 14:05 UTC — OpenHands (P4 agent, session 2)
**Task:** P4.1 `task` extensions (app fields pinned on the standard task object)
**Status:** PARTIAL DONE (subset of the bullet's list shipped; remainder
documented inline in PLAN.md and below)
**What was verified before writing (anti-hallucination passes):**
- STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS is a value export from
  twenty-sdk/define (not just a type), with .task = 20202020-1ba1-... —
  real ids from packages/twenty-shared/src/metadata/constants/
  standard-object-fields.constant.ts (task block) and
  task-flat-object.mock.ts. note = 20202020-0b00-....
- Real-estate personType.field.ts confirmed: app fields pinned on STANDARD
  objects live as standalone src/fields/*.field.ts with
  objectUniversalIdentifier = standard object id.
- SYSTEM_VIEW_KEYS export covers only INDEX/FIELDS_WIDGET for the standard
  app's own views (runtime probe of twenty-sdk/dist/define/index.cjs) —
  app views on standard objects therefore point objectUniversalIdentifier
  at the object id directly.
- The SDK has NO many-to-many primitive (checked relation-type.interface.ts
  + RelationType in dist) — stays an open plan-amendment question for
  members (P4.1 session-1 report) and any labels-M2M idea here.
- TagColor + FieldMetadataComplexOption (color: TagColor) verified live in
  twenty-shared/src/types/FieldMetadataOptions.ts — used for status colors.
**Files added:**
- src/constants/universal-identifiers.ts: TASK_FIELD_IDS block
  (c31a0201 family — task-field standalones).
- src/constants/field-vocabulary.ts: +manyToOne join-column helper.
- src/fields/task-project.field.ts (task→project M2O, FK on task,
  onDelete SET_NULL, matching how Twenty treats assignee deletion)
- src/fields/project-tasks.field.ts (project→tasks inverse O2M)
- src/fields/task-project-status.field.ts (SELECT, 3 committed options
  TODO/IN_PROGRESS/DONE gray/blue/green, default TODO)
- src/fields/task-priority.field.ts (SELECT, 4 options)
- src/fields/task-estimate.field.ts + task-estimate-label.field.ts
  (TEXT pair — plain + colored-label variant, real-estate Text+options
  pattern)
- src/fields/task-block-issue.field.ts (task→note M2O "Bloquée par")
- src/fields/note-blocked-tasks.field.ts (note→tasks inverse)
- src/views/project-tasks.view.ts (standard-task TABLE view "Tâches
  projet": title/project/projectStatus/assignee/priority/dueAt — the free
  side-panel column surface native law §3 grants).
**Verification done:**
- npx tsc --noEmit (a2e-projects): 0 errors.
- yarn lint (oxlint): 0 warnings 0 errors.
- npx twenty app:publish --private: tarball builds, manifest.json 21.2kB
  with all 9 families (objects 1, fields 7, views 2 incl. the new
  task-surface view, pageLayouts 1, nav 1, cmds 2, frontComponents 2,
  roles 1). Upload fails without a dev server on :2020 (session-1
  behavior, not a code defect). .twenty/ build output cleaned pre-commit.
**Scope honesty (NOT in this commit):**
- labels (object), subtask parent relation, human id (computed) and
  time-tracking entries object remain open; each is a full surface
  (object+UI+relations), logged in PLAN.md's PARTIAL note. Suggestion:
  labels→P4.2 (board tag UX), subtasks→P4.2 (tree UI), time-tracking→P4.3
  (entries object + timer hook), human-id→needs a server computed-field
  decision (page-layout hooks or domain module src/modules/project/) —
  flagged, NOT silently invented here.
- No post-install logic function added (no seed needed for this subset;
  option ids already committed manifest-side).

### Correction (2026-09-12, later) — self-audit
Session 1 ticked the P4.1 `project` object bullet [x] even though two listed
items were missing: `members (relation)` (SDK has no many-to-many; junction
object unresolved) and `milestones (object)` (deferred to its own bullet).
That violated the plan rule that a task is ticked only when complete. The
tick is reverted to [ ] with a PARTIAL note in PLAN.md. The task-extensions
bullet was never ticked and remains [ ] with its PARTIAL annotation.
Milestone object, workflow template and all of P4.2 remain open/untouched.

## 2026-09-14 16:20 UTC — GLM-5.3-Flash [executor]
**Task:** P7.0 Safety gate · **Slice:** first bullet — transactional ledger replay/uniqueness recovery · **Claim:** partial
**Changed:** `a2e-accounting/src/lib/ledger.ts` (pure `resolveLedgerUpsertAction` + `isLedgerUniqueViolation`); `a2e-accounting/src/logic-functions/handlers/ledger-handler.ts` (upsert find now widens to soft-deleted rows, retired-row revival in place, create-race loser adopts the winner's row); `a2e-accounting/src/lib/__tests__/ledger.test.ts` (5 new cases).
**Checks:** `yarn test:unit` → 83/83 (was 78); `yarn typecheck` (tsc) → 0 errors; `yarn lint` (oxlint) → 0 warnings; `npx twenty dev:build .` → OK (26 files). Server contracts verified in source before writing: `graphql-query.parser` widens to `withDeleted()` on any `deletedAt` key in the filter; mutation statement builder renders only user filters (update-by-id reaches a soft-deleted row); `DateTimeFilter.is: NOT_NULL` exists; manifest `IndexManifest` has no `indexWhereClause` so `sourceKey`'s unique index covers tombstoned rows.
**Missing for tick:** live concurrent-replay proof against the running server (Tier 2: app:publish/app:install, two event replays + a soft-delete/replay cycle — orchestrator). Rest of the P7.0 first bullet (money/rounding already integer-micros in `lib/money.ts`; invoice numbering race and period-close races) is a separate slice.
**Do not redo:** the find-filter pattern (`or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }]`) is a deliberate tautology that triggers the server's soft-delete widening; `updateBookEntry` with `deletedAt: null` is the revival mechanism — restore resolvers are not needed. The race-recovery find needs no widening: an insert-race winner is live by definition.
**Next:** P7.0 same bullet — invoice numbering allocation race (per-workspace sequence under concurrent invoice creation), then the protected-bank-data bullet.

## 2026-09-14 16:47 UTC — GLM-5.3-Flash [executor]
**Task:** P7.0 Safety gate · **Slice:** same first bullet — invoice numbering allocation race (per-workspace sequence under concurrent invoice creation) · **Claim:** done-for-review
**Changed:** new `a2e-accounting/src/logic-functions/handlers/numbering-handler.ts` (race-safe allocator `allocateDocumentNumber` for invoice/quote/receipt counters); `a2e-accounting/src/lib/numbering.ts` (+`readCounterState` pure normalizer for a missing/malformed NUMBER counter); `src/lib/__tests__/numbering.test.ts` rewritten around `readCounterState` (3 counter cases, prior build/parse/gap cases preserved); new `src/logic-functions/__tests__/numbering-handler.test.ts` (4 cases).
**Checks:** `yarn typecheck` (tsc) → 0 errors; `yarn lint` (oxlint) → 0/0; `yarn test:unit` → 80/80 lib glob + handler file run separately → 4/4; `npx twenty dev:build .` → OK (26 files). Server contracts verified in source before writing: `updateManyOrgProfiles` renders the caller filter into the UPDATE WHERE and returns only actually-written rows (root-type.generator.ts `updateMany` → CommonUpdateManyQueryRunnerService.runFilteredMutation → WorkspaceRepository.runMutation → `update()…returning().execute()`), `is: 'NULL'|'NOT_NULL'` is a shared filter operand (`twenty-shared` IsFilter).
**Missing for tick:** live concurrent-allocation proof against the running server (Tier 2: app:publish/app:install, two simultaneous invoice emissions must allocate FA-…000N and FA-…000N+1 with no gap-noise on retry) — orchestrator. The allocator is additive and NOT yet wired into any creation surface: invoice creation is currently UI/API-driven with no number stamping anywhere, so wiring it into an invoice-builder flow is the next slice (do not tick the numbering item on tests alone).
**Do not redo:** the CAS shape — filter pins `id eq <profileId>` AND `or: [{<counter> eq expected}, {<counter> is NULL}]`, data bumps to expected+1; the `is: NULL` arm makes a first-ever allocation (profile seeded pre-field / hand-cleared) deterministic exactly once. Lost CAS ⇒ re-READ the profile before retrying, never guess the winner's increment; cap at 10 attempts then throw `Numérotation contestée` (a burn is legal, a reprint is not, art. L102 B). Client is injectable (`CoreClientLike = Pick<…'query'|'mutation'>`) because the generated `CoreApiClient` throws before generation — keep tests stubbing that boundary, do not instantiate the real client.
**Next:** wire `allocateDocumentNumber('invoice', …)` into the invoice-creation surface (builder front component or a databaseEvent logic function stamping DRAFT→SENT), then the protected-bank-data bullet (P7.0 same task).
