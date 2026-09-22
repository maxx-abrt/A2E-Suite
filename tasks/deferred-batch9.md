# Deferred batch 9 — extraction exclusions (PLAN.md as of 2026-09-22, HEAD 1b1a5f39, post-Tier-2-pass commit fa12753d)

Source scan: fresh re-read of PLAN.md (Milestones M0–M6 / Current-state ledger /
Execution order and agent handoffs) plus the two 2026-09-22 phase-report
Tier-2 pass entries (phase-01-report 15:25 CEST, phase-04-report 15:25 CEST).
`git diff 3b3c42a4..HEAD` confirms PLAN.md is **byte-identical** to batch 8's
baseline — the 69 open top-level `[ ]`/`[~]` bullets are unchanged, so
deferred-batch8.md's per-bullet dependency adjudication carries over verbatim
and is not repeated bullet-by-bullet here.

## P7.0 safety-gate re-check (fresh, per instruction, 2026-09-22 pass included)

**Still BLOCKED/UNVERIFIED — P7 stays excluded.** Today's phase-04-report
15:25 entry re-verified live: "fresh install of accounting (Bilan) 0.1.0
against the live server today: clean, INSTALLED … The 2026-09-16 'blockage
lifted' entry is confirmed on current HEAD. **Gate proofs (ledger replay,
numbering race, rounding, period-close, live finance-user iban-denial run)
remain open; `P7.0` stays `[~]`.**" Install passing is not gate-closed. Per
the standing instruction, ALL of P7 (21 bullets) and every P7-gated leg
(P9.2 Accounting, P9.2b `aiCacheEntry`/`score-subventions` wiring, P1.6d
Bilan preview legs, P9.3 invoice leg) stays excluded.

## Extraction result (why 2 stories, not 20)

Batch 8 (HEAD 3b3c42a4) exhaustively checked all 69 open bullets and found
**zero** executor-runnable work; this pass re-verified that conclusion on a
byte-identical PLAN.md. What changed since batch 8 is the orchestrator's
2026-09-22 Tier-2 live pass (commit fa12753d), which recorded **two genuine
code defects** in the phase reports and queued them explicitly for executors:
phase-01-report 2026-09-22: "Next: executor — the nav-restore defect above and
the a2e-projects install-time schema-build ordering defect." Neither existed
as a PLAN.md bullet, so both are extracted directly from the phase-report
citations per the batch instruction (US-074 = schema-build defect #1, US-075
= nav-restore defect #2). These are the only two executor-completable stories
in the repository right now; the honest count is **2**, not 20. No padding.

Why the defect fixes do not immediately unlock further executor work:
- US-074's fix unblocks the *orchestrator's* Tier-2 proofs (P4.1 human-ID
  concurrency live proof, M1a's a2e-projects install leg, the a2e-chat
  dependency chain, and every P4/P6 install-then-render proof) — all of which
  need a running app and stay deferred below.
- US-075's fix closes the CRM preview/apply contradiction at Tier 1, but the
  remaining P1.3/P1.6c/P1.7 legs (browser journeys, E03 nav-restoration e2e)
  are Tier 2 and stay deferred.
- P4C.4's occurrence-expansion slice stays gated behind P4C.3 `[~]` (browser
  proof); P1.6e/P1.7a/P1.7b stay behind P1.6c `[~]`; retroplanning/P4C.5 stay
  behind P4.1 `[ ]` (tickable only after US-074 + a Tier-2 install).

Already-present IDs: `tasks/prd.json` on disk was batch 8's empty-extraction
file (0 user stories) — nothing to exclude as consumed. Batch numbering
continues at US-074 as batch 8's header recorded.

## Deferred — needs orchestrator (Tier 2: running app / browser / multi-session / live proof)

Carried from deferred-batch8.md items 1–23, updated for today's pass:

| # | PLAN task | Remaining leg (executor evidence) | Delta today |
|---|---|---|---|
| 1 | P1.1 `[~]` | Live uninstall (destructive) + reinstall proof on populated scratch under C3. | — |
| 2 | P1.3 `[~]` + `[ ]` e2e | Live scratch preset apply observing seeded rows > 0; individual-preset browser e2e incl. restore-to-CRM and customized-nav (now also the US-075 regression target live). | nav-restore defect recorded live (phase-01 2026-09-22); fix extracted as US-075 |
| 3 | P1.6c `[~]` | `graphql:generate` against a live **authenticated** schema (⚠ unauthenticated `/graphql` codegen would clobber the generated file) + onboarding/Settings browser journey. Ticking P1.6c unlocks P1.6e/P1.7a/P1.7b. | STUDENT apply + same-key retry + version-conflict legs verified live; defect queued as US-075 |
| 4 | P1.6d `[~]` | Live Bilan install/reinstall observing seeded rows > 0; **D02** product call on persona bundles. | — |
| 5 | P1.7c `[ ]` | E01–E04 + E12 first-use acceptance runs. | — |
| 6 | P2.1 `[ ]`×3 + b5 residual | Real handshake (browser + revoked-session negative); multi-instance fan-out + outage/recovery; record/channel ACL **revocation** journey (needs installed a2e-chat runtime). Bullet-5 in-harness half verified (US-072/073). | — |
| 7 | P2.4 `[~]` | Browser E2E `side-panel-tabs.spec.ts`. | — |
| 8 | P2.5 `[ ]` | p95 < 150 ms @ 10k records; live app-installed `searchAppRecords` re-proof. | — |
| 9 | P3.2 `[ ]`/`[~]`×5 | Comment reload/second-session; E04 gallery/template journey; revision reload/second-session + graphql:generate; two-session conflict banner + CAS; nonempty export browser validation. | — |
| 10 | P3.3 `[ ]` | Record→doc copy browser trigger; deep-tree journey; live purge-cron firing. | — |
| 11 | P4.1 `[ ]` | Live validation of installed relations/permissions/layouts + the human-ID **concurrency proof** (`task-human-id-handler.ts` CAS). | **BLOCKED by defect #1 (phase-04 2026-09-22, verbatim): "the `<projectKey>-<n>` human-ID allocator … cannot be exercised live while a2e-projects fails to install … Concurrency proof deferred until that defect is fixed."** US-074 removes the blocker; the proof itself stays Tier 2. Highest-leverage single tick: gates retroplanning AND P4C.5. |
| 12 | P4.2 `[ ]`/`[~]`×8 | Install + render proofs: board drag, task-calendar, My-tasks, project-page tabs, Gantt DOM + 1k benchmark, time-tracker heartbeat, dependency-picker live, CSV import, Cmd+K. All need a2e-projects installable → US-074. | — |
| 13 | P4.3 `[ ]` documents | Live install/render proof of project doc-relation + linked-docs overview. | — |
| 14 | P4C.3 `[~]` proof leg | `/calendar` browser journeys: scope-dialog this-vs-series (US-068 landed) + P4C.2 create/edit/delete legs. API-level storage semantics verified live today (anchor + detached + seriesId, series-scoped query/edit/delete — phase-04 2026-09-22). Ticking P4C.3 unlocks P4C.4. | leg narrowed to browser-only by today's API proof |
| 15 | P5 | `chat.integration-spec.ts` with-db execution + two-session live journey; **a2e-chat install blocked on a2e-projects' `project` object** (phase-01 2026-09-22: "dependency, not a separate defect") → unblocked at code level by US-074, proof stays Tier 2. | — |
| 16 | P6 | a2e-drive live install + upload→folder→preview→share journey (drive 0.1.0 INSTALLED live today — phase-01 2026-09-22). | install leg confirmed live; journey remains |
| 17 | P8 | Live socket push/badge; live email delivery. | — |
| 18 | P9.1 `[~]` | Live assistant-catalogue dispatch + forced-tool deterministic-execution proof on a rebuilt server (`directToolInvocation` arg landed US-069; live schema probe confirms the arg is absent until restart). | — |
| 19 | P9.3 `[~]`×2 | Recipe live materialization/firing/replay; suggestions browser proof. | — |
| 20 | P10 `[ ]`×2 + `[~]` | Performance profiling; final regression (full e2e, upgrade chain, uninstall-everything); personal-dashboard browser journeys; dock layout rendering proof. | — |
| 21 | M0a | Five blocking browser journeys on the dev stack (rows 2/7/9/12/14). | — |
| 22 | M1a | Clean-volume `docker compose up` → 6 registered apps. **3/5 live today**: documents 0.2.0, drive 0.1.0, accounting 0.1.0 INSTALLED; **a2e-projects install FAILS (defect #1 → US-074)**; a2e-chat dependency-blocked; docker not on this machine. | 3/5 recorded (phase-01 2026-09-22) |
| 23 | M2a | Live seeding rows > 0 observation; preset expansion + picker copy (decision-gated). | — |

## Deferred — blocked upstream (literal `(after X)` not `[x]`)

| PLAN task | Blocker |
|---|---|
| ALL of P7 (21 bullets) | P7.0 gate proofs UNVERIFIED live — re-confirmed fresh 2026-09-22 (phase-04: "remain open; `P7.0` stays `[~]`"). Also gates P9.2 Accounting, P9.2b wiring, P9.3 invoice leg, P1.6d Bilan legs. |
| P1.6e `[~]` | `(after P1.6c)` — P1.6c `[~]`. |
| P1.7a `[~]` | `(after P0.4/P1.6c)` — P1.6c `[~]`. |
| P1.7b `[~]` | `(after P1.6c/P0.2)` — P1.6c `[~]`. |
| P3.4 bullets 1–2 + guest `[ ]` | Durable save/share acceptance Tier-2-pending; bullet 2 additionally **D07**. |
| P4.2 Retroplanning `[ ]` | `(after P4.1/C1)` — P4.1 `[ ]` (tick needs US-074 + Tier-2 install/validation). |
| P4.3 calendar links `[ ]` | Pointer to P4C.5 — `(after P4.1)` blocked. |
| P4C.4 `[ ]` (incl. occurrence-expansion slice) | `(after P4C.3 and P8 notification contract)` — P4C.3 `[~]` until the browser proof. P8 contract `[x]`. |
| P4C.5 `[ ]` | `(after P4.1/P4C.2)` — P4.1 `[ ]`. |
| P9.2 Projects `[~]` | AI suggestion layer is P9.1-gated (assistant surface `[~]`). |
| a2e-chat install (P5) | Dependency: a2e-projects `project` object — blocked by defect #1 until US-074 lands (then Tier 2). |

## Deferred — decision-gated

| PLAN task | Decision |
|---|---|
| P7.0 bullet 3 | C6/D03 (catalogue storage scope) + D04 (CERFA terminology). |
| P1.6d persona bundles | D02. |
| M2a preset expansion + picker copy | D-B1 + D02. |
| M1a mechanism choice | D-M1 (image-baked manifests vs provisioning script vs both). |
| P3.4 advanced authoring | D07 (`xl-*` AGPL-vs-commercial). |

## Deferred — environment-blocked

- M1a docker-compose leg: docker not installed on this machine (phase-01
  2026-09-22).

## Unlock-leverage note (orchestrator pass order, updated)

1. **US-074** (executor, this batch) — removes the a2e-projects install
   blocker; then the orchestrator's Tier-2 pass can tick P4.1 (→ retroplanning
   + P4C.5), the M1a install leg, and the a2e-chat chain.
2. **US-075** (executor, this batch) — closes the nav-restore contradiction;
   then P1.3/P1.6c browser legs + E03 can be adjudicated.
3. **P1.6c tick** — unblocks P1.6e/P1.7a/P1.7b.
4. **P4C.3 tick** — unblocks P4C.4 + the occurrence-expansion slice (the only
   remaining Tier-0 executor work, still gated).
5. **P7.0 gate proofs** — unfreeze all 21 P7 bullets + P9 P7-gated legs.
6. Decisions D-B1/D02/D07/D-M1 unlock complete bullet families without code.

After US-074/US-075 land and the orchestrator re-runs the Tier-2 pass, the
plan's remaining work is purely verification — there is no third
executor-runnable story to extract today.
