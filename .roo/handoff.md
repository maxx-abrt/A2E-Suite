Repo: maxx-abrt/A2E-Suite (GitHub, branch main, HEAD e7812876) Constraint: Code-only mode. Zero yarn start, zero builds, zero dev servers, zero live previews. Read → edit → commit → push only. CI verifies.

YOUR FIRST ACTION (mandatory, before any code)
Read these four files in full — do not skim:

/app/PLAN.md — milestones M0–M6, P0–P10 phases, current-state ledger, native-law §5 checklist, house acceptance gates
/app/tasks/prd.json — current batch of user stories and completion status
/app/tasks/deferred-batch10.md — full census of what is Tier-2/blocked/decision-gated and WHY, plus the unlock-leverage table
All phase reports in /app/docs/plan/phases/phase-0*.md through phase-10-report.md — especially the final entry of each (that is the orchestrator's last verified state and any queued "Next: executor" items)
Only after reading all four do you write a single line of code.

WHAT TO EXTRACT
Build your work queue from these three sources — in this priority order:

Source A — Phase-report "Next: executor" lines (highest leverage) Any entry ending with "Next: executor — <task>" that has no subsequent "CLAIMED" or completion line is immediately executable. Parse every phase report tail. These are defects/gaps the orchestrator explicitly queued.

Source B — PLAN.md open bullets with no upstream blocker Walk every [ ] and [~] bullet. For each, check its literal (after X) dependency. If every dependency is [x] (ticked), extract it. If it is Tier-2 (needs browser/live/multi-session/Docker) or decision-gated (D-B1/D02/D03/D04/D07/D-M1), skip it — record it in tasks/deferred-batch11.md instead. Do not invent Tier-2 proofs as Tier-0 work.

Source C — Code-level gaps visible in the repository After reading the plan, grep the codebase for TODO, FIXME, STUB_NOT_IMPLEMENTED, patterns the plan describes as incomplete, or spec files that reference unimplemented paths. Only extract an item if the plan names it as a deliverable — never gold-plate beyond scope.

EXECUTION RULES
Order by dependency, not by phase number or ID. A task whose dependency resolves first goes first.
One atomic git commit per task: "US-XXX: <short description>". If no US-XXX exists yet, assign the next integer after the highest in prd.json.
After each commit, append a dated entry to the relevant phase report (docs/plan/phases/phase-NN-report.md) stating: base commit, files changed, root-cause chain, what was done, Tier-0 checks (tsgo/oxlint/jest), and named Tier-2 residuals. Never set passes: true yourself — that is the orchestrator's job.
Update tasks/prd.json with a completionNotes entry after each commit. Keep passes at its current value (only the orchestrator flips it).
Keep going — do not stop after one task. Process the entire eligible queue until it is empty or you hit a decision-only blocker.
If a bullet requires a migration, use the 2-39 upgrade-version directory (currently under packages/twenty-server/src/database/commands/upgrade-version-command/2-39/), strictly increasing epoch-ms timestamp > 1789905000000, with up + down, registered in both 2-39-upgrade-version-command.module.ts AND instance-commands.constant.ts.
Respect native law (PLAN §"Native-first rules"): no parallel sidebar, no new auth system, defineObject/defineView/definePageLayout before front components, twenty-ui primitives only, Lingui fr+en macros (never commit catalogs), Linaria for styles.
Quality gates per task (self-review; CI verifies):
cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit → 0 errors
cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit → 0 errors
npx oxlint --type-aware -c .oxlintrc.json <touched files> → 0 errors/warnings
If twenty-shared touched: npx nx build twenty-shared --skip-nx-cache
New spec passes (show failing-then-passing proof in the phase report)
node docs/scripts/check-docs.mjs → PASS if docs touched
If blocked twice on the same issue, stop that task, log the exact blocker in tasks/deferred-batch11.md, and move to the next eligible task.
WHAT IS CURRENTLY DONE (do not redo)
From the latest orchestrator verification (HEAD e7812876):

US-074 ✅ Schema-build cross-app relation fix
US-075 ✅ CRM nav-restore + user-hidden-item provenance
US-076 ✅ INSTALL_APP idempotency
US-077 ✅ A2E allowlist + OnboardingInstallableApps (Projects/Chat/Drive added)
US-078/079 ✅ M1 Dockerfile twenty-apps-build stage + ProvisionBundledAppsCommand + migration
Known open Tier-2 items (orchestrator runs these, not you):

M1 Docker clean-volume compose proof (no docker on this machine)
P4C.3 /calendar browser journey
P4.1 human-ID concurrency live proof
P1.6c authenticated codegen + Settings browser journey
P7.0 gate proofs (blocks all 21 P7 bullets)
Any item in tasks/deferred-batch10.md
KNOWN HIGH-VALUE UNLOCKS (check these first)
After the latest session, these are the items with highest tick-leverage once code is delivered:

P4C.4 — gated on P4C.3 browser tick (orchestrator). If P4C.3 has been ticked since HEAD, P4C.4 is immediately executor-runnable: configurable reminders with idempotent delivery, quiet-hours/timezone rules. Check the phase-04-report tail first.
Occurrence-expansion in the calendar view — explicitly noted as "P4C.4+ Tier-0 front work, gated on P4C.3 tick". Same gate as above.
P1.6e/P1.7a/P1.7b — gated on P1.6c tick. If P1.6c has been ticked, these are unblocked: workspace template reuse (save/edit/duplicate), app management UX (readiness/export/dependency impact), team entry browser journey.
P4.2 retroplanning — gated on P4.1 live tick. If P4.1 has been ticked, retroplanning is unblocked.
Any new defect the orchestrator queued in a phase report after commit e7812876 — check phase reports for entries dated after 2026-09-22 22:30 UTC.
OUTPUT FORMAT
For each task completed:

TASK US-XXX — <title>
Base: <commit hash>
Changed: <files list>
Root cause / what was done: <2-3 sentences>
Quality gates: tsgo ✓ | oxlint ✓ | jest <N>/<N> ✓
Tier-2 residual: <what the orchestrator still needs to verify>
Commit: <hash> "<message>"
At the end, output a deferred-batch11.md summary: all tasks you evaluated and skipped, with the exact reason (Tier-2 / blocked upstream / decision-gated / environment-blocked).

Goal: maximise the number of fully-implemented, committed, atomic tasks the orchestrator can tick in one pass. Quality over quantity — but quantity matters. Push everything.
