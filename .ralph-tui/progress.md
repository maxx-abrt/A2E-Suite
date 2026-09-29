# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- twenty-front enforces a custom oxlint rule `twenty(max-consts-per-file)` (max 1
  top-level `const` per file). Put a new exported constant in its own file, not
  appended to an existing constants module. Run `npx oxlint --type-aware -c
  .oxlintrc.json <files>` from inside `packages/twenty-front` (there is no root
  `.oxlintrc.json`; the config is per package).
- `npx nx lint:diff-with-main <pkg>` only sees *committed* changes
  (`git diff main...HEAD`); on the uncommitted working tree it prints "No changed
  files". Use direct `oxlint`/`oxfmt` on the touched paths instead.
- Lingui macro `t`/`msg` fall back to the source string when the key is absent
  from `locales/generated/en`, so renaming a source message does not require
  touching catalogs (do not commit catalog churn).

---


## 2026-09-29 - US-100 (M7a-2: host strings → Agenda / Syna / Archive)
- Renamed the remaining host display strings to the five-app naming. Calendar:
  Home card "Open the calendar" → "Open Agenda", toolbar "Calendar view" →
  "Agenda view", and `/calendar` browser page title → "Agenda" via
  `getPageTitleFromPath`. Syna: AiChatPageHeader, SidePanelAskAiInfo,
  useOpenAskAiPageInSidePanel, EngineComponentKeyHeadlessComponentMap,
  useNavigationDrawerModes, SettingsAI title/breadcrumb, settings nav item, and
  the 6 AI-settings sibling breadcrumbs. Archive: DRIVE_FOLDER_ROOT_LABEL,
  DriveToolbar source-app option, DrivePage error, and the drive Cmd+K mapper.
  Cmd+K a2e-projects group heading now resolves to "Bureau" through a new
  `A2E_SUITE_APPLICATION_GROUP_HEADINGS` map consumed by useAppSearchResultItems.
  Docs updated: applications.md, product-experience.md, README-A2E.md, 5 app READMEs.
- Files changed: 30 front ts/tsx (incl. 2 new), 2 server comments, 6 docs/READMEs.
- **Learnings:**
  - The Cmd+K app-provider group heading is resolved client-side from
    `application.name` in `useAppSearchResultItems.ts`; the server provider has
    no heading field. To read "Bureau" for a2e-projects (displayName "Bureau
    Projets") the override must live in that resolution path, not in a rename of
    the provider's universal-identifier constant.
  - Generic `AI` (roles/permission flags, workflow action type, admin/usage tabs)
    is intentionally left untouched; only the settings-section title/breadcrumbs
    and the assistant's own surfaces become `Syna`.
  - There is no host Cmd+K entry for the calendar in the codebase, so the M7a
    note's "Cmd+K entries" bullet has no code to change.
---
