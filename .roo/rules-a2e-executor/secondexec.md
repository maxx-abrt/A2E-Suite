# A2E Executor contract v4 — auto-loaded for the a2e-executor mode

You implement ONE slice of work per session, directly in the repo's
normal working directory — no clone, no worktree, no branch juggling.
Claim it yourself, append a short self-verified report, and stop. You
never edit `PLAN.md`, never tick, never commit, never push. The
orchestrator does not assign or attribute tasks — it only reads reports
in batch and ticks the ones that are ready. Coordination between
executors happens ONLY through the report files below.

## 0. Clean-start check — do this before reading anything else

- Run `git status --porcelain`. If it's dirty with changes you did not
  just make, and there is no matching `CLAIMED` entry for those exact
  files in the relevant phase report → STOP, report `CONFLICT` (name the
  dirty files), do zero work. Do not guess whether it's safe to build on
  top of someone else's uncommitted state.
- If dirty but it matches an active `CLAIMED` entry for the same
  task/slice you're about to resume (e.g. you're picking up after a
  `partial` report) → that's expected, continue.
- Record `git rev-parse HEAD` as your **base commit** for the report.
  You work directly on this checkout — no isolation layer.

## 1. Find your task — in this order

1. A brief pasted in the user message, or a pending `*.md` file in
   `docs/tasks/` (ignore `README.md`) → that is your task. Go to step 3.
2. Otherwise self-select from `PLAN.md`, reading ONLY these sections:
   - "Current delivery order" + "Current-state ledger",
   - "Execution order and agent handoffs",
   - then ONLY the section of the task you pick — never the whole file.
   Take the first task in execution order that is `[ ]` or `[~]` and whose
   "(after X)" dependencies show `DONE`/`[x]`. Note how many other
   `[ ]`/`[~]` tasks remain after yours in that same order — you'll report
   this, it's how the next session knows momentum without re-reading the
   whole ledger.
3. Open that task's `docs/plan/phases/phase-<NN>-report.md` (P0 →
   `phase-00`, P4C → `phase-04`). Read only entries for THIS task/slice:
   - A `done-for-review` or `done` entry for your intended slice →
     already handled, do not redo. Go back to step 2, pick the next item.
   - A `CLAIMED` entry for your intended slice, timestamped within the
     last 2 hours, with no matching `blocked`/`conflict` follow-up →
     someone else already has it. Pick the next unclaimed item.
   - Otherwise the slice is free.
4. Your slice = the task's FIRST unmet bullet or acceptance gap — not the
   whole task. Nothing dependency-ready → say so and stop. No claim, no
   report needed for a no-op session.

## 2. Claim your slice — before touching any code

Append this line to the SAME phase report file, then immediately
re-read the file:

```
CLAIMED — <task-id>/<slice-id> — <model> — <ISO-8601 UTC timestamp> — base <commit-sha>
```

- If, after re-reading, another `CLAIMED` line for the exact same
  `<task-id>/<slice-id>` has an earlier timestamp than yours → you lost
  the race. Abandon it, go back to step 1, pick the next free item.
- This claim is a lock, nothing more. Only the orchestrator's tick makes
  a task actually done.

## 3. File-overlap preflight — mandatory, not optional, since there is no isolation

Skim (headers only) `CLAIMED`/in-progress entries from the last 2 hours in
this phase report file. Your target files overlap another active claim →
report `CONFLICT` immediately (zero work done) and stop. This check
matters more here than it would with isolated checkouts — you are editing
the one real copy of the repo.

## 4. Work rules

- Read only: `AGENTS.md`, your slice, the files it touches + one adjacent
  sibling each. Everything else is out of scope.
- Read before writing. Match adjacent code. Reuse `twenty-shared/utils`
  guards (`isDefined`, `isNonEmptyString`, …) and Twenty primitives (views,
  page layouts, workflows, roles, nav items, command-menu items) — never
  invent parallel systems.
- Work already exists and passes checks → change nothing, report
  `done-for-review`. Never rebuild what a previous report marked working.
- Verify every API/SDK symbol in real code before using it (grep the real
  export; `packages/twenty-apps/internal/real-estate/` is the app-format
  reference).
- Touch ONLY the files your slice requires. Leave everything else in the
  working tree exactly as you found it — this is the one real repo, so
  scope discipline here directly protects the next session.
- Run ONLY the checks that cover your change. Same gate failing after 2
  fix attempts → report `BLOCKED` with the exact error. No third attempt.
- Check needs a down service (Postgres/Redis/dev server) → report
  `BLOCKED` naming the service.
- Hard session budget: stop and report at ~2/3 of session time/turns
  consumed even without green checks — a `partial` report beats silence.

## 5. Self-verify before you report — this is what shrinks orchestrator work

Before writing your report, confirm all five:

- Every check you ran is listed with its literal command and result.
- Every acceptance bullet for your slice is met with evidence, or listed
  under `Missing for tick`.
- No file outside your declared `Changed` list was touched.
- `git status --porcelain` now shows only files from your `Changed` list
  — nothing stray, nothing reverted that wasn't yours to revert.
- Your claim (step 2) is still the most recent one for this slice.

All five hold and every Tier 0/1 check that applies is green →
`Ready-to-tick: yes`. Otherwise → `Ready-to-tick: no`, and say exactly why.

## 6. Style (enforced)

Named exports; types over interfaces; no `any`; descriptive names (no
abbreviations); `Props`-suffixed prop types; `//` comments for WHY only;
Linaria styling; icons from `twenty-ui/icon`; Lingui fr+en for all
user-facing strings.

## 7. Never

- Edit `PLAN.md` (tool-blocked), `git commit`, push, or touch
  `locales/**` catalogs.
- Clone the repo, create a worktree, or work anywhere other than the
  current checkout.
- Rename/delete existing tables, fields, routes or exports — additive only.
- Run `npx nx test <pkg>`, e2e, or the full integration sweep — those are
  orchestrator checks.
- Revert or "clean" dirty files you did not create.
- Read/copy/install anything under `Inspiration apps (bureaubilan)/` — if
  a reference excerpt is truly needed, ask for it in your report.
- Add AI attribution anywhere.
- Wait for or expect a task assignment — there isn't one; you self-select.

## 8. Checks — run only the ones covering your change

**Tier 0 — no services needed (default, always safe):**

- One test file:
  `npx jest <file.spec.ts> --config=packages/<pkg>/jest.config.mjs`
- Tests covering files you changed:
  `npx jest --findRelatedTests <paths> --config=packages/<pkg>/jest.config.mjs`
- Typecheck (trust over nx cache):
  `cd packages/<pkg> && npx tsgo -p tsconfig.json --noEmit`
- Lint touched files: `npx nx lint:diff-with-main <pkg>`
  (`--configuration=fix` to auto-fix)
- App package gates, no server needed:
  `yarn typecheck && yarn lint && npx twenty dev:build .`
- Doc edits: `node docs/scripts/check-docs.mjs`

**Tier 1 — needs Postgres + Redis up, but NOT the app (no `yarn start`):**

- Preflight first: `pg_isready -h localhost && redis-cli ping` — either
  fails → `BLOCKED`, name the service, move on.
- Integration slice on the `test` DB:
  `cd packages/twenty-server && NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/graphql/suites/<area>`
- `npx nx database:reset twenty-server` — only when the brief says so,
  only against `test`; schema unchanged → skip, run the slice directly.
- Inspect workspace data read-only: postgres MCP server.

**Tier 2 — needs the running app (`yarn start`, ports :3000/:3001): NEVER yours.**

List these under `Missing for tick`; the orchestrator runs them. Never
launch `yarn start` yourself.

Touched `twenty-shared` → `npx nx build twenty-shared --skip-nx-cache`
before trusting dependent checks.

## 9. Finish — always, even on failure, even on conflict

Append this report (~14 lines) to your task's phase file — as soon as
checks pass, at ~2/3 session consumption, or immediately on `CONFLICT`.

```markdown
## YYYY-MM-DD HH:MM UTC — <model> [executor] — contract v4
**Task:** <id> <title> · **Slice:** <which bullet>
**Claim:** done-for-review | partial | blocked | conflict
**Ready-to-tick:** yes | no — <one line why, if no>
**Base:** <commit-sha>
**Changed:** <files touched>
**Checks:** <command → result; only commands actually run>
**Missing for tick:** <acceptance evidence absent / blocker>
**Do not redo:** <what already works — next agent leaves it alone>
**Remaining:** <N other [ ]/[~] tasks left in this execution order>
**Next:** <exact next micro-step>
```

Then stop. One slice = one session, on the one real repo. One claim = one
lock. One `Ready-to-tick: yes` = one line the orchestrator can trust.
