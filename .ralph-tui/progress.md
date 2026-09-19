# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- **Cross-app relation owned by the consumer (A2E apps):** the consuming app declares both sides — a standalone `defineField` FK on the provider's object (with `objectUniversalIdentifier` hardcoded to the provider object uid, since packages can't import each other's constants) plus the inverse ONE_TO_MANY on its own object. Provider installs first. Model file: `a2e-projects/src/fields/company-projects.field.ts` (standard object) and `document-project.field.ts` (sibling app object). The whole-manifest graph-walk tests must add the provider object uid to their `resolvableObjectIds` set.
- **Record-page relation list:** use the native `FIELD` widget (`type: 'FIELD'`, `configuration.fieldMetadataId` = the relation field universal identifier, `fieldDisplayMode: 'TABLE' | 'CARD'`) — the same primitive as company↔people. The manifest universal config keeps `fieldMetadataId` = the uid (server resolves it); `fieldDisplayMode: 'TABLE'` without an embedded view degrades to the inline relation list.
- **a2e-* app package gates:** `yarn typecheck && yarn lint && yarn test:unit && npx twenty dev:build .` — these apps are not Nx projects, so `npx nx lint:diff-with-main` does not apply.

---


## 2026-09-19 - US-001
- Implemented the P4.3 project↔document relation per decision D-P4.3-DOC: `document.project` M2O FK (join `projectId`, SET_NULL) as a standalone app-owned field on A2E Documents' `document` object + inverse `project.documents` O2M on the project object, both owned by A2E Projects.
- Added the project-page Documents tab (native FIELD widget on the relation, TABLE mode) and a linked-docs count chip in the project overview front component + pure projection.
- Files changed: a2e-projects `src/constants/universal-identifiers.ts`, `src/objects/project.object.ts`, new `src/fields/document-project.field.ts`, `src/page-layouts/project.page-layout.ts`, `src/lib/project-overview.ts`, `src/front-components/project-overview.front-component.tsx`, and the three lib specs (`project-object-integrity`, `task-field-integrity`, `project-overview`).
- **Learnings:**
  - `project-object-integrity.test.ts` and `task-field-integrity.test.ts` both walk the project object's fields, so a new relation must be registered in BOTH (field path + external provider object id in the resolvable set) or the symmetry/target-resolution tests fail.
  - The manifest universal config for a FIELD widget keeps `fieldMetadataId` = the field's universal identifier (not a transformed `…UniversalIdentifier` key) — `from-page-layout-widget-configuration-to-universal-configuration.util.ts` maps stored ids to uids under that same key.
  - No workspace preset currently lists A2E Projects, so the "Documents before Projects" install-order rule needs no change yet; it becomes the caller's contract when Projects joins a preset.
---
