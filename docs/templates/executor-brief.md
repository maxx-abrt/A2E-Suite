# Executor brief template

[Documentation home](../README.md) · [Handoff template](handoff.md)

Optional — executors self-select from PLAN.md by default. The orchestrator
writes a brief only to pin specific work: a narrowed slice, specific files,
or non-plan scope. Paste it as the executor's user message or save it to
`docs/tasks/<task-id>-<slug>.md` (one pending at a time). Keep it to one
page. Paste needed doc/reference excerpts into the brief; the executor does
not hunt through the plan for them.

## Task

- ID / title:
- Phase file to report to: `docs/plan/phases/phase-<NN>-report.md`
- Goal in one sentence:
- In scope:
- Explicitly out of scope:

## Read first — only these

- `AGENTS.md`
- `<file>` (+ one adjacent sibling)
- `<file>`
- Excerpt or doc section, if any — pasted here, not referenced:

## Do

- Concrete change, step by step. Name the native primitive to reuse.
- If the work already exists and passes the checks below: change nothing,
  report done-for-review.

## Verify — run exactly these, nothing more

- `<command>` → expected result
- `<command>` → expected result

## Then

- Append the executor report (PROMPT.md format) to the phase file above.
- Stop. Do not tick PLAN.md; the orchestrator ticks after verifying.

## Stop conditions — report BLOCKED instead of thrashing

- Same gate still failing after 2 fix attempts → report with exact error.
- Missing service/tooling the brief didn't cover → report, name it.
- A product decision or missing primitive would change the approach →
  report, ask the smallest question.
- Session ~2/3 consumed → write the report now, before context runs out.
