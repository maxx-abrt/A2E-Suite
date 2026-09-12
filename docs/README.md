# A2E Suite documentation

**One workspace, only the apps you need.** A2E Suite is evolving from Twenty's
CRM into a native, modular workspace for individuals and teams. This directory
explains the fork; upstream product documentation lives in
[`packages/twenty-docs`](../packages/twenty-docs/).

## Start with your task, not the whole repository

| I need to… | Read first | Then inspect |
| --- | --- | --- |
| Understand the product and naming | [Product experience](product-experience.md) | [Delivery plan](../PLAN.md) |
| Find Bilan, Bureau or the app installer | [Applications runbook](applications.md) | The linked catalog, installer and preset source |
| Locate the code for a change | [Codebase map](plan/01-codebase-map.md) | One adjacent implementation and its tests |
| Build a native feature | [Integration blueprint](plan/03-integration-blueprint.md) | [Native patterns](plan/04-twenty-native-law.md), [app authoring](../packages/twenty-apps/README-A2E.md) |
| Translate a reference-app feature | [Reference analysis](plan/02-reference-analysis.md) | Only the relevant reference schema/component |
| Run checks or set up development | [Verification](verification.md) | Package manifest and Nx targets |
| Understand a known risk | [Architecture audit](repository-architecture-audit.md) | Source evidence and the matching plan work package |
| Scope work or leave a handoff | [Task template](templates/task.md) | [Handoff template](templates/handoff.md) |
| Deploy the platform | [Deployment guide](../DEPLOY.md) | [App provisioning](applications.md) is separate |

## Document ownership and precedence

- **Requested issue/MR:** scope for this session. Do not select unrelated work
  merely because a roadmap checkbox is empty.
- **[AGENTS.md](../AGENTS.md):** repository conventions; closer directory rules
  and real adjacent code determine local patterns. `AGENTS.md` is a symlink
  to `CLAUDE.md`, so both entry points share the same rules.
- **[PROMPT.md](../PROMPT.md):** short execution and handoff workflow.
- **[PLAN.md](../PLAN.md):** delivery order and retained feature scope.
- **Product experience:** target UX and acceptance contracts, not a claim that
  everything is implemented.
- **Applications runbook and codebase map:** source-backed current behavior.
  Update alongside changes to registration, routing, presets or package layout.
- **Audit and `plan/phases/`:** dated evidence/history. Old passes are not new
  verification; add corrections without rewriting past session reports.
- **Reference apps:** feature inspiration only, never runtime dependencies or
  authoritative architecture for this fork.

When sources disagree, inspect implementation and record the discrepancy.
Code establishes what exists; tests establish what works; the product contract
establishes what still needs to be built. None replaces the others.

## Evidence vocabulary

| Label | Meaning |
| --- | --- |
| **Observed** | Found in source at a named baseline; not runtime verification |
| **Verified** | A named check actually passed, with commit/environment/result |
| **Partial** | Some implementation exists; list missing acceptance criteria |
| **Planned** | Desired behavior with no completion claim |
| **Blocked / unverified** | A check or implementation cannot proceed; name the blocker |
| **Historical** | Previous report or legacy checkbox, not release certification |

Current-state pages were reconciled against `3e664c89` on **2026-09-12**.
This reorganization does not install applications or certify the running product.
See the [issue #2 handoff](plan/issue-02-handoff.md) for scope, actual checks and
runtime follow-up.

## Maintaining these resources

Keep entry points short. Add a link to a focused guide instead of copying its
rules into another prompt. Link to real source paths rather than line numbers
that drift. Keep secrets, local machine paths and generated artifacts out of
examples. Use the task and handoff templates to record decisions and actual
checks; do not require every agent to reread every phase report.

Run the scoped documentation check from the repository root:

```sh
node --test docs/scripts/check-docs.test.mjs
node docs/scripts/check-docs.mjs
```

The checker covers maintained fork entry points and guides (its explicit list
is in the script), local inline link targets and fenced-code balance. It does
not validate remote URLs, heading anchors, prose accuracy or app behavior.
