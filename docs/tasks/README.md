# Executor task queue — optional pins

Executors normally self-select their slice from PLAN.md's execution order.
This directory is for **pinned** work only: when the orchestrator wants a
specific slice, specific files, or non-plan scope, it writes one brief here
from [`docs/templates/executor-brief.md`](../templates/executor-brief.md)
named `<task-id>-<slug>.md` (e.g. `p0.4b-uninstall-preflight-deps.md`).

At most one pending brief at a time. A pending brief overrides plan
self-selection — executors consume it first. The orchestrator deletes
consumed briefs; PLAN.md status stays authoritative either way.
