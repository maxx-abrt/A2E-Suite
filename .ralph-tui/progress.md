# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

<!-- entries appended below -->

- **Host "app landing" pages** follow `HomeDashboard`/`InboxPage`: a `~/pages/<x>` component (`~` = `src`), registered in `createWorkspaceRouteObjects.tsx` with a new `AppPath`, a `title-utils.ts` case, and self-gating via `useIsDocumentApplicationInstalled` / `hasObjectMetadataItem`. The app-side nav row then points at it with a `NavigationMenuItemType.LINK` (VIEW→LINK like US-101); the link must be added to `INTERNAL_NAVIGATION_MENU_ITEM_ROUTE_PATHS` (twenty-shared) and both `twenty-shared` and `twenty-sdk` dist rebuilt.
- **Template gallery entry seam**: every surface opens via `useOpenTemplateGallery({ category, templateKey })`; category + key are *soft* preselects in jotai atoms (`templateGallery*PreselectState`) read by `TemplateGallerySidePanelPage` → `TemplateGallery(initialCategory, initialTemplateKey)`. App front-components cannot use it (isolated runtime) — landing pages that deep-link the gallery must be host pages.
- **Two shapes of "landing"**: (1) a *new* host route (`~/pages/<x>` + `createWorkspaceRouteObjects` + `AppPath` + `title-utils` + nav row repoint), as with Bureau `/bureau`; or (2) an *existing* host page enriched in place when a nav row already targets it (Agenda `/calendar`), as with US-151 — default the host to the intended surface and prepend a self-contained header component that takes the host's own action as a callback, so the host keeps a single write path and no second route/nav is added.
- **`twenty(max-consts-per-file)`**: max one exported `const` per file. Split paired constants into separate files (see `BureauLandingTemplateCategory.ts` vs `BureauLandingTemplates.ts`); `styled` consts are exempt.
- **Pre-existing red**: `usePageChangeEffectNavigateLocation.test.ts` "tests should be exhaustive" was red at HEAD because `AppPath.{Drive,Calendar,Discussions,Inbox}` lack matrix rows; `UNTESTED_APP_PATHS` is the exemption list.
- **Landing without an app object (Syna/Agenda)**: when the surface is a *host* feature (no `Application`/object metadata to install-gate on), mount the landing as an *empty-state* enrichment of the existing host page rather than a new route — for Syna that is `AiChatEmptyState`, gated on `AiChatSurfaceContext === AI_CHAT_SURFACE.PAGE` so the side panel stays compact. No `/syna` `AppPath` is needed. A *new* route is only justified when the landing must own content during an active thread.

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

## 2026-10-01 - US-151 M7f-2: Agenda landing page
- Enriched the existing `/calendar` host page instead of adding a route: `CalendarPage` now defaults to the **week** view and renders an `AgendaLanding` strip above the existing toolbar.
- `AgendaLanding` (`modules/calendar/components/AgendaLanding.tsx`): title + subtitle, primary "New event" opening the host's existing composer (new `handleCreateEvent` using `buildDefaultCalendarEventDraft` = next full hour), and 3 featured M9c template links opening the shared gallery via `useOpenTemplateGallery({ category: 'Agenda', templateKey })`.
- Constants `AgendaLandingTemplateCategory`/`AgendaLandingTemplates` (own files per `max-consts-per-file`); new util `buildDefaultCalendarEventDraft` reuses `buildCalendarEventDraftFromSlot`.
- Tests: `AgendaLanding.test.tsx` (composition/primary/gallery category), `AgendaLandingTemplates.test.ts` (host-side drift guard: each featured key resolves to a shipped `Agenda` descriptor), `buildDefaultCalendarEventDraft.test.ts`. 27 calendar suites / 257 green; tsgo 0; oxlint/oxfmt clean.
- Files: `twenty-front/src/pages/calendar/CalendarPage.tsx` + new `modules/calendar/{components/AgendaLanding,components/__tests__/AgendaLanding.test,constants/AgendaLandingTemplateCategory,constants/AgendaLandingTemplates,constants/__tests__/AgendaLandingTemplates.test,utils/buildDefaultCalendarEventDraft,utils/__tests__/buildDefaultCalendarEventDraft.test}.ts(x)`.
- **Learnings:**
  - The Agenda nav seed (`20202020-b00c-…-c0aba11c000c`, standard `NavigationMenuItemType.LINK`) already targets `/calendar`, so "no parallel nav" means *no route change at all* — just enrich the host page. Contrast US-150, which had to add/repoint a route.
  - The week view is a read-only edit surface (`isCalendarLocalEditSurface` is day/agenda only), but **creation** is mode-independent: a global "New event" that opens the existing composer is additive and safe.
  - Keep landing constants + their drift guard co-located in the host package when both the featured keys and the descriptors are host-side (US-142 Agenda), unlike Bureau whose descriptors ship in a2e-documents.
---


## 2026-10-01 - US-152 M7f-3: Syna landing page
- Built the Syna home as the `/chat` host page's empty-state enrichment: new `SynaLanding` renders the primary "New conversation" (`useSwitchToNewAiChat`), 3 featured M9c recipe links, the full 7-READY actions library (each opens the shared gallery via `useOpenTemplateGallery({ category: 'Syna', templateKey })`) and the recent runs (`useChatThreads` + `useAiChatThreadClick`).
- `AiChatEmptyState` now renders `<SynaLanding />` only when `AiChatSurfaceContext === AI_CHAT_SURFACE.PAGE`, so the side-panel ask box is untouched.
- Zero-AI gate (US-141) first: `isSynaAvailable` false + `AI_SETTINGS` -> a single `Connect a provider` **Link** (`to={getSettingsPath(SettingsPath.AiProviders)}`); false without admin -> null.
- Recent runs are derived from the existing `agentChatThreads` usage store (`getRecentSynaRuns`: exclude archived, sort by `lastMessageAt ?? updatedAt` desc, cap 3) — no new table.
- Constants `SynaLandingTemplateCategory`/`SynaLandingTemplates` (own files per `max-consts-per-file`). Tests: `SynaLanding.test.tsx` (10), `getRecentSynaRuns.test.ts` (4), `SynaLandingTemplates.test.ts` (4, drift guard), `AiChatEmptyState.test.tsx` (+2 surface gating). 24 pass; tsgo 0; oxlint/oxfmt 0/0.
- Files: `twenty-front/src/modules/ai/{components/SynaLanding.tsx,components/AiChatEmptyState.tsx,constants/SynaLandingTemplateCategory.ts,constants/SynaLandingTemplates.ts,utils/getRecentSynaRuns.ts}` + their `__tests__`.
- **Learnings:**
  - A host surface with **no app object** (Syna is the host AI chat, `AiChat` in `useNavigationDrawerModes`) cannot use `useIsDocumentApplicationInstalled` to self-gate; the right gate is the empty-state hook (`useShouldShowAiChatEmptyState`) and the existing page-vs-side-panel surface.
  - `twenty(no-navigate-prefer-link)` fires on `navigate()` in an `onClick` — use `<Button to={...}>` (renders a react-router `Link`) for pure navigation.
  - When unit-rendering a *child* that consumes a module-level React context (e.g. `AiChatSurfaceContext`) without the real provider tree, mock only the context's `Provider` to a pass-through and keep the real `createContext` value, instead of building the full agent-chat provider stack.
---

## 2026-10-01 - US-153 M7f-4: Archive landing (/drive explorer + usage) + a2e-drive Archive folder nav row
- Built the Archive home as an **enrichment of the existing host `/drive` page** (no new route): new `ArchiveLanding` strip renders at the explorer root (`!isDefined(selectedFolderId)`) with the primary `Upload`, secondary `New folder`, 3 M9c folder-structure starter links (`useOpenTemplateGallery({ category: 'Archive', templateKey })`), and a usage readout fed by `buildDriveUsageSummary` over the page's existing `liveFiles`.
- `ArchiveLanding` self-gates via `useIsDriveApplicationInstalled` (renders null without a2e-drive) and is pure-props (`onUpload`/`onCreateFolder`/`usageSummary`) — no drive state, no query.
- a2e-drive now owns an `Archive` FOLDER nav row (`c31d0000-0010-4000-8000-000000000002`, IconArchive, pos 140) and its `Files` LINK row (renamed from `Archive`, pos 0, `/drive`) nests under it — a self-owned folder so the group resolves on a standalone install (unlike the Bureau folder owned by a sibling).
- Tests: front `ArchiveLanding.test.tsx` (6, install-gate + empty-state + usage + callbacks + deep-link) and `ArchiveLandingTemplates.test.ts` (2); a2e-drive `archive-navigation.test.ts` + `archive-landing-template-links.test.ts` (drift guard reading the host constant). a2e-drive 0.1.4→0.1.5.
- Files: `twenty-front/src/modules/drive/{components/ArchiveLanding.tsx,components/__tests__/ArchiveLanding.test.tsx,constants/ArchiveLandingTemplateCategory.ts,constants/ArchiveLandingTemplates.ts,constants/__tests__/ArchiveLandingTemplates.test.ts,hooks/useIsDriveApplicationInstalled.ts,utils/isDriveApplicationInstalled.ts}`, `twenty-front/src/pages/drive/DrivePage.tsx`; `a2e-drive/src/{constants/universal-identifiers.ts,navigation-menu-items/archive-folder.navigation-menu-item.ts,navigation-menu-items/drive.navigation-menu-item.ts,lib/__tests__/archive-navigation.test.ts,lib/__tests__/archive-landing-template-links.test.ts,package.json,README.md}`.
- **Learnings:**
  - Two shapes of landing again: `/drive` already had a host page + app nav row, so US-153 is shape (2) — enrich in place and prepend a self-contained header component taking the host's own actions as callbacks (same as Agenda). No `AppPath`/route/`createWorkspaceRouteObjects` change.
  - A **self-owned** nav folder (app owns both the FOLDER and the nested rows) resolves on a standalone install; a cross-app folder ref only works when the owning app is a hard install prerequisite (Bureau). Prefer self-owned for an app's own group.
  - Landing constants + their descriptor drift guard live on opposite sides when the descriptors ship in an app (Archive → a2e-drive reads the host constant, like Bureau), vs co-located when both are host-side (Agenda).
---
