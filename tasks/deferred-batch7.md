# Deferred batch 7 — extraction exclusions (PLAN.md as of 2026-09-21, HEAD 359d1249, prd.json = US-072…073)

Source scan: PLAN.md "Current delivery order", "Current-state ledger" and
"Execution order and agent handoffs" in full, P1–P10. Every one of the 53
remaining `[ ]`/`[~]` bullets was checked against its own literal `(after X)`
references. `tasks/prd.json` was **empty (0 bytes)** at extraction time — no
IDs excluded on the "already present" rule; batches US-001…071 are all
done-for-review and their PLAN.md legs are ticked or ledger-recorded
(f90f6595 verified US-068…071 on 2026-09-21). New batch numbering continues
at US-072.

## Extraction result (why only 2 stories)

After batch 6, every remaining open bullet is Tier 2 (running app / browser /
multi-session / live install proof) or blocked upstream — except one seam:
the P2.1 realtime integration harness. The historically hung
`realtime-gateway.integration-spec.ts` is a flagged open item the
orchestrator itself deferred (phase-02 2026-09-16/17 entries), and its fix +
the in-process-verifiable half of bullet 5 are contract-Tier-1 work
(Postgres/Redis, no app launch). Those two legs are US-072/US-073. Nothing
else open is executor-runnable today — do not invent work to pad the batch.

## Deferred — needs orchestrator (Tier 2: running app / browser / multi-session / live proof)

| # | PLAN task | Remaining leg (executor evidence) |
|---|---|---|
| 1 | P1.1 `[~]` | Live uninstall (destructive) + reinstall proof on populated scratch under C3 — install + 5 upgrades already accepted (phase-04). |
| 2 | P1.3 `[~]` + `[ ]` e2e | Live scratch preset apply observing seeded rows > 0 (root cause fixed US-028); individual-preset browser e2e incl. restore-to-CRM and customized-nav. |
| 3 | P1.6c `[~]` | `npx nx run twenty-front:graphql:generate` against a live **authenticated** schema (⚠ running codegen against the unauthenticated `/graphql` would clobber the generated file — PLAN line ~600) + onboarding/Settings browser journey. **Ticking P1.6c unlocks P1.6e/P1.7a/P1.7b.** |
| 4 | P1.6d `[~]` | Live Bilan install/reinstall observing seeded rows > 0 (write path unit-proven US-028/029 lineage); **D02 product call** on adding a2e-projects to project-oriented personas (touches 2 onboarding integration specs) and on exact bundle contents (persona bundles unshipped, phase-01 2026-09-16). |
| 5 | P1.7c `[ ]` | E01–E04 + E12 first-use acceptance runs (empty/populated/customized workspaces, no-AI, missing optional apps). |
| 6 | P2.1 `[ ]`×3 + b5 residual | Tier-2 real handshake (browser client + revoked-session negative — bullet 1 tick, phase-02 :616 says tick on the Tier-0/1 evidence + run this); true worker↔server-process fan-out across instances + outage/recovery + socket-level rejected acks (bullet 2); record/channel ACL revocation journey (bullet 3 — needs installed a2e-chat runtime for app-owned object names, phase-02 :627). Bullet-5 in-process half = US-073; residual adjudication noted there. |
| 7 | P2.4 `[~]` | Browser E2E `side-panel-tabs.spec.ts`: two records as tabs → switch/close → reload restores permitted context (unit half = US-058, 11 suites/85). |
| 8 | P2.5 `[ ]` | p95 < 150 ms on a 10k-record workspace with stated hardware/network/query conditions; live app-installed `searchAppRecords` re-proof (shared standing item with the P4 Cmd+K leg). |
| 9 | P3.2 `[ ]`/`[~]`×5 | Comment threads reload/second-session preservation; E04 gallery/template browser journey (US-030, 18/18); revision reload/second-session + restricted role + graphql:generate live schema (US-031); two-session conflict banner + app-reinstall CAS proof (US-032, 13/13); nonempty-content export browser validation (fidelity helpers shipped). |
| 10 | P3.3 `[ ]` | Record→doc copy browser trigger from company/person (US-033, 18/18); deep-tree browser journey; live purge-cron firing. |
| 11 | P4.1 `[ ]` | Live validation of installed relations/permissions/layouts on the populated workspace. **Highest-leverage single proof: gates P4.2 retroplanning AND P4C.5.** |
| 12 | P4.2 `[ ]`/`[~]`×8 | Install + render proofs: board drag-writes-`projectStatus` (US-034); task-calendar render/no-invitation (US-035 + US-059); My-tasks folder (US-036 + US-059); project-page tabs/widgets (US-037/038); Gantt DOM render + 1k-task benchmark with recorded hardware; time-tracker heartbeat; dependency-picker set/refuse/persist live (US-049); CSV import/export task proof (US-039); Cmd+K create-task/go-to re-proof. |
| 13 | P4.3 `[ ]` documents | Live install/render proof of project doc-relation + linked-docs overview (US-001 + US-037 landed; Tier-2 leg only). |
| 14 | P4C.3 `[~]` proof leg | `/calendar` browser journey: this-vs-series scope-dialog edit/delete journeys (US-068 landed 2026-09-21) + P4C.2 create/edit/delete, keyboard slot-create, overlap lanes, provider read-only notice, DST wall-clock, light/dark, narrow. **Ticking P4C.3 unlocks P4C.4.** |
| 15 | P5 | `chat.integration-spec.ts` (600 lines) with-db execution — needs `with-db-reset` between runs (app-uninstall DDL debris, phase-05 note) + two-session live chat/typing/read-cursor journey (E08); a2e-chat install-order proof (chat tab on standard company layout). |
| 16 | P6 | a2e-drive live install + upload→folder→preview→share journey (all front suites + queue model green). |
| 17 | P8 | Live socket push/badge proof; live email delivery. |
| 18 | P9 | Standing live assistant-catalogue dispatch on app-installed workspaces (all apps) + forced-tool deterministic-execution proof on a rebuilt server (US-069 arg landed; live schema probe confirms the arg appears after restart); PRIVATE-channel denial; recipe live materialization/firing/replay (US-014); suggestions browser proof (US-015); audit tab browser proof (US-045); P9.2b live provider-call-count journey on re-open. |
| 19 | P10 `[ ]`×2 + `[~]` residual | Performance profiling (workspace switch, 10k views, cold start — top 3 + doc); final regression (full e2e, upgrade chain from clean 2.39, uninstall-everything leaves working CRM); personal-dashboard Tier-2 browser journeys (gallery instantiation, capture walkthrough — all four features verified US-003/023/024 + P8.2 grid); dock layout browser rendering proof (after US-071). |

## Deferred — blocked upstream

| PLAN task | Blocker |
|---|---|
| **ALL of P7** — P7.0 (2×`[~]` + 1×`[ ]`), P7.1b (2), P7.1c (2), P7.1d (4), P7.1e (2), P7.1f (3), P7.2 (5) = 21 bullets | **P7.0 safety gate UNVERIFIED** in the Current-state ledger (fresh+populated install proofs, replay/numbering/rounding/period-close/alternate-API proofs + finance/privacy reviewer sign-off pending). Excluded per the standing instruction. Also gates: P9.2 Accounting tools, P9.2b `aiCacheEntry`/`score-subventions` wiring, P9.3 invoice leg, P1.6d Bilan preview legs. |
| P1.6e `[~]` | `(after P1.6c)` — P1.6c is `[~]`. All Tier-0/1 legs already green (phase-01 2026-09-20: "No Tier-0/1 acceptance gap remains"); only the Tier-2 populated-workspace/browser regression stays. |
| P1.7a `[~]` | `(after P0.4/P1.6c)` — P1.6c `[~]`. Remaining legs are Tier 2 (readiness/impact UI browser proof) + D01-gated export leg. |
| P1.7b `[~]` | `(after P1.6c/P0.2)` — P1.6c `[~]`. Six executor legs verified (142/142 + 3/3); only the Tier-2 invite→join→matrix→templates browser journey remains. |
| P3.4 bullet 1 | "After durable save/share acceptance" — US-019/US-032 acceptance is Tier-2-pending (deferred item 9). |
| P3.4 bullet 2 | Same + **D07** (`xl-*` AGPL-vs-commercial ratification — owner decision; feasibility artifact accepted US-048). |
| P3.4 guest editing | Deliberately deferred by PLAN (separate authorization/concurrency decision). |
| P4.2 Retroplanning `[ ]` | `(after P4.1/C1)` — P4.1 `[ ]` (orchestrator item 11). Engine `lib/retroplanning.ts` already exists — do not rebuild. |
| P4.3 calendar links `[ ]` | Pointer bullet to P4C.5 by design — `(after P4.1)` blocked. |
| P4C.4 `[ ]` | `(after P4C.3 and P8 notification contract)` — P4C.3 `[~]` until the browser proof (item 14). P8 contract is `[x]`. The P4C.3 occurrence-expansion-in-view slice is explicitly assigned to "P4C.4+" (phase-04 2026-09-21 entry) — it inherits this blocker even though it would be Tier-0 front work. |
| P4C.5 `[ ]` | `(after P4.1/P4C.2)` — P4.1 `[ ]`. P4C.2 is `[x]`. |
| P9.2 Projects `[~]` | AI suggestion layer is P9.1-gated (assistant surface `[~]`) + Tier-2 live dispatch; context tools verified US-012. |
| P9.2 Accounting `[ ]` | P7-gated (see P7 row). |
| P9.2b cache `[~]` + saved runs `[~]` | Contracts verified (US-043/US-055, 25/25 + 36/36); storage-backed wiring into `aiCacheEntry`/`score-subventions` is P7-gated. |

## Ticking leverage note

Fastest path to finishing the plan (the executor residue is now exhausted):
1. Run prd.json (US-072…073) — 2 stories; they close the last Tier-0/1 seam
   (P2.1 harness + bullet-5 in-process half) and unblock the P2.1 orchestrator
   ticks (bullets 1/3 need only their Tier-2 proofs on top of green code).
2. ONE orchestrator Tier-2 pass over the 19 deferred items above — items 3
   and 11 are the unlock points (P1.6c pass → P1.6e/P1.7a/P1.7b ticks; P4.1
   live validation → retroplanning + P4C.5); items 2/4/9/10/12/14/15 close
   whole bullets whose executor work is already green.
3. Maintainer decisions D02 (persona bundles) and D07 (xl-*) each unlock a
   complete bullet family; the P7.0 gate proofs unfreeze all 21 P7 bullets +
   the P9 P7-gated legs. After that, the plan's remaining work is purely
   orchestrator verification + the three maintainer decisions.
