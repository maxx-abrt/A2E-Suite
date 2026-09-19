# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Persisting an app-owned workspace object from `twenty-front`**: the app declares the object (e.g. `documentRevision`, `documentCommentThread`) in `packages/twenty-apps/internal/a2e-documents/src/objects/`, and the front writes it through hand-written `gql` documents + `useApolloCoreClient()` (the objects are absent from checked-in generated metadata — regen with `nx run twenty-front:graphql:generate` once installed). Permissions are the platform's object permissions on the standard GraphQL API; the client adapter must fail closed on a denied transport (no read leak, no write applied), not add a parallel authz layer.

---


## 2026-09-19 - US-031
- Closed the remaining executor acceptance gaps of the already-shipped durable revision history: made `EditorVersionHistoryStore.loadFromPersistence` fail closed on a denied/failed adapter read (keep local versions, no unhandled rejection), added unit proof that the store round-trips snapshots through the Apollo transport (a fresh store reads them back) and that unauthorized reads/writes are denied, and documented retention (20 snapshots, oldest-first, pruned both sides), non-destructive restore-as-new-revision and permission semantics in the a2e-documents README.
- Files changed: `packages/twenty-front/src/modules/blocknote-editor/version-history/EditorVersionHistoryStore.ts`, `.../version-history/__tests__/EditorVersionHistoryStore.test.ts`, `.../version-history/hooks/__tests__/useDocumentRevisionPersistence.test.tsx`, `packages/twenty-apps/internal/a2e-documents/README.md`, `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - The durable path was already committed in earlier sessions: `documentRevision` object (unique `versionId`, `body`, CASCADE `document` relation) + `useDocumentRevisionPersistence` + the store's optional `EditorVersionHistoryPersistence` adapter. This session only hardened/documented; do not rebuild.
  - `getObjectPermissionsForObject` fails **open** (all flags true) when an object has no permission entry, so it is not a fail-closed primitive; revision access is enforced by the server's object permissions on the normal GraphQL calls, and the client store fails closed when the transport rejects.
  - `nx lint:diff-with-main` diffs `main...HEAD`, so it reports "No changed files" for uncommitted work; run `npx oxlint --type-aware -c .oxlintrc.json <files>` + `npx oxfmt` directly on touched files instead.
---


## 2026-09-19 - US-030
- Verified the committed P3.2 template-instantiation slice (`aae72f9a`: `readAuthorizedTemplateCopySource` fail-closed read + `remapTemplateBlockIds` anchor re-key, both front-components routed through the authorized tree query) and closed the two acceptance bullets it left unproven with unit coverage: disjoint anchors across two instantiations, and deletion independence (a copy carries no template id / block anchor / relation back to the source).
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/__tests__/instantiate-template.test.ts` (+2 cases, 16→18); `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - `buildTemplateCopyPayload` is the single instantiation authority and only ever copies title + content — relations/system fields are dropped, which is *why* deleting a template cannot cascade to a copy (the only CASCADE edge is parent→children, and an instantiated copy is a root with no `parent`).
  - Workspace document templates (`kind = TEMPLATE`) have no descriptor key/version/`operationId`, so C1's `TemplateContentProvenance` shape cannot be recorded for P3.2; spec §5.1/§8 assigns it to P1.6e's descriptor loader. If/when it lands it must be a value copy (key+version), never a live relation, or it would re-break deletion independence via the CASCADE parent edge.
  - The a2e-documents package gates are `yarn test:unit` (node --test), `yarn typecheck`, `yarn lint`, `npx twenty dev:build .` — it is not an Nx project, so `nx lint:diff-with-main` returns "Cannot find project".
---

## 2026-09-19 - US-030 (independent re-verify)
- A second concurrent ralph session (agent pid 48678) had already executed US-030 and committed it as `a605200d` with a `done-for-review` phase report. This iteration changed no source; it independently re-ran the slice's Tier-0 test and reports `done-for-review` with zero new changes.
- Files changed: `docs/plan/phases/phase-03-report.md`, `.ralph-tui/progress.md` only.
- **Learnings:**
  - `node --test --experimental-strip-types src/lib/__tests__/instantiate-template.test.ts` → 18/18 on `a605200d`; the slice's E04 browser leg and the P1.6e provenance clause remain the only open items.
  - Gotcha: two ralph processes can run against one checkout (both acquire/spawn agents); `git status` can acquire new concurrent modifications mid-session. Check `ps` for live sibling opencode agents (children of a `ralph-tui run`) before assuming a dirty tree is a stall.
---

## 2026-09-19 - US-032
- Did **not** implement: a concurrent ralph session claimed the identical slice (`CLAIMED — US-032/server-side-compare-and-set — 2026-09-19T21:38:00Z`) 17 seconds before this session's claim (`US-032/server-expected-revision-cas`, 21:38:17Z). Per contract §3 file-overlap preflight, stopped with zero code changes and reported `conflict`.
- Files changed: `docs/plan/phases/phase-03-report.md`, `.ralph-tui/progress.md` only.
- **Learnings:**
  - Two ralph sessions can be live on one checkout at once (US-030 already showed a duplicate). Always re-read the phase report's tail immediately before claiming — a claim can appear between your read and your append.
  - The first unmet US-032 acceptance gap is AC3 (server-side compare-and-set via the app's logic-function pattern). The app CAS primitive is a **filtered update** (`updateX(filter, data)` compiles to one `UPDATE … WHERE … RETURNING`, per phase-04-report lines 158/210/556) — but the document body path can only be a **post-commit repair** guard (SDK has no pre-write hook), so it needs a client-carried expected-revision token to detect staleness at all.
  - `DatabaseEventPayload.properties` carries full `before`/`after` records (`ObjectRecordUpdateEvent`), so a `document.updated` guard can read `before.content`/`after.content` and restore the winner without a second query.
  - AC4 (front `retry` + draft-preservation cases) and AC5 (single-writer guidance docs) remain open and unclaimed once the AC3 claimant reports.
---
