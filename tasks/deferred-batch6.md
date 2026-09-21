# Deferred batch 6 — extraction exclusions (PLAN.md as of 2026-09-21, prd.json = US-068…071)

Source scan: PLAN.md "Current delivery order", "Current-state ledger" and
"Execution order and agent handoffs" in full, P1–P10. Every `[ ]`/`[~]` bullet
was checked against its own literal `(after X)` references. `tasks/prd.json`
was **empty (0 bytes)** at extraction time — no task IDs were excluded on the
"already present" rule; prior batches US-001…067 are all done-for-review and
their PLAN.md legs are ticked or ledger-recorded. New batch numbering
continues at US-068.

## Extraction result (why only 4 stories)

After batch 5 (US-056…067) landed, every remaining open PLAN.md bullet is
either Tier 2 (running app / browser / multi-session / live proof) or blocked
upstream. The four stories below are the entire Tier 0/1 residue: two are the
last executor legs of `[~]` bullets (P4C.3 UI wiring, P9.1 forced-tool arg),
two are flagged-defect conclusions recorded in the ledger/phase reports
(a2e-chat Discussions wiring, StyledDockRoot invalid CSS). Nothing else
open in PLAN.md is executor-runnable today — do not invent work to pad the
batch.

## Deferred — needs orchestrator (Tier 2: running app / browser / multi-session / live proof)

| # | PLAN task | Remaining leg (executor evidence) |
|---|---|---|
| 1 | P1.1 `[~]` | Live uninstall (destructive) + reinstall proof on populated scratch under C3 — install + 5 upgrades already accepted (phase-04). |
| 2 | P1.3 `[~]` + `[ ]` e2e | Live scratch preset apply observing seeded rows > 0 (root cause fixed US-028); individual-preset browser e2e incl. restore-to-CRM and customized-nav. |
| 3 | P1.6c `[~]` | `npx nx run twenty-front:graphql:generate` against a live authenticated schema (⚠ running codegen against the unauthenticated `/graphql` would clobber the generated file — PLAN line ~600) + switch hand-written preview/operation documents to generated `*Document`s + onboarding/Settings browser journey. **Ticking P1.6c unlocks P1.6e/P1.7a/P1.7b.** |
| 4 | P1.6d `[~]` | Live Bilan install/reinstall observing seeded rows > 0 (write path unit-proven US-028/029 lineage); **D02 product call** on adding a2e-projects to project-oriented personas (touches 2 onboarding integration specs) and on exact bundle contents. |
| 5 | P1.7c `[ ]` | E01–E04 + E12 first-use acceptance runs (empty/populated/customized workspaces, no-AI, missing optional apps). |
| 6 | P2.1 `[ ]`×3 + 5 | Tier-2 real handshake (browser client + revoked-session negative); true worker↔server-process fan-out + outage/recovery + socket-level rejected acks; revocation journey; bullet 5 real-session integration tests ("Tier 2 by nature" — phase-02 13:19 entry) + rerun/fix the hung `jest-integration-realtime.config.ts` spec (afterAll Redis/ws close). |
| 7 | P2.4 `[~]` | Browser E2E `side-panel-tabs.spec.ts`: two records as tabs → switch/close → reload restores permitted context (unit half = US-058, 11 suites/85). |
| 8 | P2.5 `[ ]` | p95 < 150 ms on a 10k-record workspace with stated hardware/network/query conditions; live app-installed `searchAppRecords` re-proof (shared standing item with the P4 Cmd+K leg). |
| 9 | P3.2 `[ ]`/`[~]`×5 | Comment threads reload/second-session preservation; E04 gallery/template browser journey (US-030 code done, 18/18); revision reload/second-session + restricted role (US-031); two-session conflict banner + app-reinstall CAS proof (US-032, 13/13); nonempty-content export browser validation (fidelity helpers shipped). |
| 10 | P3.3 `[ ]` | Record→doc copy browser trigger from company/person (US-033 code done); deep-tree browser journey; live purge-cron firing. |
| 11 | P4.1 `[ ]` | Live validation of installed relations/permissions/layouts on the populated workspace. **Highest-leverage single proof: gates P4.2 retroplanning AND P4C.5.** |
| 12 | P4.2 `[ ]`/`[~]`×7 | Install + render proofs: board drag-writes-`projectStatus` (US-034); task-calendar render/no-invitation (US-035 + US-059); My-tasks folder (US-036 + US-059); project-page tabs/widgets (US-037/038); Gantt DOM render + 1k-task benchmark with recorded hardware; time-tracker heartbeat; dependency-picker set/refuse/persist live (US-049); CSV import/export task proof (US-039); Cmd+K create-task/go-to re-proof. |
| 13 | P4.3 `[ ]` documents | Live install/render proof of project doc-relation + linked-docs overview (US-001 implementation + US-037 verification landed; Tier-2 leg only). |
| 14 | P4C.2/3 proof legs | `/calendar` browser journey (create/edit/delete, keyboard slot-create, overlap lanes, provider read-only notice, DST wall-clock, light/dark, narrow — US-050/051/052); recurrence this-vs-series dialog browser proof (after US-068 lands); P4C.3 tick blocked on that proof. |
| 15 | P5 | `chat.integration-spec.ts` (600 lines) with-db execution — PLAN-classified Tier 2; needs `with-db-reset` between runs (app-uninstall DDL debris, phase-05 note) + two-session live chat/typing/read-cursor journey (E08); a2e-chat install-order proof (chat tab on standard company layout). |
| 16 | P6 | a2e-drive live install + upload→folder→preview→share journey (all front suites + queue model green). |
| 17 | P8 | Live socket push/badge proof; live email delivery. |
| 18 | P9 | Standing live assistant-catalogue dispatch on app-installed workspaces (all apps) + forced-tool deterministic-execution proof (after US-069 adds the arg); PRIVATE-channel denial; recipe live materialization/firing/replay (US-014); suggestions browser proof (US-015); audit tab browser proof (US-045); P9.2b live provider-call-count journey on re-open. |
| 19 | P10 `[ ]`×2 | Performance profiling (workspace switch, 10k views, cold start — top 3 + doc); final regression (full e2e, upgrade chain from clean 2.39, uninstall-everything leaves working CRM); solo/team E12 journeys; dock layout browser rendering proof (after US-071). |

## Deferred — blocked upstream

| PLAN task | Blocker |
|---|---|
| **ALL of P7**: P7.0 (3 bullets), P7.1b (2), P7.1c (2), P7.1d (4), P7.1e (2), P7.1f (3), P7.2 (5) | **P7.0 safety gate UNVERIFIED** in the Current-state ledger (fresh+populated install proofs, replay/numbering/rounding/period-close/alternate-API proofs + finance/privacy reviewer sign-off pending). Also gates: P9.2 Accounting tools, P9.2b `aiCacheEntry`/`score-subventions` wiring, P9.3 invoice leg, P1.6d Bilan preview legs. |
| P1.6e `[~]` | `(after P1.6c)` — P1.6c is `[~]`. All Tier-0/1 legs already green (phase-01 2026-09-20 entry: "No Tier-0/1 acceptance gap remains"); only the Tier-2 populated-workspace/browser regression stays. |
| P1.7a `[~]` | `(after P0.4/P1.6c)` — P1.6c `[~]`. Remaining legs are Tier 2 (readiness/impact UI browser proof) + D01-gated export leg. |
| P1.7b `[~]` | `(after P1.6c/P0.2)` — P1.6c `[~]`. Six executor legs verified; only the Tier-2 invite→join→matrix→templates browser journey remains. |
| P3.4 bullet 1 | "After durable save/share acceptance" — US-019/US-032 acceptance is Tier-2-pending. |
| P3.4 bullet 2 | Same + **D07** (`xl-*` AGPL-vs-commercial ratification — owner decision; feasibility artifact accepted US-048). |
| P3.4 guest editing | Deliberately deferred by PLAN (separate authorization/concurrency decision). |
| P4.2 Retroplanning `[ ]` | `(after P4.1/C1)` — P4.1 `[ ]` (orchestrator item 11). Engine `lib/retroplanning.ts` already exists — do not rebuild. |
| P4.3 calendar links `[ ]` | Pointer bullet to P4C.5 by design — `(after P4.1)` blocked. |
| P4C.4 `[ ]` | `(after P4C.3 and P8 notification contract)` — P4C.3 `[~]` until the US-068 UI wiring + browser proof land. P8 contract is `[x]`. |
| P4C.5 `[ ]` | `(after P4.1/P4C.2)` — P4.1 `[ ]`. P4C.2 is `[x]`. |

## Ticking leverage note

Fastest path to finishing the plan:
1. Run prd.json (US-068…071) — 4 executor stories; US-068 is the last executor
   leg of P4C.3 (→ unlocks the P4C.3 tick → P4C.4); US-069 is the last executor
   leg of P9.1.
2. ONE orchestrator Tier-2 pass over "Deferred — needs orchestrator" above —
   items 3 and 11 are the unlock points (P1.6c pass → P1.6e/P1.7a/P1.7b;
   P4.1 live validation → retroplanning + P4C.5); items 2/4/9/10/12/14/15 close
   whole bullets whose executor work is already green.
3. Maintainer decisions D02 (persona bundles) and D07 (xl-*) each unlock a
   bullet family; the P7.0 gate proofs unfreeze all ~23 P7 bullets.
