# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

---

## 2026-09-17 - US-001
- Drift-audited `docs/plan/05-template-contracts.md` against source at `91cb20a9`; appended a header audit note and 4 dated in-place corrections (preserving prior text).
- Corrections: §3 lists only 2 of 3 app packages (a2e-projects 0.1.1 missing); §4 shows positive `selectedAppUniversalIdentifiers` but source implements negative `deselectedOptionalAppUniversalIdentifiers`; §2/§5/§8 claim the `seed-samples` step is a spec-only future seeder, while source now delegates to app post-install hooks that run async and seed 0 rows live (documented as a P1.6b obligation).
- Files changed: `docs/plan/05-template-contracts.md`, `docs/plan/phases/phase-01-report.md` (+ this file).
- **Learnings:**
  - The `a2e-accounting 0.1.1` seen in phase-report logs is a **reverted scratch version** (report line 628) — the on-disk/real version is 0.1.0. Do not trust report prose for version claims; read `package.json`.
  - `seed-samples` reports `succeeded` purely from the presence of `postInstallLogicFunction` in the registration manifest (`resolveSampleSeedingStep`), so it over-reports: the hook is `shouldRunSynchronously: false` and fails silently live. Treat the step status as unverified until a Tier-2 reinstall proves rows land.
  - No app→app dependency field exists in the SDK manifest (`ApplicationConfig` / `ApplicationManifest`) — §3/§8's "flat ordering" claim holds; app relations are only inferred at uninstall time.
  - `docs/scripts/check-docs.mjs` is the cheap gate for doc edits (links + fences); run it before and after.
---
