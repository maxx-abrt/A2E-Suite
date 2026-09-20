# Deferred batch — extraction exclusions (PLAN.md as of 2026-09-20, prd.json = US-056…067)

## Deferred — needs orchestrator (Tier 2: running app / browser / multi-session / live proof)

Executor-side work on every item below is already green and recorded in phase
reports — re-extracting them wastes a run. One orchestrator pass over this list
ticks the most PLAN.md bullets.

| # | PLAN task | Remaining leg (executor evidence) |
|---|---|---|
| 1 | P1.1 `[~]` | Live uninstall (destructive) + reinstall proof on populated scratch under C3 — install + 5 upgrades already accepted (phase-04). |
| 2 | P1.3 `[ ]` e2e + `[~]` residual | Live scratch preset apply observing seeded rows > 0 (root cause fixed US-028); individual-preset browser e2e incl. restore-to-CRM and customized-nav. |
| 3 | P1.6c `[~]` | `graphql:generate` against a live schema + onboarding/Settings browser journey (after US-056 lands → tick `[x]` → unlocks P1.6e/P1.7a/P1.7b). |
| 4 | P1.6d `[~]` | Live Bilan install/reinstall observing seeded rows > 0 (US-028/029 landed); **D02 product call** on adding a2e-projects to project-oriented personas. |
| 5 | P1.7b `[~]` | Tier-2 invite→join→role-matrix→templates browser journey (six executor legs verified 142/142 + 3/3, 2026-09-16). |
| 6 | P1.7c `[ ]` | E01–E04 + E12 first-use acceptance runs (empty/populated/customized workspaces). |
| 7 | P2.1 `[ ]`×4 | Real-session proofs: HTTP-session auth validation, Redis fan-out across instances + outage/recovery, ACL revocation, real-session integration tests. |
| 8 | P2.4 `[ ]` | Browser E2E: two records as tabs → switch/close → reload restores permitted context (unit half = US-058). |
| 9 | P2.5 `[ ]`×2 | Live app-installed `searchAppRecords` re-proof; p95 < 150 ms on a 10k-record workspace with stated conditions. |
| 10 | P3.2 | E04 gallery/template browser journey (US-030, 18/18); revision reload/second-session + restricted role + graphql:generate (US-031); app reinstall + two-session conflict banner + graphql:generate (US-032, 13/13 + CAS); comment threads reload/second-session; nonempty-content export browser validation. |
| 11 | P3.3 `[ ]` | Record→doc copy browser trigger from company/person (US-033, 18/18); deep-tree browser journey; live purge-cron firing. |
| 12 | P4.1 `[ ]` | Live validation of installed relations/permissions/layouts on the populated workspace — **gates P4.2 retroplanning AND P4C.5**. |
| 13 | P4.2 | Install + render proofs: board drag-writes-`projectStatus` (US-034), calendar render/no-invitation (US-035), My-tasks folder (US-036), project-page tabs (US-037/038), Gantt DOM render + 1k-task benchmark, time-tracker heartbeat, dependency-picker set/refuse/persist (US-049 ticked, proof open), CSV import/export task proof (US-039). |
| 14 | P4C.2 `[x]` proof legs | `/calendar` browser journey (create/edit/delete, keyboard slot-create, overlap lanes, provider read-only notice, DST wall-clock, light/dark, narrow); redaction to a second member; 2-39 command on an upgraded workspace. |
| 15 | P5 | `chat.integration-spec.ts` (600 lines) with-db execution; two-session live chat/typing/read-cursor proof. |
| 16 | P6 | a2e-drive live install + upload→folder→preview→share journey. |
| 17 | P8 | Live socket push/badge proof; live email delivery. |
| 18 | P9 | Standing live assistant-catalogue dispatch (all apps); PRIVATE-channel denial; recipe live materialization/firing/replay (US-014); suggestions browser proof (US-015); audit tab browser proof (US-045). |
| 19 | P10 `[ ]`×2 | Performance profiling (workspace switch, 10k views, cold start — top 3 + doc); final regression (full e2e, upgrade chain from clean 2.39, uninstall-everything leaves working CRM). |

## Deferred — blocked upstream

| PLAN task | Blocker |
|---|---|
| **ALL of P7**: P7.0 (3 bullets), P7.1b (2), P7.1c (2), P7.1d (4), P7.1e (2), P7.1f (3), P7.2 (5) | **P7.0 safety gate UNVERIFIED** in the Current-state ledger (gate proofs + populated-install proofs pending; reviewer sign-off pending). Also: P9.2 Accounting tools, P9.2b cache/saved-run wiring into `aiCacheEntry`/`score-subventions`, P9.3 invoice-draft leg, P1.6d Bilan sheet previews already gated behind `P7.0_SAFETY_GATE`. |
| P1.6e `[~]` (gallery/first-open/populated-workspace reuse, provenance descriptor) | `(after P1.6c)` — P1.6c is `[~]` (needs US-056 + orchestrator legs). |
| P1.7a `[~]` (readiness, dependency display, export legs) | `(after P0.4/P1.6c)` — P1.6c `[~]`. |
| P3.4 bullet 1 (templates gallery, HTML import completion, CSV/JSON portability) | "After durable save/share acceptance" — US-019/US-032 acceptance is Tier-2-pending. |
| P3.4 bullet 2 (advanced authoring blocks) | Same + **D07** (`xl-*` AGPL-vs-commercial ratification — owner decision; feasibility artifact accepted US-048). |
| P4.2 Retroplanning `[ ]` | `(after P4.1/C1)` — P4.1 first bullet `[ ]` (live validation, orchestrator item 12). Engine `lib/retroplanning.ts` already exists — do not rebuild. |
| P4C.4 `[ ]` (reminders/team) | `(after P4C.3 and P8 notification contract)` — P4C.3 in progress (US-060…063); P8 contract is `[x]`. |
| P4C.5 `[ ]` (task/project links) | `(after P4.1/P4C.2)` — P4.1 `[ ]`. P4.3's calendar-links bullet is a pointer here by design. |

## Ticking leverage note

Fastest path to maximum PLAN.md ticks:
1. Run prd.json (US-056…067) — 12 executor stories; US-056 alone unblocks the
   P1.6c tick → P1.6e/P1.7a/P1.7b; US-060…063 complete P4C.3 → unblocks P4C.4.
2. ONE orchestrator pass over "Deferred — needs orchestrator" above ticks
   roughly 15+ bullets/slice-legs whose executor work is already green.
3. The two maintainer decisions (D02 personas, D07 xl-*) each unlock a
   complete bullet family; P7 stays frozen until its gate proofs run.
