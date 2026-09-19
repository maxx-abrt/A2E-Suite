# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

---


## 2026-09-19 - US-030
- Verified the committed P3.2 template-instantiation slice (`aae72f9a`: `readAuthorizedTemplateCopySource` fail-closed read + `remapTemplateBlockIds` anchor re-key, both front-components routed through the authorized tree query) and closed the two acceptance bullets it left unproven with unit coverage: disjoint anchors across two instantiations, and deletion independence (a copy carries no template id / block anchor / relation back to the source).
- Files changed: `packages/twenty-apps/internal/a2e-documents/src/lib/__tests__/instantiate-template.test.ts` (+2 cases, 16→18); `docs/plan/phases/phase-03-report.md`.
- **Learnings:**
  - `buildTemplateCopyPayload` is the single instantiation authority and only ever copies title + content — relations/system fields are dropped, which is *why* deleting a template cannot cascade to a copy (the only CASCADE edge is parent→children, and an instantiated copy is a root with no `parent`).
  - Workspace document templates (`kind = TEMPLATE`) have no descriptor key/version/`operationId`, so C1's `TemplateContentProvenance` shape cannot be recorded for P3.2; spec §5.1/§8 assigns it to P1.6e's descriptor loader. If/when it lands it must be a value copy (key+version), never a live relation, or it would re-break deletion independence via the CASCADE parent edge.
  - The a2e-documents package gates are `yarn test:unit` (node --test), `yarn typecheck`, `yarn lint`, `npx twenty dev:build .` — it is not an Nx project, so `nx lint:diff-with-main` returns "Cannot find project".
---
