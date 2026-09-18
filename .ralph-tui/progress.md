# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **a2e-* app manifest tests** live in `src/lib/__tests__/*.test.ts`, run with `node --test --experimental-strip-types`. Import each declarable module and `assert.equal(module.default.success, true)` before reading `module.default.config`; view/page-layout/widget/nav/role configs all come back on `config`. Native standard field ids for views resolve via `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS[object].fields[name].universalIdentifier` — do not import twenty-shared into the standalone app.
- **a2e-* quality gates**: `yarn test:unit` + `yarn typecheck` + `yarn lint` + `npx twenty dev:build .`. `npx nx lint:diff-with-main <app>` reports "Cannot find project" (apps are not Nx projects); format `src/lib/**` with a lib-inclusive oxfmt config because the root `.oxfmtrc.jsonc` ignores `**/lib/**`.
- **a2e-projects view contract**: a KANBAN view's `mainGroupByFieldMetadataUniversalIdentifier` must be the app field id you intend (e.g. `TASK_FIELD_IDS.projectStatus`, not the native task `status`), and `groups[].fieldValue` must equal the target SELECT option *values*. Project-scope a task view with `ViewFilterOperand.IS_NOT_EMPTY` + `value: ''` on the relation field. Existing views can pass the manifest graph-walk yet group by the wrong field — assert the semantic target in a focused unit test, don't rely on reference-resolution alone.
- **a2e-projects calendar view contract**: a `ViewType.CALENDAR` view places records by `calendarFieldMetadataUniversalIdentifier` (must be the intended date field, e.g. native task `dueAt`) with `calendarLayout` (`ViewCalendarLayout.MONTH`); it renders on the native record-calendar grid and only displays — declaring one creates no provider event/invitation (P4C.5 owns sync). The existing graph walk resolves the calendar field but cannot catch a missing project scope: assert `calendarFieldMetadataUniversalIdentifier === dueAt` and the `IS_NOT_EMPTY` project filter explicitly. Task-view filter uids continue `c31b0100-0005-…`.

---


## 2026-09-18 - P4.1-project-object-validation
- Extended the manifest graph-walk (P4.1 task-field-integrity precedent) to the whole app surface: new `project-object-integrity.test.ts` walks 6 objects + 55 fields + 8 views + 1 page-layout + 2 nav items + 1 role and asserts 0 duplicate universal identifiers, 0 unresolved relation targets, 0 inverse-ownership mismatches, every view-field/sort/filter/group-by/calendar field and page-layout widget resolves, exactly one projectMember/milestone/timeEntry object, one least-privilege default role, and budget/spent stay CURRENCY-only.
- Files changed: `src/lib/__tests__/project-object-integrity.test.ts` (new, 10 tests), `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - The SDK's `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS` runtime values carry `.fields` maps (`{ fieldName: { universalIdentifier } }`), so a test can resolve view references to native task/note/company fields without importing twenty-shared. The existing task-field-integrity test cast away that shape; it is the real source of truth.
  - App package gates: `yarn test:unit`, `yarn typecheck`, `yarn lint`, `npx twenty dev:build .`; `npx nx lint:diff-with-main a2e-projects` always says "Cannot find project" (not an Nx project). Root `.oxfmtrc.jsonc` ignores `**/lib/**`, so formatting a lib test needs a lib-inclusive config copy passed with `-c`.
  - The built `.twenty/output/manifest.json` flattens page-layout tabs and view fields; a python walk of it is a cheap extra install-shape proof (0 dups, 0 unresolved target fields).
---

## 2026-09-18 - P4.2-board-view
- Audited the pre-existing `task-board.view.ts` (KANBAN on task) and found it grouped by the native task `status`, not the app `taskProjectStatus` select, with no project scoping — acceptance-invalid despite existing. Corrected the group-by target to `TASK_FIELD_IDS.projectStatus`, switched the project column to `TASK_FIELD_IDS.project`, added an `IS_NOT_EMPTY` filter on the task→project relation, and kept the TODO/IN_PROGRESS/DONE groups.
- Files changed: `src/views/task-board.view.ts`, new `src/lib/__tests__/task-board.test.ts` (5 tests), `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - A committed view can look valid (KANBAN, resolvable field references) yet violate acceptance: the existing graph walk resolves whatever field id is present, so it cannot catch "grouped by the wrong status field". Assert the semantic target (`mainGroupBy === TASK_FIELD_IDS.projectStatus`) explicitly.
  - Kanban view contract: `mainGroupByFieldMetadataUniversalIdentifier` is the group-by field; `groups[].fieldValue` must equal the target SELECT option *values* (TODO/IN_PROGRESS/DONE), not option ids. `shouldHideEmptyGroups` is optional.
  - Project scoping a task view reuses `ViewFilterOperand.IS_NOT_EMPTY` on the relation field with `value: ''` (server tooling documents `""` for IS_EMPTY/IS_NOT_EMPTY). Filter universal ids for task views continue the `c31b0100-0005-…` sequence.
---

## 2026-09-18 - P4.2-calendar-view
- Audited the pre-existing `task-calendar.view.ts` (native CALENDAR on the standard task object by native `dueAt`, MONTH layout) and found it was NOT acceptance-complete: no project scope (only `status IS_NOT DONE`), so it showed every open task workspace-wide, and the object id was hardcoded. Added the required `IS_NOT_EMPTY` + `value: ''` filter on the task→project relation (mirroring the board), switched the project column/filter to `TASK_FIELD_IDS.project` and the object to `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier`. View-only: no provider event/invitation.
- Files changed: `src/views/task-calendar.view.ts`, new `src/lib/__tests__/task-calendar.test.ts` (4 tests), `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - A committed CALENDAR view can resolve (graph walk green) yet violate acceptance by lacking project scope. Assert `calendarFieldMetadataUniversalIdentifier === native dueAt` + the `IS_NOT_EMPTY` project filter semantically, not just reference resolution.
  - Native task date field used for calendar placement is `20202020-fd99-40da-951b-4cb9a352fce3` (`dueAt`); task-view filter uids continue `c31b0100-0005-…` (calendar project filter = `…0005`).
  - Displaying a due date is purely a view declaration — no logic function or provider call, so the P4.3/P4C.5 boundary holds by construction.
---
