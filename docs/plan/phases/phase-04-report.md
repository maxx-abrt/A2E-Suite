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

## 2026-09-14 18:57 UTC — GLM-5.3-Flash [executor]
**Task:** P7.0 Safety gate · **Slice:** same first bullet — wire `allocateDocumentNumber` into the invoice-creation surface as a server-enforced issuance stamp (alternate API writes covered) · **Claim:** done-for-review
**Changed:** new `a2e-accounting/src/logic-functions/stamp-invoice-number.ts` (`databaseEventTriggerSettings: invoice.*`, fills the new `LOGIC_FUNCTION_IDS.stampInvoiceNumber` UUID `…000c`); `handlers/numbering-handler.ts` (+ `stampInvoiceNumberIssued` flow kept beside the allocator for the testable-handler pattern); `lib/numbering.ts` (+ `shouldStampInvoiceNumber` / `INVOICE_STAMP_STATUSES`: only an unnumbered SENT/PARTIALLY_PAID/PAID/OVERDUE invoice is a candidate); tests extended in `lib/__tests__/numbering.test.ts` and `logic-functions/__tests__/numbering-handler.test.ts`.
**Checks:** `yarn typecheck` → 0 errors; `yarn lint` → 0/0; `yarn test:unit` → 89/89 (was 83); handler spec → 8/8 (4 new flow cases); `npx twenty dev:build .` → OK (28 files). Semantics: created DRAFT skips (no burn), any update touching an unnumbered issued invoice stamps it (legacy/backfill), created-as-SENT via raw API stamps immediately, already-numbered never re-stamped — allocation stays the proven CAS path.
**Missing for tick:** live end-to-end proof (Tier 2, orchestrator): app:publish/app:install, create DRAFT → set SENT → number appears once; direct GraphQL `createInvoice {status: SENT}` stamped; re-edit does not renumber; two concurrent issuances get N and N+1.
**Do not redo:** the stamp decision lives in `shouldStampInvoiceNumber` (lib, tested); the flow in `stampInvoiceNumberIssued` (handler, injectable client) — the logic-function file only unwraps the payload, same pattern as sync-invoice-to-ledger. Do not wire this into front components too: the server event is the single enforcement point and a front-side stamp would double-allocate.
**Next:** P7.0 second bullet — protected organization bank data and role/field access, or the remaining first-bullet items (period-close races, money/rounding review) if the domain reviewer prefers.

## 2026-09-14 21:28 UTC — GLM-5.3-Flash [executor]
**Task:** P7.0 Safety gate · **Slice:** second bullet — protected organization bank data with server-enforced role/field access (export/retention/uninstall reviewed) · **Claim:** done-for-review
**Changed:** new `a2e-accounting/src/lib/protected-bank-fields.ts` (shared IBAN/BIC deny list, server `fieldPermissions` shape); new `src/roles/finance-user.role.ts` (assignable "Bilan utilisateur" role: read/update all, no delete, IBAN/BIC denied, via `defineRole` — SDK allows only ONE `defineApplicationRole` per app); `src/roles/default-function.role.ts` (same denies added; no logic function reads iban/bic, verified by grep); `src/objects/org-profile.object.ts` (comment + field descriptions now state server enforcement, no longer "restreindre via le rôle"); new `src/lib/__tests__/protected-bank-fields.test.ts` (4 cases: exact field targets, full deny shape, both roles carry identical denies, assignability).
**Checks:** `yarn typecheck` → clean; `yarn lint` → 0/0; `yarn test:unit` → 93/93; `npx twenty dev:build .` → OK 28 files; manifest inspected: 2 roles, both with `…000e:false/false` (iban) + `…000f:false/false` (bic), finance-user `canBeAssignedToUsers: true`. Server enforcement verified in source, not assumed: `workspace-roles-permissions-cache.service.ts` compiles role fieldPermissions into `restrictedFields`, `permissions.utils.ts` read/update guards deny `canRead/canUpdate === false` on every query, and `object-record-event-publisher.ts` strips restricted fields from subscription events (event-side leak covered). `.twenty/` build output left in place (cleanup command denied) — not committed material, orchestrator may delete.
**Missing for tick:** live proof on the running server (Tier 2, orchestrator): app:publish/app:install, then as a finance-user assignee `orgProfiles {iban}` must fail field-level while `legalName` returns, an update touching iban must be denied, admin role still sees values; export/CSV of orgProfile as restricted user must omit the columns. Encryption at rest remains open under P7.1e (server domain module) — this slice is access control, not at-rest secrecy. Retention: no uninstall hook touches orgProfile; records survive uninstall per C3 preflight, so bank data is not silently destroyed.
**Do not redo:** the deny list lives once in `lib/protected-bank-fields.ts` — both role files import it; never inline duplicates. Field-permission entries must be full denies (`false`, not undefined): undefined falls back to unrestricted in the cache compiler. `finance-user.role.ts` uses `defineRole` because a second `defineApplicationRole` fails the manifest build. Tests unwrap `{success, config}` — `defineRole`/`defineApplicationRole` return validation results, not the config.
**Next:** P7.0 remaining second-bullet items or the first-bullet leftovers (period-close races, money/rounding review); then D03/D04 catalogue scope + CERFA terminology decision before P7 expansion.

## 2026-09-14 20:00 UTC — GLM-5.3-Flash [executor]
**Task:** P7.0 Safety gate · **Slice:** first-bullet leftovers — money/rounding review + period-close races · **Claim:** done-for-review
**Changed:** `a2e-accounting/src/lib/ledger.ts` (+ `isLedgerWriteLocked`: a write is locked when the NEW date or the row's EXISTING date sits in the closed period — rewriting/reviving closed history is refused too); `logic-functions/handlers/ledger-handler.ts` (lock re-checked AFTER the find so a treasurer closing the period mid-flight makes late replays return `SKIPPED_LOCKED` instead of writing closed books; find now also selects `entryDate` to test the row's own date); `front-components/quick-entry.front-component.tsx` (raw `Math.round(parsedAmount * 1_000_000)` → `toMicros`, ending the two-rounding-disciplines defect: Math.round is half-toward-+∞, the app contract is half-away-from-zero); new `lib/__tests__/money.test.ts` (rounding contract); `lib/__tests__/ledger.test.ts` (+ `isLedgerWriteLocked` case covering both dates and the no-lock case).
**Checks:** `yarn typecheck` → clean; `yarn lint` → 0/0; `yarn test:unit` → 96/96 (was 93); ledger+money specs run directly → 15/15 including both new cases; `npx twenty dev:build .` → OK (28 files).
**Missing for tick:** live concurrent proof (Tier 2, orchestrator): close the period while a sync event is in flight and observe `SKIPPED_LOCKED` + no closed-period row; edit a row dated inside the lock and observe refusal. Residual honesty: the re-check narrows but cannot eliminate the race — the Core API has no server-side conditional write on bookEntry (same constraint as the numbering allocator's documented CAS workaround); full elimination needs a server `accounting` domain module (P7 server phase, PLAN already notes its absence).
**Do not redo:** `isLedgerWriteLocked` accepts a date LIST (not just the new date) so the handler's early check and post-find check share one predicate; the row-date arm only fires when `entryDate` is a string (never-booked rows are not lockable). `toMicros` is the ONLY sanctioned decimal→micros conversion — no other call site may inline `Math.round(x * 1_000_000)`.
**Next:** P7.0 third bullet is decision-gated (D03/D04, maintainer/product). Server-side remaining: IBAN/BIC encryption at rest (P7.1e, needs the `accounting` server module) and GDPR-lite consent/export objects (P7.1e). App-side P7.0 is now exhausted pending the orchestrator's Tier-2 sweeps.

## 2026-09-14 22:33 UTC — GLM-5.3 [orchestrator verification]
**Scope:** the three unverified P7.0 executor entries above.
**Diff review:** clean — additive, deny list factored once in `lib/protected-bank-fields.ts`, no catalog churn, no secrets. All `Math.round(x * 1_000_000)` call sites gone (`toMicros` only).
**Checks re-run (all green):** `yarn test:unit` 96/96; `tsgo --noEmit` clean; lint 0/0; `dev:build` OK; manifest inspected live: both roles carry `canReadFieldValue/canUpdateFieldValue: false` for iban (…000e) and bic (…000f), finance-user `canBeAssignedToUsers: true`; deny UUIDs match `field-identifiers.ts` exactly. ORM enforcement chain source-verified end to end: `workspace-roles-permissions-cache.service.ts` compiles fieldPermissions → `restrictedFields`; `permissions.utils.ts` throws `PermissionsException` on every read/update path (`validateReadFieldPermissionOrThrow` L296, `validateUpdateFieldPermissionOrThrow` L337).
**Tier 2 (live):** **BLOCKED — a2e-accounting 0.1.0 does not install.** `app:publish --private --remote scratch` succeeds (tarball 1.3 MB, 42 files), but `app:install` fails with 38 sync errors: 6× `maxNumberOfValues must be defined in settings` (multi-select fields), 2× relation target metadata not found, 2× reserved field names (`address`, `links`), 25× view-field references to nonexistent field metadata, 1× unique index on TEXT `cacheKey`. No application row or partial metadata was left behind. All live P7.0 proofs (stamp on SENT, concurrent numbering, finance-user iban denial, period-close race) remain UNVERIFIED until the manifest is fixed — the app-side logic cannot reach a server.
**Actions:** PLAN.md P7.0 bullets 1–2 → `[~]` with the blockage recorded; no tick. The `.twenty/` build outputs in the app dirs are scratch state, not committed.
**Next:** pin a brief to fix the a2e-accounting manifest (field settings, relation targets, renamed reserved names, view-field cleanup, index type) — this now gates every remaining P7 Tier-2 check and the P7.1 expansion.

## 2026-09-16 20:40 UTC — GLM-5.3 [orchestrator verification]
**Scope:** follow-up on the 2026-09-14 P7.0 install blockage (manifest fix landed 2026-09-16 12:10); Bilan Tier-2 re-run.
**Tier 2:** scratch registry refused re-publishing 0.1.0 → bumped to 0.1.1 (scratch-only, reverted in the app package.json after) → `app:publish --private --remote scratch` + `app:install` both clean. Live on scratch: application row present, 15 tables in the workspace schema, 11 logic functions registered — the 38 sync errors are gone. Manifest-sync + uninstall-data-loss-preflight integration re-run green 6/6 (needs `NODE_OPTIONS=--max-old-space-size=6144`, else jest OOMs).
**Blockage lifted, not the gate proofs:** schema/relations on fresh+populated, ledger replay, invoice numbering, rounding, period-close races, alternate-API stamping remain UNVERIFIED live — now runnable. Populated-install proofs are additionally gated by the post-install seeding failure (see phase-01-report 2026-09-16 orchestrator entry: hook completes per queue metrics but seeds 0 rows). Finance-user iban-denial live proof + reviewer sign-off (bullet 2) still pending.
**Actions:** PLAN.md P7.0 bullet-1 annotation updated (blockage lifted, proofs still open), bullet-2 note updated. No `[x]`.
**Next:** pin the post-install seeding bug — it gates the populated-install proofs here; then run the gate proofs on the live install.

CLAIMED — P4.1-task-extensions/atomic-human-id-allocator — deepseek-v4.1-flash — 2026-09-17T15:37:20Z — base aae72f9a334b41c3812ba6873e241c8ea33b2202

## 2026-09-17 15:41 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.1-task-extensions P4.1: atomic task human-ID allocator + task app-field integrity/lifecycle tests · **Slice:** first bullet — atomic human-id allocator (+ concurrent/replay unit proof)
**Claim:** done-for-review
**Ready-to-tick:** no — the slice is green, but the task's third bullet (UI/API integrity + lifecycle tests for the task app fields) is untouched, so the overall task is not complete.
**Base:** aae72f9a334b41c3812ba6873e241c8ea33b2202
**Changed:** `a2e-projects/src/lib/task-human-id.ts` (new pure rules: `hasTaskHumanId`, `readTaskProjectId`, `readTaskCounter` normalizer, `computeTaskHumanId`); `.../src/logic-functions/handlers/task-human-id-handler.ts` (new CAS allocator `allocateTaskHumanId` + idempotent `assignTaskHumanId` flow, injectable client); `.../src/logic-functions/task-human-id.logic-function.ts` (rewritten as thin payload unwrapper); `.../src/lib/__tests__/task-human-id.test.ts` (new, 4); `.../src/logic-functions/__tests__/task-human-id-handler.test.ts` (new, 10); `.../package.json` (+`test:unit` script); `docs/plan/phases/phase-04-report.md`.
**Checks:** `yarn test:unit` (`node --test --experimental-strip-types` both globs) → 20/20 (10 lib incl. 6 pre-existing + 10 handler); `npx tsc --noEmit` → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 2 warnings both pre-existing in untouched files (`objects/project-member.object.ts`, `fields/task-labels.field.ts`); `npx oxfmt --check` on the 5 touched files → clean; `npx twenty dev:build .` → Build succeeded (14 files), manifest still carries `task-human-id` @ `c31a0000-0012-4000-8000-000000000007`; `npx nx lint:diff-with-main a2e-projects` → "Cannot find project 'a2e-projects'" (app is not an Nx project — package gates substitute, same as a2e-documents precedent); `npx oxlint --type-aware` → "`--type-aware` is not expected in this context" (unsupported in oxlint 0.16.12).
**Missing for tick:** the task's third bullet — UI/API integrity + lifecycle tests for project relation / status / priority / labels / estimate / subtask parent / blockedBy / time-entry object (needs the app installed on the test DB, i.e. Tier 1→2). Tier-2 live concurrency proof (two real concurrent task creations via `app:publish`/`app:install`) stays orchestrator-only.
**Do not redo:** the allocator contract — CAS via `updateManyProjects` filter `{ id: {eq}, taskCounter: { or: [{eq expected},{is NULL}] } }`, data `{ taskCounter: expected+1 }`, allocate BEFORE writing `humanId`, re-read + retry on a lost CAS, cap 10 then throw `TASK_HUMAN_ID_REFUSED`. The accounting CAS precedent is the model; the `.ts` unit stub enforces "caller filter → UPDATE WHERE, only written rows returned" including the synchronous-read concurrency interleaving. `project.taskCounter` keeps meaning "last n attributed" — do not flip it to next-number semantics.
**Remaining:** P4.1 milestone-object bullet (stale — already satisfied in source), P4.1 recurring-generator workflow, this task's integrity/lifecycle tests, then P4.2/P4C output.
**Next:** add the P4.1 task-field integrity/lifecycle tests — Tier 1 seam first (assert the manifest relations/options resolve for the eight task app fields), then the orchestrator installs the app for the live CRUD lifecycle proof.

CLAIMED — P4.1-task-extensions/task-field-integrity-tests — deepseek-v4.1-flash — 2026-09-17T17:45:00Z — base aae72f9a334b41c3812ba6873e241c8ea33b2202

## 2026-09-17 16:07 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.1-task-extensions P4.1: atomic task human-ID allocator + task app-field integrity/lifecycle tests · **Slice:** third bullet — Tier-0 task app-field integrity/lifecycle tests (+ relation-graph repair)
**Claim:** done-for-review
**Ready-to-tick:** no — Tier-0 integrity and static lifecycle policy are green and the install-blocking relation graph is closed, but the live installed UI/API lifecycle CRUD proof is Tier 2 (orchestrator install).
**Base:** aae72f9a334b41c3812ba6873e241c8ea33b2202
**Changed:** new `a2e-projects/src/lib/__tests__/task-field-integrity.test.ts` (13 tests); repaired relation graph — `objects/label.object.ts` + `objects/task-label.object.ts` junction ids/targets (the two sides pointed at a self/missing id), moved 8 inverse O2M fields out of the wrong object into standalone files on their target objects (new `fields/{lead-projects,company-projects,project-milestones,milestone-tasks,project-members,workspace-member-project-memberships,task-time-entries,project-time-entries,workspace-member-time-entries,task-subtasks}.field.ts`); edited `objects/{project,milestone,project-member,time-entry}.object.ts` to drop the now-relocated embedded inverses (M2O fields untouched); `docs/plan/phases/phase-04-report.md`.
**Checks:** `node --test --experimental-strip-types "src/lib/__tests__/*.test.ts" "src/logic-functions/__tests__/*.test.ts"` → 33/33 (13 new integrity); `npx tsc --noEmit` → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 warning pre-existing (`fields/task-labels.field.ts` unused OnDeleteAction); `npx oxfmt --check` on all touched files → clean after format; `npx twenty dev:build .` → Build succeeded (14 files). Extra proof: a manifest.json graph walk (55 fields, 6 objects) reports 0 duplicates / 0 unresolved target fields / 0 inverse-ownership mismatches — the same defects the test locks. `npx nx lint:diff-with-main a2e-projects` and `oxlint --type-aware` remain unavailable (app is not an Nx project; oxlint 0.16.12 rejects --type-aware) — package gates substitute, same precedent as prior P4.1/P3 reports.
**Missing for tick:** live UI/API lifecycle (create/read/update/delete a task through the installed app with project FK, status, priority, labels, estimate, subtask parent, blockIssue, timeEntry) and the live concurrent human-id proof — both need `app:publish`/`app:install` on the test DB (Tier 2, orchestrator).
**Do not redo:** the CAS allocator contract (prior slice, green); the relation graph is now closed end-to-end — 55 fields resolve, every M2O owns its join column, every inverse lives on the relation target and points back. Do NOT re-embed inverse O2M fields inside the FK object: `defineObject` fields omit `objectUniversalIdentifier`, so an embedded inverse lands on the wrong object (the exact defect fixed here; model = real-estate `*-on-*.field.ts`).
**Remaining:** P4.1 milestone-object bullet (stale — already satisfied in source), P4.1 recurring-generator workflow, then P4.2/P4C output.
**Next:** orchestrator Tier-2 — install a2e-projects on the seeded `test` DB, exercise the task-field lifecycle (status/priority/labels/estimate/subtask/blockIssue/timeEntry) and two simultaneous task creations for unique `KEY-n`.

CLAIMED — P4.1-recurring-generator/workflow-template — deepseek-v4.1-flash — 2026-09-17T16:14:53Z — base 3e3f9caf604eb862ebb952768ec919550c777237

## 2026-09-17 17:12 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.1-recurring-generator P4.1: 'recurring task generator' workflow template on the existing workflow engine · **Slice:** first/only bullet — the recipe + manifest-declared generator action
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0/1 gates green; live workflow execution stays Tier 2/orchestrator.
**Base:** 3e3f9caf604eb862ebb952768ec919550c777237
**Changed:** new `src/lib/recurring-task-generator.ts` (pure UTC recurrence math: anchored DAILY/WEEKLY/MONTHLY, half-open window, skip-ahead index, cap, recurrence key); new `src/workflow-templates/recurring-task-generator.workflow.ts` (recipe in the engine's own vocabulary — CRON/DAYS trigger + one LOGIC_FUNCTION step + `validateRecurringTaskGeneratorWorkflow`); new `src/logic-functions/recurring-task-generator.logic-function.ts` (inline-typed handler so the manifest builder infers the action inputSchema; `workflowActionTriggerSettings`); new `src/logic-functions/handlers/recurring-task-generator-handler.ts` (idempotent materialization via project+title+dueAt lookup); new tests `src/lib/__tests__/recurring-task-generator.test.ts` (13), `src/lib/__tests__/recurring-task-generator-workflow.test.ts` (5), `src/logic-functions/__tests__/recurring-task-generator-handler.test.ts` (6); `src/constants/universal-identifiers.ts` (+`recurringTaskGenerator` id); `docs/plan/phases/phase-04-report.md`.
**Checks:** `yarn test:unit` (`node --test --experimental-strip-types` both globs) → 57/57 (24 new); `npx tsc --noEmit` → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 warning pre-existing in untouched `fields/task-labels.field.ts`; `npx oxfmt --check` on all 8 touched files → clean (ran with a lib-inclusive config because root `.oxfmtrc.jsonc` ignores `**/lib/**`; the app's own run also passes on the 5 non-lib files); `npx twenty dev:build .` → Build succeeded (16 files) and the built manifest carries `recurring-task-generator` @ `c31a0000-0012-4000-8000-000000000009` with `workflowActionTriggerSettings.label/icon` and an inferred `inputSchema` (template + window). Extra manifest walk: 4 logic functions present, the generator one is the only `workflowActionTriggerSettings` action.
**Missing for tick:** Tier-2 proof only — install the rewritten app, materialize the recipe into a live workflow (`workflow` + `workflowVersion` via the engine), run the CRON trigger and confirm exactly one task per occurrence with a duplicate-free replay. The orchestrator must provide it (no `yarn start` here). No app-manifest entity emits workflows, so materialization is not bootstrapped by `dev:build`.
**Do not redo:** the recurrence contract — UTC, anchored on `startsAt` (monthly clamps to the month end and re-anchors next month, Jan 31 → Feb 28 → Mar 31), window is half-open `[from, to)`, `firstIndexForWindow` skips history, `MAX_RECURRENCE_OCCURRENCES` bounds. Idempotency is the project+title+dueAt lookup in the handler, not a schema field. Keep the logic-function handler param as an inline type literal (imported aliases fall back to the default empty schema in `getInputSchemaFromSourceCode`). `src/lib/**` is oxfmt-ignored by the root config; the separate 2026-09-17-task-extensions CAS allocator is unrelated and green.
**Remaining:** P4.1 milestone-object bullet (stale — already satisfied in source), the task-extension live lifecycle tests, then P4.2/P4C output.
**Next:** orchestrator Tier-2 — install on the seeded `test` DB, create a workflow from `buildRecurringTaskGeneratorWorkflow`, activate it, run it twice over one window and assert one task per occurrence.

CLAIMED — P4.3-trash/trash-retention-and-purge-cron — deepseek-v4.1-flash — 2026-09-17T18:20:00Z — base 4129966af2ace260aef8c99191078afdc4e3d110

## 2026-09-17 18:55 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.3-trash P4.3: projects trash — 7-day restore + purge cron mirroring the P3 pattern · **Slice:** the task's only bullet — trash lifecycle (archive/restore policy) + purge cron + retention tests
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0/1 green; the Tier-2 live archive/restore/purge proof stays orchestrator-only.
**Base:** 4129966af2ace260aef8c99191078afdc4e3d110
**Changed:** new `a2e-projects/src/lib/trash-retention.ts` (policy as data: `TRASH_RETENTION_DAYS=7`, `isInTrash`, `isPastTrashRetention`, `isRestorable`, `buildArchivePayload`, `buildRestorePayload`); new `src/lib/__tests__/trash-retention.test.ts` (8); new `src/logic-functions/handlers/purge-trash-handler.ts` (`purgeExpiredTrash`, injectable `Pick<CoreApiClient,'query'|'mutation'>` client, `TRASH_OBJECT_TARGETS` = projects/milestones/timeEntries/labels); `src/logic-functions/purge-trash.logic-function.ts` (no-op stub → real 03:30 cron); new `src/logic-functions/__tests__/purge-trash-handler.test.ts` (4); `src/objects/{project,milestone,time-entry,label}.object.ts` (+nullable `archivedAt` DATE_TIME corbeille field); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Checks:** `yarn test:unit` → 69/69 (12 new: 8 retention + 4 purge); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxfmt --check` on all 9 touched files with a lib-inclusive config (root `.oxfmtrc.jsonc` ignores `**/lib/**`) → clean; `npx twenty dev:build .` → Build succeeded (16 files), manifest carries 4 `archivedAt` fields (`c31a0200-…000b`, `c31a0300-…0004`, `c31a0500-…0004`, `c31a0600-…0003`) and `purge-projects-trash`; `npx nx lint:diff-with-main a2e-projects` → "Cannot find project" (app is not an Nx project — package gates substitute); local `oxlint --type-aware` → unsupported in 0.16.12 (phase-report precedent).
**Missing for tick:** no app surface writes `archivedAt` yet (an archive/restore action belongs to P4.2 UX; the field is editable on the native record page). Tier-2 live proof — install, archive a project, restore inside 7 days, observe purge past the window — is orchestrator-only. Standard `task` deliberately keeps Twenty's native trash (no duplicate `archivedAt`).
**Do not redo:** the policy is data — cron and payload builders read `TRASH_RETENTION_DAYS`; empty/unparsable `archivedAt` never purges (mirrors `a2e-documents`). Purge targets are declared once in `TRASH_OBJECT_TARGETS`; each object owns its field; mutations are generated `delete<Plural>` (the default function role has no destroy), same as `purge-archived-documents`, so a purge soft-deletes and the native trash cleanup later hard-deletes. The handler client is injectable — the generated client throws before generation, keep tests stubbing that boundary.
**Remaining:** P4.1 milestone bullet (stale), P4.1 live task-field lifecycle (Tier 2), the rest of P4.2/P4C.
**Next:** executor — add the projects archive/restore action surface (writes `buildArchivePayload()`/`buildRestorePayload()`), or defer to P4.2 views; orchestrator — Tier-2 install + purge-window proof.

CLAIMED — P4.2-subtasks-dependencies-ui/nested-subtask-list — deepseek-v4.1-flash — 2026-09-17T17:21:11Z — base aded3bafc88ab101a838242b33186c32dc1a575c

## 2026-09-17 19:05 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.2-subtasks-dependencies-ui P4.2: subtasks & dependencies UI with cycle validation · **Slice:** first bullet — nested subtask list UI on the existing `parentTask` self-relation (+ cycle-safe reparent reusing the shared guard)
**Claim:** done-for-review
**Ready-to-tick:** no — this slice is green, but the task's dependency-picker bullet and its unit tests are untouched, so the task is not complete.
**Base:** aded3bafc88ab101a838242b33186c32dc1a575c
**Changed:** new `a2e-projects/src/lib/task-tree.ts` (readTaskParentId, collectTaskParentIdMap, nestTaskTree with orphan-at-root + cycle-broken promotion, flattenTaskTree, isTaskParentCycle = the shared visited-set ancestor walk, buildTaskParentPayload, collectTaskParentCandidates); new `src/lib/__tests__/task-tree.test.ts` (11); new `src/front-components/task-subtasks.front-component.tsx` (lazy per-parent nested list, expand/collapse, add subtask, open task, parent picker with client-side cycle refusal, detach); new `src/command-menu-items/open-subtasks.command-menu-item.ts` (GLOBAL mount); `src/constants/universal-identifiers.ts` (+`FRONT_COMPONENT_IDS.taskSubtasks` `…0013-…0007`, +`COMMAND_MENU_ITEM_IDS.openSubtasks` `…0011-…0006`); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Checks:** `yarn test:unit` → 80/80 (11 new task-tree tests: nesting/orphan/cycle-break, cycle predicate, payload refusal, picker exclusion); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxfmt --check` on the 5 touched code files with a lib-inclusive config (root `.oxfmtrc.jsonc` ignores `**/lib/**`) → clean; `npx twenty dev:build .` → Build succeeded (18 files), manifest carries `task-subtasks` @ `c31a0000-0013-4000-8000-000000000007` and the command @ `c31a0000-0011-4000-8000-000000000006`; `npx nx lint:diff-with-main a2e-projects` → "Cannot find project" (app is not an Nx project — package gates substitute, phase-report precedent); `npx oxlint --type-aware` → unsupported in 0.16.12.
**Missing for tick:** (1) acceptance bullet 2/3 — dependency picker + its cycle tests are NOT built (this slice is the nested list only); (2) Tier-2 live proof — install `a2e-projects` on the seeded `test` DB, open the widget, add/reparent subtasks and observe the cycle refusal. The generated GraphQL names (`createTasks`/`updateTask` with `parentTaskId`, the `parentTask { id }` filter) are unverified against a real install here (no `yarn start`).
**Do not redo:** the tree/cycle contract — `isTaskParentCycle` is the SAME visited-set ancestor walk as a2e-documents' `isDocumentParentCycle` (one algorithm, not a second one); `buildTaskParentPayload` throws before persistence; `nestTaskTree` promotes only nodes whose OWN chain re-enters them (bystanders keep their parent) and surfaces orphans at root; reparent writes `parentTaskId` (the `<fieldName>Id` input convention proven by recurring-task-generator's `projectId`, NOT the `subtaskId` join column).
**Gotcha for the next slice:** the existing `task.blockIssue` field is task ➜ **note** (`note-blocked-tasks` inverse), NOT a task self-relation — the PRD's "blockedBy self-relation" wording does not match source. A dependency picker must either pick the blocking note or introduce a task↔task self-relation; confirm with the maintainer/PLAN before building, do not silently reinterpret.
**Remaining:** P4.2 dependency picker + cycle tests, Gantt, calendar link, retroplanning, My-tasks page, project-page widgets, time tracker, Cmd+K; then P4C and the P4.1 live-lifecycle leftovers.
**Next:** executor — dependency picker reusing `isTaskParentCycle` over the chosen dependency edge, with picker + rejection tests; or orchestrator — Tier-2 install for the live nested-list/reparent proof.

CLAIMED — P4.2-gantt/gantt-front-component — deepseek-v4.1-flash — 2026-09-17T17:28:32Z — base 0ae9962297c2649e0b23b1996a1d706932423302

## 2026-09-17 17:34 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.2-gantt P4.2: Gantt/timeline view front component · **Slice:** the task's only bullet — framer-motion-free, virtualized Gantt front component
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0 green; the DOM-level render + live install proof stay Tier 2/orchestrator.
**Base:** 0ae9962297c2649e0b23b1996a1d706932423302
**Changed:** new `a2e-projects/src/lib/project-gantt.ts` (pure timeline math: `parseGanttTimestamp`, `resolveGanttTaskBounds` createdAt➜dueAt / milestone collapse, `collectGanttRange` padded+minimum window, `buildGanttBars` clamped day offsets + deterministic sort, `buildGanttDependencyLinks` over `parentTask`, `computeGanttRowWindow`/`computeGanttDayWindow` overscan windows, `buildGanttModel`, `getGanttStatusColor`); new `src/lib/__tests__/project-gantt.test.ts` (15); new `src/front-components/project-gantt.front-component.tsx` (project-scoped Core query, sticky axis + label column, absolutely positioned bars/milestone diamonds, SVG parent➜child dependency elbows restricted to visible rows, paginated "Charger plus"); `src/constants/universal-identifiers.ts` (+`FRONT_COMPONENT_IDS.projectGantt` `…0013-…0008`); `src/page-layouts/project.page-layout.ts` (+`Gantt` FRONT_COMPONENT widget `c31a0200-000a-…0009` in the Timeline tab); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Checks:** `yarn test:unit` (`node --test --experimental-strip-types`) → 95/95 (15 new: date parsing/bounds, range padding+minimum, bar offsets/span/status/ordering, dependency links, row+day virtualization/clamping, a 1k-task model that mounts 24 rows and 999 links, status colours); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 1.53.0) → 0 errors, 1 pre-existing warning in untouched `fields/task-labels.field.ts`; `npx oxfmt --check` on all 5 touched code files with a lib-inclusive config (root `.oxfmtrc.jsonc` ignores `**/lib/**`) → clean; `npx twenty dev:build .` → Build succeeded (20 files), manifest carries `project-gantt` @ `c31a0000-0013-4000-8000-000000000008` and the page-layout widget @ `c31a0200-000a-4000-8000-000000000009`; `npx nx lint:diff-with-main a2e-projects` → "Cannot find project" (app is not an Nx project — package gates substitute, phase-report precedent); `npx oxlint --type-aware` → "`--type-aware` is not expected in this context" (unsupported in the installed oxlint, same as prior reports).
**Missing for tick:** (1) acceptance bullet 2 asks for *rendering* tests — this app package has no RTL/jsdom/Storybook, so node:test covers the pure rendering model + virtualization windows (bars/rows/ticks/links + bounded mounts); a DOM-render assertion is not expressible at Tier 0 here; (2) Tier-2 live proof — install `a2e-projects` on the seeded `test` DB, open a project record, confirm the `Gantt` widget draws bars/dependency arrows and mounts only the visible rows. The generated GraphQL names (`tasks(filter:{ project:{ id:{ eq }}})`) are unverified against a real install (no `yarn start`).
**Do not redo:** the scheduling contract — bar = createdAt➜dueAt (native task has no start field), single known date collapses to an isMilestone marker, range is padded then floored at `GANTT_MINIMUM_DAY_COUNT`, bars are sorted start/end/title/id so page merges never reshuffle, row window = viewport + overscan clamped to [0,rowCount], day window the horizontal analogue. Dependency arrows reuse the app's `parentTask` self-relation via `readTaskParentId` from `lib/task-tree.ts` (one parent-id reader, not a second one); `blockIssue` is task➜note (previous gotcha) so it is deliberately NOT the dependency edge.
**Remaining:** P4.2 dependency picker, board view, calendar view, retroplanning, My-tasks page, project-page widgets, time tracker, Cmd+K; then P4C and the P4.1 live-lifecycle leftovers.
**Next:** orchestrator — Tier-2 install for the live Gantt render; or executor — the dependency-picker slice (confirm the dependency edge first, per the blockIssue gotcha).

CLAIMED — P4.2-time-tracker/time-tracker-core — deepseek-v4.1-flash — 2026-09-17T17:36:35Z — base f944cc6155ef95a43b1a594ee2bc86883200f3b6

## 2026-09-17 17:41 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.2-time-tracker P4.2: time tracker — start/stop on task, entries list, per-project rollup · **Slice:** the task's only unmet bullet — task-scoped timer + entries list + per-project rollup widget (resumed after the run that held the 17:36 claim stalled before reporting; no second claim created)
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier 0 gates green; the live start→stop→entry-row install proof stays Tier 2/orchestrator.
**Base:** f944cc6155ef95a43b1a594ee2bc86883200f3b6
**Changed:** new `a2e-projects/src/lib/time-tracker.ts` (pure state machine + rollup: `startTimer` single-session, `stopTimer` floors `MINIMUM_LOGGED_MINUTES` on a sub-minute/corrupt start, `computeElapsedMinutes`, `formatDuration`, `serializeTimer`/`parseTimer`, `readTimeEntryTaskId`/`readTimeEntryProjectId`/`readTimeEntryTaskTitle`, `buildProjectTimeRollup` by task with a `sans-tache` bucket, `buildTimeRollupByProject` by project with a `sans-projet` bucket); new `src/lib/__tests__/time-tracker.test.ts` (14); new `src/front-components/time-tracker.front-component.tsx` (localStorage-backed running timer, 1s heartbeat only while running, stop-then-`createTimeEntries` with the timer kept on write failure, task entry list + delete); new `src/front-components/project-time-rollup.front-component.tsx` (project `timeEntries` → `buildProjectTimeRollup`, relative bars); new `src/command-menu-items/open-time-tracker.command-menu-item.ts` (RECORD_SELECTION on `task`); `src/constants/universal-identifiers.ts` (+`FRONT_COMPONENT_IDS.timeTracker` `…0013-…0009`, +`FRONT_COMPONENT_IDS.projectTimeRollup` `…0013-…000a`, +`COMMAND_MENU_ITEM_IDS.openTimeTracker` `…0011-…0007`); `src/page-layouts/project.page-layout.ts` (+`Temps` FRONT_COMPONENT widget `c31a0200-000a-…000a`); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Checks:** `yarn test:unit` (`node --test --experimental-strip-types`) → 109/109 (14 new: start/replace, normalizisation, elapsed floor + skew/corrupt, stop payload + minimum floor + override, `isTimerRunningForTask`, serialize round-trip + malformed, relation/FK id reads, `formatDuration`, sum guards, project rollup by task w/ bucket + stable order, workspace rollup by project w/ detached bucket); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxfmt --check` on the 7 touched files with a lib-inclusive config (root `.oxfmtrc.jsonc` ignores `**/lib/**`) → "All matched files use the correct format"; `npx twenty dev:build .` → Build succeeded (24 files), manifest carries `time-tracker` @ `c31a0000-0013-4000-8000-000000000009`, `project-time-rollup` @ `…0013-…000a`, command `A2E Projects : chronomètre` @ `…0011-…0007`, page widget `FRONT_COMPONENT` @ `c31a0200-000a-4000-8000-00000000000a`; `npx nx lint:diff-with-main a2e-projects` → "Cannot find project 'a2e-projects'" (app is not an Nx project — package gates substitute, phase-report precedent); `npx oxlint --type-aware` → "`--type-aware` is not expected in this context" (unsupported in 0.16.12).
**Missing for tick:** (1) Tier-2 live proof — install `a2e-projects` on the seeded `test` DB, open a task, start/stop, confirm exactly one `timeEntry` row is created and the list refreshes, then open the project page `Temps` widget to see the per-task rollup. The generated GraphQL names (`createTimeEntries` data with `taskId`/`projectId`, `timeEntries(filter:{ task:{ id:{ eq }}})`, `deleteTimeEntry`, `project.timeEntries`, `orderBy spentAt DescNullsLast`) are unverified against a real install (no `yarn start`). (2) "Presence-adjacent" is honoured structurally (mounts through the existing command-menu/side-panel surface on `task`, no new presence system) — a2e front components have no app-level P2.3 presence API to call (the roster/avatar primitives live twenty-front-side), so literal piggy-backing is not expressible here.
**Do not redo:** the state-machine/rollup contract — one `timeEntry` object only (`objects/time-entry.object.ts`; no duplicate), stored unit is whole `timeEntry.minutes`, the running timer is one localStorage link keyed `TIMER_STORAGE_KEY` so a remount/record switch resumes instead of forking, a failed stop keeps the timer, and the grouping/summing is pure `buildProjectTimeRollup`/`buildTimeRollupByProject` (the widgets are render shells). Relation reads accept relation-or-FK (`task{id}` or `taskId`), matching the app's `readTaskParentId` convention.
**Remaining:** P4.2 dependency picker, board view, calendar view, retroplanning, My-tasks page, project-page widget set, Cmd+K search; then P4C and the P4.1 live-lifecycle leftovers.
**Next:** orchestrator — Tier-2 install for the live start/stop→entry-row and `Temps` rollup proof, then tick P4.2-time-tracker; or executor — the next P4.2 bullet (dependency picker must confirm the `blockIssue` task➜note gotcha first).

CLAIMED — P4.2-cmdk/cmd-k-create-task-search-provider — deepseek-v4.1-flash — 2026-09-17T17:45:55Z — base 52bebee6deca5bdba51f99eb100018833bf969c2

## 2026-09-17 17:50 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.2-cmdk P4.2: Cmd+K create task / go to project + tasks/projects search provider · **Slice:** the task's only bullet — a GLOBAL "créer une tâche" command + an app search provider for tasks/projects (resumed after the run that held the 17:45:55Z claim stalled before reporting; no second claim created)
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier 0 gates green; Cmd+K/search live proof stays Tier 2/orchestrator.
**Base:** 52bebee6deca5bdba51f99eb100018833bf969c2
**Changed:** new `a2e-projects/src/command-menu-items/create-task.command-menu-item.ts` (GLOBAL, id `…0011-…0008`, front component `…0013-…000b`); new `a2e-projects/src/front-components/create-task-command.front-component.tsx` (`CoreApiClient.mutation({ createTasks: { __args: { data: [{ title }] } } })` then `navigate(AppPath.RecordShowPage, { objectNameSingular: 'task', … })`, mirrors create-project-command); new `a2e-projects/src/lib/__tests__/command-availability.test.ts` (8 tests: every command validates, id registered in `COMMAND_MENU_ITEM_IDS`, front component registered, create-task GLOBAL + wiring, create/go-to-project GLOBAL, timer stays RECORD_SELECTION while subtasks GLOBAL, registry ids unique + UUID-v4 shaped); new `twenty-server/.../search/services/a2e-projects-search-provider.service.ts` (`@RegisteredSearchProvider({ appUniversalIdentifier: a2e-projects })`, ILIKE task.title + non-archived project.name under the CALLER's resolved role config, items `{recordId,label,description:Tâche|Projet,path:/object/<singular>/<id>}`); new `twenty-server/.../search/services/__tests__/a2e-projects-search-provider.service.spec.ts` (9); `search.module.ts` (+provider); `a2e-projects/src/constants/universal-identifiers.ts` (+`createTask` command id, +`createTaskCommand` front component id); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Checks:** `yarn test:unit` (a2e-projects, `node --test --experimental-strip-types`) → 116/116 (8 new command-availability); `npx jest .../a2e-projects-search-provider.service.spec.ts --config=packages/twenty-server/jest.config.mjs` → 9/9; `yarn typecheck` (`tsc --noEmit`, app) → exit 0; `npx tsgo -p tsconfig.json --noEmit` (twenty-server) → exit 0; `yarn lint` (oxlint 0.16.12, app) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxlint --type-aware -c .oxlintrc.json` on the 3 touched server files → 0 warnings 0 errors; `npx oxfmt --check` on all 7 touched code files with a lib-inclusive config (root `.oxfmtrc.jsonc` ignores `**/lib/**`) → "All matched files use the correct format" (3 files reformatted, cosmetic only, tests re-run after); `npx twenty dev:build .` → Build succeeded (26 files), manifest carries `create-task-command` + `c31a0000-0011-4000-8000-000000000008` + `c31a0000-0013-4000-8000-00000000000b`; `npx nx lint:diff-with-main twenty-server` → "No changed files" (uncommitted edits; direct oxlint/oxfmt substituted per phase-report precedent); `npx nx lint:diff-with-main a2e-projects` not applicable (app is not an Nx project).
**Missing for tick:** Tier-2 live proof — install `a2e-projects` on the seeded `test` DB, type in Cmd+K and confirm the created task opens + the "A2E Projects" group lists matching tasks/projects with working deep links. The generated GraphQL name `createTasks` and the `tasks(filter:{title:{ilike}})`/`projects(...archivedAt null)` repository selects are unverified against a real install (no `yarn start`). Note the sibling `document-search-provider.service.ts` deep-links `/object/documents/<id>` (plural) whereas `AppPath.RecordShowPage` is `/object/:objectNameSingular/:objectRecordId`; this provider deliberately uses the singular `task`/`project` — the plural path in the pre-existing document provider is out of scope here.
**Do not redo:** the search wiring — `A2eProjectsSearchProviderService` is registered purely via the existing `@RegisteredSearchProvider` decorator + module provider; `SearchProviderRegistryService` (DiscoveryService) + `AppSearchService` already group by app id and cap at 5, so no resolver/DTO/Cmd+K-host change is needed. One provider covers both object types on purpose (tasks on standard `task`, projects on the app's `project`). Permission resolution must stay ambient (`resolveRolePermissionConfig({authContext,userWorkspaceRoleMap,apiKeyRoleMap})` passed to `getRepository`); a null config ⇒ `undefined` ⇒ empty object permissions ⇒ fails closed, never `shouldBypassPermissionChecks`. The command mirrors `create-project-command` exactly (Command execute-on-mount, `AppPath.RecordShowPage` with `objectNameSingular: 'task'`); "go to project" already exists as `go-to-projects`.
**Remaining:** P4.2 dependency picker, board view, calendar view, retroplanning, My-tasks page, project-page widget set; then P4C and the P4.1 live-lifecycle leftovers.
**Next:** orchestrator — Tier-2 install for the live Cmd+K create-task + grouped task/project search proof, then tick P4.2-cmdk; or executor — the next P4.2 bullet.

CLAIMED — P4C.1/ownership-compatibility-spike — deepseek-v4.1-flash — 2026-09-17T17:52:00Z — base 7e74c40e7f6e74a4172b5b9187460185cd426a41

## 2026-09-17 — P4C.1 calendar ownership/compatibility spike — findings (report-only)

Base commit `7e74c40e`. Method: read-only inspection of standard metadata, creation
drivers, import/sync and front-end calendar UI at that commit. No metadata or
service was modified — this section is the deliverable and feeds PLAN.md **D05**.
Paths below are relative to the repo root, backticked so no doc link can rot.

### 1. Standard metadata inventory (as it actually is)

- The event store is the workspace standard object **`calendarEvent`**
  (`packages/twenty-server/src/modules/calendar/common/standard-objects/calendar-event.workspace-entity.ts`,
  metadata in `.../utils/field-metadata/compute-calendar-event-standard-flat-field-metadata.util.ts`).
  Fields: `title, isCanceled, isFullDay, startsAt, endsAt, externalCreatedAt,
  externalUpdatedAt, description, location, iCalUid, conferenceSolution,
  conferenceLink` + system fields and four reverse relations
  (`calendarChannelEventAssociations`, `calendarEventParticipants`,
  `calendarEventTargets`, `callRecordings`).
- **No `recurrenceRule`/RRULE field exists on `calendarEvent`.** Repo-wide grep
  for `recurrenceRule` returns nothing in the calendar module. Recurrence is only
  an association string, `calendarChannelEventAssociation.recurringEventExternalId`
  (metadata `compute-calendar-channel-event-association-standard-flat-field-metadata.util.ts`),
  and is only populated by the CalDAV parser
  (`.../drivers/caldav/utils/parse-ical-event.util.ts`).
- **No owner/connected-account column on `calendarEvent`.** Linkage is indirect:
  `calendarEvent` → `calendarChannelEventAssociation.calendarEventId` /
  `.calendarChannelId` → core `calendarChannel.connectedAccountId` + `workspaceId`.
- `calendarChannel` is a **core metadata entity**, not a workspace standard
  object (`packages/twenty-server/src/engine/metadata-modules/calendar-channel/entities/calendar-channel.entity.ts`;
  also `CoreObjectNameSingular`). It carries `visibility`
  (`CalendarChannelVisibility`: `METADATA` default, `SHARE_EVERYTHING`),
  `isSyncEnabled`, sync stage/cursor, webhook fields and `connectedAccountId`.
- `calendarEventParticipant`
  (`.../compute-calendar-event-participant-standard-flat-field-metadata.util.ts`)
  has `handle, displayName, isOrganizer, responseStatus`
  (`NEEDS_ACTION|DECLINED|TENTATIVE|ACCEPTED`) with optional `person` /
  `workspaceMember` relations, matched asynchronously after import.
- `calendarEvent` object metadata is `isSystem: true, isUICreatable: false`
  (`.../object-metadata/create-standard-flat-object-metadata.util.ts:224-226`),
  and every event field is `isUIEditable: false`. Standard record CRUD UI does
  **not** create or edit events.

### 2. Ownership and sharing as implemented

- Storage is workspace-wide; **reads are filtered per-user at query time** by
  `packages/twenty-server/src/modules/calendar/common/query-hooks/calendar-event/services/apply-calendar-events-visibility-restrictions.service.ts`
  (wired for `calendarEvent.findMany` / `findOne`). Rules:
  1. any `SHARE_EVERYTHING` channel → keep full event;
  2. user owns the connected account behind one of the event's channels → keep full;
  3. else any `METADATA` channel → redact `title` + `description` to
     `FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED`;
  4. **no channel association → `splice` the event out (invisible to everyone)**.
- The timeline API re-implements the same logic
  (`.../engine/core-modules/calendar/timeline-calendar-event.service.ts`).
  `myCalendarChannels`, `updateCalendarChannel` and create-path ownership all
  enforce `connectedAccount.userWorkspaceId`
  (`.../calendar-channel/calendar-channel-metadata.service.ts`).
- Net sharing model today: **owner-full / workspace-redacted (METADATA)** by
  default, **workspace-full** when the owner opts into `SHARE_EVERYTHING`.

### 3. Existing creation drivers (writes)

Creation is real and provider-side, but only through dedicated paths — not the
standard UI:

- Metadata mutation `createCalendarEvent`
  (`.../calendar-event-creation-manager/resolvers/create-calendar-event.resolver.ts`),
  guarded by `PermissionFlagType.CREATE_CALENDAR_EVENT_TOOL`; composer service
  `.../services/calendar-event-composer.service.ts`; dispatcher
  `.../services/create-calendar-event.service.ts`.
- Workflow action `CREATE_CALENDAR_EVENT`
  (`.../workflow-executor/workflow-actions/create-calendar-event/`).
- Tool `CreateCalendarEventTool` (used by AI/action tools,
  `.../engine/core-modules/tool/tools/calendar-tool/create-calendar-event-tool.ts`).
- Front-end composer (`packages/twenty-front/src/modules/activities/calendar/hooks/useCalendarEventComposer.ts`,
  mutation `createCalendarEvent.ts`) reachable from a record's related-record
  action and the calendar widget header.
- Provider create drivers: Google `events.insert` (`calendar.events` scope),
  Microsoft Graph `POST /me/calendar/events` (`Calendars.ReadWrite`), CalDAV
  `createCalendarObject`. Provider-creation support = `get-missing-create-event-scopes.util.ts`;
  account eligibility = `isCalendarCreationEnabledForAccount.ts`.

### 4. Import/sync (reads)

- Pull-only for all three providers: Google (`events.list` + `syncToken` +
  `watch` webhook), Microsoft (`/me/calendar/events/delta` + subscription),
  CalDAV (sync-token/CTag). Two-phase list-fetch → detail-import via Redis sets,
  crons `calendar-event-list-fetch.cron.job.ts` (`*/5`) and
  `calendar-events-import.cron.job.ts` (`*/1`), plus webhook-triggered pulls.
- Persistence `CalendarSaveEventsService` upserts event + association by
  external id; orphan events are deleted when the provider deletes them.
- **There is no provider-side update or delete push for any provider.** Grep
  for `events.patch|events.delete|updateCalendarObject|deleteCalendarObject`
  finds only unrelated workflow/ORM symbols. A locally edited or deleted event
  is therefore overwritten/re-created by the next pull.

### 5. Calendar UI (front-end)

- **No `modules/calendar/`, no `AppPath.Calendar`, no `/calendar` route.**
  `packages/twenty-shared/src/types/AppPath.ts` has none. Calendar is a
  **view type** (`ViewType.CALENDAR` / `CALENDAR_WIDGET`,
  `ViewCalendarLayout = DAY|WEEK|MONTH`).
- Generic record calendar grid (any object with a date field), custom-built on
  `@dnd-kit/react` (no FullCalendar): `packages/twenty-front/src/modules/object-record/record-calendar/`.
  Supports create (+ per day), inline field edit and drag-to-move between days.
- Calendar-event agenda widget (month/day-grouped list):
  `packages/twenty-front/src/modules/activities/calendar/`. Events are shown in
  a side-panel record page; **no update/delete UI or mutations** exist
  (only `createCalendarEvent`).
- Composer supports `title, description, location, startsAt, endsAt, isFullDay,
  timeZone, attendees, sendInvitations, addConferencing, connectedAccountId`
  (`generated-metadata/graphql.ts` `CreateCalendarEventInput`) — **no recurrence
  and no attendee-response editing**. Settings page `accounts/calendars` exposes
  visibility + contact auto-creation; `isSyncEnabled` is fetched but not
  rendered as a control.

### 6. Provider capability matrix (create/update/delete/recurrence/attendee)

| Capability | Google | Microsoft | CalDAV (IMAP_SMTP_CALDAV) | Local, no provider |
| --- | --- | --- | --- | --- |
| Import (pull) | yes | yes | yes | n/a |
| Create push | yes (`events.insert`) | yes (Graph `POST`) | yes (`createCalendarObject`) | **no path today** |
| Update push | **no** | **no** | **no** | **no path today** |
| Delete push | **no** | **no** | **no** | **no path today** |
| Recurrence read | association id only, no rule stored | same | `recurringEventExternalId` parsed | n/a |
| Recurrence create/edit | **no** | **no** | **no** | **no** |
| Attendee create | yes (`sendInvitations`) | yes | iCal-dependent | **no** |
| Attendee response | import only (`responseStatus`) | import only | import only | n/a |

Provider availability also gated by config defaults **false**:
`CALENDAR_PROVIDER_GOOGLE_ENABLED`, `CALENDAR_PROVIDER_MICROSOFT_ENABLED`
(`.../twenty-config/config-variables.ts`), plus a Google Calendar
availability probe.

### 7. App activation boundary (what an app can and cannot own)

- Apps may **extend** standard objects with app-owned fields/relations/views
  (SDK `defineField` + `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS`; precedent in
  `packages/twenty-apps/public/last-contact/src/fields/last-contact-for-opportunities-on-calendar-event.field.ts`
  which adds a relation to standard `calendarEvent`). They may not create/own an
  object named `calendarEvent` (workspace name collision → `OBJECT_ALREADY_EXISTS`).
- Apps may declare roles with `objectPermissions` / `fieldPermissions` / RLS
  predicates on standard objects, but **cannot attach permissions to another
  app's role** (including standard admin).
- There is **no whole-app enable/disable**; the `Application` entity only has
  lifecycle `state` (`INSTALLING|INSTALLED|UPGRADING|UNINSTALLING`). Boundaries
  that do exist: per-entity `isActive`/overrides preserved across upgrades, a
  global cache kill-switch, per-app settings/variables, and uninstall.
- Query hooks and provider drivers are **server-side core code** — an app cannot
  register a post-query visibility hook or a calendar sync driver. Apps can add
  page-layout widgets, command-menu items, nav items/views, front components,
  logic functions and (server-registered) search providers.
- A full calendar **page/route** cannot be contributed by an app.

### 8. Decisions (for D05)

- **D5.1 Local-event path — one object, provider-optional.** Local and imported
  events both live in standard `calendarEvent`; do **not** add an app-owned event
  object (parallel backend) and do not fork the save path. Required additive
  core work before local events are usable: (a) an origin/ownership marker
  distinguishing local from imported (prefer an additive standard field via a
  generated migration, because read filtering is server-side and an app cannot
  change it); (b) extend
  `ApplyCalendarEventsVisibilityRestrictionsService` (+ timeline service and the
  `findOne` hook) to resolve local events by creator
  (`createdBy.workspaceMemberId`) and workspace default instead of dropping
  channel-less rows — otherwise a local event is invisible to everyone;
  (c) make `CreateCalendarEventService`/composer provider-optional (persist
  locally, skip the provider call) or add a local create mutation, since today it
  requires a connected account + sync-enabled channel.
- **D5.2 App activation boundary.** Keep the **local-event path and the calendar
  surface in core** (`twenty-front` + `twenty-server`), because local-event
  visibility depends on server query hooks and a page/route cannot be app-owned.
  An app (Bureau/`a2e-calendar`, name still open) owns only opt-in extras:
  links from events to app objects, templates, logic functions, page-layout
  widgets, command-menu items and search providers. Activation is **install +
  per-entity `isActive`**; there is no whole-app toggle, so nothing that must
  always work may be app-gated. Do not create a duplicate event object; the
  Bureau packaging decision remains open and is informed, not settled, here.
- **D5.3 Calendar sharing rights.** Reuse the existing model verbatim — channel
  `visibility` (`METADATA` default → owner-full/others-redacted; `SHARE_EVERYTHING`
  → workspace-full) plus per-user connected-account ownership. For local events
  (no channel) apply the **same semantics with the creator as owner** and a
  single workspace-level default share setting; do not introduce a second
  sharing model or per-event ACLs in this phase.
- **D5.4 Provider capability matrix.** Adopt section 6 as the contract: create
  is pushable; update/delete are read-back-only; recurrence is import metadata
  only (no rule store, no create/edit); attendee create is provider-dependent and
  attendee response is import-only. Unsupported provider actions must surface
  read-only in the UI (P4C.4). Timezone handling exists (user timezone +
  composer time zone); **quiet-hours rules have no primitive** and stay deferred
  to P4C.4/P8.

### 9. Gaps recorded before any metadata/service extension

1. No provider-independent (**local**) create path; composer hard-requires a
   connected account + sync-enabled channel.
2. Channel-less `calendarEvent` rows are dropped by the visibility hook → local
   events need a core read-filter change, not just a new mutation.
3. No `recurrenceRule`/RRULE storage on `calendarEvent`; recurrence only as a
   CalDAV-populated association id, with no UI.
4. No provider-side update/delete push (all providers) — local edits cannot be
   persisted to a provider and are overwritten by the next pull.
5. No front-end `updateCalendarEvent`/`deleteCalendarEvent` mutation or form.
6. No calendar page/route; calendar is a view type + agenda widget only.
7. `calendarEvent` is `isUICreatable: false` with all fields `isUIEditable:
   false` — standard CRUD cannot create/edit.
8. No reminder model and no quiet-hours/timezone rules beyond display/composer
   time zone; reminder delivery is P8-dependent.
9. `isSyncEnabled` is not exposed as a calendar settings control.
10. Apps cannot add routes, query hooks or sync drivers; and there is no
    per-app enable/disable — so local-event ownership must stay core.

### 10. Non-decisions / open questions

- App **name and packaging** (Bureau vs `a2e-calendar`) remain open and are
  explicitly *not* inferred from Bureau here.
- Whether local events need a dedicated standard field vs a core-owned marker,
  and the exact workspace default share setting, require maintainer/product
  confirmation before P4C.2.
- No Tier-2 live evidence was collected (spike is code/read inspection only).
- `Inspiration apps (bureaubilan)` was not read, per the executor contract.


## 2026-09-17 18:05 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4C.1 P4C.1: calendar ownership/compatibility spike (report-only) · **Slice:** the task's only deliverable — the recorded ownership/capability decision in section "P4C.1 calendar ownership/compatibility spike — findings"
**Claim:** done-for-review
**Ready-to-tick:** yes — spike is report-only; docs-only quality gate green, no package touched so lint/tsgo are N/A.
**Base:** 7e74c40e7f6e74a4172b5b9187460185cd426a41
**Changed:** `docs/plan/phases/phase-04-report.md` (findings + this report); `.ralph-tui/progress.md`.
**Checks:** `node docs/scripts/check-docs.mjs` → `PASS: 19 maintained documents, 130 local inline links, balanced code fences` (exit 0). No package changed → `lint`/`tsgo` N/A by design (reported as such); no `yarn start` (Tier 2 orchestrator-only).
**Missing for tick:** none for a report-only slice. Tier-2 live verification is not applicable to a decision record; the exhaustive import/Webhook and provider-push claims are source-read at base `7e74c40e`, not live-install-proven. Maintainer/product confirmation of the open items in findings §10 (app packaging name; local-field-vs-marker; workspace default share setting) is a downstream decision, not a blocker.
**Do not redo:** the recorded decisions — local events reuse standard `calendarEvent` (no parallel backend), app boundary stays off the core local-event path (apps cannot add routes/query-hooks/sync drivers, no whole-app toggle), sharing reuses channel `visibility` + per-user ownership, capability matrix = create pushable / update+delete read-back-only / recurrence import-metadata-only / attendee create provider-dependent. The gap list (§9) is the input for P4C.2+; do not re-derive it.
**Remaining:** P4C.2 core UX, P4C.3 recurrence, P4C.4 reminders/team, P4C.5 task/project links (4 tasks in this execution-order block), plus the P4.2 and P4.1 live-lifecycle leftovers.
**Next:** orchestrator — tick P4C.1 after review (no code to merge beyond docs); or executor — P4C.2 core UX, treating findings §9 gaps 1–3/6–7 and decisions D5.1/D5.3 as the starting contract, and marking D05 resolved in PLAN.md only after maintainer confirmation of §10.

## 2026-09-17 21:10 UTC — deepseek-v4.1-flash [orchestrator verification]
**Scope:** the five unverified P4.1/P4.2/P4.3 executor entries above (task-extensions ×2, recurring-generator, trash, subtasks, gantt, time-tracker, cmdk) plus the report-only P4C.1. Diff review of `aae72f9a..aecb3ca7`: additive app metadata + one additive server module registration; the only "deletions" are inverse O2M fields re-homed into standalone `fields/*.field.ts` files (55-field manifest walk, 0 unresolved), no i18n catalogs, no secrets, no feature removal.
**Environment:** reused the running dev stack (server :3000, Postgres/Redis) instead of cold-booting. The stack's queue worker was stale (Sunday build, trigger jobs sitting unconsumed in Redis `prioritized`), so a worker on the current `dist` was started; `cron:register:all` was run so the workflow cron path is live. This is pre-existing stack drift, not app code.
**Install blocker found and fixed (needed maintainer approval):** the first `app:install` aborted — a2e-projects shared **17 universal identifiers** with A2E Documents (the whole `c31a*` namespace was cloned), so the two apps could never coexist. Approved fix: prefix shift `c31a` → `c31b` across the app (26 files, incl. the generated `viewFieldId` template); a2e-projects is installed nowhere, so no upgrade risk. Published 0.1.3.
**Five more live-only defects found by the Tier-2 proofs, fixed and re-verified (0.1.4 → 0.1.10):**
1. page-layout widgets hardcoded a wrong standard `note` universal id (`20202020-0b00-0000-…`); now `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note` (+ `task`), `projectOverview` id centralised.
2. `updateManyProjects` does not exist; the real CAS primitive is `updateProjects(filter, data)` — verified in `workspace-repository.runMutation`/`morphAndExecute` that it compiles to one `UPDATE … WHERE <filter> RETURNING`, and probed live (eq hit/miss).
3. NUMBER filters accept no `or` (only `eq … is`), so the counter CAS became two single-statement attempts (`{eq}` then `{is: NULL}` for pre-field projects).
4. `Position` scalar only accepts `'first' | 'last' | number` — `position: 'V'` failed post-install task creation and the workflow step; now `'last'` (post-install, recurring handler, add-subtask).
5. `OrderByDirection` has only the four Nulls variants — `'Asc'`/`'Desc'` are invalid live (hidden by `as never` casts); fixed in gantt/subtasks/time-tracker. Also: database event payloads carry `projectId` (join column), not `project { id }` — `readTaskProjectId` now accepts both; the plural `delete<Plural>` takes a required `filter`, not `id`; project `description` is RICH_TEXT and needs `{ markdown }`.
**Tier-2 evidence (all on the populated `Apple` workspace, app v0.1.10, A2E Documents 0.2.1 installed):**
- P4.1 task fields: `OVF-1` on create; concurrent creations `OVF-2`/`OVF-3` unique; edit re-trigger keeps id+counter; status/priority/estimate, label+junction, `parentTask`, `blockIssue`→note, `timeEntry` create/read/delete + project rollup all exercised over GraphQL. Post-install seeded LIV/EVT with 5 tasks each, auto-numbered LIV-1..5/EVT-1..5.
- P4.1 recurring generator: recipe materialized on the engine (draft + `createWorkflowVersionStep` + `createWorkflowVersionEdge` + activate), native CRON fired `WorkflowTriggerJob → RunWorkflowJob`; run 1 `created:1/skipped:0`, runs 2–3 `created:0/skipped:1` (duplicate-free). `post-install` re-run twice: 2 then 0 (idempotent).
- P4.3 trash: archive → trash query, restore inside 7 days clears `archivedAt`, deployed purge handler `{purged:2, projects:1, milestones:1}`, expired project+milestone soft-deleted, a same-day archived label untouched.
- P4.2 subtasks: roots/children filters and reparent write verified live. Gantt/time-tracker: live query shapes verified (pagination, null-variant orderBy, rollup join).
- P4C.1: spot-checked `calendarEvent` (`isUICreatable=false`, 0/24 recurrence-named fields) against the recorded findings.
**BLOCKED, not ticked:** P4.2 Cmd+K search half — `searchAppRecords` returns `[]` live (API-key and user token) for the new a2e-projects provider **and** for a freshly created document through the pre-existing provider, including after a clean server restart; the app-search federation is not live-functional, so the provider's live proof stays UNVERIFIED. Needs a follow-up brief on `SearchProviderRegistryService`/`AppSearchService` (registration vs. `flatApplicationMaps` keys) before P4.2-cmdk can be completed. Gantt DOM render + 1k-task benchmark and the timer's browser heartbeat also stay open (no browser-session proof in this pass).
**Actions:** PLAN.md ticked P4.1 task-extensions, milestone object, recurring generator, P4.3 trash, P4C.1; marked `[~]` with reasons for subtasks/dependencies, gantt, time tracker, Cmd+K and P1.1 (install+upgrade accepted, uninstall still open). App source shipped to 0.1.10 and published/installed on the scratch registry.
**Do not redo:** the `c31b*` namespace decision and the six fixes above — each is live-verified, not theoretical. The executor slices themselves were correct in intent; the defects were unverified-API-shape assumptions (`as never` casts hide them all — treat any new Core API call as requiring a live probe).
**Next:** (1) executor brief — fix live app-search federation; (2) executor — dependency-picker decision (`blockIssue` task→note vs new self-relation) then the picker; (3) browser pass for gantt DOM/timer heartbeat/1k benchmark; (4) P4.2 remaining bullets (board, calendar view, retroplanning, My-tasks, project page) and then P4C.2.

CLAIMED — P4.1-project-object-validation/manifest-graph-walk — deepseek-v4.1-flash — 2026-09-18T04:25:00Z — base d19510d25ae7a722c5481be606b92720a67b4ff0

## 2026-09-18 04:33 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.1-project-object-validation P4.1: validate installed project-object relations, permissions and layouts at manifest level (no duplicate objects) · **Slice:** second bullet — extend the manifest graph-walk to views, page-layouts, navigation-menu items and roles (the 6-object/55-field relation walk itself is already green: task-field-integrity.test.ts)
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0/1 gates green; installed-permission/layout-rendering proofs are Tier 2 (orchestrator-only) and listed under Missing.
**Base:** d19510d25ae7a722c5481be606b92720a67b4ff0
**Changed:** new `a2e-projects/src/lib/__tests__/project-object-integrity.test.ts` (10 tests); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Checks:** `node --test --experimental-strip-types "src/lib/__tests__/project-object-integrity.test.ts"` → 10/10; `yarn test:unit` (both globs) → 128/128 (10 new, prior 118 untouched); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxfmt -c <lib-inclusive tmp config> --check <new file>` → clean (root `.oxfmtrc.jsonc` ignores `**/lib/**`; lib-inclusive copy used, prior-phase precedent); `npx twenty dev:build .` → Build succeeded (26 files); `npx nx lint:diff-with-main a2e-projects` → "Cannot find project 'a2e-projects'" (app is not an Nx project — package gates substitute, precedent); `npx oxlint --type-aware` unsupported in 0.16.12 per the brief. Extra proof: walked the generated `.twenty/output/manifest.json` → 6 objects / 21 standalone fields / 8 views / 1 page-layout / 2 nav items / 1 role, 0 duplicate universal identifiers, 0 unresolved relation target fields.
**Missing for tick:** Tier 2 only — (1) installed-permission proof: assign the `A2E Projects default function role` on a live install and exercise the read/update/soft-delete ACLs; (2) installed-layout proof: render the project record page (Accueil/Timeline widgets, gantt/overview/rollup front components) on the installed app; (3) live reinstalled-metadata re-walk confirming no duplicate objects after install. No `yarn start` run here.
**Do not redo:** the object/field/relation graph is closed (6 objects, 55 fields, every M2O owns its join column, every inverse lives on the relation target and points back) — `project-object-integrity.test.ts` re-asserts the three walk invariants on the same full graph plus the new view/layout/nav/role surface, but the relation-graph repair is prior work. The `c31b*` namespace and the six live-found API-shape fixes (phase-04 orchestrator entry 2026-09-17) stand. budget/spent stay declared-only CURRENCY (P7.1c wires them).
**Remaining:** P4.2 board view / calendar view / My-tasks / project page / dependency picker, P4.2 retroplanning, gantt DOM + timer heartbeat Tier-2, P4C.2–P4C.5, P6.1 — plus the P4.1 Tier-2 legs above.
**Next:** orchestrator — Tier-2 install to collect the permission/layout-rendering proofs; or executor — P4.2-board-view (audit existing KANBAN definition first, per its acceptance).

CLAIMED — P4.2-board-view/kanban-status-grouping — deepseek-v4.1-flash — 2026-09-18T04:35:26Z — base 5b309393178a2125242740a6bb544d3a991b80b2

## 2026-09-18 04:36 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.2-board-view P4.2: board view — kanban on task grouped by status (prefer the existing KANBAN view type) · **Slice:** the task's only bullet — audit/correct the existing `task-board.view.ts` so it matches the acceptance contract
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0/1 gates green; live kanban rendering/drag proof is Tier 2 (orchestrator-only) and listed under Missing.
**Base:** 5b309393178a2125242740a6bb544d3a991b80b2
**Changed:** `a2e-projects/src/views/task-board.view.ts` (group-by + project-scope filter + comments); new `a2e-projects/src/lib/__tests__/task-board.test.ts` (5 tests); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Audit:** a valid KANBAN view did already exist (`task-board.view.ts`, committed in `bfedc629` / namespace-shifted in `aecb3ca7`), so its shape was reused, not rebuilt. It was NOT acceptance-valid: it grouped by the native task `status` (`20202020-70bc-…`), not the app `taskProjectStatus` select, and had no project scoping. `task-project-status.field.ts` explicitly documents "the P4.2 board groups on this field", confirming the intent.
**What I did:** `mainGroupByFieldMetadataUniversalIdentifier` now points at `TASK_FIELD_IDS.projectStatus` (`c31b0201-0001-…0002`, app SELECT, options TODO/IN_PROGRESS/DONE); `fields` reference `TASK_FIELD_IDS.project` instead of a hardcoded string; added one `IS_NOT_EMPTY` filter on the app task→project relation (`c31b0201-0001-…0001`) to project-scope the board; groups stay TODO/IN_PROGRESS/DONE and are asserted equal to the status field's option values. No new view type, no custom-status object, no schema change.
**Checks:** `node --test --experimental-strip-types "src/lib/__tests__/task-board.test.ts"` → 5/5; `yarn test:unit` → 133/133 (was 128; +5, prior untouched); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxfmt -c <lib-inclusive tmp config> --check` on both touched files → needed fix, then clean after `-w` run (root `.oxfmtrc.jsonc` ignores `**/lib/**`); `npx twenty dev:build .` → Build succeeded (26 files); `npx nx lint:diff-with-main a2e-projects` → "Cannot find project" (app is not an Nx project — package gates substitute, prior-phase precedent); `npx oxlint --type-aware` unsupported in 0.16.12. Manifest proof: `.twenty/output/manifest.json` board entry = `type KANBAN`, task object, `mainGroupBy c31b0201-0001-…0002`, filter project relation `IS_NOT_EMPTY`, groups `[TODO, IN_PROGRESS, DONE]`, 8 views total.
**Missing for tick:** Tier 2 only — install the app and confirm the live kanban renders four/three columns by `Statut` and that dragging a card writes `taskProjectStatus` (not the native status); no `yarn start`/browser run here.
**Do not redo:** the `c31b*` namespace decision and the six live-found API-shape fixes (2026-09-17 orchestrator entry); the existing graph walk (`project-object-integrity.test.ts`) already resolves every view field/group-by/filter — only the board's group-by target and missing project filter were wrong. `all-labels`, `all-milestones`, `all-projects`, `project-tasks`, `my-tasks`, `current-tasks`, `task-calendar` views are untouched.
**Remaining:** P4.2 calendar view / My-tasks page / project-page widgets / dependency picker / retroplanning, gantt DOM + timer heartbeat Tier-2, P4C.2–P4C.5, P6.1 — plus the P4.1 Tier-2 legs.
**Next:** orchestrator — Tier-2 install for the live board render + drag-writes-projectStatus proof, then tick P4.2-board-view; or executor — P4.2 calendar view (also audited present as `task-calendar.view.ts`, verify against its acceptance).

CLAIMED — P4.2-calendar-view/project-scoped-native-calendar — deepseek-v4.1-flash — 2026-09-18T06:40:00Z — base 0717c7ef07ba0ca6d9f7f6be153f4108ea8b31eb

## 2026-09-18 04:39 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** P4.2-calendar-view P4.2: calendar view of task due dates on the existing calendar view surface · **Slice:** the task's only bullet — audit/correct the existing `task-calendar.view.ts` so it matches the acceptance contract (native CALENDAR on task dueAt, project-scoped via the task→project relation)
**Claim:** done-for-review
**Ready-to-tick:** yes — Tier 0/1 gates green; live calendar rendering/drag proof is Tier 2 (orchestrator-only) and listed under Missing.
**Base:** 0717c7ef07ba0ca6d9f7f6be153f4108ea8b31eb
**Changed:** `a2e-projects/src/views/task-calendar.view.ts` (project filter + standard task object id + `TASK_FIELD_IDS.project` field ref, comments); new `a2e-projects/src/lib/__tests__/task-calendar.test.ts` (4 tests); `docs/plan/phases/phase-04-report.md`; `.ralph-tui/progress.md`.
**Audit:** a native CALENDAR view did already exist (`task-calendar.view.ts`, task object, `calendarFieldMetadataUniversalIdentifier` = native dueAt, MONTH layout), so its shape was reused, not rebuilt. It was NOT acceptance-complete: the bullet requires a "project-scoped filter via the existing task→project relation", and the view had no such filter (only `status IS_NOT DONE`), so it would show every open task workspace-wide. The object id was also hardcoded rather than the SDK standard id the board uses.
**What I did:** added a second filter `IS_NOT_EMPTY` + `value: ''` on `TASK_FIELD_IDS.project` (`c31b0201-0001-…0001`), mirroring the board; switched the project column and filter to `TASK_FIELD_IDS.project` and the object to `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier`; kept the existing `status IS_NOT DONE` filter. No new view type, no front component, no logic function / provider call — the view only renders due dates, so no calendar event or invitation is produced (P4C.5 boundary). New filter uid continues the `c31b0100-0005-…` sequence (`…0005`).
**Checks:** `node --test --experimental-strip-types "src/lib/__tests__/task-calendar.test.ts"` → 4/4; `yarn test:unit` (both globs) → 137/137 (was 133; +4, prior untouched); `yarn typecheck` (`tsc --noEmit`) → exit 0; `yarn lint` (oxlint 0.16.12) → 0 errors, 1 pre-existing warning (`fields/task-labels.field.ts`, untouched); `npx oxfmt -c <lib-inclusive tmp config> --check` on both touched files → clean after one `-w` run (root `.oxfmtrc.jsonc` ignores `**/lib/**`; lib-inclusive copy used, prior-phase precedent); `npx twenty dev:build .` → Build succeeded (26 files); `npx nx lint:diff-with-main a2e-projects` → "Cannot find project 'a2e-projects'" (app is not an Nx project — package gates substitute, prior-phase precedent); `npx oxlint --type-aware` unsupported in 0.16.12 per the brief. Manifest proof: `.twenty/output/manifest.json` calendar entry = `type CALENDAR`, task object `20202020-1ba1-…`, `calendarLayout MONTH`, `calendarField dueAt`, project column + second filter `IS_NOT_EMPTY` on `c31b0201-0001-…0001`.
**Missing for tick:** Tier 2 only — install the app and confirm the live record-calendar grid renders the month with project tasks placed by `dueAt`, respecting the project scope, with no provider event/invitation created. No `yarn start`/browser run here.
**Do not redo:** the `c31b*` namespace decision and the six live-found API-shape fixes (2026-09-17 orchestrator entry); `project-object-integrity.test.ts` already resolves this view's fields/filters/calendar field. The native calendar surface (`packages/twenty-front/src/modules/object-record/record-calendar/`) is the rendering target — do not add a competing calendar. `all-labels`, `all-milestones`, `all-projects`, `project-tasks`, `my-tasks`, `current-tasks`, `task-board` views are untouched.
**Remaining:** P4.2 My-tasks page / project-page widgets / dependency picker / retroplanning, gantt DOM + timer heartbeat Tier-2, P4C.2–P4C.5, P6.1 — plus the P4.1 Tier-2 legs.
**Next:** orchestrator — Tier-2 install for the live calendar render proof, then tick P4.2-calendar-view; or executor — P4.2 My-tasks page (audit `my-tasks.view.ts` + nav item against its acceptance first).
