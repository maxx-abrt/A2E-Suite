# Multi-agent entry point

Use [PROMPT.md](PROMPT.md) for the workflow and [docs/README.md](docs/README.md)
for task-specific context. This file intentionally does not duplicate rules or
assign a hard-coded phase.

For parallel work, agree on independent acceptance criteria and file ownership
before starting. Each worker uses the [task template](docs/templates/task.md)
and leaves a [handoff](docs/templates/handoff.md) with actual checks and known
limitations. The integrating agent runs the combined checks: separate worker
passes do not prove the merged result works.

Do not select another worker's next task, edit the same roadmap status
concurrently, overwrite dirty work, or mark a whole phase complete to satisfy a
prompt. Missing tooling and failing checks remain visible blockers.
