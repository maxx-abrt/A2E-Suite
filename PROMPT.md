# PROMPT.md — execution contract

This plan runs with two roles. RooCode auto-loads the canonical contract
per mode — `.roo/rules-a2e-executor/executor.md` and
`.roo/rules-a2e-orchestrator/orchestrator.md`; other agents read the same
files. If unsure of your role, act as EXECUTOR.

- **EXECUTOR** (fast model): implements ONE slice per session — the first
  unmet bullet of the next dependency-ready task — appends a short report,
  NEVER edits PLAN.md, never commits.
- **ORCHESTRATOR** (strong model / maintainer): runs on demand, not per
  task — verifies executor reports in batch, runs the heavy acceptance
  checks, ticks PLAN.md, commits.

## Executor workflow

Find your task, in order:

1. A pasted brief, or the single pending file in `docs/tasks/` → that is
   your task.
2. Otherwise self-select from PLAN.md, reading ONLY the delivery-order
   table, the current-state ledger, the execution-order list, and your
   chosen task's own section — never the whole file. Take the first
   `[ ]`/`[~]` task whose dependencies are DONE; check the last entry of
   its phase file to skip work already reported. Your slice is that task's
   first unmet bullet, not the whole task.
3. Nothing dependency-ready → say so and stop.

Then:

1. Read only: `AGENTS.md`, your slice, the files it touches + one adjacent
   sibling each. The plan slice carries the decisions you need.
2. Read before writing; match adjacent code; reuse existing primitives and
   `twenty-shared/utils` guards. Verify every API/SDK symbol in real code
   before using it. Never invent parallel systems — views, page layouts,
   workflows, roles, nav and command-menu items are Twenty primitives; use
   them.
3. If the work already exists and passes checks, change nothing — verify
   and report done-for-review. Do not rebuild what a previous report
   marked done.
4. Run only the checks covering your change (see Fast checks). Max 2 fix
   attempts per failing gate, then report BLOCKED with the exact error.
5. Append your report (format below) to the task's phase file — as soon as
   checks pass, or when the session is ~2/3 consumed, whichever comes
   first. Never end a session without it: the report is what stops the
   next agent redoing or breaking your work.
6. Stop. One slice = one session. Do not pick the next task.

Never: edit PLAN.md; commit; commit i18n catalogs or AI attribution;
rename or delete existing tables, fields, routes, exports; run full
package suites, e2e or the full integration sweep; revert dirty files you
did not create; install or copy `Inspiration apps (bureaubilan)` code.

### Executor report — append to the task's phase file, keep it ~10 lines

```markdown
## YYYY-MM-DD HH:MM UTC — <model> [executor]
**Task:** <id> <title> · **Slice:** <which bullet> · **Claim:**
done-for-review | partial | blocked
**Changed:** <files touched>
**Checks:** <command → result; only commands actually run>
**Missing for tick:** <acceptance evidence still absent, or the blocker>
**Do not redo:** <what already works, so the next agent leaves it alone>
**Next:** <exact next micro-step>
```

## Orchestrator workflow

You are the auditor, not the dispatcher — run after several executor
sessions or before a commit/MR.

1. Resume: `git status` / `git diff` / `git log --oneline -15` + the new
   executor reports in `docs/plan/phases/`. Dirty work with no report:
   inspect and attribute the diff, write the missing entry yourself,
   decide salvage vs redo; never revert unexplained changes.
2. For each unverified report: inspect the diff for unrelated churn, i18n
   catalogs, secrets, deleted features — then run the checks the report
   lists as missing.
3. Tick PLAN.md only with acceptance evidence; annotate status + date +
   phase file. Commit change + report + tick together. Partial stays
   `[ ]` or `[~]` with the reason — a tick is your verification, not the
   executor's claim.
4. Blocked/partial reports: split the item into smaller bullets in
   PLAN.md, fix the environment, or ask the user the smallest question.
   Record product deviations in the phase file and PLAN.md's unresolved
   decisions.
5. Optional: pin work by writing `docs/tasks/<task-id>-<slug>.md` from
   `docs/templates/executor-brief.md` (one pending at a time) when a task
   needs narrowing, specific files, or non-plan scope.

## Fast checks — executors run only the ones covering their change

**Tier 0 — no services needed (default, always safe):**

- One test file:
  `npx jest <file.spec.ts> --config=packages/<pkg>/jest.config.mjs`
- Tests covering files you changed:
  `npx jest --findRelatedTests <paths> --config=packages/<pkg>/jest.config.mjs`
- Typecheck (trust this over nx cache):
  `cd packages/<pkg> && npx tsgo -p tsconfig.json --noEmit`
- Lint touched files only: `npx nx lint:diff-with-main <pkg>`
  (`--configuration=fix` to auto-fix)
- App package fast gates, no server needed:
  `yarn typecheck && yarn lint && npx twenty dev:build .`
- Doc edits: `node docs/scripts/check-docs.mjs`

**Tier 1 — Postgres + Redis up, no app launch:**

- Preflight (1s): `pg_isready -h localhost && redis-cli ping` — either
  fails → report BLOCKED naming the service.
- Integration slice on the existing `test` DB:
  `cd packages/twenty-server && NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/graphql/suites/<area>`
  Reset only when schema/migrations changed; otherwise run directly.
- Inspect workspace data read-only: postgres MCP server (`.mcp.json`).

**Tier 2 — running app required (`yarn start`): orchestrator only.**
e2e, real `app:publish`/`app:install`, browser journeys → executors list
them as `Missing for tick` and never launch the stack.

After switching branches or editing `twenty-shared`, rebuild it first:
`npx nx build twenty-shared --skip-nx-cache`. Environment setup:
`docs/verification.md` + `packages/twenty-utils/setup-dev-env.sh`.

## Binding rules — both roles

- PLAN.md is the scope/status/acceptance contract. Deviations get a
  phase-file entry + plan edit, never silent scope changes.
- Additive only: deprecate, don't delete. New server entity → generated
  migration + upgrade command under the current version directory with a
  strictly increasing epoch-ms timestamp, `up` + `down`; app metadata uses
  manifest migration. Never rewrite committed commands.
- House style per AGENTS.md: named exports, types over interfaces, no
  `any`, `//` comments for WHY only, Linaria styling, icons from
  `twenty-ui/icon`, Lingui fr+en for all user-facing strings.
- Reference apps are feature/UX inspiration only — never integrate, copy
  wholesale, adopt dependencies or connect backends.
- No committed i18n catalog churn; no AI attribution in commits.
- Every claimed pass is a command actually run this session; every file
  mentioned was actually opened. Blocked stays UNVERIFIED — never weaken a
  test to go green.
