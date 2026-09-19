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
