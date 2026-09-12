## Implementation status
Baseline cleanup and visible UI/UX integration are implemented. Tree follows owner-provided curved branch reference, supports persisted tree-only mode, correct depth, focus/touch actions, exact drag intent and atomic server moves. Editor adds requested package schemas, compact review controls, ODT and native math/diagram export mappings. Saves are serialized with error/retry state and encrypted writes are atomic. Strict Next typechecking re-enabled. Final validation in progress: generated test suite contains incorrect APIs/expectations and must be corrected, not treated as passed. Authenticated Convex/WorkOS flows have NOT been validated or deployed in this environment.


## Latest owner direction
Use the supplied animated-file-tree reference: curved SVG branches, accent active ancestry, quiet selection/hover surfaces, compact minimal hierarchy and contextual actions. Adapt to the real flattened/virtualized document tree rather than replacing it with a static demo. Improve DnD exact placement, maintain hierarchy, remove only verified dead legacy code. User supplied real public Convex URLs for builds; no auth secrets requested.

# Texxel – Plan (editor + sidebar solidity)

## 1) Objectives
- Make the app feel “Notion-solid”: fewer fragile states, clearer UI, faster perceived performance, cleaner interactions.
- Upgrade BlockNote integration and wire in:
  - `@blocknote/xl-docx-exporter`, `@blocknote/xl-odt-exporter`
  - `@blocknote/xl-multi-column`
  - `@blocknote/prosemirror-suggest-changes`
  - `@blocknote/block-view`, `@blocknote/math-block`, `@blocknote/diagram-block`
- Sidebar overhaul: collapsible “tree-only mode”, remove clutter, tighten IA; Affine/Huly-inspired.
- File tree drag & drop: robust, predictable reordering/move across folders with strong invariants (no cycles, no lost nodes), optimistic UI + server validation.
- Remove useless UI/actions and dead code paths while respecting existing design rules.
- Finish with `typecheck` + `build`, then commit and push to `main`.

## 2) Implementation Steps

### Phase 0 — Repo baseline + design rules (no product changes)
User stories:
1. As a dev, I want a clean local setup so I can iterate quickly without breaking prod.
2. As a user, I want the UI to remain consistent with existing design rules.
3. As a user, I want faster load and fewer spinners.
4. As a user, I want errors to be actionable, not vague.
5. As an owner, I want changes scoped to this repo only.
Steps:
- Clone `main`, install deps, run `typecheck`/`lint`/`test` (if any)/`build` to capture baseline.
- Inventory architecture: Next.js routes, Convex schema/mutations, BlockNote usage, tree model + DnD implementation.
- Identify design system source (Tailwind/shadcn/custom) + spacing/typography rules.
- Create a short “cleanup list” (dead components, unused buttons, unreachable routes) to remove safely.

### Phase 0 completed
- Cloned main, preserved Next.js/Convex/WorkOS and existing design system.
- Baseline: 113 TypeScript errors, predominantly unreachable legacy components. Build compiled but lacked public Convex URL; owner supplied both real public URLs.
- Verified registry/source after playbook corrections: math/diagram first exist at 0.54.0. Coordinated upgrade to 0.54.0, block-view 0.1.4, suggest-changes 0.1.3.
- Design blueprint: docs/editor-sidebar-design.md.

### Phase 1 — Core POC (Isolation): BlockNote XL + tree DnD invariants (in progress)
User stories:
1. As a user, I can export the current doc to DOCX/ODT and it downloads reliably.
2. As a user, I can insert a multi-column section and it persists after reload.
3. As a user, I can insert math/diagram blocks without crashing the editor.
4. As a user, I can propose edits (suggest-changes) and accept/reject them.
5. As a user, I can drag a page in the tree and it lands exactly where I drop it.
Steps:
- **Web research (short):** confirm latest integration patterns + peer deps for each BlockNote XL package; note any required CSS/assets.
- Implement shared production adapter modules and validate them in isolated Node/DOM tests (no POC route, no auth bypass or fake app data):
  - Instantiates the editor with required extensions/blocks.
  - Shows “Export DOCX/ODT” actions.
  - Includes a minimal tree model with DnD → calls a single “move node” function.
- Add isolated invariant checks (no cycles, stable order, parent existence) in shared utility:
  - `moveNode(tree, sourceId, targetParentId, index)` returns new tree + validation result.
- If Convex is used for persistence: add a minimal mutation/action to validate and apply moves server-side.
- Do not proceed until: exports work locally, editor doesn’t throw runtime errors, DnD produces valid moves.

### Phase 2 — V1 App Development: integrate proven core into real app flows
User stories:
1. As a user, I can collapse the sidebar into “tree-only” and still navigate instantly.
2. As a user, I can reorder pages/folders with clear drop indicators and safe auto-scroll.
3. As a user, I can create a doc and immediately use columns/math/diagrams.
4. As a user, I can export a doc from the main editor toolbar in 1 click.
5. As a user, I can recover from failures (network/permission) with a clear toast + no corrupted UI.
Steps:
- BlockNote production wiring:
  - Merge POC editor config into the main editor entry.
  - Add a compact toolbar section for: Export (DOCX/ODT), Columns, Suggest changes, Math, Diagram.
  - Ensure serialization/persistence remains compatible (migrations only if required; prefer backward-compatible).
- Sidebar + layout polish:
  - Implement left sidebar modes: `Full` (icons+labels), `Tree-only`, `Collapsed`.
  - Remove redundant controls; consolidate actions into contextual menus.
  - Ensure responsive/mobile: tree as drawer, editor remains primary.
- Tree DnD hardening:
  - Use a reliable DnD library already in repo (or add one if needed) with:
    - Keyboard + pointer support if feasible.
    - Drop targets for “above/inside/below”, visible indicators.
    - Optimistic UI update + server mutation; rollback on failure.
  - Enforce server-side invariants + deterministic ordering.
- Error-proofing/perf:
  - Add boundary guards around editor + tree.
  - Debounce expensive operations; memoize derived tree views.
  - Remove dead code/UI; keep navigation minimal.
- Conclude with one testing pass: run `typecheck` + `build` and fix all failures.

### Phase 3 — Stabilization + feature tightening (production-friendly)
User stories:
1. As a user, I never lose content while switching pages or during slow network.
2. As a user, I can undo/redo without desync.
3. As a user, tree operations feel instantaneous even with many pages.
4. As a user, empty/error states tell me exactly what to do next.
5. As an owner, I can deploy without hidden env requirements.
Steps:
- Reliability audit:
  - Fix race conditions between selection, save, and navigation.
  - Add “saving…” state, last-saved indicator, and non-blocking retries where appropriate.
- Data correctness:
  - Add Convex-side validation for tree/doc mutations.
  - Add lightweight unit tests for pure tree move logic (if test runner exists); otherwise keep as deterministic utilities.
- UI/UX micro-polish:
  - Align spacing, typography, hover states; remove jitter.
  - Ensure context menus consistent and minimal (Affine-like).
- Final cleanup:
  - Remove unused packages/components, dead feature flags, unused buttons.
  - Confirm no secrets added, no license keys stored.
- Conclude with one more `typecheck` + `build`.

### Phase 4 — Delivery
User stories:
1. As an owner, I can review a clean PR-like commit history.
2. As an owner, I can deploy with the same env vars as before.
3. As a user, the app feels smoother and more predictable.
4. As a user, exports work every time.
5. As a user, tree DnD never produces broken structure.
Steps:
- Git hygiene: concise commits (or one squashed commit if preferred), clear message.
- Push to `main` and sync with the requested Git identity (configured locally only).
- Provide a short changelog + any env var needs (only if truly required).

## 3) Next Actions
- Clone repo (main) and run baseline `typecheck`/`build`.
- Identify current editor + tree/DnD implementation points.
- Do the Phase 1 POC route for BlockNote XL + invariant-checked tree moves.

## 4) Success Criteria
- BlockNote features available in main editor: multi-column, math, diagram, block-view usage where relevant, suggest-changes, DOCX/ODT exports.
- Sidebar supports tree-only mode + collapse, stays responsive on mobile.
- Tree DnD is deterministic and safe: no cycles, no missing nodes, rollback on failure, clear drop indicators.
- App feels cleaner: removed useless buttons/features without breaking workflows.
- `pnpm/npm/yarn` (repo default) `typecheck` and `build` pass locally.
- Changes committed and pushed to `main` without secrets recorded anywhere.