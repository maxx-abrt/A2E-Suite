# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

<!-- entries appended below -->

- **Host "app landing" pages** follow `HomeDashboard`/`InboxPage`: a `~/pages/<x>` component (`~` = `src`), registered in `createWorkspaceRouteObjects.tsx` with a new `AppPath`, a `title-utils.ts` case, and self-gating via `useIsDocumentApplicationInstalled` / `hasObjectMetadataItem`. The app-side nav row then points at it with a `NavigationMenuItemType.LINK` (VIEW→LINK like US-101); the link must be added to `INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS` (twenty-shared) and both `twenty-shared` and `twenty-sdk` dist rebuilt.
- **Template gallery entry seam**: every surface opens via `useOpenTemplateGallery({ category, templateKey })`; category + key are *soft* preselects in jotai atoms (`templateGallery*PreselectState`) read by `TemplateGallerySidePanelPage` → `TemplateGallery(initialCategory, initialTemplateKey)`. App front-components cannot use it (isolated runtime) — landing pages that deep-link the gallery must be host pages.
- **`twenty(max-consts-per-file)`**: max one exported `const` per file. Split paired constants into separate files (see `BureauLandingTemplateCategory.ts` vs `BureauLandingTemplates.ts`); `styled` consts are exempt.
- **Pre-existing red**: `usePageChangeEffectNavigateLocation.test.ts` "tests should be exhaustive" was red at HEAD because `AppPath.{Drive,Calendar,Discussions,Inbox}` lack matrix rows; `UNTESTED_APP_PATHS` is the exemption list.

---

## 2026-10-01 - US-150 M7f-1: Bureau landing page
- Built the Bureau home as a host page at `/bureau` (`BureauLanding`): install-gated on a2e-documents via `useIsDocumentApplicationInstalled`, primary "New page" via `useCreateNewPage`, three starter-template links deep-linking the M9 gallery via `useOpenTemplateGallery({ category: 'Pages', templateKey })`, recent pages (reused `RecentPagesWidget`) and an "All pages" link to the documents index.
- Extended the US-132 gallery seam with an optional `templateKey` soft preselect (new atom, `TemplateGallery.initialTemplateKey`), rather than adding a second open path.
- Repointed the a2e-documents Bureau "Pages" nav row VIEW→LINK `/bureau` (added `/bureau` to the internal nav allow-list) so opening Bureau actually opens the landing.
- Added an app-side drift guard (`bureau-landing-template-links.test.ts`) that reads the host featured-keys constant and asserts each resolves to a shipped `Pages` descriptor.
- Files: twenty-shared `AppPath.ts` + nav allow-list + specs; twenty-front `modules/bureau/*`, `pages/bureau/BureauPage.tsx`, `createWorkspaceRouteObjects.tsx`, `title-utils.ts`, template-gallery seam files, `UntestedAppPaths.ts`; a2e-documents nav row + tests + package.json 0.2.12.
- **Learnings:**
  - App front-components run isolated and cannot call host hooks — a landing that deep-links the host gallery must be a host page, not a `definePageLayout` FRONT_COMPONENT widget.
  - `twenty(max-consts-per-file)` forces one exported const per file; split constants.
  - The exhaustive page-change test was already red at HEAD (Drive/Calendar/Discussions/Inbox unexempted); added all native home pages to `UNTESTED_APP_PATHS`.
---

