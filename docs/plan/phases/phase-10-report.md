# Phase 10 — Individual Mode & Polish

CLAIMED — US-002/solo-presence-degrade — deepseek-v4.1-flash — 2026-09-19T10:19:32Z — base 8debd2e2b8caabeff6c7556a34e72108759b84c7

## 2026-09-19 10:34 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-002 P10: Solo onboarding polish — 1-user presets hide team UI · **Slice:** the task's single bullet — team presence surfaces degrade for a one-member workspace
**Claim:** done-for-review
**Ready-to-tick:** yes — every applicable Tier-0 gate is green; the only absent evidence is the Tier-2 E12 solo journey, which the executor contract forbids and the orchestrator owns
**Base:** 8debd2e2b8caabeff6c7556a34e72108759b84c7
**Changed:** `packages/twenty-front/src/modules/workspace-member/utils/isSoloWorkspace.ts` (new), `.../workspace-member/hooks/useIsSoloWorkspace.ts` (new), `.../workspace-member/utils/__tests__/isSoloWorkspace.test.ts` (new), `.../workbench-dock/registry/workbenchWidgetRegistry.ts` (`requiresCollaborators` flag + `presence` marked), `.../workbench-dock/components/WorkbenchWidgetDock.tsx` (omit team-only widgets when solo), `.../workbench-dock/components/__tests__/WorkbenchWidgetDock.test.tsx`, `.../side-panel/components/SidePanelTopBar.tsx`, `.../side-panel/components/__tests__/SidePanelTopBar.test.tsx`, `.../chat/components/ChatChannelConversation.tsx`, `docs/plan/phases/phase-10-report.md` (new), `.ralph-tui/progress.md`
**Checks:** `npx jest .../isSoloWorkspace.test.ts .../WorkbenchWidgetDock.test.tsx .../SidePanelTopBar.test.tsx --config=packages/twenty-front/jest.config.mjs` → 3 suites / 21 tests PASS; `npx jest src/modules/workbench-dock src/modules/home-dashboard src/modules/realtime src/modules/workspace-member` → 19 suites / 54 tests PASS; `npx jest src/modules/side-panel/components src/modules/chat/components` → 9 suites / 60 tests PASS; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → only the 6 documented `front-components` AppPath baseline errors, 0 from touched files; `npx oxlint --type-aware -c .oxlintrc.json <9 touched files>` → 0 warnings / 0 errors; `npx oxfmt --check <same>` → clean after `oxfmt` fixed one test file; `npx nx lint:diff-with-main twenty-front` → "No changed files." (target diffs `main...HEAD`, so the direct oxlint/oxfmt run is the covering gate); `node docs/scripts/check-docs.mjs` → PASS
**Missing for tick:** Tier-2 E12 solo-usability journey in the running app (a real 1-user workspace shows no presence widget/widget rail entry, header or chat avatars; inviting a 2nd member restores them) — orchestrator-only, no browser proof here.
**Do not redo:** the predicate is `currentWorkspaceMembersState.length === 1` (0 members = not solo, so the initial load never flashes hidden UI); `requiresCollaborators` on the widget registry is the reuse point — opt new/HOME/app team widgets in via the flag instead of hardcoding widget-id checks; presence components already return null on empty input.
**Remaining:** 6 other [ ] tasks in the P10 batch (US-003..007) plus the P9/app-search US-008..015 batch II
**Next:** US-003 personal dashboard (contribution grid already shipped in P8.2 — do not rebuild; open: habits/Pomodoro widget, journal template, quick capture) extending the existing Home widget registry.

CLAIMED — US-003/personal-dashboard — deepseek-v4.1-flash — 2026-09-19T10:23:40Z — base 3b4b2be24be8ea606fa0277d3ce795b983c8f421

## 2026-09-19 10:27 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-003 P10: Personal dashboard — contribution grid, habits/Pomodoro widget, journal doc template, quick capture · **Slice:** first unmet sub-item — habits/Pomodoro widget (contribution grid already shipped by P8.2, left untouched)
**Claim:** partial
**Ready-to-tick:** no — one of the four dashboard deliverables is done; the journal doc template and the Cmd+K quick capture remain
**Base:** 3b4b2be24be8ea606fa0277d3ce795b983c8f421
**Changed:** `packages/twenty-front/src/modules/home-dashboard/utils/pomodoroTimer.ts` (new), `.../utils/__tests__/pomodoroTimer.test.ts` (new), `.../components/PomodoroWidget.tsx` (new), `.../components/PomodoroWidgetContent.tsx` (new), `.../components/__tests__/PomodoroWidget.test.tsx` (new), `.../components/__tests__/PomodoroWidgetContent.test.tsx` (new), `.../components/__stories__/PomodoroWidget.stories.tsx` (new), `.../registerHomeDashboardWidgets.ts` (register `focus` widget), `.../__tests__/registerHomeDashboardWidgets.test.ts`, `.../workbench-dock/components/DefaultWorkbenchWidgetContent.tsx` (`focus` title), `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`
**Checks:** `npx jest src/modules/home-dashboard --config=packages/twenty-front/jest.config.mjs` → 14 suites / 41 tests PASS (incl. 6 new); `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → only the 6 documented `front-components` AppPath baseline errors, 0 from touched files (grepped home-dashboard/workbench-dock); `npx oxlint --type-aware -c .oxlintrc.json <10 touched files>` → 0 warnings / 0 errors; `npx oxfmt --check <same>` → clean after `oxfmt` fixed 3 test files; `npx nx lint:diff-with-main twenty-front` → "No changed files." (target diffs `main...HEAD`, so the direct oxlint/oxfmt run is the covering gate)
**Missing for tick:** journal doc template (a2e-documents starter bundle) and quick capture Cmd+K → note/task/income; Tier-2 browser proof of the widget in the running Home surface
**Do not redo:** the contribution grid and the four P8.2 Home widgets are shipped — reuse the workbench registry extension point; `focus` is now the single Pomodoro implementation (US-005's settings surface must wrap it, not fork it)
**Remaining:** 5 other open P10 tasks (US-003 remainder, US-004..007) plus the P9/app-search US-008..015 batch II
**Next:** journal doc template — append a `Modèle — Journal` entry to `packages/twenty-apps/internal/a2e-documents/src/lib/starter-templates.ts` and update `starter-templates.test.ts` (assert 5 templates / non-empty markdown), verified in `a2e-documents` with `yarn typecheck && yarn lint && yarn test:unit && npx twenty dev:build .`; then quick capture composing the existing create-task / create-document / quick-entry command-menu items rather than adding a duplicate command.

CLAIMED — US-004/first-open-help — deepseek-v4.1-flash — 2026-09-19T10:31:03Z — base 4ed2fa8a

## 2026-09-19 10:37 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-004 P10: Guided first-open help — contextual actions, dismissible explanations, searchable help · **Slice:** the task's single bullet — a non-modal first-open help dock widget
**Claim:** done-for-review
**Ready-to-tick:** yes — every applicable Tier-0 gate is green; the only absent evidence is the Tier-2 in-browser walkthrough, which the executor contract forbids and the orchestrator owns
**Base:** 4ed2fa8a
**Changed:** new `packages/twenty-front/src/modules/first-open-help/` (types/FirstOpenHelpTopic.ts, constants/FirstOpenHelpTopics.ts, constants/FirstOpenHelpTopicKindLabels.ts, constants/FirstOpenHelpLaunchActions.ts, utils/{searchFirstOpenHelpTopics,resolveFirstOpenHelpContext,dismissedFirstOpenHelpTopics}.ts, states/dismissedFirstOpenHelpTopicsState.ts, hooks/useDismissedFirstOpenHelpTopics.ts, components/{FirstOpenHelpPanel,FirstOpenHelpWidget}.tsx, registerFirstOpenHelpWidget.ts, plus 6 spec files); `.../workbench-dock/components/WorkbenchWidgetDock.tsx` (one side-effect import); `.../workbench-dock/components/DefaultWorkbenchWidgetContent.tsx` (`help` title case); `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`
**Checks:** `npx jest src/modules/first-open-help src/modules/workbench-dock --config=packages/twenty-front/jest.config.mjs` → 9 suites / 30 tests PASS; `npx jest src/modules/home-dashboard --config=packages/twenty-front/jest.config.mjs` → 14 suites / 41 tests PASS; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → only the 6 documented `front-components` AppPath baseline errors, 0 mentioning first-open-help/workbench-dock; `npx oxlint --type-aware -c .oxlintrc.json <19 touched files>` → 0 warnings / 0 errors (after splitting the two-kind-label const out of the topics constant file per `twenty(max-consts-per-file)` and renaming the hook binding per `twenty(matching-state-variable)`); `npx oxfmt`/`--check` on the same files → clean; `npx nx lint:diff-with-main twenty-front` → "No changed files." (the target diffs `main...HEAD` and this work is uncommitted, so the direct oxlint/oxfmt run is the covering gate — same substitution prior P10 entries recorded)
**Missing for tick:** Tier-2 browser proof in the running app (open the dock's "First-open help" widget: contextual template/blank action navigates to Drive / Tasks / Projects; dismissing an explanation hides it and it stays hidden after reload for the same user but reappears for a different signed-in user; search surfaces a dismissed topic) — orchestrator-only, no browser session here.
**Do not redo:** the workbench registry is the extension point (`registerWorkbenchWidget`, id `help`, order 5); the help launch actions only *navigate* to Drive/Projects/Tasks — P1.6e's gallery/first-open instantiation is consumed by reference, not duplicated; per-user dismissal is the localStorage atom `a2e-first-open-help-dismissed-topics` keyed by `currentUser.id` (userId-less sessions are a no-op, never a crash); search deliberately re-surfaces dismissed topics once a query is typed.
**Remaining:** 4 other open P10 tasks (US-003 journal/quick-capture remainder, US-005..007) plus the P9/app-search US-008..015 batch II
**Next:** orchestrator Tier-2 first-open-help widget pass then tick US-004; executors — US-003 journal doc template (`a2e-documents/starter-templates.ts` + its test) per the prior entry's Next, or US-005 focus/accessibility settings wrapping the shipped `focus` Pomodoro widget.

CLAIMED — US-005/focus-accessibility-preferences — deepseek-v4.1-flash — 2026-09-19T10:40:50Z — base 32be9c7c22f9287a7a3f545bee280e0a57a01186

## 2026-09-19 10:46 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-005 P10: Focus/accessibility preferences — Pomodoro, density/easy-read, shortcuts under explicit user control · **Slice:** the task's single bullet — a persisted, explicit user-control surface for Pomodoro, density/easy-read and shortcuts, wrapping the shipped `focus` widget
**Claim:** done-for-review
**Ready-to-tick:** yes — every applicable Tier-0 gate is green; the only absent evidence is the Tier-2 in-browser walkthrough, which the executor contract forbids and the orchestrator owns
**Base:** 32be9c7c22f9287a7a3f545bee280e0a57a01186
**Changed:** new `packages/twenty-front/src/modules/focus-preferences/` (types/FocusPreferences.ts, constants/{DefaultFocusPreferences,FocusDensities,FocusPreferenceBounds,FocusDurationPresetMinutes,FocusSessionTargetPresets}.ts, utils/focusPreferences.ts, utils/__tests__/focusPreferences.test.ts, states/focusPreferencesState.ts, hooks/useFocusPreferences.ts, components/{UserFocusPreferencesProviderEffect,FocusPreferencesSettings}.tsx, components/__tests__/FocusPreferencesSettings.test.tsx); new `.../modules/ui/utilities/focus/states/__tests__/currentGlobalHotkeysConfigSelector.test.ts`; `.../home-dashboard/components/PomodoroWidget.tsx` (duration/target from prefs); `.../home-dashboard/components/HomeWidgetList.tsx` (density scale); `.../home-dashboard/components/__tests__/PomodoroWidget.test.tsx`; `.../ui/utilities/focus/states/currentGlobalHotkeysConfigSelector.ts` (shortcutsEnabled gate); `.../app/components/WorkspaceAppProviders.tsx` (mount provider effect); `.../pages/settings/profile/appearance/components/SettingsExperience.tsx` (new Section); `src/index.css` (easy-read + density variables); `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`
**Checks:** `npx jest src/modules/focus-preferences src/modules/ui/utilities/focus/states/__tests__/currentGlobalHotkeysConfigSelector.test.ts src/modules/home-dashboard/components/__tests__/PomodoroWidget.test.tsx --config=packages/twenty-front/jest.config.mjs` → 4 suites / 15 tests PASS; `npx jest src/modules/home-dashboard src/modules/workbench-dock src/modules/settings/experience` → 17 suites / 51 tests PASS; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → only the 6 documented `front-components` AppPath baseline errors, 0 from touched files; `npx oxlint --type-aware -c .oxlintrc.json <all touched>` → 0 warnings / 0 errors; `npx oxfmt --check <all touched>` → clean after `oxfmt` fixed 6 files; `npx nx lint:diff-with-main twenty-front` → "No changed files." (the target diffs `main...HEAD` and this work is uncommitted, so the direct oxlint/oxfmt run is the covering gate — same substitution prior P10 entries recorded); `node docs/scripts/check-docs.mjs` → PASS
**Missing for tick:** Tier-2 browser proof in the running app (Settings → Experience → Focus and readability: changing density toggles `data-a2e-density` and tightens Home list spacing; enabling Easy read widens body line-height/letter-spacing; changing Pomodoro duration/target resizes the Home `focus` clock idle and habit row; turning Keyboard shortcuts off stops Cmd+K) — orchestrator-only, no browser session here.
**Do not redo:** `focus` stays the single Pomodoro implementation — `PomodoroWidget` now reads `focusPreferences.pomodoroFocusDurationMinutes/pomodoroSessionTarget` (the old `POMODORO_*` constants are unused by the widget but kept); prefs are one browser-local localStorage atom `a2e-focus-preferences` (not a workspace-member column — no server migration for an optional P10 preference); density/easy-read are published as root `data-a2e-*` attributes by `UserFocusPreferencesProviderEffect` and consumed by `index.css` + `HomeWidgetList`; `shortcutsEnabled` gates `currentGlobalHotkeysConfigSelector` only when the focus stack is empty, so focus-trap surfaces keep their own config.
**Remaining:** 3 other open P10 tasks (US-003 journal/quick-capture remainder, US-006 accessibility pass, US-007 docs) plus the P9/app-search US-008..015 batch II
**Next:** US-003 journal doc template (`a2e-documents` `starter-templates.ts` + its test) per the earlier entry's Next; US-006 then runs the keyboard/focus-trap/reduced-motion pass over the new `focus-preferences` surface.

CLAIMED — US-006/a11y-pass — deepseek-v4.1-flash — 2026-09-19T10:49:27Z — base e47fe833e61ad2b2ed8a857c98c7652e92706812

## 2026-09-19 10:53 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-006 P10: Accessibility pass — keyboard nav, focus traps, reduced motion on all new surfaces · **Slice:** the task's single bullet, scoped to the P10-new surfaces that exist (Pomodoro focus widget, first-open-help dock widget, workbench dock) — keyboard operation, non-trapping dock, reduced-motion, screen-reader semantics
**Claim:** done-for-review
**Ready-to-tick:** yes — all applicable Tier-0 gates green; the only absent evidence is Tier-2 rendering proof (focus ring, reduced-motion, region landmark) which the executor contract forbids and the orchestrator owns
**Base:** e47fe833e61ad2b2ed8a857c98c7652e92706812
**Changed:** `packages/twenty-front/src/modules/home-dashboard/components/PomodoroWidgetContent.tsx` (phase + session count are `role="status"` live regions; decorative habit dots `aria-hidden` so the count is announced once), `.../home-dashboard/components/__tests__/PomodoroWidgetContent.test.tsx` (3 new specs), `.../first-open-help/components/FirstOpenHelpPanel.tsx` (`:focus-visible` outline on the custom action buttons + `prefers-reduced-motion` kills their transition), `.../first-open-help/components/__tests__/FirstOpenHelpPanel.test.tsx` (keyboard-only spec), `.../workbench-dock/components/WorkbenchWidgetDock.tsx` (expanded panel is a labelled `region`; `prefers-reduced-motion` on the dock width transition), `.../workbench-dock/components/__tests__/WorkbenchWidgetDock.test.tsx` (keyboard expand + no-focus-trap specs), `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`
**Checks:** `npx jest <the 4 touched specs> --config=packages/twenty-front/jest.config.mjs` → 4 suites / 25 tests PASS; `npx jest src/modules/home-dashboard src/modules/first-open-help src/modules/workbench-dock --config=packages/twenty-front/jest.config.mjs` → 23 suites / 79 tests PASS; `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exactly the 6 documented `front-components` AppPath baseline errors, 0 mentioning any touched file; `npx oxlint --type-aware -c .oxlintrc.json <6 touched files>` → 0 warnings / 0 errors; `npx oxfmt --check <same>` → clean after `oxfmt` fixed 1 test file; `npx nx lint:diff-with-main twenty-front` → "No changed files." (it diffs `main...HEAD` and this work is uncommitted, so the direct oxlint/oxfmt run is the covering gate — same substitution prior P10 entries recorded); `node docs/scripts/check-docs.mjs` → PASS
**Missing for tick:** Tier-2 browser proof (keyboard-tab through the first-open-help widget shows the focus ring and Enter activates; the expanded dock exposes a "…" region landmark and no focus trap; OS reduced-motion stops the help-card border transition and dock width transition; the two Pomodoro live regions announce). Also, this pass does not cover US-003's still-missing journal template + Cmd+K quick capture: per the phase report US-003 is `partial`, so those surfaces do not exist yet — when they land they need their own keyboard/label check (they are a content template and a command-menu flow, not new docks/modals).
**Do not redo:** the dock is deliberately non-modal, so the correct behaviour is NO focus trap — the new test `does not trap focus because the dock is not a modal` locks that in; do not add a trap; `role="status"` on the Pomodoro phase label and session caption are the announcement points (the clock must stay out of a live region or it would read every second); the `focus-preferences` settings surface already passed the pass without changes — its `Select`s are labelled and its `SettingsOptionCardContentToggle`s are `getByRole('switch', { name })` labelled, so do not re-add labels there.
**Pre-existing bug found, NOT fixed (out of scope):** `WorkbenchWidgetDock.tsx` `StyledDockRoot` uses invalid CSS from its original commit (`min-workbenchwidgetdockwidth`, `workbenchwidgetdockwidth`, `@media (max-workbenchwidgetdockwidth: …)`), so the width transition the reduced-motion rule targets never fires and the <1200px overlay media queries never apply. Left untouched (layout change, not an a11y fix) — flagged for the orchestrator to schedule separately.
**Remaining:** P10 open: US-003 journal/quick-capture remainder, US-007 docs, this US-006; plus the P9/app-search US-008..015 batch II
**Next:** orchestrator Tier-2 a11y rendering pass; executors — US-003 journal doc template (`a2e-documents/src/lib/starter-templates.ts` + test) per the earlier entry's Next, or US-007 docs.

CLAIMED — US-007/docs-per-app-and-gateway — deepseek-v4.1-flash — 2026-09-19T10:58:07Z — base 61a39e7181fc7362152474ece61aca28f2ffab66

## 2026-09-19 11:14 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-007 P10: Docs — user-facing feature docs per app + self-host gateway requirements · **Slice:** the task's single bullet — per-app README feature docs + self-host gateway (ws, Redis) docs
**Claim:** done-for-review
**Ready-to-tick:** yes — docs-only change; `docs/scripts/check-docs.mjs` (the repo doc gate) and its own test are green; no package source, spec or schema changed, so package lint/typecheck/tests are N/A per the phase-report precedent
**Base:** 61a39e7181fc7362152474ece61aca28f2ffab66
**Changed:** new `packages/twenty-apps/internal/a2e-documents/README.md`, `.../a2e-projects/README.md`, `.../a2e-drive/README.md`, `.../a2e-chat/README.md`, new `docs/features.md`; `DEPLOY.md` (new "Realtime gateway requirements (WebSocket + Redis)" section); `docs/README.md` + `README.md` (link the feature guide); `docs/scripts/check-docs.mjs` (register the 5 new maintained docs); `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`
**Checks:** `node docs/scripts/check-docs.mjs` → PASS: 25 maintained documents, 198 local inline links, balanced code fences; `node --test docs/scripts/check-docs.test.mjs` → 6 tests / 6 PASS; package lint/typecheck/unit → N/A (no `.ts/.tsx` touched, so no package gate applies; app package gates unaffected by README-only additions)
**Missing for tick:** none required by the story. The READMEs describe **observed** source behavior, not runtime verification; no browser/e2e/Tier-2 check is part of US-007. If the orchestrator wants runtime proof of the gateway, that is the separate E12/realtime acceptance, not this documentation task.
**Do not redo:** a2e-accounting already has a user-facing README (left untouched); `docs/features.md` is the cross-surface index and links each app README; the self-host facts live in `DEPLOY.md` next to the existing Postgres/Redis matrix (compose pins `redis:7`, no host port, `/realtime` on the API port). Do not restate the P10 front-module work (US-002..006) as shipped product features.
**Remaining:** P10 open: US-003 journal/quick-capture remainder, US-006 (done-for-review, awaiting tick), this US-007; plus the P9/app-search US-008..015 batch II
**Next:** orchestrator tick pass for US-006/US-007 then Tier-2 E12 solo/no-AI journeys; executor next free P10 slice is US-003's journal doc template (`a2e-documents/src/lib/starter-templates.ts` + its test) per the earlier entries, or the P9/app-search batch.

## 2026-09-19 12:20 UTC — orchestrator — P10 batch-II verification + tick

Verified US-002..US-007 on HEAD (commit range 8debd2e2..1500656f, clean tree).

Checks re-run by orchestrator: front module suites (home-dashboard, workbench-dock,
first-open-help, focus-preferences, inbox, workspace-member, side-panel/components,
chat/components, ui/utilities/focus) → 46 suites / 196 tests PASS; `tsgo` twenty-front
→ only the 6 documented `front-components` AppPath baseline errors; `node docs/scripts/check-docs.mjs`
→ PASS (25 docs / 198 links) and its own test 6/6.

Diff review: additive only (no deletions outside `.ralph-tui` session files), no
i18n catalogs, no secrets, no migrations, `twenty-shared` untouched.

PLAN.md ticks: US-002 `[x]`, US-004 `[x]`, US-005 `[x]`, US-006 `[x]`, US-007 `[x]`;
US-003 stays `[~]` (journal doc template + Cmd+K quick capture remain).

Spot-checks: `requiresCollaborators` registry flag + `isSoloWorkspace` predicate
(0 members ≠ solo) as reported; help dismissal atom keyed by `currentUser.id`.

Still open (Tier-2, orchestrator-only, no running stack at verification time):
E12 solo journey, first-open-help walkthrough, focus-prefs browser proof, a11y
rendering proof. Recorded inline on each tick. The pre-existing `StyledDockRoot`
invalid-CSS bug (US-006 entry) is noted for a separate layout slice.

CLAIMED — US-023/journal-doc-template — deepseek-v4.1-flash — 2026-09-19T19:50:00Z — base 58cfc9bdf2d2ec4feeaf3864817ebe3c9e1f9cbe

## 2026-09-19 19:56 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-023 P10 (personal dashboard remainder): journal doc template · **Slice:** the recorded remaining P10 dashboard content slice — the `Modèle — Journal` starter content (PLAN.md P10 line 1419; prior phase-10 entries track it under US-003)
**Claim:** done-for-review
**Ready-to-tick:** yes — every applicable Tier-0 gate green; the only absent evidence is the Tier-2 browser gallery/first-open instantiation journey, which the executor contract forbids and the orchestrator owns
**Base:** 58cfc9bdf2d2ec4feeaf3864817ebe3c9e1f9cbe
**Changed:** `packages/twenty-apps/internal/a2e-documents/src/lib/starter-templates.ts` (append `Modèle — Journal`), `.../src/lib/__tests__/starter-templates.test.ts` (four→five title list, updated install-delta expectation, 2 new payload specs), `.../a2e-documents/README.md` + `docs/features.md` (bundle count four→five + journal bullet, kept truthful), `docs/plan/phases/phase-10-report.md`, `.ralph-tui/progress.md`
**Checks:** `node --test --experimental-strip-types src/lib/__tests__/starter-templates.test.ts` (in a2e-documents) → 6 tests / 6 PASS; `yarn lint` → 0 warnings / 0 errors on 66 files; `yarn typecheck` → clean (no output); `npx twenty dev:build .` → "Build succeeded (20 files)"; `node docs/scripts/check-docs.mjs` → PASS: 25 maintained documents, 199 local inline links
**Missing for tick:** Tier-2 browser journey (Documents gallery shows/template page offers `Modèle — Journal`, and "utiliser" instantiates a `Journal` DOCUMENT copy) — orchestrator-only; no running stack here.
**Do not redo:** the journal is content-only code-data in the existing `STARTER_DOCUMENT_TEMPLATES` array — the P1.6e payload helpers/surfaces (`buildTemplateCopyPayload`, `collectGalleryTemplates`, the browser gallery section and the template-page first-open action) already consume it by reference, so no entry-point code was added; no new template engine, no `TEMPLATE_CONTENT_*` server descriptor loader (05-template-contracts §8 stays document-only); app bundle content stays French code-data like its four siblings (app packages have no Lingui runtime), and carries no tokens/IDs/URLs/live records.
**Remaining:** P10 open: US-024 Cmd+K quick capture (note/task, income reuses the pinned Bilan quick entry), plus US-008..US-015 batch II (P9/app-search).
**Next:** US-024 Cmd+K quick capture — compose the existing command-menu + record-creation primitives (no second creation system); then orchestrator Tier-2 gallery/first-open pass for both.

CLAIMED — US-024/quick-capture-cmdk — deepseek-v4.1-flash — 2026-09-19T18:30:58Z — base 484272faa9ed7314b6d34f38b313ff068ffb18ed

## 2026-09-19 18:52 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-024 P10 (personal dashboard remainder): Cmd+K quick capture (note/task — income reuses the existing Bilan quick entry) · **Slice:** the whole story — one command-menu quick-capture flow; note/task create natively through the record primitive, income routes to the pinned Bilan command
**Claim:** done-for-review
**Ready-to-tick:** yes — every applicable Tier-0 gate green; only the Tier-2 browser capture walkthrough is absent (orchestrator-owned)
**Base:** 484272faa9ed7314b6d34f38b313ff068ffb18ed
**Changed:** `packages/twenty-shared/src/types/SidePanelPages.ts` (+`QuickCapture`); `packages/twenty-front/src/modules/quick-capture/**` (new: pure `utils/quickCapture.ts` + 13-test spec, `hooks/useQuickCapture.ts`, `hooks/useQuickCaptureCommand.ts`, `hooks/useOpenQuickCaptureSidePanel.ts`, `components/QuickCaptureCommand.tsx`, `components/QuickCaptureSidePanelPage.tsx`); `.../side-panel/constants/SidePanelPagesConfig.tsx` (register the page); `.../command-menu-item/display/components/SidePanelCommandMenuItemDisplayPage.tsx` (render + keyboard-selectable "Quick capture" item); `docs/plan/phases/phase-10-report.md`
**Checks:** `npx nx build twenty-shared --skip-nx-cache` → success; `npx nx build twenty-sdk --skip-nx-cache` → success; `npx tsgo -p tsconfig.json --noEmit` (packages/twenty-front) → 0 errors (no AppPath baseline either); `npx oxlint --type-aware -c .oxlintrc.json <9 changed twenty-front files>` → 0 warnings / 0 errors; `npx oxfmt --check <same 9>` → correct; `npx jest --findRelatedTests <changed files> --config=jest.config.mjs` (in twenty-front) → 4 suites / 25 tests PASS (incl. the new 13-test quickCapture spec); oxlint + oxfmt on the twenty-shared enum → clean
**Missing for tick:** Tier-2 browser proof (Cmd+K → Quick capture: a note captures to its new record page, a task likewise; selecting Income reopens the command menu filtered to the pinned "Bilan : saisie rapide" and creates no income row) — orchestrator-only; no running stack here.
**Do not redo:** quick capture creates core `note`/`task` with the native `useCreateOneRecord` primitive and navigates via `buildQuickCaptureNavigationPlan` — no second creation system and no new app command. The income leg creates nothing: it sets `sidePanelSearchState` to `QUICK_CAPTURE_INCOME_COMMAND_SEARCH` and returns to `CommandMenuDisplay`, so P7.2's pinned GLOBAL command stays the only income path.
**Rebuild note:** `SidePanelPages.QuickCapture` is re-declared by the bundled `twenty-sdk/dist/front-component/index.d.ts`; if tsgo reports `Property 'QuickCapture' is missing`, rebuild first: `npx nx build twenty-shared --skip-nx-cache && npx nx build twenty-sdk --skip-nx-cache` (same class as the documented `twenty-sdk/dist` gotcha).
**Remaining:** P10 open: the performance bullet and final regression; then the P9/app-search US-025+ batch.
**Next:** orchestrator — Tier-2 browser proof of the capture flow; nothing else pending for US-024.

## 2026-09-19 21:55 local — orchestrator — batch III verify (US-023/024)

**Scope:** verified the P10 slices of the batch: US-023 journal doc template, US-024 Cmd+K quick capture.

**Checks run (HEAD = b61cce0b):** twenty-front `npx jest src/modules/quick-capture + getContextToolButtons + AiChatEmptyState --config=jest.config.mjs` → 3 suites/29 PASS; twenty-shared/sdk rebuilt uncached first (US-024 touched `SidePanelPages` — documented dist gotcha) before trusting any dependent result. US-023's six template specs were covered by the a2e-documents unit run logged in phase-03-report (169/169).

**Ticks:** P10 personal-dashboard bullet annotation updated — journal template + quick capture verified; bullet stays `[~]` only because the habit/Pomodoro-adjacent performance bullet of P10 remains open, not because of these two stories.

**Still open (Tier 2):** browser gallery `Modèle — Journal` instantiation proof; Cmd+K capture walkthrough (note→record page, task likewise, income→pinned Bilan command creating no row). Not runnable this session — no running stack.
