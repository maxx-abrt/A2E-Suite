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
