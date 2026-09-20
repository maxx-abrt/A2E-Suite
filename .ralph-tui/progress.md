# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Detect Apollo permission denials with `isGraphqlErrorOfType(error, 'FORBIDDEN')`** (`twenty-front/src/utils/is-graphql-error-of-type.util.ts`). It handles Apollo v4 `CombinedGraphQLErrors` (`.errors[0].extensions`) as well as plain `{extensions}`/`{code}` shapes; do NOT read `error.graphQLErrors` directly — v4 mutation errors do not expose that property, so a manual check silently falls through to "network error".
- **Template preview/apply error vocabulary is mirrored by hand** between `twenty-server/.../onboarding/types/apply-template-operation.types.ts` and `twenty-front/.../a2e-workspace/types/apply-template-operation.types.ts`; the GraphQL DTO enum registers by MEMBER NAME (wire value == member name). The front union may add client-only codes (`NETWORK_ERROR`) that the server enum omits.
- **App-owned additive task relations follow the `parentTask`/`subtasks` shape**: add a NEW MANY_TO_ONE field on the standard task (join column, SET_NULL) + its ONE_TO_MANY inverse `defineField`, with fresh universal identifiers only. Cycle guards for these self-relations stay injected-free synchronous libs over a `Map<taskId, linkedId>` (`lib/task-tree.ts`, `lib/task-dependencies.ts`) so `node --test --experimental-strip-types` covers them without a server. Never rename/retarget a committed, installed relation (`blockIssue` is task➜note and stays that way).
- **Local calendar events are channel-less standard `calendarEvent` rows.** There is no second store: the provider-independent create path is the generic record UI, opened by `isUICreatable: true` on the object + `isUIEditable: true` on the content fields (provider-synced fields stay false), and the read filter is the pure `resolveCalendarEventVisibility` (creator = owner FULL, others REDACTED reusing the METADATA default). Existing workspaces do **not** auto-resync standard UI flags — ship a `2-39-workspace-command-…` UPDATE on `core.objectMetadata`/`core.fieldMetadata` (pattern of the 2-13 `sync-standard-ui-capability-flags` command). A calendar post-query hook splice IS honoured for `findMany` but a findOne payload mutation is not reflected in the response, so test local visibility through `findMany`.

---

## 2026-09-20 - US-047
- Implemented the P1.6c distinct-error-surface leg: additive `ApplyTemplateErrorCode` (`PERMISSION_DENIED` | `NO_APPS_AVAILABLE` server-side, `+ NETWORK_ERROR` client-side), a `TemplatePreview.errorCode` discriminator the server sets only when a template expects apps but none are registered, and a shared front classifier `getWorkspaceTemplateSetupErrorCode`.
- `A2eWorkspaceTemplatePreview` now renders three distinct panels (`…-permission-denied` / `…-network-error` / `…-no-apps-available`) plus a distinct apply-error banner instead of the single "Preview unavailable" panel; `useWorkspaceTemplatePreview` exposes `refetch`, `useApplyWorkspaceTemplateOperation` exposes `operationErrorCode` + distinct snackbars. Template choice is never discarded.
- Files changed: server onboarding types/DTO/service + service spec; front a2e-workspace types, new classifier + spec, preview component + spec, picker spec, both hooks + apply hook spec, preview query document.
- **Learnings:**
  - Apollo v4 wraps GraphQL errors in `CombinedGraphQLErrors` (`.errors`, not `.graphQLErrors`); reuse `isGraphqlErrorOfType`.
  - `TemplatePreview` has no committed generated GraphQL schema here — the front query is a hand-written `gql` document, so an additive server field needs a matching hand-written selection + a Tier-2 `graphql:generate` later.
  - `npx nx lint:diff-with-main` diffs `main...HEAD`, so it prints "No changed files." on an uncommitted slice; run `npx oxlint --type-aware` / `npx oxfmt --check` on the touched files directly for real coverage.
---


## [2026-09-20] - US-048
- Verified the P3.4 native-primitive/license feasibility check already exists (performed 2026-09-18 as `P3.4-feasibility-spike`, committed `7c372028`): artifact `docs/plan/p3.4-advanced-authoring-feasibility.md`, indexed in README and registered in `check-docs.mjs`.
- Met every acceptance bullet (six-block matrix with native primitive + license + verdict, PDF/DOCX-required vs ODT-deferred, advanced-controls/reference-package constraints, per-block round-trip obligation, explicit defers, Inspiration-apps boundary). No new product code.
- Files changed: `docs/plan/phases/phase-03-report.md` (done-for-review entry), `.ralph-tui/progress.md` (this entry).
- **Learnings:**
  - A report-only slice can already be complete under a differently-named prior entry (`P3.4-feasibility-spike` vs PRD `US-048`); check the phase report for an equivalent done-for-review before doing new work.
  - `check-docs.mjs` maintains a `MAINTAINED_DOCUMENTS` list — a new findings doc is only covered by the gate if registered there; the P4C.1/P3.4 precedent also adds a `docs/README.md` index row.
---

## [2026-09-20] - US-049
- Recorded the dependency-edge decision FIRST in `phase-04-report.md`: the edge is a NEW additive `task.blockedBy` self-relation, not the note-targeting `blockIssue`; then implemented it.
- Added `task-blocked-by.field.ts` (task➜task M2O, join `blockedById`, SET_NULL) + `task-blocks.field.ts` (O2M inverse), new universal identifiers, and a pure `lib/task-dependencies.ts` cycle guard (self/two-node/deep/valid-chain) with 9 `node --test` cases.
- Built the `task-dependencies` front component (Cmd+K "A2E Projects : dépendances") that refuses cyclic choices before the `updateTask` mutation, plus its command-menu item. Reused the untouched nested-list slice (`task-tree.ts`/`task-subtasks`).
- Files changed: a2e-projects `src/constants/universal-identifiers.ts`; NEW `src/fields/task-blocked-by.field.ts`, `src/fields/task-blocks.field.ts`, `src/lib/task-dependencies.ts`, `src/lib/__tests__/task-dependencies.test.ts`, `src/front-components/task-dependencies.front-component.tsx`, `src/command-menu-items/open-dependencies.command-menu-item.ts`; `src/lib/__tests__/{task-field-integrity,project-object-integrity,command-availability}.test.ts`; `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - `blockIssue` is task➜note (join `blockIssueId`), so it cannot express a task-to-task edge; the P4.2 picker needs its own self-relation. Additive-only law forbids retargeting the installed field.
  - `twenty dev:build .` scans `src/` automatically for standalone `defineField`/`defineFrontComponent`/`defineCommandMenuItem` defaults — new files need no central registry, but the integrity tests keep explicit `FIELD_MODULE_PATHS`/command lists, which must be updated or the new relations go uncovered.
  - The dependency graph direction matters: adding `T.blockedBy = C` cycles iff walking `C`'s blocker chain reaches `T`; a task at the top of a chain has no dependents, so many candidates stay legal.
---

## [2026-09-20] - US-050
- Implemented the P4C.2a server/core local calendar-event path: standard `calendarEvent` is now UI-creatable and its 7 content fields UI-editable (provider metadata stays read-only), so the generic record CRUD is a provider-independent local create path.
- Fixed the channel-less read filter: extracted pure `resolveCalendarEventVisibility` (SHARE → owned → METADATA → local creator FULL/others REDACTED → HIDDEN), wired it into `ApplyCalendarEventsVisibilityRestrictionsService` (now resolves the creator actor and hoists channel ownership) and gave the timeline service creator-full for local events.
- Added additive workspace command `2-39-workspace-command-1789903000000-enable-standard-calendar-event-ui` (flags for existing workspaces) + standard-metadata assertions; new integration regression spec proves a created channel-less event is returned to its creator.
- Files changed: `twenty-server/src/modules/calendar/common/{utils/resolve-calendar-event-visibility.util.ts,+spec,standard-objects/calendar-event.workspace-entity.ts,query-hooks/calendar-event/**}`; `src/engine/core-modules/calendar/timeline-calendar-event.service.ts`; `twenty-standard-application/utils/**` (object/field metadata + spec); `2-39/**` (new command + module); `test/integration/graphql/suites/calendar/calendar-event-local-visibility.integration-spec.ts`; `docs/plan/phases/phase-04-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - `isUICreatable`/`isUIEditable` are UI-affordance flags in `core.objectMetadata`/`core.fieldMetadata`; flipping the standard definitions only affects new workspaces — existing ones need an explicit workspace upgrade command (standard metadata is not auto-resynced). In version order, the historical 2-13 backfill (`calendarEvent` forced non-creatable) runs first, so the 2.39 command is the last writer.
  - A calendar post-query hook splice is honoured for `findMany` but not observable on a `findOne` payload mutation (pre-existing); the gap-2 fix therefore targets `findMany`.
  - Local events are identified by the absence of a `calendarChannelEventAssociation`; an association that cannot be resolved to a channel still hides (unchanged), so `hasChannelAssociation` must be tracked separately from the resolved channel accesses.
---
