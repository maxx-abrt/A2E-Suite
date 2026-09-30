# Phase 13 report — M9 curated templates (L-TPL)

CLAIMED — US-103/bureau-page-templates — deepseek-v4.1-flash — 2026-09-29T20:23:46Z — base 5224ba9c46986750c9b899d3baed2a408b2dcdd7

## 2026-09-29 20:26 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-103 M9c family: 20 curated Bureau page templates (a2e-documents) · **Slice:** the 20-page family content — add the 15 missing descriptors + extend the missing-titles delta + per-descriptor tests + patch bump
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 browser leg is absent. One documented scope deviation: the `labels fr+en` descriptor contract is US-117's, not this content slice's (see fr+en note).
**Base:** 5224ba9c46986750c9b899d3baed2a408b2dcdd7
**Changed:**
- `packages/twenty-apps/internal/a2e-documents/src/lib/starter-templates.ts` (+15 descriptors: weekly review, daily note, OKR, team wiki home, onboarding guide, recurring agenda, decision log/ADR, retrospective, brainstorm, reading list, Cornell course notes, thesis planner, recipe book, travel plan, personal CRM-lite)
- `.../src/lib/__tests__/starter-templates.test.ts` (20-title bundle assertion, uniqueness test, one `descriptor « … » is shaped and instantiable` test per descriptor via a loop, delta expectation extended to the 19 missing)
- `.../src/logic-functions/post-install.ts` (template page `first: 30`→`200` + WHY comment — see seeder note)
- `.../package.json` (0.2.1→0.2.2)
- `.../README.md` + `docs/features.md` (five→twenty starter templates, truthful list)
- this report
**Checks:**
- `yarn typecheck` (a2e-documents) → clean (no output)
- `yarn lint` → `Found 0 warnings and 0 errors` (77 files)
- `yarn test:unit` → `tests 221 / pass 221 / fail 0` (was 197; +20 per-descriptor +1 uniqueness +the updated list/delta)
- `npx twenty dev:build .` → `Build succeeded (28 files)`; built `post-install.mjs` carries 20 `title: "Mod\xE8le …"` descriptors
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 214 local inline links`
**Missing for tick:** Tier 2 (orchestrator): install/reinstall `a2e-documents` in a browser and observe all 20 templates appear in the gallery + a template opens with content, and no duplicate on reinstall.
**Do not redo:** the descriptor shape (`{title, markdown}`) and the seeder contract — the app already seeds via `findMissingStarterTemplates` (missing-titles-only) into the `_document` tree; extending the constant is all the "delta" needs. Do not rebuild the template-copy/instantiate path.
**Remaining:** US-104…107 (sibling M9c families), then US-117/US-118/US-119/US-120.
**Next:** US-104 (a2e-projects, 10 missing project templates) per Ralph's queue; the descriptor contract (key/version/labels fr/en/category) is US-117's scope, not this slice's.

### Seeder note (why post-install.ts changed)
`findExistingTemplateTitles` read `first: 30`. At 5 shipped titles that left 25 slots of headroom; at 20 it leaves 10, so a workspace with >10 user-created templates could push a shipped title off the page under a newest-first ordering and the missing-titles delta would re-seed a duplicate. Raised to `first: 200` so the delta stays exhaustive regardless of ordering. Writes are still titles-only into the `_document` tree — the recorded seeder contract is untouched.

### fr+en note (deliberate deviation, not a defect)
This app's content is French-only by construction: all 5 pre-existing descriptors, every sibling family (a2e-projects `starter-projects.ts`, a2e-accounting `fiche-templates.ts`) and the post-install welcome doc are French, and there is no i18n layer in `packages/twenty-apps/internal/*`. The `key/version/labels fr+en/category` descriptor contract named in the AC is US-117's deliverable ("Define the descriptor shape once … each app exposes its templates through its existing lib constants + a logic function returning descriptors"); inventing it here would pre-empt US-117 and add an unconsumed parallel shape. The titles are the user-facing seed strings and are curated French; the fr+en label surface lands with US-117. No catalogs touched.

CLAIMED — US-104/project-templates — deepseek-v4.1-flash — 2026-09-29T20:30:00Z — base 47137f6de6fe997c35c0a8f704b00fd07f6c9683

## 2026-09-29 20:36 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-104 M9c family: 12 curated Bureau project templates (a2e-projects) · **Slice:** the 12-project family content — add the 10 missing descriptors + seeder headroom + per-descriptor tests + patch bump
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 live-install leg is absent. Two documented content-slice conventions: the fr+en `labels` surface is US-117's contract, and the descriptor field is `name` (existing shape), not `title`.
**Base:** 47137f6de6fe997c35c0a8f704b00fd07f6c9683
**Changed:**
- `packages/twenty-apps/internal/a2e-projects/src/lib/starter-projects.ts` (+10 descriptors: sprint board SPR, content calendar CNT, hiring pipeline REC, client onboarding ONB, website redesign WEB, student semester SEM, association AG AGA, grant application SUB, bug tracker BUG, personal goals/habits OBJ; corrected the header comment repeat-safe-by-*name*→*key*)
- `.../src/lib/__tests__/starter-projects.test.ts` (12-key bundle assertion, Bilan-link test, one `descriptor « … » is shaped and instantiable` test per descriptor via a loop, delta keys-on-key-not-name test, delta expectation extended to 11)
- `.../src/logic-functions/post-install.ts` (project read `first: 30`→`200` + WHY comment; header + logic-function description two→twelve)
- `.../package.json` (0.1.11→0.1.12)
- `.../README.md` + `docs/features.md` (two→twelve starter projects, truthful list)
- this report
**Checks:**
- `yarn typecheck` (a2e-projects) → clean (no output)
- `yarn lint` → `Found 1 warning and 0 errors` (143 files; the 1 warning is the pre-existing `task-labels.field.ts` unused `OnDeleteAction`)
- `yarn test:unit` → `tests 297 / pass 297 / fail 0` (was 285; +10 per-descriptor + Bilan-link + keys-not-name +12→12 list)
- `npx twenty dev:build .` → `Build succeeded (40 files)`
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 214 local inline links`
**Missing for tick:** Tier 2 (orchestrator): install/reinstall `a2e-projects` in a browser and observe all 12 projects seed with tasks+milestones, and no duplicate project on reinstall.
**Do not redo:** the `findMissingStarterProjects` delta is data-driven by `key` and already handles a larger bundle — extending the constant is the whole change; do not rebuild the create/seed path. The grant-application Bilan link is *text only* in the description (no install, no required app).
**Remaining:** US-105…107 (sibling M9c families), then US-117/US-118/US-119/US-120.
**Next:** US-105 (next M9c family) per Ralph's queue; the descriptor contract (key/version/labels fr/en/category) remains US-117's scope.

### fr+en / title note (content-slice convention, not a defect)
Same as US-103: `packages/twenty-apps/internal/*` has no i18n layer, every content family (this app's 2 originals, a2e-documents, a2e-accounting) is French-only, and the AC's `(title/key fr+en)` contract names US-117's not-yet-built `key/version/labels fr+en/category` descriptor. The existing `StarterProjectTemplate` field is `name` (not `title`); the slice matches the real shape and keeps names curated French. No catalogs touched.

CLAIMED — US-105/bilan-templates — deepseek-v4.1-flash — 2026-09-29T22:40:00Z — base 259cfcdf58bb70ccb4d53a598c93cd2527fe9314

## 2026-09-29 22:52 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-105 M9c family: Bilan templates — personal monthly budget + freelancer invoicing kit (a2e-accounting) · **Slice:** the two missing Bilan descriptors — personal monthly budget (existing charges/produits budget shape) + freelancer quote→invoice→payment-reminders kit — as `withTemplateDefaults` descriptors, plus the fiche `templateKey` select options, per-descriptor tests and one patch bump
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 live-install leg is absent. Two documented content-slice conventions: the fr+en `labels` surface is US-117's contract, and the invoice builder stays P7-gated (descriptor only).
**Base:** 259cfcdf58bb70ccb4d53a598c93cd2527fe9314
**Changed:**
- `packages/twenty-apps/internal/a2e-accounting/src/lib/fiche-templates.ts` (+2 keys: `BUDGET_MENSUEL_PERSONNEL`, `KIT_FACTURATION_INDEPENDANT`; +2 `FICHE_TEMPLATES` descriptors; + `PERSONAL_BUDGET_CHARGES`/`PERSONAL_BUDGET_PRODUITS`, all amounts 0)
- `.../src/objects/fiche.object.ts` (+2 `templateKey` select options, positions 8/9, additive — no renumbering of the existing 8)
- `.../src/lib/__tests__/fiches.test.ts` (length 8→10 + renamed shape test; +2 per-descriptor tests)
- `.../package.json` (0.1.0→0.1.1)
- `.../README.md` + `docs/features.md` (Fiches/Bilan rows mention the two new templates, truthful)
- this report
**Checks:**
- `yarn typecheck` (a2e-accounting) → clean (exit 0, no output)
- `yarn lint` → `Found 0 warnings and 0 errors` (106 files)
- `yarn test:unit` → `tests 108 / pass 108 / fail 0` (was 106; +2 per-descriptor)
- `npx twenty dev:build .` → `Build succeeded (28 files)`
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 214 local inline links`
**Missing for tick:** Tier 2 (orchestrator): install/reinstall `a2e-accounting` in a browser and observe the 10 Bilan templates listed in the gallery (8 fiches + budget mensuel + kit de facturation) with no duplicate on reinstall.
**Do not redo:** the fiche descriptor contract (`{key,label,defaultTitle,description,sections,defaultData}` + `withTemplateDefaults`) — the two new templates are appended to it; the fiche `templateKey` select is now the 10-value editor contract. The 8 existing fiche descriptors and tests already covered their keys (the loop test was extended, not rewritten).
**Remaining:** US-106…107 (sibling M9c families), then US-117/US-118/US-119/US-120.
**Next:** US-106 (a2e-drive folder structures) or US-107 (recipes) per Ralph's queue; the descriptor contract (key/version/labels fr/en/category) remains US-117's scope.

### Scope note (why not seeded / why the object select changed)
The AC asks for the two templates "as template descriptors reusing the `withTemplateDefaults` contract": both are now `FICHE_TEMPLATES` entries whose `defaultData` backfills through `withTemplateDefaults`. They are **gallery descriptors**, not extra install-time `STARTER_FICHES`: the AC's bullet 3 scopes this slice to descriptor coverage, and C6 forbids extending seeds toward financial content, so the install output (`STARTER_FICHES` = 2 draft fiches) is deliberately unchanged. The fiche object's `templateKey` select was extended because a fiche cannot carry a key the editor's select rejects — that select is the other half of "the editor contract". No invoice-builder logic was built (P7-gated); the freelancer kit is descriptor/data only, all amounts zero.

### fr+en note (content-slice convention, not a defect)
Same as US-103/US-104: `packages/twenty-apps/internal/*` has no i18n layer, every content family (this app's 10 templates, a2e-documents, a2e-projects) is French, and the `key/version/labels fr+en/category` contract named in the AC is US-117's deliverable. Inventing it here would pre-empt US-117 and add an unconsumed parallel shape. No catalogs touched.

CLAIMED — US-106/folder-structures — deepseek-v4.1-flash — 2026-09-29T20:42:15Z — base 173f6bb0353f5c0bae6d41b8d63df7091adce2db

## 2026-09-29 20:46 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-106 M9c family: Archive folder-structure templates ×4 (a2e-drive) · **Slice:** the four Archive folder-structure descriptors + idempotent install apply + per-descriptor/handler tests + patch bump
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 live-install leg is absent.
**Base:** 173f6bb0353f5c0bae6d41b8d63df7091adce2db
**Changed:**
- `packages/twenty-apps/internal/a2e-drive/src/lib/folder-structure-templates.ts` (NEW: `FolderStructureTemplate` descriptors `CLIENT`/`ASSOCIATION`/`ETUDIANT`/`ADMINISTRATION_ENTREPRISE` — `key`, `version`, `labels` fr+en, `category`, `requiredApps`, `tree`; `findMissingFolderStructureTemplates` delta by key; `flattenFolderStructureTemplate` parent-before-child drafts)
- `.../src/lib/__tests__/folder-structure-templates.test.ts` (NEW: family + one test per descriptor + ordering + delta + unknown key)
- `.../src/logic-functions/handlers/seed-folder-structures-handler.ts` (NEW: injectable client; folders only; `templateKey` provenance delta)
- `.../src/logic-functions/__tests__/seed-folder-structures-handler.test.ts` (NEW: fresh / child parenting / re-apply no-op / partial delta)
- `.../src/logic-functions/post-install.ts` (NEW: auto-discovered `definePostInstallLogicFunction`)
- `.../src/objects/drive-folder.object.ts` (+nullable `templateKey` TEXT provenance field)
- `.../src/constants/universal-identifiers.ts` (+`FOLDER_FIELD_IDS.templateKey`, +`LOGIC_FUNCTION_IDS.postInstall`)
- `.../package.json` (0.1.1→0.1.2)
- `.../README.md` (folders section + folder-structure templates subsection, truthful)
- this report
**Checks:**
- `yarn typecheck` (a2e-drive) → clean (exit 0, no output)
- `yarn lint` → `Found 0 warnings and 0 errors` (41 files)
- `yarn test:unit` → `tests 87 / pass 87 / fail 0` (was 75; +8 descriptor, +4 handler)
- `npx twenty dev:build .` → `Build succeeded (12 files)`; manifest carries the `templateKey` field and the `post-install` hook
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 217 local inline links`
**Missing for tick:** Tier 2 (orchestrator): install/reinstall `a2e-drive` in a browser and observe the four folder trees (Client, Association, Étudiant, Administration) created once, with no duplicate on reinstall.
**Do not redo:** the `FolderStructureTemplate` descriptor contract and the `flattenFolderStructureTemplate` pre-order; the `driveFolder.templateKey` provenance field + `{ templateKey: { is: 'NOT_NULL' } }` delta; the handler's folders-only write path (no attachment/file mutation). Extending the family is constant-only; the seeder needs no change.
**Remaining:** US-107 (recipes), then US-117/US-118/US-119/US-120.
**Next:** US-107 per Ralph's queue; the descriptor contract's richer `preview`/`inputs` fields (if any) remain US-117's scope.

### Scope note (why a field + an install seed, and why not descriptor-only)
US-106's AC (unlike US-103/104/105) explicitly requires `key/version/labels fr+en/category/required apps` and an idempotent apply "delta by a stable key/provenance on the descriptor", so the fr+en labels ARE implemented here, not deferred to US-117. A `driveFolder` had no stable marker to delta on — its `name` is user-editable — so a nullable `templateKey` provenance field (the same app-side provenance shape as fiches' `templateKey`/bookSheets' `systemKey`, C1 §5.1) was added and every seeded folder is tagged with its descriptor key. The brief said a2e-drive already had a post-install path; it did not, so the auto-discovered `post-install` hook now performs the apply. The seeder writes `driveFolder` rows only — never an attachment or file record.

CLAIMED — US-107/workflow-recipes-family — deepseek-v4.1-flash — 2026-09-29T20:53:00Z — base 6e77f853fa0f35b4b66b09b92f7f7c39fd2e6bdf

## 2026-09-29 21:01 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-107 M9c family: cross-app workflow recipes ≥6 (workflow engine, opt-in, previewed) · **Slice:** the recipe family — descriptor registry (2 existing + 3 new + 1 P7-deferred), the 3 non-P7 recipes as workflow templates (pure plan + validator + inline-typed logic-function action + idempotent handler), per-recipe tests, one patch bump
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 live materialization/firing/replay leg is absent.
**Base:** 6e77f853fa0f35b4b66b09b92f7f7c39fd2e6bdf
**Changed:** `packages/twenty-apps/internal/a2e-projects/` — new `src/lib/recipe-correlation.ts` (shared C5 `<recipeKey>@v<n>:<workspace>:<object>:<record>` key); new `src/lib/meeting-notes-recipe.ts`, `file-review-recipe.ts`, `task-due-reminder-recipe.ts` (pure correlation key + title derivation + preview writes plan); new `src/lib/workflow-recipes.ts` (C1 descriptor registry: key/version/fr+en labels/category/requiredApps/preview writes for all 6, invoice-paid recorded `DEFERRED` gatedBy P7, `validateWorkflowRecipeDescriptors`); `src/lib/recurring-task-generator.ts` (+`RECURRING_TASK_GENERATOR_RECIPE_KEY/_VERSION`); new `src/workflow-templates/meeting-notes.workflow.ts`, `file-review.workflow.ts`, `task-due-reminder.workflow.ts` (DATABASE_EVENT trigger + one LOGIC_FUNCTION step + validator rejecting foreign/invoice steps); new `src/logic-functions/{meeting-notes-page,file-review-task,task-due-reminder}.logic-function.ts` (inline-typed handler → inferred workflow-action inputSchema; `workflowActionTriggerSettings`) + `handlers/*` (idempotent: document/task by persisted `recipeCorrelationKey`, calendar reminder by `iCalUid`; file without project → `SKIPPED`); new `src/fields/task-recipe-correlation-key.field.ts`, `document-recipe-correlation-key.field.ts`; `src/constants/universal-identifiers.ts` (+`DOCUMENT_FIELD_IDS.recipeCorrelationKey`, +`TASK_FIELD_IDS.recipeCorrelationKey`, +3 logic-function ids); new specs (lib: `meeting-notes-recipe` 4, `file-review-recipe` 4, `task-due-reminder-recipe` 4, `workflow-recipes` 5, `meeting-notes-workflow` 4, `file-review-workflow` 3, `task-due-reminder-workflow` 3; handlers: `meeting-notes-page` 3, `file-review-task` 4, `task-due-reminder` 4); `package.json` (0.1.12→0.1.13); this report.
**Checks:** `yarn typecheck` → exit 0; `yarn lint` → 0 errors / 1 pre-existing warning (`task-labels.field.ts` unused `OnDeleteAction`, not mine); `yarn test:unit` → tests 335 / pass 335 / fail 0; `npx twenty dev:build .` → `Build succeeded (46 files)`, manifest carries the 3 actions with inferred `inputSchema` (`meeting-notes-page`, `file-review-task`, `task-due-reminder`) and the new `recipeCorrelationKey` fields.
**Missing for tick:** Tier 2 (orchestrator): install/reinstall a2e-projects, materialize each recipe via the engine, fire it, and prove one write per trigger with no duplicate on replay (US-014 precedent). The generic `createCalendarEvents` core path is not live-verified here (unit-tested against a stub only) — flag if the core API rejects local calendar-event creation.
**Do not redo:** the `workflow-recipes.ts` registry + validators; the three pure plans and their correlation keys; the handlers' persisted-provenance idempotency (document/task `recipeCorrelationKey`, calendar `iCalUid`) and the no-project `SKIPPED` degrade.
**Remaining:** US-117/US-118/US-119/US-120 after this family, plus the M9c sibling slices already reported.
**Next:** orchestrator Tier-2 proof above; then US-117 consumes these descriptors (recipe `preview` entries are the family's own C1 declarations, extendable without touching recipe logic).

### Scope note (why descriptors, why two provenance fields, why not the invoice recipe)
US-107's AC explicitly asks to "add descriptor entries … so the family lists ≥6" and that "each recipe declares its writes per the C1 preview contract", so a local registry (`workflow-recipes.ts`) carries the fr+en labels/category/preview for US-117 to consume — same shape US-106 shipped, not a pre-emption of US-117 (which owns the cross-app descriptor logic functions). Idempotency needs a stable marker on each target: `project.recipeCorrelationKey` already existed; `task`/`document` gained the same nullable TEXT slot (app-owned fields, additive, no server migration). `calendarEvent.reminderMinutes` + `iCalUid` are the existing native reminder primitives — no notification engine is built. The invoice-paid recipe is listed `DEFERRED` with no preview writes and every ready validator rejects invoice/accounting steps while P7 is blocked; it is recorded, never built.

CLAIMED — US-117/template-descriptor-contract — deepseek-v4.1-flash — 2026-09-29T22:50:45Z — base 50b4c21df8330d036a14105ab14cbdd147db5f8d

## 2026-09-30 00:00 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-117 M9a-1: template descriptor contract (C1) + per-app descriptor logic functions · **Slice:** the whole task — C1 contract in twenty-shared + one read-only descriptor function per installed app (documents/projects/accounting/drive) + per-app tests + one patch bump each
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 live-execution leg is absent. Resumed two dead-run partials (Ralph iterations 18/19, uncommitted); no competing `CLAIMED`.
**Base:** 50b4c21df8330d036a14105ab14cbdd147db5f8d
**Changed:**
- `packages/twenty-shared/src/application/templateDescriptorType.ts` (NEW: `TemplateDescriptor` = key/version/labels fr+en/category/preview writes/requiredApps/inputs; `TemplateDescriptorLabels|Category|Input|PreviewWrite|Validation`)
- `packages/twenty-shared/src/application/templateDescriptorGuards.ts` (NEW: structural `isTemplateDescriptor*` guards + `validateTemplateDescriptors` cross-descriptor key/self-require checks)
- `packages/twenty-shared/src/application/__tests__/template-descriptor.spec.ts` (NEW: 7 tests) + `src/application/index.ts` (barrel regenerated by build)
- `a2e-documents`: NEW `src/lib/document-template-descriptors.ts` + `src/logic-functions/list-template-descriptors.ts` + `__tests__/document-template-descriptors.test.ts`; `src/constants/universal-identifiers.ts` (+`listTemplateDescriptors` `…000009`); `package.json` 0.2.6→0.2.7
- `a2e-projects`: NEW `src/lib/project-template-descriptors.ts` + `src/logic-functions/list-template-descriptors.ts` + `__tests__/project-template-descriptors.test.ts`; `src/constants/universal-identifiers.ts` (+`listTemplateDescriptors` `…000015`); `package.json` 0.1.15→0.1.16
- `a2e-accounting`: NEW `src/lib/fiche-template-descriptors.ts` + `src/logic-functions/list-template-descriptors.ts` + `__tests__/fiche-template-descriptors.test.ts`; `src/constants/universal-identifiers.ts` (+`listTemplateDescriptors` `…00000d`); `package.json` 0.1.1→0.1.2
- `a2e-drive`: NEW `src/lib/folder-structure-descriptors.ts` + `src/logic-functions/list-template-descriptors.ts` + `__tests__/folder-structure-descriptors.test.ts`; `src/constants/universal-identifiers.ts` (+`listTemplateDescriptors` `…000006`); `package.json` 0.1.2→0.1.3
- deleted the dead-run probe `a2e-documents/src/lib/__twenty-shared-probe.ts`; this report
**Checks:**
- `npx nx build twenty-shared --skip-nx-cache` → `Successfully ran target build`
- `cd packages/twenty-shared && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `cd packages/twenty-shared && npx jest src/application/__tests__/template-descriptor.spec.ts --config=jest.config.mjs` → `7 passed`
- documents: `yarn typecheck` exit 0 · `yarn lint` 0/0 (82 files) · `yarn test:unit` 227/227 · `npx twenty dev:build .` `Build succeeded (30 files)`
- projects: `yarn typecheck` exit 0 · `yarn lint` 0 errors/1 pre-existing warning (`task-labels.field.ts` unused `OnDeleteAction`, not mine) · `yarn test:unit` 342/342 · `npx twenty dev:build .` `Build succeeded (50 files)`
- accounting: `yarn typecheck` exit 0 · `yarn lint` 0/0 (109 files) · `yarn test:unit` 113/113 · `npx twenty dev:build .` `Build succeeded (30 files)`
- drive: `yarn typecheck` exit 0 · `yarn lint` 0/0 (44 files) · `yarn test:unit` 91/91 · `npx twenty dev:build .` `Build succeeded (14 files)`
- each app manifest carries `list-template-descriptors` with **no** `toolTriggerSettings` (documents 9 / projects 14 / accounting 12 / drive 6 logic functions)
- `node docs/scripts/check-docs.mjs` → `PASS: 26 maintained documents, 217 local inline links`
**Missing for tick:** Tier 2 (orchestrator): install/reinstall a workspace and invoke each app's `list-template-descriptors`, observing the families (documents 20 pages, projects 12 projects, accounting 10 fiches, drive 4 folder structures).
**Do not redo:** the four `lib/*descriptors.ts` projections + their logic functions; the twenty-shared C1 contract/guards; the US-103…107 family suites (untouched, green). The projection is constant-only: extending a family is a constant change, no descriptor-module change.
**Remaining:** 13 other pending tasks (US-118 → US-119 → US-120, then US-121…US-130).
**Next:** orchestrator Tier-2; then US-118 gallery consumes each app's `{ templates }` return.

### Resume note (dead-run partials)
Two Ralph iterations (2026-09-30 00:31 / 00:35, logs under `.ralph-tui/iterations/*US-117*`) died mid-task leaving uncommitted: the shared contract, the documents `lib/document-template-descriptors.ts` + `logic-functions/list-template-descriptors.ts`, uid edits and a `__twenty-shared-probe.ts`. No `CLAIMED` line existed for US-117 in this report, so per §0 these are this task's own dead-run artifacts, not another executor's work; I resumed them, deleted the probe, dropped an extra `description` field the prior run had added (contract is now exactly the AC's seven fields), and completed projects/accounting/drive.

### twenty-shared coupling (must-know for orchestrator)
Apps import `type TemplateDescriptor` from `twenty-shared/application`; it is a **type-only** import, so each `.twenty/output/*.mjs` inlines no twenty-shared runtime code (verified: no `twenty-shared` require in the built logic-function bundles). However, the apps' `tsc` and `node --test` resolve `twenty-shared/dist`, which is untracked per-branch state — **`npx nx build twenty-shared --skip-nx-cache` must run before any app typecheck/test**. This deliberately re-introduces the coupling the older "apps import neither twenty-shared nor each other" note warned about; the AC explicitly sanctions twenty-shared as the single contract home, and the gate line names the rebuild, so it is recorded rather than worked around.

### Recipes boundary (why a2e-projects lists 12, not 18)
US-107 already ships `workflow-recipes.ts` with its own `WorkflowRecipeDescriptor` (key/version/fr+en labels/category/requiredApps/status/preview, incl. the DEFERRED invoice recipe). US-117's AC names only the four content-template apps, and the task note defers recipes to "their own slice", so `a2e-projects`'s descriptor function exposes the 12 project templates only. US-118 may merge both sources; no recipe descriptor was re-declared or rewritten.

CLAIMED — US-118/gallery-surface — deepseek-v4.1-flash — 2026-09-30T03:44:35Z — base 4b444e7bb73815b31ba5be1bbc08b463bc05947d

## 2026-09-30 03:44 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-118 M9a-2: gallery surface — one host surface with categories, search, preview, Use template / Blank · **Slice:** the new front module `packages/twenty-front/src/modules/template-gallery/` — the gallery's install-gated data layer (consumes the US-117 descriptors) + the presentational surface (categories, search, preview pane, Use template / Blank)
**Claim:** partial
**Ready-to-tick:** no — the gallery surface + data layer exist and are green, but the AC's entry-points (Cmd+K `Templates`, every existing `New` surface, app landing pages) are NOT wired this session, and the app-side `applyTemplateByKey` logic functions the "Use template" callback must call do not exist yet. See Next / Missing.
**Base:** 4b444e7bb73815b31ba5be1bbc08b463bc05947d
**Changed:**
- `packages/twenty-front/src/modules/template-gallery/types/TemplateGalleryItem.ts` (NEW)
- `.../types/TemplateGalleryDescriptorGroup.ts` (NEW)
- `.../constants/TemplateDescriptorLogicFunctionName.ts` (NEW: well-known `list-template-descriptors` name)
- `.../constants/TemplateGalleryCategoryConfig.ts` (NEW: per-category fr+en label + canonical icon)
- `.../utils/collectTemplateDescriptorLogicFunctions.ts` (NEW: resolve each installed app's descriptor function by name+application)
- `.../utils/buildTemplateGalleryItems.ts` (NEW: install-gated projection — `available` = every `requiredApps` installed)
- `.../utils/filterTemplateGalleryItems.ts` (NEW: category + diacritic-insensitive search)
- `.../hooks/useTemplateGalleryItems.ts` (NEW: executes each installed app's descriptor function via `ExecuteOneLogicFunctionDocument`, validates with `isTemplateDescriptor`, merges into items; a failing function degrades to skipped)
- `.../components/TemplateGallery.tsx` (NEW: search box, category tabs, template list, descriptor preview pane, `Use template`/`Blank` host callbacks, locale-aware fr/en labels, unavailable safe state + disabled apply)
- 4 test files (3 utils + 1 component, 18 tests); this report
**Checks:**
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `cd packages/twenty-front && npx oxlint --type-aware -c .oxlintrc.json src/modules/template-gallery` → `Found 0 warnings and 0 errors` (13 files)
- `cd packages/twenty-front && npx oxfmt --check src/modules/template-gallery` → `All matched files use the correct format.`
- `cd packages/twenty-front && npx jest src/modules/template-gallery --config=jest.config.mjs` → `4 passed / 18 tests` (0 snapshots)
- no `locales/**` touched
**Missing for tick:**
- **Entry-points (AC 3):** `SidePanelPages.TemplatesGallery` + a `SidePanelTemplatesGalleryPage` + a Cmd+K `TemplatesCommand` + openers from the existing `New` surfaces / app landing pages are NOT added. The surface is self-contained with host callbacks; mounting is the next slice.
- **Use-template write path (AC 4):** app-side `applyTemplateByKey` logic functions do not exist (US-117 shipped read-only `list-template-descriptors`; only a2e-documents has an instantiate path, keyed by a live document id, not descriptor key).
- **Tier 2 (orchestrator):** E15 gallery browser journey + live execution of each app's `list-template-descriptors`.
**Do not redo:** the gallery module's data layer and surface. Install-gating lives in `buildTemplateGalleryItems` (`requiredApps` is the single source of truth). Search/filter is pure and tested. The presentational surface takes `items` + `onUseTemplate`/`onBlank`, so the mounting slice only supplies host wiring. `twenty(max-consts-per-file)` only applies under `**/constants/*.ts`; both constants files export a single const.
**Remaining:** 13 other pending tasks (US-118 → US-119 → US-120, then US-121…US-130).
**Next:** (1) add the four app-side `applyTemplateByKey` logic functions (additive, patch bump each: documents extract the `buildTemplateCopyPayload`/`post-install` path keyed by descriptor key; projects/accounting/drive extract their `post-install` seeding into a keyed handler); (2) mount the surface (`SidePanelPages.TemplatesGallery` in twenty-shared, a side-panel page wired to `useTemplateGalleryItems` + the apply functions, a `TemplatesCommand`, and a `New`-surface opener); (3) Tier-2 E15 by the orchestrator.

### Scope note (why a data-layer+surface slice, not the full AC)
US-118's AC spans three separable pieces: the gallery module (this slice), the per-app callable apply functions, and the shell entry-points. Per the executor contract the slice is the task's first unmet bullet; this session built the module and the surface it renders, leaving entry-points and the write-path for the next slice rather than half-wiring an untestable shell. Two honest deviations: (a) "Use template" is a host callback, not yet bound to an apply logic function, because no app exposes one keyed by descriptor key — inventing a consumer-side copy would fork the template-copy path the C1 note warns against; (b) entry-points are deliberately deferred so the next session lands them together with their command tests.
