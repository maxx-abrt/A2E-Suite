# Deferred batch 10 — extraction exclusions (PLAN.md as of 2026-09-22, HEAD 23d1b6d2)

Source scan: PLAN.md (Milestones M0–M6), all phase reports through phase-01-report
(including the 20:15 CEST entry), deferred-batch9.md. HEAD 23d1b6d2 adds US-076
(INSTALL_APP idempotency fix) on top of batch 9's US-074/US-075.

## Extraction result

**1 story (US-076), now complete.** The only executor-runnable work since batch 9
was the INSTALL_APP idempotency defect queued by the orchestrator in phase-01-report
20:15 CEST (2026-09-22). US-076 is committed and pushed. No further executor work
is identifiable at this HEAD.

**Why no further stories:**
- US-074's fix (a2e-projects install) unlocks the *orchestrator's* Tier-2 proofs
  (P4.1 human-ID concurrency live proof, M1a's 5/5 install-leg tick, a2e-chat chain,
  P4/P6 install-then-render proofs) — all Tier-2.
- US-075's fix (nav-restore) closes the C2 preview/apply contradiction; P1.3/P1.6c
  browser legs + E03 remain Tier-2.
- US-076's fix (INSTALL_APP idempotency) closes the retry-completion blocker;
  the live probe (STUDENT apply on workspace with Documents already installed)
  remains Tier-2 for the orchestrator.
- P4C.4 (Reminders/team) still gated on P4C.3's browser proof (`[~]`).
- All P7 bullets (21 total) still gated on P7.0 safety proofs (`[~]`).
- P1.6e/P1.7a/P1.7b still gated on P1.6c browser/codegen (`[~]`).
- retroplanning/P4C.5 still gated on P4.1 live proof (`[ ]`).
- Decisions D-B1/D02/D07/D-M1 still open.

## Deferred — needs orchestrator (Tier 2: running app / browser / multi-session / live proof)

Carries over verbatim from deferred-batch9.md items 1–23, updated for batch 10 deltas:

| # | PLAN task | Remaining leg | Delta batch 10 |
|---|---|---|---|
| 1 | P1.1 `[~]` | Live uninstall + reinstall proof on populated scratch under C3. | — |
| 2 | P1.3 `[~]` + `[ ]` e2e | Live scratch preset apply observing seeded rows > 0; individual-preset browser e2e incl. restore-to-CRM. | — |
| 3 | P1.6c `[~]` | `graphql:generate` (authenticated) + onboarding/Settings browser journey. | — |
| 4 | P1.6d `[~]` | Live Bilan install/reinstall observing seeded rows > 0; D02 product call. | — |
| 5 | P1.7c `[ ]` | E01–E04 + E12 first-use acceptance runs. | — |
| 6 | P2.1 `[ ]`×3 + b5 residual | Real handshake (browser + revoked-session); multi-instance fan-out; record/channel ACL revocation. | — |
| 7 | P2.4 `[~]` | Browser E2E `side-panel-tabs.spec.ts`. | — |
| 8 | P2.5 `[ ]` | p95 < 150 ms @ 10k records; live `searchAppRecords` re-proof. | — |
| 9 | P3.2 `[ ]`/`[~]`×5 | Comment reload/second-session; E04 gallery/template; revision reload; two-session conflict banner + CAS; nonempty export browser. | — |
| 10 | P3.3 `[ ]` | Record→doc copy browser trigger; deep-tree journey; live purge-cron. | — |
| 11 | P4.1 `[ ]` | Live install + human-ID concurrency proof (a2e-projects now installable via US-074). | US-074 removes code blocker; live proof is orchestrator's. |
| 12 | P4.2 `[ ]`/`[~]`×8 | Install + render proofs: board drag, task-calendar, My-tasks, Gantt DOM, time-tracker, dependency-picker, CSV import, Cmd+K. | — |
| 13 | P4.3 `[ ]` | Live install/render proof of project doc-relation + linked-docs overview. | — |
| 14 | P4C.3 `[~]` proof leg | `/calendar` browser: scope-dialog edit/delete on live `/calendar`; view-level occurrence expansion separate. | — |
| 15 | P5 | `chat.integration-spec.ts` with-db + two-session live; a2e-chat install now unblocked at code level (US-074). | a2e-chat code blocker removed; proof stays Tier 2. |
| 16 | P6 | a2e-drive live upload→folder→preview→share journey. | — |
| 17 | P8 | Live socket push/badge; live email delivery. | — |
| 18 | P9.1 `[~]` | Live forced-tool dispatch on rebuilt server. | — |
| 19 | P9.3 `[~]`×2 | Recipe live firing/replay; suggestions browser proof. | — |
| 20 | P10 `[ ]`×2 + `[~]` | Performance profiling; final regression; personal-dashboard browser; dock layout rendering. | — |
| 21 | M0a | Five blocking browser journeys (deferred-batch7 rows 2/7/9/12/14). | — |
| 22 | M1a | Clean-volume `docker compose up` → 6 registered apps (docker not on this machine). 5/5 install legs verified live; docker leg unrunnable. | — |
| 23 | M2a | Live seeding rows > 0; preset expansion + picker copy (D-B1/D02 gated); US-076 closes the retry-completion blocker (Tier-2 live probe queued). | US-076 fix queued Tier-2 probe. |

## Deferred — blocked upstream

Same as deferred-batch9.md (all P7, P1.6e, P1.7a, P1.7b, P4.2 retroplanning,
P4.3 calendar links, P4C.4, P4C.5, P9.2 Projects).

## Deferred — decision-gated

Same as deferred-batch9.md (D02 persona bundles, D-B1 Bureau bundle, D03 catalogue,
D04 CERFA, D07 advanced editor, D-M1 provisioning mechanism).

## Unlock-leverage note (updated)

1. **US-074/075/076 all done** — orchestrator's next Tier-2 pass covers:
   - P4.1 human-ID concurrency proof (a2e-projects installs)
   - a2e-chat install chain (project object dependency resolved)
   - P1.3/P1.6c nav-restore + browser journey (US-075)
   - M2 retry-completion honest probe (US-076)
2. **P1.6c tick** → unblocks P1.6e/P1.7a/P1.7b
3. **P4C.3 tick** → unblocks P4C.4 + occurrence-expansion slice
4. **P7.0 gate proofs** → unfreeze all 21 P7 bullets
5. **Decisions D-B1/D02/D07/D-M1** → unlock complete bullet families

**Honest executor queue after batch 10:** empty. No further Tier-0/1 executor
code work is identifiable on the current PLAN.md + phase reports. Next steps
require the orchestrator to run Tier-2 browser/live proofs and record new
defects for the executor queue.
