# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Cross-app relation owned by the consumer (A2E apps):** the consuming app declares both sides — a standalone `defineField` FK on the provider's object (with `objectUniversalIdentifier` hardcoded to the provider object uid, since packages can't import each other's constants) plus the inverse ONE_TO_MANY on its own object. Provider installs first. Model file: `a2e-projects/src/fields/company-projects.field.ts` (standard object) and `document-project.field.ts` (sibling app object). The whole-manifest graph-walk tests must add the provider object uid to their `resolvableObjectIds` set.
- **Record-page relation list:** use the native `FIELD` widget (`type: 'FIELD'`, `configuration.fieldMetadataId` = the relation field universal identifier, `fieldDisplayMode: 'TABLE' | 'CARD'`) — the same primitive as company↔people. The manifest universal config keeps `fieldMetadataId` = the uid (server resolves it); `fieldDisplayMode: 'TABLE'` without an embedded view degrades to the inline relation list.
- **a2e-* app package gates:** `yarn typecheck && yarn lint && yarn test:unit && npx twenty dev:build .` — these apps are not Nx projects, so `npx nx lint:diff-with-main` does not apply.
- **Solo/conditional front UI:** `useIsSoloWorkspace` (`@/workspace-member/hooks/useIsSoloWorkspace`) = `currentWorkspaceMembersState.length === 1` (0 members ≠ solo). Team-only dock widgets opt in via `WorkbenchWidgetDefinition.requiresCollaborators`; gate containers/rail entries, not the presence primitives (they already no-op on empty).
- **Per-user dismissible front state:** persist a `Record<userId, string[]>` in a `createAtomState({ useLocalStorage: true })` and keep the add/remove/select logic as pure helpers; the hook selects with `currentUserState.id` and treats a null user as a no-op. Avoids a server schema change and survives reload, while a shared browser never leaks one member's hidden UI to another.
- **Browser-local display preferences (no migration):** one `createAtomState({ useLocalStorage: true, localStorageOptions: { getOnInit: true }, validateInitFn })` + a `useXPreferences` hook of clamped setters + pure `sanitize`/`isValid` utils; publish attributes on `document.documentElement` from one `*ProviderEffect` mounted in `WorkspaceAppProviders` and consume them in `index.css`. Keeps optional P10 preferences out of the workspace-member schema.
- **base-ui `Switch` in jsdom:** `Toggle`/`Switch` forwards a root click to a synthetic `PointerEvent` on a hidden checkbox; jsdom lacks `PointerEvent`, so a spec that clicks a toggle must alias `window.PointerEvent = MouseEvent` (and query `getByRole('switch', { name })`).

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

## 2026-09-19 - US-003
- Implemented the habits/Pomodoro piece of the P10 personal dashboard: a new `focus` Home widget on the existing workbench registry — 25-minute Pomodoro countdown, start/pause/reset, and a derived "N of 4 focus sessions today" habit row (a completed session is the habit notch, so no separate habit store/object was introduced).
- Added `home-dashboard/{utils/pomodoroTimer.ts, components/PomodoroWidget.tsx, components/PomodoroWidgetContent.tsx}` (+ 6-test suite, story) and registered `focus` (IconClockPlay, order 52) in `registerHomeDashboardWidgets.ts`; added the `focus` title in `DefaultWorkbenchWidgetContent.tsx`.
- Files changed: twenty-front `home-dashboard/{utils,components,__tests__,components/__stories__}`, `registerHomeDashboardWidgets.ts`, `workbench-dock/components/DefaultWorkbenchWidgetContent.tsx`, `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`.
- **Learnings:**
  - The Home dashboard is a set of `WorkbenchWidgetDefinition`s registered by `registerHomeDashboardWidgets()` (imported for side effect by `WorkbenchWidgetDock`); new Home widgets only need a registry entry + a `getWorkbenchWidgetTitle` case — no dock change. Use `IconClockPlay` for focus (no timer/clock concept in the icon dictionary; rule 5 = pick an existing icon).
  - The container/hook timer is the only place a `useEffect` + `setInterval` is warranted here; keep the presentational `*WidgetContent` callback-driven (`onStart/onPause/onReset`) so it is testable with `fireEvent`, and test the ticking container with `jest.useFakeTimers()` + `act`.
  - `npx nx lint:diff-with-main twenty-front` can only see committed diffs (`main...HEAD`) and reports "No changed files" for uncommitted work — run `npx oxlint --type-aware -c .oxlintrc.json <files>` + `npx oxfmt --check <files>` from `packages/twenty-front` instead; the repo forbids JSX prop spreading in tests.
---

## 2026-09-19 - US-004
- Implemented the P10 guided first-open help as a non-modal workbench dock widget (id `help`, order 5): contextual "Get started" actions resolved from the current route (Documents / Tasks / Workspace), dismissible explanation cards, and a search box that filters topics across title/body/keywords (diacritic-insensitive).
- Help content uses R15's explanatory patterns only — `FEATURE_EXPLANATION` / `COMPARISON` / `FAQ` — with no pricing, plan, availability or mock-data claims. Dismissals persist per user in a localStorage atom map keyed by `currentUser.id`.
- Files changed: new `packages/twenty-front/src/modules/first-open-help/` (types, constants, utils, states, hooks, components, register + 6 specs); `workbench-dock/components/WorkbenchWidgetDock.tsx` (side-effect import); `workbench-dock/components/DefaultWorkbenchWidgetContent.tsx` (`help` title); `docs/plan/phases/phase-10-report.md`; `.ralph-tui/progress.md`.
- **Learnings:**
  - The repo's oxlint custom rules bite in two places: `twenty(max-consts-per-file)` allows only ONE non-function `const` per file under `constants/` (so kind-label map and topic list must be separate files), and `twenty(matching-state-variable)` forces the `useAtomState` destructure names to mirror the atom name (`dismissedFirstOpenHelpTopicsState` → `[dismissedFirstOpenHelpTopics, setDismissedFirstOpenHelpTopics]`).
  - `twenty-ui/input`'s `SearchInput` renders fine under jsdom/base-ui and is queryable by placeholder; no manual normalizer needed — reuse `~/utils/normalizeSearchText`.
  - Contextual actions should only NAVIGATE (`useNavigate` to `AppPath.Drive`/`TasksPage`/`/objects/projects`), not re-implement P1.6e's template instantiation; the document-template gallery/entrypoint stays the single source.
---

## 2026-09-19 - US-005
- Implemented the P10 focus/accessibility preferences: a persistent, explicit user-control surface in Settings → Experience → "Focus and readability" for density (Comfortable/Compact), easy-read, Pomodoro focus duration + daily session target, and a keyboard-shortcuts toggle.
- Pomodoro "wrapping, not forking": the shipped `focus` widget now reads duration/target from the preference atom, so its clock and "N of M focus sessions" row follow the user's choice. `shortcutsEnabled` gates `currentGlobalHotkeysConfigSelector` when the focus stack is empty. Density/easy-read publish `data-a2e-density` / `data-a2e-easy-read` on the root; `index.css` widens body text for easy-read and defines `--a2e-density-gap-scale`, consumed by `HomeWidgetList`.
- Files changed: new `packages/twenty-front/src/modules/focus-preferences/` (types, 5 constants files, sanitize/clamp utils + test, localStorage state, hook, provider effect, settings component + test); new `ui/utilities/focus/states/__tests__/currentGlobalHotkeysConfigSelector.test.ts`; modified `home-dashboard/components/{PomodoroWidget,HomeWidgetList}.tsx`, `home-dashboard/components/__tests__/PomodoroWidget.test.tsx`, `ui/utilities/focus/states/currentGlobalHotkeysConfigSelector.ts`, `app/components/WorkspaceAppProviders.tsx`, `pages/settings/profile/appearance/components/SettingsExperience.tsx`, `src/index.css`.
- **Learnings:**
  - `twenty-ui/icon` exports a curated set: `IconKeyboard` is NOT exported even though it exists in `AllIcons`; the icon dictionary maps `IconCommand` to the command/keyboard concept. `IconTextSize` is exported and fits easy-read.
  - `constants/*.ts` may hold only ONE `const` (`twenty(max-consts-per-file)` max 1), so defaults/bounds/presets live in separate files.
  - Preferences that are optional polish stay browser-local: a workspace-member column would have forced a server migration for display-only state. Use localStorage + a root-attribute provider effect instead.
  - `atomWithStorage` atoms can be read from a `createAtomSelector` via the `get` helper, which is how the shortcuts preference reaches the global hotkeys config without a parallel system.
---
