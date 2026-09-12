# A2E Suite — Focused agent handoff

Read `PROMPT.md`, `PLAN.md`, `CLAUDE.md`/`AGENTS.md` and applicable directory
guidance before editing. Follow PROMPT.md's context-reading sequence, including
the complete local reference inventory and dated architecture audit.

## Scope and product intent

- Follow the user's current request. **Planning-only means planning-file
  updates, not product implementation**; do not launch an autonomous coding loop.
- For implementation, select one dependency-ready task from PLAN.md's execution
  order, beginning with unresolved P0/P1 safety/setup work. No instruction here
  overrides dependencies or requires finishing all of P4 in one session.
- All reference projects/apps are **feature/UX inspiration only**. Do not
  integrate their applications, copy full code, adopt stacks/dependencies or
  connect backends. Distinguish source behavior, schemas, prototypes and absent
  sources using R01–R15 traceability.
- Build one Notion-like, progressively disclosed experience using Twenty
  metadata, views/layouts, roles, workflow, app lifecycle and design primitives.
  No Huly-like complexity or parallel shell. C1–C7 connect reusable templates,
  onboarding/app choice, existing customization, later installation/removal,
  team identity and cross-app records. Full calendar is P4C, not a task view.

## Execution and evidence

1. Inspect current implementation and adjacent patterns. Existing app metadata
   and native `toolTriggerSettings` are starting points, not systems to rebuild.
2. State the task, prerequisites, source anchors, interfaces and lifecycle impact.
3. Implement only the selected scope, preserving unrelated work and stable IDs.
4. Run real applicable tests/build/typechecks and the E01–E12 integration
   scenarios for that task; keep assertions intact. A manifest or helper test
   cannot prove a populated-workspace/browser journey.
5. Tick only when acceptance passes, with exact commands/results and artifacts
   in the existing phase report. Legacy ticks do not certify release readiness.
6. If blocked, stop with the error, fallback, remaining **UNVERIFIED** checks
   and next step. Missing tooling can be provisioned in
   `.gitlab/duo/agent-config.yml`; do not turn a blocked attempt into a pass.

For planning-only work, review paths, feature traceability, unresolved decisions,
dependency order and consistency across existing plans; record validation in the
MR without adding redundant summary files. Deliver a **draft merge request**
unless the user requests otherwise. Never claim a commit, push, test pass or MR
without observing the corresponding command succeed.
