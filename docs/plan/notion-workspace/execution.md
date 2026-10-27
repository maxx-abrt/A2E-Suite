# Running this plan with smaller executors

[Program overview](../../NOTION_WORKSPACE_PLAN.md) · [Canonical contract](../../../PROMPT.md) ·
[Brief template](../../templates/executor-brief.md)

This guide narrows the existing workflow. It creates no new agent framework,
automatic dispatcher or recurring job. The orchestrator reviews in batches;
executors handle one concrete slice. Use stronger architectural review for
computed fields, save protocols, ACLs, offline writes and finance boundaries.

## Scheduling and authority

1. The user or orchestrator selects this program explicitly. Otherwise continue
   the root plan's normal order; do not let this proposal hijack the queue.
2. NW-00 reconciles the first candidate with code, pending briefs and existing
   reports. If it already works, verify and report rather than rewrite.
3. The orchestrator accepts the needed design decisions and selects one
   dependency-ready row. A dependency is ready only with accepted evidence, not
   a historical checkbox or an executor's unreviewed claim.
4. Create one brief from the repository template. Prefer pasting it directly;
   if saving it under `docs/tasks/`, first inspect the directory and preserve the
   one-pending-brief rule. This planning session installs no pending brief.
5. Executor appends a report and stops. Orchestrator accepts/rejects the slice,
   reconciles mapped root-plan status and schedules the next brief. Executors
   never tick PLAN.md or commit.

All row IDs are stable references. Actual status/evidence is appended to the
[program report](../phases/notion-workspace-report.md). Existing M/P tasks also
receive a short cross-reference in their original phase report; do not copy
the same acceptance ledger into multiple plans. Only an orchestrator changes
release status in PLAN.md. New unmapped scope remains proposed until scheduled
and incorporated into that acceptance contract.

## Keep a brief small enough to succeed

- One behavior and one primary boundary: pure logic, server persistence/query,
  host UI, app metadata, export adapter or verification. A row spanning several
  boundaries must be split, for example `B4.1` server selection and `B4.2`
  permission handling; the parent is partial until all children are accepted.
- Read `AGENTS.md`, the brief and usually 2–5 implementation files plus adjacent
  tests. Include only the relevant plan excerpt. Do not require a small model
  to discover architecture in the whole root plan.
- Aim for a handful of touched production files and one focused regression
  test. File count is guidance, not a reason to omit required generated files or
  split an inseparable atomic migration. Hand broad changes back for splitting.
- Fix decisions before execution: schema, algorithm semantics, package/license,
  permission rules, provider and data ownership. A design task returns an ADR
  excerpt/fixtures/next brief rather than speculative implementation.
- Stop for an unresolved contract, repeated failing gate after two fixes,
  missing service, collision with another contributor, or context exhaustion;
  preserve work and report the exact blocker under PROMPT.md. Do not broaden
  scope, weaken tests or attempt the next row.

## What every executable brief must contain

| Field | Required content |
| --- | --- |
| Identity | Program row/subslice, original root-plan home, report destination |
| Baseline | Revision, relevant dirty paths and latest accepted report |
| Goal | One observable behavior, reproduction and expected result |
| Scope | Exact source/test paths, native primitive to reuse and explicit exclusions |
| Contract | Accepted schema/types/permissions/error/retry rules; decisions quoted inline |
| Steps | Small ordered edits; no “implement the rest” or whole-lane tasks |
| Checks | Actual package-local commands/test files, expected outcome and check tier |
| Handoff | Missing live/upgrade checks, stop condition, next step and report requirement |

Placeholders in the reusable prompts below are for the **orchestrator** to
resolve. Never hand an executor a command containing `<test>` or an invented
API symbol. Confirm the script in the relevant manifest and locate the test.

## Check selection

Follow [verification](../../verification.md) and the canonical contract. From the
repository root, docs-only work uses:

```sh
node --test docs/scripts/check-docs.test.mjs
node docs/scripts/check-docs.mjs
git diff --check
```

For a code brief, substitute actual paths into these command patterns before
dispatch. Run the package's direct typecheck and lint as well as its relevant
tests; a parser test cannot certify metadata, authorization or UI integration.

```sh
npx jest <actual-test-path> --config=packages/<actual-package>/jest.config.mjs
npx nx lint:diff-with-main <actual-package>
```

Direct typecheck inside the changed host/server/shared package:

```sh
npx tsgo -p tsconfig.json --noEmit
```

For app packages inspect their own `package.json` and lockfile first. Projects
at the observed baseline has `typecheck`, `lint` and `test:unit`, with Node's
type-stripping test runner. Do not assume every app shares those scripts. A
pinned Node test should name the actual file instead of running every app test.
SDK/manifest changes need app `dev:build`; shared edits need an uncached shared
build before dependent tests. Schema changes require prescribed generators,
codegen and focused integration tests on disposable services.

Executors can use Tier 0 and permitted Tier 1 checks. Full package suites,
Storybook/e2e, real install/upgrade and multi-session journeys belong to the
orchestrator. Record baseline failures separately without claiming a pass or
reverting unrelated work. A docs-only planning session needs no application
lint/typecheck because it changes no TypeScript application code.

## Copyable executor prompt

```text
Act as EXECUTOR under AGENTS.md and PROMPT.md.
Implement only the attached brief for <row.subslice> from
docs/NOTION_WORKSPACE_PLAN.md. Read the brief's named files and adjacent tests.
Preserve unrelated dirty work. Reuse the specified native primitives.
All architectural decisions and exact verification commands must be supplied
in the brief. If one is missing, report the specific blocker; do not invent it.
If the behavior already exists, verify it and report without rewriting it.
Run the listed scoped checks plus required touched-package lint/typecheck.
Append the canonical executor report to
docs/plan/phases/notion-workspace-report.md; include the root-plan phase
cross-reference where applicable. State missing live/upgrade evidence.
Stop after this slice. Do not edit PLAN.md, commit, publish, or pick another row.

ATTACHED BRIEF:
<orchestrator inserts the completed one-page repository brief here>
```

## Copyable orchestrator prompt

```text
Act as ORCHESTRATOR under AGENTS.md and PROMPT.md.
Review only the new reports for the selected batch from
docs/plan/phases/notion-workspace-report.md and their actual diffs.
Inspect current dirty work and pending docs/tasks briefs; preserve other work.
Reconcile against the matching PLAN.md M/P item and original phase report.
Verify claims with actual commands, run the missing integration/live/upgrade
checks appropriate to the change, and check CRM regressions for shared code.
Accept only evidenced criteria. Partial or blocked stays partial or blocked.
Resolve architecture decisions before scheduling their dependent tasks.
Split the next dependency-ready row into one exact, small executor brief.
Do not publish a template, invite a guest, deploy, or message another chat
merely because such an action appears in the roadmap.
```

## Batch review checklist

- Source reality reconciled; no duplicate engine, package identity churn or
  unrelated feature deletion.
- Tests cover actual behavior, denied access, errors and retries appropriate
  to the changed boundary; uncached typecheck and lint recorded.
- Data changes have generated migration/manifest changes and fresh/populated
  lifecycle evidence; old clients/jobs cannot corrupt new state.
- UI has FR/EN, keyboard, narrow-screen and declared unsupported states.
- New blocks survive save/reload/export; computed values and schedule writes
  remain consistent through native queries and concurrent updates.
- Evidence names the revision/environment and separates Observed,
  done-for-review, accepted and release-verified. No guessed test counts.
- The next brief is concrete, dependencies accepted, and the current pending
  queue remains unambiguous.
