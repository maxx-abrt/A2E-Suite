# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- A2E app registration is guarded by a single front parity spec: `packages/twenty-front/src/modules/a2e-workspace/constants/__tests__/A2eSuiteApplicationUniversalIdentifiers.test.ts` reads the real `packages/twenty-apps/internal/a2e-*` sources and asserts each app is in the allowlist, onboarding list, Dockerfile COPY and build loop. Add a new `a2e-*` app → this spec fails until all four lists include it. Extend discovery, never copy the list.

---

## 2026-09-28 - US-086
- What was implemented: nothing new — the slice was already implemented and committed at `fe3623a1` (ancestor of HEAD `875671a4`); re-verified and reported `done-for-review`.
- Files changed: none (report entries only: `docs/plan/phases/phase-01-report.md`, `.ralph-tui/progress.md`).
- **Learnings:**
  - Before starting, grep `docs/plan/phases/phase-<NN>-report.md` for the task id — a prior `done-for-review` entry means the slice is handled; do not redo.
  - The A2E app drift guard is a single parity spec reading real sources; verified green 4/4 via `npx jest ... --config=packages/twenty-front/jest.config.mjs`.
---

## 2026-09-28 - US-087
- What was implemented: nothing new — the slice was already implemented and committed (ancestor of HEAD `3f3d2e74`); re-verified and reported `done-for-review`.
- Files changed: none (report entries only: `docs/plan/phases/phase-01-report.md`, `.ralph-tui/progress.md`).
- **Learnings:**
  - `entrypoint.sh` provisioning is tri-state: `DISABLE_BUNDLED_APP_PROVISIONING=true` skips, `=false` forces even when migrations are out-of-band, unset follows `DISABLE_DB_MIGRATIONS`. All compose workers set `true`; all servers pass `${DISABLE_BUNDLED_APP_PROVISIONING:-}`.
  - The deployment contract is pinned by `packages/twenty-server/src/database/commands/__tests__/provision-bundled-apps.deployment.spec.ts` (runs the real entrypoint under `/bin/sh` with stubbed `yarn`/`psql` + manifest guards) — green 15/15.
---

