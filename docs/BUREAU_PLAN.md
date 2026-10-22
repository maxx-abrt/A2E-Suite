# plan.md — A2E Suite (Twenty fork) · Bureau workspace

## User decisions (binding)
- Language: English. Push cleanly to `main`.
- NO paid BlockNote extras (multi-column / xl-ai / premium pdf), NO AI. Focus: app availability + clean Bureau writing experience.
- Optimise tokens; be accurate. UI uses Twenty's design tokens (`themeCssVariables`, twenty-ui). No new design system.

## Runtime (preview)
- Supervisor runs a2e-postgres, a2e-redis, a2e-server and a2e-worker. a2e-server is NestJS on :3000 and serves the front build through `dist/front -> twenty-front/build`. `a2e-front` (vite dev) is off.
- Front rebuild: `bash /root/a2e-env/build-front.sh > /root/a2e-env/build-front.log 2>&1 &` (about 2 min, pauses the worker).
- After a pod restart: `bash /root/a2e-env/bootstrap.sh`. API token for curl: `bash /root/a2e-env/gql-token.sh`.
- Login: tim@apple.dev / tim@apple.dev (dev seed, prefilled).

## Phase 1 — App available (Status: COMPLETED)
- [x] Infra boots, migrations run, bundled apps provisioned.
- [x] Vite prod build fixed and served by the server.
- [x] Fixed UI text showing raw ids (e.g. `BQPUt2`): ran `lingui extract` + `lingui compile` in twenty-front and rebuilt.

## Phase 2 — Bureau full-page workspace `/bureau` (Status: IN PROGRESS, about 60%)
Verified data model (GraphQL, live):
- `document`: title, content{blocknote,markdown}, icon(emoji), coverColor(hex), coverImage(url), isFullWidth, isSmallText, parentId, position(float), deletedAt.
  - The server fills in markdown from blocknote, so `content.markdown ilike` works for search.
  - Trash query: `filter {deletedAt:{is:NOT_NULL}}`.
- `documentFavorite`: userId (core user id), documentId, favoriteKey `${userId}:${documentId}` (unique). Destroy it; don't soft-delete.

DONE (in `packages/twenty-front/src/modules/bureau/`):
- types/ (BureauDocument, BureauPageRecord, BureauTree, BureauDropZone, BureauDropPlacement)
- constants/ (page path, gql fields, icon choices, cover colors, modal ids, favorite object name)
- states/bureauExpandedPageIdsState (localStorage)
- utils/
  - Done: buildBureauTree (orphans and cycles go to root), getBureauAncestors, getBureauDescendantIds, getBureauDropPlacement (before/after/inside, cycle-safe, renumbers siblings on collision), getBureauPositionBetween, getBureauAppendPosition, getBureauPagePath.
  - Jest tests: 7 passing.
- hooks/
  - Done: useBureauDocuments (paged tree query, resync on events, focus and side-panel close), useBureauFavorites, useBureauPageActions (create→navigate, update, move, trash with subtree and Undo, restore with subtree and re-home, destroy), useBureauTextInputFocus, useBureauWorkspaceValue.
  - contexts/BureauWorkspaceContext plus useBureauWorkspace.
- components/
  - Done: BureauPageIcon, BureauSidebarAction, BureauPageActionsDropdown, BureauTreeItem (native drag/nest, rename, keyboard), BureauBreadcrumbs, BureauIconPicker, BureauCoverPicker.
  - None of these are wired to the route yet.

REMAINING (next agent, in order):
1. `components/BureauSidebar.tsx`:
   - Header (Bureau link + new page) and actions: Search / Home / Templates (`useOpenTemplateGallery({category: BUREAU_LANDING_TEMPLATE_CATEGORY})`).
   - Sections: Favorites (BureauTreeItem section="favorites") and Pages tree (section="pages", role=tree).
   - Root drop zone while dragging: `actions.movePage(id, null, 'inside')`.
   - Footer: Trash (openTrash).
2. `components/BureauPageView.tsx`, which loads the open page:
   - Query: `useFindOneRecord` with BUREAU_PAGE_RECORD_GQL_FIELDS.
   - Seed the record store with `useUpsertRecordsInStore` before mounting the editor. RichTextFieldEditor reads the store once per recordId.
   - Then render: top bar (BureauBreadcrumbs, "Edited x ago", favorite LightIconButton, BureauPageActionsDropdown with readingControls), cover, hero icon (BureauIconPicker), "Add icon / Add cover" hover controls, and a title TextareaAutosize (debounced updatePage; Enter focuses the editor through editorRef).
   - Editor: lazy `RichTextFieldEditor` with objectNameSingular='document' and fieldName='content'. It already provides the slash menu, autosave, versions, comments and export.
   - Font size: `.bn-container .editor` = font.size.lg, or md when isSmallText. Max width 760px unless isFullWidth.
   - Not-found state with "Back to Bureau" and "Open trash".
3. `components/BureauHome.tsx`:
   - Greeting, New page / Search / Templates buttons, recent pages grid (by updatedAt), starter templates (BUREAU_LANDING_TEMPLATE_LINKS).
   - Empty state: `A2eContextualEmptyState surfaceKey="bureau"`.
4. Modals:
   - `BureauSearchModal`: ModalStatefulWrapper with id BUREAU_SEARCH_MODAL_ID and renderInDocumentBody. Matches titles client-side plus content via `content.markdown ilike` (debounced). Arrow keys and Enter.
   - `BureauTrashModal`: list deleted pages with network-only fetch, Restore (actions.restorePage), Delete forever (two-step confirm, actions.destroyPage).
5. `components/BureauWorkspace.tsx`:
   - Wrap in the context provider, using `useBureauWorkspaceValue(activeDocumentId)`.
   - Layout: sidebar 260px plus main. On mobile, show either the sidebar or the page.
   - Render the modals here.
6. `pages/bureau/BureauPage.tsx`:
   - Read `documentId` with `useParams`.
   - Gate on `useIsDocumentApplicationInstalled` and on both objects existing in `useObjectMetadataItems`.
   - Render BureauWorkspace.
   - Add route `BUREAU_PAGE_PATH` ('/bureau/:documentId') next to `AppPath.Bureau` in `modules/app/routing/utils/createWorkspaceRouteObjects.tsx`.
   - Delete `bureau/components/BureauLanding.tsx` and its test. Keep constants/BureauLanding*.
7. Finish up:
   - `npx lingui extract --overwrite && npx lingui compile --typescript` in twenty-front.
   - `npx oxlint src/modules/bureau` and a typecheck.
   - Rebuild the front, take screenshots, run the testing agent, then commit and push.

## Phase 3 — Ship (Status: partial)
- [x] Commit and push of infra fixes, compiled catalogs and the Bureau foundation (this commit).
- [ ] Final push after REMAINING 1–7.
