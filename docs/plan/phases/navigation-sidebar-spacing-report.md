# Sidebar spacing

## 2026-10-28 12:00 UTC — Codex [executor]

**Task:** Requested Syna logo/label spacing polish · **Slice:** top sidebar mode switcher · **Claim:** done-for-review.
**Changed:** `packages/twenty-front/src/modules/navigation/components/MainNavigationDrawerModeSwitcher.tsx`: expanded icon/label gap increases from 2px to 6px; the centered icon slot grows from 16px to 20px to accommodate the existing Syna logo minimum size without overflowing into its label. Shared mode alignment uses the same spacing tokens.
**Checks:** Front `npx jest src/modules/navigation/components/__tests__/MainNavigationDrawerModeSwitcher.test.tsx src/modules/navigation/components/__tests__/AppNavigationDrawer.test.tsx --config=jest.config.mjs --runInBand` → 2 suites / 6 tests pass, including expanded/collapsed activation and keyboard navigation.
**Checks:** Front direct `npx oxlint --type-aware -c .oxlintrc.json src/modules/navigation/components/MainNavigationDrawerModeSwitcher.tsx` → 0 warnings/errors; `npx oxfmt --check` on that file → pass; `npx tsgo -p tsconfig.json --noEmit` → exit 0; root `git diff --check` → pass. Node 24.20.0, local baseline `f54aecb9` plus existing working changes.
**Missing for tick:** Live visual acceptance in expanded/collapsed sidebar, including narrow drawer widths; no deployment performed.
**Do not redo:** Logo artwork and size are preserved; existing dirty work, including the preceding navigation remount correction, remains intact. No new tests were added for this CSS-only adjustment.
**Next:** Review the Syna spacing in the running app and deploy with the owning release.
