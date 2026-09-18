# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **a2e-* app manifest tests** live in `src/lib/__tests__/*.test.ts`, run with `node --test --experimental-strip-types`. Import each declarable module and `assert.equal(module.default.success, true)` before reading `module.default.config`; view/page-layout/widget/nav/role configs all come back on `config`. Native standard field ids for views resolve via `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS[object].fields[name].universalIdentifier` — do not import twenty-shared into the standalone app.
- **a2e-* quality gates**: `yarn test:unit` + `yarn typecheck` + `yarn lint` + `npx twenty dev:build .`. `npx nx lint:diff-with-main <app>` reports "Cannot find project" (apps are not Nx projects); format `src/lib/**` with a lib-inclusive oxfmt config because the root `.oxfmtrc.jsonc` ignores `**/lib/**`.

---


## 2026-09-18 - P4.1-project-object-validation
- Extended the manifest graph-walk (P4.1 task-field-integrity precedent) to the whole app surface: new `project-object-integrity.test.ts` walks 6 objects + 55 fields + 8 views + 1 page-layout + 2 nav items + 1 role and asserts 0 duplicate universal identifiers, 0 unresolved relation targets, 0 inverse-ownership mismatches, every view-field/sort/filter/group-by/calendar field and page-layout widget resolves, exactly one projectMember/milestone/timeEntry object, one least-privilege default role, and budget/spent stay CURRENCY-only.
- Files changed: `src/lib/__tests__/project-object-integrity.test.ts` (new, 10 tests), `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - The SDK's `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS` runtime values carry `.fields` maps (`{ fieldName: { universalIdentifier } }`), so a test can resolve view references to native task/note/company fields without importing twenty-shared. The existing task-field-integrity test cast away that shape; it is the real source of truth.
  - App package gates: `yarn test:unit`, `yarn typecheck`, `yarn lint`, `npx twenty dev:build .`; `npx nx lint:diff-with-main a2e-projects` always says "Cannot find project" (not an Nx project). Root `.oxfmtrc.jsonc` ignores `**/lib/**`, so formatting a lib test needs a lib-inclusive config copy passed with `-c`.
  - The built `.twenty/output/manifest.json` flattens page-layout tabs and view fields; a python walk of it is a cheap extra install-shape proof (0 dups, 0 unresolved target fields).
---
