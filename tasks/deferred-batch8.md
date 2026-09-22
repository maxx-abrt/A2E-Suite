# Deferred batch 8 — extraction exclusions (PLAN.md as of 2026-09-22, HEAD 3b3c42a4, post-US-072…073 verify commit f71e473a)

Source scan: PLAN.md's delivery-order sections ("Milestones — the only
execution order" — the 2026-09-22 revision (84f8be4d + 3b3c42a4) replaced the
old "Current delivery order" with M0–M6; the "Current-state ledger" and
"Execution order and agent handoffs" sections were re-read in full), P1–P10.
Every one of the **69** remaining top-level `[ ]`/`[~]` bullets was checked
against its own literal `(after X)` references individually (phase-by-phase,
never phase-level inference). The P-phase content is byte-identical to the
pre-revision scan (diff-verified against 359d1249/84f8be4d: 69 open bullets
before and after the revision), so no bullet changed status in the restructure.

## P7.0 safety-gate re-check (fresh, per instruction)

**Still BLOCKED/UNVERIFIED — P7 stays excluded.** PLAN.md P7.0 carries no
annotation newer than 2026-09-16: bullet 1 remains `[~]` with "The gate proofs
themselves (schema/relations on fresh+populated, replay, numbering, rounding,
period-close races, alternate API) **remain UNVERIFIED live**"; bullet 2
remains `[~]` with "the live finance-user iban-denial proof is now runnable
but still unverified; reviewer sign-off still pending"; bullet 3 (`[ ]`) is
decision-gated (C6/D03/D04). The 2026-09-22 revision itself restates this: M4
status = "app code strong, **live proofs blocked behind M0**", and the code
encodes the gate literally
(`workspace-template-definitions.constant.ts` blocks all Bilan bundle
contents with reason `P7_0_SAFETY_GATE`). No phase-report entry after
2026-09-16 touches P7.0. Per the standing instruction, ALL of P7
(P7.0 3 + P7.1b 2 + P7.1c 2 + P7.1d 4 + P7.1e 2 + P7.1f 3 + P7.2 5 = 21
bullets) and every P7-gated leg (P9.2 Accounting, P9.2b `aiCacheEntry`/
`score-subventions` wiring, P1.6d Bilan preview legs) is excluded.

## Already-present / consumed IDs

`tasks/prd.json` on disk is **empty (0 bytes)** — the tracker consumed it —
but HEAD `f71e473a` records US-072/US-073 as **verified 2026-09-22 00:45**
(phase-02-report): P2.1 bullet 5's in-harness half is done and the bullet was
moved to `[~]`. US-072/US-073 are therefore excluded as consumed. Batches
US-001…071 are all done-for-review and their PLAN.md legs are ticked or
ledger-recorded. New batch numbering would continue at US-074 — **no US-074+
exists**: the extraction result is empty.

## Extraction result (why 0 stories)

The executor residue is exhausted. After US-072/073 closed the last Tier-0/1
seam (P2.1 harness + bullet-5 in-process half), all 69 remaining open bullets
are Tier 2 (running app / browser / multi-session / live install / live perf /
full e2e), blocked upstream (literal `(after X)` not `[x]`), or
decision-gated — see the two tables below. The 2026-09-22 revision's new
milestone slices (M0a/M1a/M2a) are not checkbox bullets and are not
executor-runnable either: M0a/M1a require a live stack/deployment (Tier 2) and
M1a/M2a carry the open D-M1/D-B1/D02 decisions. **Do not invent work to pad
the batch.** The fastest path to PLAN.md ticks is ONE orchestrator Tier-2 pass
over the table below (unlock-leverage note at the end), plus the four open
maintainer decisions.

## Deferred — needs orchestrator (Tier 2: running app / browser / multi-session / live proof)

| # | PLAN task | Remaining leg (executor evidence) |
|---|---|---|
| 1 | P1.1 `[~]` | Live uninstall (destructive) + reinstall proof on populated scratch under C3 — install + 5 upgrades already accepted (phase-04). |
| 2 | P1.3 `[~]` + `[ ]` e2e | Live scratch preset apply observing seeded rows > 0 (root cause fixed US-028); individual-preset browser e2e incl. restore-to-CRM and customized-nav. |
| 3 | P1.6c `[~]` | `npx nx run twenty-front:graphql:generate` against a live **authenticated** schema (⚠ running codegen against the unauthenticated `/graphql` would clobber the generated file — PLAN line ~600) + onboarding/Settings browser journey. **Ticking P1.6c unlocks P1.6e/P1.7a/P1.7b.** |
| 4 | P1.6d `[~]` | Live Bilan install/reinstall observing seeded rows > 0 (write path unit-proven US-028/029 lineage); **D02 product call** on adding a2e-projects to project-oriented personas (touches 2 onboarding integration specs) and on exact bundle contents (persona bundles unshipped, phase-01 2026-09-16). |
| 5 | P1.7c `[ ]` | E01–E04 + E12 first-use acceptance runs (empty/populated/customized workspaces, no-AI, missing optional apps). |
| 6 | P2.1 `[ ]`×3 + b5 residual | Tier-2 real handshake (browser client + revoked-session negative — bullet 1); true worker↔server-process fan-out across instances + outage/recovery (bullet 2); record/channel ACL **revocation** journey (bullet 3 — needs installed a2e-chat runtime for app-owned object names). Bullet-5 in-process half verified (US-072/073, 12/12, 0 open handles — phase-02 2026-09-22); residual adjudicated there. |
| 7 | P2.4 `[~]` | Browser E2E `side-panel-tabs.spec.ts`: two records as tabs → switch/close → reload restores permitted context (unit half = US-058, 11 suites/85). |
| 8 | P2.5 `[ ]` | p95 < 150 ms on a 10k-record workspace with stated hardware/network/query conditions; live app-installed `searchAppRecords` re-proof (shared standing item with the P4 Cmd+K leg). |
| 9 | P3.2 `[ ]`/`[~]`×5 | Comment threads reload/second-session preservation; E04 gallery/template browser journey (US-030, 18/18); revision reload/second-session + restricted role + graphql:generate live schema (US-031); two-session conflict banner + app-reinstall CAS proof (US-032, 13/13); nonempty-content export browser validation (fidelity helpers shipped). |
| 10 | P3.3 `[ ]` | Record→doc copy browser trigger from company/person (US-033, 18/18); deep-tree browser journey; live purge-cron firing. |
| 11 | P4.1 `[ ]` | Live validation of installed relations/permissions/layouts on the populated workspace. **Highest-leverage single proof: gates P4.2 retroplanning AND P4C.5.** |
| 12 | P4.2 `[ ]`/`[~]`×8 | Install + render proofs: board drag-writes-`projectStatus` (US-034); task-calendar render/no-invitation (US-035 + US-059); My-tasks folder (US-036 + US-059); project-page tabs/widgets (US-037/038); Gantt DOM render + 1k-task benchmark with recorded hardware; time-tracker heartbeat; dependency-picker set/refuse/persist live (US-049); CSV import/export task proof (US-039); Cmd+K create-task/go-to re-proof. |
| 13 | P4.3 `[ ]` documents | Live install/render proof of project doc-relation + linked-docs overview (US-001 + US-037 landed; Tier-2 leg only). |
| 14 | P4C.3 `[~]` proof leg | `/calendar` browser journey: this-vs-series scope-dialog edit/delete journeys (US-068 landed 2026-09-21) + P4C.2 create/edit/delete, keyboard slot-create, overlap lanes, provider read-only notice, DST wall-clock, light/dark, narrow. **Ticking P4C.3 unlocks P4C.4** (incl. the P4C.4+ occurrence-expansion-in-view slice — Tier-0 front work once unblocked). |
| 15 | P5 | `chat.integration-spec.ts` (600 lines) with-db execution — needs `with-db-reset` between runs (app-uninstall DDL debris, phase-05 note) + two-session live chat/typing/read-cursor journey (E08); a2e-chat install-order proof (chat tab on standard company layout). |
| 16 | P6 | a2e-drive live install + upload→folder→preview→share journey (all front suites + queue model green). |
| 17 | P8 | Live socket push/badge proof; live email delivery. |
| 18 | P9.1 `[~]` | Standing live assistant-catalogue dispatch on app-installed workspaces (all apps) + forced-tool deterministic-execution proof on a rebuilt server (US-069 arg landed; live schema probe confirms `SendChatMessageInput.directToolInvocation` absent until restart); PRIVATE-channel denial. |
| 19 | P9.3 `[~]`×2 | Recipe live materialization/firing/replay (US-014); suggestions browser proof (US-015). |
| 20 | P10 `[ ]`×2 + `[~]` | Performance profiling (workspace switch, 10k views, cold start — top 3 + doc); final regression (full e2e, upgrade chain from clean 2.39, uninstall-everything leaves working CRM); personal-dashboard Tier-2 browser journeys (gallery instantiation, capture walkthrough — all four features verified US-003/023/024 + P8.2 grid); dock layout browser rendering proof (after US-071). |
| 21 | **M0a** (milestone slice, new 2026-09-22) | Start the dev stack and run the five blocking browser journeys (deferred rows 2/7/9/12/14 are the highest-leverage). Each failure becomes the next executor slice — but the runs themselves are Tier 2. |
| 22 | **M1a** (milestone slice, new 2026-09-22) | One-command provisioning: Dockerfile `twenty-apps` build stages + CI (cd-docker-image) + boot registration, verified by clean-volume `docker compose up` → 6 registered apps in Settings → Applications. **Carries decision D-M1** (image-baked manifests vs provisioning script vs both). Deployment-level = Tier 2. |
| 23 | **M2a** (milestone slice, new 2026-09-22) | Live seeding rows > 0 observation (fix already landed, US-028 lineage) — then preset expansion + picker copy, both **decision-gated** (see blocked table). |

## Deferred — blocked upstream (literal `(after X)` not `[x]`) or decision-gated

| PLAN task | Blocker |
|---|---|
| **ALL of P7** — P7.0 (2×`[~]` + 1×`[ ]`), P7.1b (2), P7.1c (2), P7.1d (4), P7.1e (2), P7.1f (3), P7.2 (5) = 21 bullets | **P7.0 safety gate UNVERIFIED live** (re-checked fresh — see above). Also gates: P9.2 Accounting tools, P9.2b `aiCacheEntry`/`score-subventions` wiring, P9.3 invoice leg, P1.6d Bilan preview legs. |
| P7.0 bullet 3 `[ ]` | Decision-gated: C6/D03 (catalogue storage scope) + D04 (CERFA terminology) — product/finance/legal reviewers. |
| P1.6e `[~]` | `(after P1.6c)` — P1.6c is `[~]`. All Tier-0/1 legs already green (phase-01 2026-09-20); only the Tier-2 populated-workspace/browser regression stays. |
| P1.7a `[~]` | `(after P0.4/P1.6c)` — P1.6c `[~]`. Remaining legs are Tier 2 (readiness/impact UI browser proof) + D01-gated export leg. |
| P1.7b `[~]` | `(after P1.6c/P0.2)` — P1.6c `[~]`. Six executor legs verified (142/142 + 3/3); only the Tier-2 invite→join→matrix→templates browser journey remains. |
| P3.4 bullet 1 `[ ]` | "After durable save/share acceptance" — US-019/US-032 acceptance is Tier-2-pending (deferred item 9). |
| P3.4 bullet 2 `[ ]` | Same + **D07** (`xl-*` AGPL-vs-commercial ratification — owner decision; feasibility artifact accepted US-048). |
| P3.4 guest editing `[ ]` | Deliberately deferred by PLAN (separate authorization/concurrency decision). |
| P4.2 Retroplanning `[ ]` | `(after P4.1/C1)` — P4.1 `[ ]` (deferred item 11). Engine `lib/retroplanning.ts` already exists — do not rebuild. |
| P4.3 calendar links `[ ]` | Pointer bullet to P4C.5 by design — `(after P4.1)` blocked. |
| P4C.4 `[ ]` | `(after P4C.3 and P8 notification contract)` — P4C.3 `[~]` until the browser proof (deferred item 14). P8 contract is `[x]`. The P4C.3 occurrence-expansion-in-view slice is explicitly assigned to "P4C.4+" (phase-04 2026-09-21) — it inherits this blocker even though it would be Tier-0 front work. |
| P4C.5 `[ ]` | `(after P4.1/P4C.2)` — P4.1 `[ ]`. P4C.2 is `[x]`. |
| P9.2 Projects `[~]` | AI suggestion layer is P9.1-gated (assistant surface `[~]`) + Tier-2 live dispatch; context tools verified US-012. |
| P9.2 Accounting `[ ]` | P7-gated (see P7 row). |
| P9.2b cache `[~]` + saved runs `[~]` | Contracts verified (US-043/US-055, 25/25 + 36/36); storage-backed wiring into `aiCacheEntry`/`score-subventions` is P7-gated. |
| M2a legs: preset expansion + picker copy | **D-B1** (Bureau packaging — Product; "must be settled before M2 exit") + **D02** (exact persona bundle contents). Live-seeding leg is deferred item 23. |
| M1a mechanism choice | **D-M1** (image-baked manifests + startup registration vs provisioning script — Maintainer; M1a investigates and records the choice). |

## Unlock-leverage note (priority order for the orchestrator pass)

1. **M1a provisioning proof** — gates M0's browser journeys (they must run on
   the M1 deployment per milestone discipline), which gate every other
   milestone's exit evidence. Highest structural leverage; carries D-M1.
2. **P4.1 live validation** (deferred item 11) — single proof that unblocks
   P4.2 retroplanning AND P4C.5.
3. **P1.6c tick** (item 3) — unblocks P1.6e/P1.7a/P1.7b (3 bullets) and closes
   the whole P1 acceptance clause.
4. **P4C.3 tick** (item 14) — unblocks P4C.4 + the occurrence-expansion slice
   (the only remaining Tier-0 executor work, currently gated).
5. **P7.0 gate proofs** — unfreeze all 21 P7 bullets + the P9 P7-gated legs +
   the Bilan bundle previews (`P7_0_SAFETY_GATE` in the onboarding constants).
6. Maintainer decisions **D-B1/D02** (M2a presets/copy) and **D07** (P3.4
   advanced authoring) each unlock a complete bullet family without code.

After the orchestrator pass + the four decisions, the plan's remaining work
is purely verification; there is no executor-runnable story to extract today.
