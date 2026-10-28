# App sidebar navigation

## 2026-10-28 12:06 UTC — Codex [executor]

**Task:** Remove the lingering back control after returning from an app submenu to the app list · **Slice:** focused app navigation · **Claim:** done-for-review.
**Changed:** `FocusedAppNavigationDrawerContent.tsx` renders only the regular drawer children after “All apps” is selected; the extra “Back to <app>” row is removed. The “All apps” control remains inside app submenus.
**Decision:** Dismissal is scoped to React Router's history-entry key instead of the URL, so selecting the same app route again can reopen its submenu without a separate return button. App ownership still comes from permission-filtered native folders.
**Tests:** `FocusedAppNavigationDrawerContent.test.tsx` covers Bureau/Bilan returns without navigation or back controls, reselecting the same route, switching apps, persistent Bureau context and unrelated CRM routes; existing deep-link, renamed-folder, saved-view and customization coverage is preserved.
**Checks:** Front focused Jest command (`--config=jest.config.mjs --runInBand`) for `FocusedAppNavigationDrawerContent.test.tsx`, `AppNavigationDrawer.test.tsx`, `NavigationMenuItemFolderContent.test.tsx` → 3 suites / 23 tests pass. Front `npx tsgo -p tsconfig.json --noEmit` → exit 0; `npx oxlint --type-aware -c .oxlintrc.json` on the two changed source/test files → 0 warnings/errors; `npx oxfmt --check` on those files → pass. Root `node docs/scripts/check-docs.mjs` and `git diff --check` → pass.
**Missing for tick:** Live authenticated browser acceptance for Bureau/Bilan app-list round trips and app reentry; no deployment performed. Node 24.20.0, local baseline `f54aecb9` with existing working changes preserved.
**Do not redo:** App routes, current page, native folder ownership, translations and the previous sidebar/remount fixes are preserved; no commit or unrelated source edits.
**Next:** Review the app-list round trip in the running app and deploy through the owning release.
