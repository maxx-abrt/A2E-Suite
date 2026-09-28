# Reusable executor prompt — batch mode (paste as the user message)

[Documentation home](../README.md) · [Execution contract](../../PROMPT.md) · [Plan](../../PLAN.md)

Copy everything in the fenced block into a new `a2e-executor` session.
Change only `LANE` and `MAX_SLICES`. It extends the single-slice contract in
[PROMPT.md](../../PROMPT.md): same rules, same checks, same report — but
chains several consecutive slices **inside one lane** so a session delivers a
visible product increment instead of one bullet.

```text
ROLE: A2E executor, BATCH MODE. Contract: PROMPT.md + .roo/rules-a2e-executor/executor.md
(this prompt overrides only "one slice per session").

LANE: <L-NAV | L-EDITOR | L-TPL | L-AI | L-LINK | L-DOCS | L-UX | M0-M2>
MAX_SLICES: 4

1. Read AGENTS.md, then in PLAN.md ONLY: the milestone table, "Suite experience
   program" → "Task mechanics for executors (M7–M13)", and the section of your
   lane's milestone. Read the last 3 entries of that lane's phase report file.
2. Build your queue: the first MAX_SLICES unmet bullets (`[ ]`/`[~]`) of your
   lane whose "Depends on" are met, in plan order. Skip anything a report
   marks done-for-review. Stay strictly inside the lane's "owns" paths; a
   needed edit outside them → note it under "Next" and skip that slice.
3. For each slice, in order:
   a. Read the files it touches + one adjacent sibling. Grep real symbols
      before using them. Reuse Twenty primitives and twenty-shared/utils.
   b. Implement the smallest complete version that a user can see/use.
      UX bar: native Twenty look, fr+en Lingui strings, one primary action,
      empty/loading/error states, keyboard reachable, light/dark.
   c. Run the Tier-0 checks covering it (tsgo/typecheck, lint, related tests,
      app `yarn typecheck && yarn lint && yarn test:unit`). Max 2 fix
      attempts, then mark the slice blocked and move to the next one.
   d. Append that slice's ~10-line report to the lane's phase file
      immediately (format in PROMPT.md). One report per slice.
4. Budget: stop starting new slices at ~2/3 of your context. Never leave a
   slice half-written without its report.
5. Never: edit PLAN.md, commit, touch locales catalogs, rename/delete
   tables/fields/routes/universal IDs, run full suites/e2e/yarn start,
   read Inspiration apps code.
6. Finish with a 5-line summary: slices done / blocked / next queue head.
```

## Lanes

The lane table and file ownership live in PLAN.md → "Task mechanics for
executors (M7–M13)". Two sessions may run concurrently only on lanes whose
owned paths don't overlap (e.g. L-AI + L-TPL + L-DOCS).

## Orchestrator follow-up

After one or more batch sessions: run the orchestrator workflow in
PROMPT.md over every new report in the lane files, then the Tier-2 legs they
list (re-publish bumped apps, browser journeys E13–E17).
