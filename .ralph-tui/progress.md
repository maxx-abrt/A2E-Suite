# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **A2E app logic-function lint wall:** `**/logic-functions/**` and `**/*.logic-function.ts` may NOT import `twenty-shared/*` (oxlint `no-restricted-imports`; message: import runtime types/helpers from `twenty-sdk/logic-function` instead). Any code needing twenty-shared types/helpers must live in `src/lib/<name>.ts` (lib imports twenty-shared freely; the logic function imports the lib relatively). Business logic + an injectable client also belongs there so the `node --test` runner can exercise it without `twenty-sdk/define`.
- **A2E app per-app observability:** each app has its own `tsconfig`/oxlint config/test glob; `test:unit` globs differ (accounting only `src/lib/__tests__/*.test.ts`, others also `src/logic-functions/__tests__/*.test.ts`). `twenty dev:build .` writes `.twenty/output/manifest.json` (gitignored) — grep it to prove a function/field shipped.
- **Idempotent app apply = nullable provenance text field on the root record** (`templateApplyOperationId`), queried `filter: { field: { eq: operationId } }` before any write; the same pattern as `recipeCorrelationKey`/`templateKey`. App-owned fields can be inline in the object or a standalone `fields/*.field.ts` manifest — no server migration.

---

## 2026-10-01 - US-131
- Implemented the M9a-3 per-app template apply write path: one `apply-template` logic function per content app (documents/projects/accounting/drive), keyed by the US-117 descriptor key.
- Added a shared `TemplateApplyResult` contract + structural guards + pure `resolveTemplateApplyRequestError` (required apps by name or universal id, required inputs) in `twenty-shared/application`; regenerated the barrel via `nx build`.
- Documents reuses `buildTemplateCopyPayload` over `STARTER_DOCUMENT_TEMPLATES`; projects extracted `createStarterProject` out of `post-install`; accounting reuses `FICHE_TEMPLATES` + `withTemplateDefaults`; drive extracted `createFolderStructureTree` out of the seeder. All fresh ids, no aliasing (C1).
- Idempotency: new nullable `templateApplyOperationId` on document/project/fiche/driveFolder root; re-apply with the same id returns the existing root and writes nothing. Required apps validated before any write; rejections are typed (`UNKNOWN_TEMPLATE_KEY`/`MISSING_REQUIRED_APP`/`MISSING_INPUT`/`APPLY_FAILED`).
- Files changed: `packages/twenty-shared/src/application/{templateApplyType,templateApplyGuards,index}.ts` + spec; per app: `src/lib/apply-template.ts` + spec, `src/logic-functions/apply-template.ts`, object/constants field+function ids, extracted creator lib (projects/drive), `package.json` patch bumps (docs 0.2.9, projects 0.1.18, accounting 0.1.4, drive 0.1.4).
- **Learnings:**
  - oxlint restricts `twenty-shared` imports inside `logic-functions/**`; move logic to `src/lib/`.
  - `MetadataApiClient().query({ findManyApplications: { name, universalIdentifier } })` is the installed-app read used by app logic functions.
  - `npx nx lint twenty-shared` is red on a pre-existing unformatted `template-descriptor.spec.ts` (US-117); `lint:diff-with-main` has no twenty-shared target.
  - Tier-2 E15 browser leg still blocked on US-132 wiring `Use template` to `apply-template`.
---

