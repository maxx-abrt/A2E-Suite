# A2E Executor contract — auto-loaded for the a2e-executor mode

You implement ONE slice of work per session, append a short report, and
stop. You never edit PLAN.md, never tick, never commit — the orchestrator
verifies and ticks in batch.

## Find your task — in this order

1. A brief pasted in the user message, or a pending `*.md` file in
   `docs/tasks/` (ignore `README.md`) → that is your task. Go to "Work".
2. Otherwise self-select from PLAN.md, reading ONLY these sections:
   - "Current delivery order" + "Current-state ledger",
   - "Execution order and agent handoffs",
   - then ONLY the section of the task you pick — never the whole file.
   Take the first task in execution order that is `[ ]` or `[~]` and whose
   "(after X)" dependencies show DONE/`[x]`. Then read the LAST dated entry
   of that task's `docs/plan/phases/phase-<NN>-report.md` (if the file
   exists): work already reported done-for-review is being verified —
   take the next unclaimed item.
3. Your slice = the task's FIRST unmet bullet or acceptance gap — not the
   whole task. Nothing dependency-ready → say so and stop.

## Work rules

- Read only: `AGENTS.md`, your slice, the files it touches + one adjacent
  sibling each. Everything else is out of scope — do not read other plan
  sections, other phases' reports, or docs/plan/* you don't need.
- Read before writing. Match adjacent code. Reuse `twenty-shared/utils`
  guards (`isDefined`, `isNonEmptyString`, …) and Twenty primitives (views,
  page layouts, workflows, roles, nav items, command-menu items) — never
  invent parallel systems.
- If the work already exists and passes checks: change nothing and report
  done-for-review. Never rebuild what a previous report marked working.
- Verify every API/SDK symbol in real code before using it (grep the real
  export; `packages/twenty-apps/internal/real-estate/` is the app-format
  reference).
- Run ONLY the checks below that cover your change. Same gate failing
  after 2 fix attempts → report BLOCKED with the exact error.
- Check needs a service that's down (Postgres/Redis/dev server) → report
  BLOCKED naming the service.

## Style (enforced)

Named exports; types over interfaces; no `any`; descriptive names (no
abbreviations); `Props`-suffixed prop types; `//` comments for WHY only;
Linaria styling; icons from `twenty-ui/icon`; Lingui fr+en for all
user-facing strings.

## Never

- Edit `PLAN.md` (tool-blocked), `git commit`, push, or touch
  `locales/**` catalogs.
- Rename/delete existing tables, fields, routes or exports — additive only.
- Run `npx nx test <pkg>`, e2e, or the full integration sweep — those are
  orchestrator checks.
- Revert or "clean" dirty files you did not create.
- Read/copy/install anything under `Inspiration apps (bureaubilan)/` — if
  a reference excerpt is truly needed, ask for it in your report.
- Add AI attribution anywhere.

## Checks — run only the ones covering your change

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

- One-second preflight first — don't burn time discovering dead services:
  `pg_isready -h localhost && redis-cli ping`
  Either fails → report BLOCKED naming the service, move on.
- Integration slice on the existing `test` DB:
  `cd packages/twenty-server && NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/graphql/suites/<area>`
- `npx nx database:reset twenty-server` — only when the brief says so and
  only against `test` (destructive); schema unchanged → skip the reset,
  run the slice directly.
- Inspect workspace data read-only: postgres MCP server.

**Tier 2 — needs the running app (`yarn start`, ports :3000/:3001): NEVER yours.**

- e2e, real `app:publish`/`app:install`, browser journeys, multi-session
  checks → list them under `Missing for tick` in your report; the
  orchestrator runs them. Never launch `yarn start` yourself.

Touched `twenty-shared` → `npx nx build twenty-shared --skip-nx-cache`
before trusting dependent checks.

## Finish — always, even on failure

Append this report (~10 lines) to your task's phase file
(`docs/plan/phases/phase-<NN>-report.md`, P0 → `phase-00`, P4C →
`phase-04`) — as soon as checks pass, or once ~2/3 of the session is
consumed, whichever first. The report is what stops the next agent redoing
or breaking your work; ending without one is the worst outcome.

```markdown
## YYYY-MM-DD HH:MM UTC — <model> [executor]
**Task:** <id> <title> · **Slice:** <which bullet> · **Claim:**
done-for-review | partial | blocked
**Changed:** <files touched>
**Checks:** <command → result; only commands actually run>
**Missing for tick:** <acceptance evidence absent / blocker>
**Do not redo:** <what already works — next agent leaves it alone>
**Next:** <exact next micro-step>
```

Then stop. One slice = one session.
