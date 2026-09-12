# Task kickoff

Use the assigned issue/MR as scope. If asked to choose roadmap work, consult
[PLAN.md](PLAN.md)'s delivery order, not the first legacy checkbox.

1. Read [AGENTS.md](AGENTS.md) and [docs/README.md](docs/README.md).
2. Use the task-to-path map to select relevant guides and source. Read the
   target files, adjacent patterns and tests before editing; inspect local
   directory rules. Do not load all reference trees or phase reports.
3. State the user-visible outcome, root cause, smallest complete approach and
   acceptance checks. Use the [task template](docs/templates/task.md).
4. Implement within the existing Twenty architecture. Verify using
   [docs/verification.md](docs/verification.md), including the real integration
   boundary and neighboring CRM behavior, not only helper tests.
5. Record actual results, blockers and the exact next step with the
   [handoff template](docs/templates/handoff.md). Update affected current-state
   docs; append to a phase report only when that phase is involved.

Preserve unrelated dirty work. Ask a focused question when a product decision
or missing evidence materially changes the approach. Source presence, an old
checkbox and a previous agent's test report are not a pass from this session.

## Implementation and checks

Use the [integration blueprint](docs/plan/03-integration-blueprint.md) and
[native patterns](docs/plan/04-twenty-native-law.md) for feature work. Confirm
SDK exports and permissions in real code. Preserve compatibility and stable
IDs; do not create parallel navigation, identity, storage or domain objects.

Style, migration and generated-file rules have one home: [AGENTS.md](AGENTS.md).
Commands and required checks by change type have one home:
[verification](docs/verification.md). App publication/installation commands and
version caveats have one home: [applications](docs/applications.md).

## Resume protocol

1. Read the assigned issue and its latest handoff. Consult only the relevant
   phase report if needed.
2. Inspect `git status`, `git diff` and recent history. Preserve unexplained or
   unrelated changes; do not revert them as a cleanup step.
3. Compare claims with source and executable checks. Record discrepancies as
   corrections, leaving historical reports intact.
4. Continue the requested task. If blocked by a material product decision or
   unavailable environment, report the blocker and ask a focused question.

## Before handing off

- Cite real paths, supported APIs and actual command results.
- Separate delivered, partial, planned and blocked/unverified outcomes.
- Do not weaken tests, bulk-retick the plan, or present a helper test as an
  installed app / persistence / permission check.
- Review the diff for unrelated work, generated catalogs and sensitive files.
- Leave a [handoff](docs/templates/handoff.md) with the precise next test,
  source path or decision. For phase work, append it to the relevant
  `docs/plan/phases/phase-<NN>-report.md`; preserve earlier entries.
- Report missing tooling and the fallback used without claiming success.
  A focused clarifying question is better than a speculative implementation.
