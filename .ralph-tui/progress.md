# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Cross-app relation owned by the consumer (A2E apps):** the consuming app declares both sides — a standalone `defineField` FK on the provider's object (with `objectUniversalIdentifier` hardcoded to the provider object uid, since packages can't import each other's constants) plus the inverse ONE_TO_MANY on its own object. Provider installs first. Model file: `a2e-projects/src/fields/company-projects.field.ts` (standard object) and `document-project.field.ts` (sibling app object). The whole-manifest graph-walk tests must add the provider object uid to their `resolvableObjectIds` set.
- **Record-page relation list:** use the native `FIELD` widget (`type: 'FIELD'`, `configuration.fieldMetadataId` = the relation field universal identifier, `fieldDisplayMode: 'TABLE' | 'CARD'`) — the same primitive as company↔people. The manifest universal config keeps `fieldMetadataId` = the uid (server resolves it); `fieldDisplayMode: 'TABLE'` without an embedded view degrades to the inline relation list.
- **a2e-* app package gates:** `yarn typecheck && yarn lint && yarn test:unit && npx twenty dev:build .` — these apps are not Nx projects, so `npx nx lint:diff-with-main` does not apply.
- **Solo/conditional front UI:** `useIsSoloWorkspace` (`@/workspace-member/hooks/useIsSoloWorkspace`) = `currentWorkspaceMembersState.length === 1` (0 members ≠ solo). Team-only dock widgets opt in via `WorkbenchWidgetDefinition.requiresCollaborators`; gate containers/rail entries, not the presence primitives (they already no-op on empty).

---


## 2026-09-19 - US-001
- Implemented the P4.3 project↔document relation per decision D-P4.3-DOC: `document.project` M2O FK (join `projectId`, SET_NULL) as a standalone app-owned field on A2E Documents' `document` object + inverse `project.documents` O2M on the project object, both owned by A2E Projects.
- Added the project-page Documents tab (native FIELD widget on the relation, TABLE mode) and a linked-docs count chip in the project overview front component + pure projection.
- Files changed: a2e-projects `src/constants/universal-identifiers.ts`, `src/objects/project.object.ts`, new `src/fields/document-project.field.ts`, `src/page-layouts/project.page-layout.ts`, `src/lib/project-overview.ts`, `src/front-components/project-overview.front-component.tsx`, and the three lib specs (`project-object-integrity`, `task-field-integrity`, `project-overview`).
- **Learnings:**
  - `project-object-integrity.test.ts` and `task-field-integrity.test.ts` both walk the project object's fields, so a new relation must be registered in BOTH (field path + external provider object id in the resolvable set) or the symmetry/target-resolution tests fail.
  - The manifest universal config for a FIELD widget keeps `fieldMetadataId` = the field's universal identifier (not a transformed `…UniversalIdentifier` key) — `from-page-layout-widget-configuration-to-universal-configuration.util.ts` maps stored ids to uids under that same key.
  - No workspace preset currently lists A2E Projects, so the "Documents before Projects" install-order rule needs no change yet; it becomes the caller's contract when Projects joins a preset.
---

## 2026-09-19 - US-002
- Implemented P10 solo onboarding polish: a one-member workspace now hides team presence UI instead of rendering an empty team shell. Predicate is the loaded member list (`currentWorkspaceMembersState.length === 1`), so 1-user presets (INDIVIDUAL/STUDENT) and any single-member workspace both qualify, and an unloaded `[]` stays non-solo (no hidden-UI flash).
- New `useIsSoloWorkspace` hook (+ pure `isSoloWorkspace` util) in the `workspace-member` module; wired it into the workbench dock (new `requiresCollaborators` widget flag, `presence` marked, solo omits team-only widgets), the side-panel top bar, and the chat conversation header (presence avatars + typing indicator hidden).
- Files changed: new `workspace-member/{utils/isSoloWorkspace.ts, hooks/useIsSoloWorkspace.ts, utils/__tests__/isSoloWorkspace.test.ts}`, `workbench-dock/registry/workbenchWidgetRegistry.ts`, `workbench-dock/components/WorkbenchWidgetDock.tsx` (+ test), `side-panel/components/SidePanelTopBar.tsx` (+ test), `chat/components/ChatChannelConversation.tsx`.
- **Learnings:**
  - `npx nx lint:diff-with-main twenty-front` diffs `main...HEAD`, so uncommitted edits always report "No changed files" — the real front gate is direct `npx oxlint --type-aware -c .oxlintrc.json <files>` + `npx oxfmt --check <files>` (run from `packages/twenty-front`), with `npx tsgo -p tsconfig.json --noEmit` tolerating the 6 documented `front-components` AppPath baseline errors.
  - Existing `RealtimePresenceAvatarStack`/`RealtimeTypingIndicator` already no-op on empty input; the clutter is the widget/rail entry and header slots, so the conditional must gate the container, not the primitive.
  - `WorkbenchWidgetDefinition` is the shared extension point between the dock and the Home dashboard (`registerHomeDashboardWidgets` re-registers `tasks`/`activity`), so adding an optional capability flag there (not an id check in the dock) is the non-duplicating way to degrade team widgets.
---
