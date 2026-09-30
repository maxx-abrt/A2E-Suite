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

CLAIMED — US-119/save-as-template-builders — deepseek-v4.1-flash — 2026-09-30T04:12:00Z — base e7d33444b8286f615fcb3a258a93c8e23a44314a

## 2026-09-30 04:32 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-119 M9b: workspace templates — 'Save as template' for project (+tasks), board view, Bilan fiche · **Slice:** the save-as-template payload builders (AC2) + the persisted `isTemplate` marker on project/fiche (AC1) + per-builder unit tests (AC4) + one patch bump each (AC5)
**Claim:** done-for-review
**Ready-to-tick:** no — the builders and markers are green, but the AC's own mount ("the save action mounts from the gallery/record surfaces") is unwired: it inherits US-118's still-open entry-points slice, and the save→instantiate round-trip is the Tier-2 browser leg. All Tier-0 gates are green.
**Base:** e7d33444b8286f615fcb3a258a93c8e23a44314a
**Changed:**
- `a2e-projects/src/lib/save-project-as-template.ts` (NEW: `PROJECT_TEMPLATE_TITLE_PREFIX`, prefix-once title + copy-title strip, `buildSaveProjectAsTemplatePayload` snapshotting project + tasks with `sourceId`-keyed relations, `buildProjectFromTemplatePayload` minting fresh task ids and remapping parent/blocked-by to the copy, project link to the fresh `projectId`)
- `a2e-projects/src/lib/save-board-view-as-template.ts` (NEW: board-view manifest template — prefix-once name, `isTemplate` payload marker, instantiate re-mints every view/field/filterGroup/filter/group/sort universal identifier and rewrites group refs, dangling refs dropped)
- `a2e-projects/src/lib/__tests__/save-project-as-template.test.ts` + `save-board-view-as-template.test.ts` (NEW: 15 tests incl. non-aliasing on save and two independent instantiations)
- `a2e-projects/src/objects/project.object.ts` (+ BOOLEAN `isTemplate`, default false) + `constants/universal-identifiers.ts` (+`PROJECT_FIELD_IDS.isTemplate` `…0000e`)
- `a2e-accounting/src/lib/save-fiche-as-template.ts` (NEW: prefix-once title, layout-only payload — status/dates/exports/amount/savedSubvention excluded, deep-cloned `data`, `buildFicheFromTemplatePayload` marker off + prefix stripped)
- `a2e-accounting/src/lib/__tests__/save-fiche-as-template.test.ts` (NEW: 8 tests incl. deep-clone non-aliasing both directions)
- `a2e-accounting/src/objects/fiche.object.ts` (+ BOOLEAN `isTemplate`, default false) + `constants/field-identifiers.ts` (+`FIELD_IDS.fiche.isTemplate` `…000c`)
- both `package.json` (projects 0.1.16→0.1.17; accounting 0.1.2→0.1.3); this report
**Checks:**
- `npx nx build twenty-shared --skip-nx-cache` → `Successfully ran target build`
- a2e-projects: `yarn typecheck` exit 0 · `yarn lint` 0 errors / 1 pre-existing warning (`task-labels.field.ts` unused `OnDeleteAction`, not mine) · `yarn test:unit` 357/357 (was 342; +15) · `npx twenty dev:build .` `Build succeeded (50 files)`; manifest carries project `isTemplate` BOOLEAN
- a2e-accounting: `yarn typecheck` exit 0 · `yarn lint` 0/0 (111 files) · `yarn test:unit` 121/121 (was 113; +8) · `npx twenty dev:build .` `Build succeeded (30 files)`; manifest carries fiche `isTemplate` BOOLEAN
- documents contract suites (unchanged): `save-document-as-template` + `instantiate-template` + `document-template-descriptors` → 31/31 pass
- no `locales/**` touched
**Missing for tick:** (1) AC mount — the save action has no gallery/record surface entry-point; that is US-118's open entry-point slice (its gallery module is not mounted either). (2) AC Tier-2 — save→instantiate round-trip + non-aliasing proof in a browser. (3) AC3's live deletion/editing independence proof (payload-level non-aliasing is unit-tested).
**Do not redo:** the three builder modules and their tests; the project/fiche `isTemplate` fields (additive, defaults false). The documents `save-document-as-template.ts`/`instantiate-template.ts` path is the pattern source, untouched and green. Board-view marker is payload-side (see note) — do not add a core `view` column.
**Remaining:** US-119 mount leg, then US-120 (M9d), then US-121…US-130.
**Next:** mount the save action (record surfaces + gallery) and the US-118 gallery entry-points together; then the orchestrator Tier-2 round-trip.

### Provenance interpretation + board-view deviation (recorded, not silent)
AC1 says "an `isTemplate` flag + provenance on the existing object, as the documents template-copy helper does". The documents helper and the pre-existing Bilan `bookSheet.isTemplate` both use a single marker on the record (the discriminator), not a separate provenance table; this slice mirrors that exactly — `project.isTemplate` / `fiche.isTemplate` are the marker, and C1's no-aliasing rule is enforced in the payloads (fresh ids on instantiate, deep clones, no source ids). The core `view` object has no app-owned column and apps cannot pin a field on it (`view` is absent from `STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS`), so the board-view template marker lives in the payload contract plus the prefix-once name; the persistence slice maps it. Adding a core-view column would need a server migration and is out of this app slice.

### Dependency note (US-118 partial → this is its first buildable successor bullet)
US-118's own report is `partial` (gallery module + surface exist; Cmd+K/New-surface entry-points and the app-side apply path do not), yet Ralph's engine committed it and advanced the queue to US-119. Per the executor contract this slice takes US-119's first unmet bullet (the payload builders, AC2) which is self-contained and does not need the gallery mounted; the AC's mount leg is left to the slice that lands US-118's entry-points, so the two compose rather than fork.

CLAIMED — US-120/M9d-persona-gallery-keys — deepseek-v4.1-flash — 2026-09-30T18:10:35Z — base 07d26eb5bdec6e6f2c502e279b01960f59e4ebec

## 2026-09-30 18:45 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-120 M9d: persona presets reference gallery template keys (fixes G14 together with M2) · **Slice:** the whole task — wire each preset's proposed bundle item to the US-117 gallery descriptor key it references + per-app drift-guard unit tests
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gate suites green; only the Tier-2 browser persona-apply leg is absent. D02-gated app-set expansion (Agenda/Archive/Projects/Syna) is recorded, not pre-empted, per AC2.
**Base:** 07d26eb5bdec6e6f2c502e279b01960f59e4ebec
**Changed:**
- `packages/twenty-server/src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant.ts` (+optional `templateKey` on `WorkspaceTemplateBundleContent`/`WorkspaceTemplateBlockedBundleContent` + the `bundleContent`/`blockedBundleContent` helpers; documents items `notes-de-reunion`/`brief-de-projet`/`specifications-produit-prd`/`entretien-individuel`, blocked Bilan items `BUDGET_EQUILIBRE`/`DEMANDE_SUBVENTION`; WHY comment records the D02 app-set gate)
- `packages/twenty-apps/internal/a2e-documents/src/lib/__tests__/persona-template-bundle-keys.test.ts` (NEW: reads the server preset constant, extracts the document `bundleContent(...)` keys by app UUID, asserts each resolves to a shipped `buildDocumentTemplateDescriptors()` key)
- `packages/twenty-apps/internal/a2e-accounting/src/lib/__tests__/persona-template-bundle-keys.test.ts` (NEW: same for the blocked Bilan `blockedBundleContent(...)` keys vs `buildFicheTemplateDescriptors()`)
- this report
**Checks:**
- `npx nx build twenty-shared --skip-nx-cache` → `Successfully ran target build`
- a2e-documents: `yarn typecheck` exit 0 · `yarn lint` 0 warnings/0 errors (83 files) · `yarn test:unit` 229/229 (was 227; +2)
- a2e-accounting: `yarn typecheck` exit 0 · `yarn lint` 0/0 (112 files) · `yarn test:unit` 123/123 (was 121; +2)
- twenty-server: `npx tsgo -p tsconfig.json --noEmit` exit 0 · `npx jest --config=jest.config.mjs src/engine/core-modules/onboarding` → 11 suites / 97 tests pass
- twenty-front: `npx tsgo -p tsconfig.json --noEmit` exit 0 · `npx jest src/modules/a2e-workspace/constants/__tests__/A2eWorkspaceTemplates.test.ts` → 13/13 pass (US-090 copy spec untouched)
- `npx oxlint --type-aware -c .oxlintrc.json <server constant>` → 0/0; `npx oxfmt --check <server constant>` → correct; no `locales/**` touched
**Missing for tick:** Tier 2 (orchestrator): apply each persona in a browser and observe seeded content rows > 0 (M2b leg). No server schema change, so no migration.
**Do not redo:** the `templateKey` wiring + the two app drift-guard specs. The key is declarative on the proposal (`starterBundleContents` is preview-only; seeding stays in each app's post-install hook, D02 owns final contents) — do not add a second seeding path. `getHiddenStandardNavigationMenuItemUniversalIdentifiers` / apply / retry idempotency are untouched and green.
**Note (adjacent pre-existing defect, not this slice):** `a2e-documents/src/lib/document-template-descriptors.ts`'s `DOCUMENT_TEMPLATE_EN_LABELS` map keys several entries wrong (`notes-reunion` vs the real slug `notes-de-reunion`, `brief-projet` vs `brief-de-projet`, `accueil-wiki-equipe`, `guide-integration`, `journal-decisions-adr`), so those en labels silently fall back to French. This is US-117's map, not the preset wiring; the corrected `templateKey` references above use the real slugs. Left for a US-117 follow-up rather than scope-creeping this slice.
**Remaining:** US-118's open entry-points mount leg + US-119's save-action mount leg, then US-121…US-130.
**Next:** orchestrator Tier-2 persona-apply proof; or, if the queue advances, US-121 (M8a-1 slash-menu structural blocks).

CLAIMED — US-121/structural-blocks — deepseek-v4.1-flash — 2026-09-30T19:02:22Z — base 285d4317509a7651cdec5fd0d5e20807bad15654

## 2026-09-30 19:40 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-121 M8a-1: slash menu core/structural blocks (toggle, columns, divider, quote, code+language, table, ToC) · **Slice:** AC1 block set + AC2 grouped/localized slash menu
**Claim:** partial
**Ready-to-tick:** no — AC1+AC2 and AC3's unit tests are done and green, but AC3's browser round-trip leg (Tier 2) and AC4 storybook stories are absent
**Base:** 285d4317509a7651cdec5fd0d5e20807bad15654
**Changed:**
- `packages/twenty-front/src/modules/blocknote-editor/blocks/Schema.ts` (wraps the schema in `withMultiColumn` so `column`/`columnList` exist; registers `tableOfContents`)
- `packages/twenty-front/src/modules/blocknote-editor/blocks/TableOfContentsBlock.tsx` (NEW custom block: reactive heading outline via `getBlockOutline`, click-to-jump, `toExternalHTML` → `<ul>` so Markdown/DOCX keep a heading list)
- `packages/twenty-front/src/modules/blocknote-editor/utils/getColumnListBlock.ts` (NEW pure 2–4 column `columnList` builder)
- `packages/twenty-front/src/modules/blocknote-editor/utils/slashMenuGroups.ts` (NEW Basic/Media/Bureau/Links/Syna keys + `msg` labels + order)
- `packages/twenty-front/src/modules/blocknote-editor/utils/slashMenuItemDefinitions.ts` (NEW per-block localized title/Icon/group + fr+en aliases for the 23 default items and the 6 custom ones)
- `packages/twenty-front/src/modules/blocknote-editor/utils/getSlashMenu.ts` (localizes + regroups defaults via `i18n._`, appends Callout/ToC/2-4 columns/File, stable group sort)
- `packages/twenty-front/src/modules/blocknote-editor/components/CustomSlashMenu.tsx` (renders localized group-header rows inside the existing `SelectableList`; keyboard nav unchanged)
- `packages/twenty-front/src/modules/blocknote-editor/components/LinkToRecordSlashMenuItem.tsx` (group `Advanced` → `Links`, localized title + fr aliases, `groupKey: 'links'`)
- `packages/twenty-front/src/modules/blocknote-editor/types/types.ts` (`SuggestionItem.groupKey?: SlashMenuGroupKey`)
- `.../utils/__tests__/getSlashMenu.test.ts` (rewritten) + `.../utils/__tests__/getColumnListBlock.test.ts` (NEW)
**Checks:**
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `npx oxlint --type-aware -c .oxlintrc.json <11 touched files>` → 0 warnings / 0 errors
- `npx oxfmt --check <touched files>` → clean
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 23 suites / 155 tests pass
- `npx jest --findRelatedTests <touched files> --config=jest.config.mjs` → 19 suites / 147 tests pass; no `locales/**` touched; no AI attribution
**Missing for tick:** AC3 save→reload→export round-trip of each new block in a browser (Tier 2, orchestrator) and AC4 light/dark Storybook stories for the new blocks
**Do not redo:** toggle list, toggle heading, divider, quote, code-with-language and the BlockNote table already ship via `defaultBlockSpecs` and BlockNote's default slash items — only columns (2–4) and the ToC block were genuinely missing. The slash-menu content seam is `utils/getSlashMenu.ts`, called by `BlockEditor.tsx:319`; `BlockEditor.tsx`/`CustomAddBlockItem.tsx` needed no edit because the menu is already wired there (AC1's file list is the location hint, not a required diff). Column items are built directly (`getColumnListBlock`) rather than importing `getMultiColumnSlashMenuItems` so the 4-column case and our group labels are uniform.
**Remaining:** US-122…US-130 (9) plus the open US-118 entry-points / US-119 save-action mount legs (2)
**Next:** add `blocks/__stories__/` light+dark stories (two `ThemeProvider colorScheme` wrappers per `ObjectLayoutHeroCard.stories.tsx`) seeding a ToC + columnList + code/quote/divider; then orchestrator runs the E14 browser round-trip legs.

CLAIMED — US-122/interactive-linking-blocks — deepseek-v4.1-flash — 2026-09-30T20:29:43Z — base a98a44e37eaf176ab1850f9b1247805a25edcaa2

## 2026-09-30 20:44 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-122 M8a-2: slash menu interactive/linking blocks (to-do→task, embeds, bookmark, page link, record mention, date/reminder) · **Slice:** the interactive/linking custom blocks — to-do→task, FileBlock media embeds, web bookmark card, page link/sub-page (creates child document) + slash-menu Media/Bureau/Links registration
**Claim:** partial
**Ready-to-tick:** no — 4 of 6 bullet-1 block families are implemented and green, but date/reminder mention (Agenda reminder creation) and the storybook stories are absent; the E14 browser legs are Tier 2
**Base:** a98a44e37eaf176ab1850f9b1247805a25edcaa2
**Changed:**
- `blocks/TodoTaskBlock.tsx` (NEW custom `todoTask` block: checkbox + inline content + `Convert to task`; on convert it creates a native `task` through `useCreateOneRecord` and stores the returned id in the block props — provenance/idempotency; converted state renders the `task` `MentionRecordChip`; `toExternalHTML` emits a GFM checkbox)
- `blocks/BookmarkBlock.tsx` (NEW custom `bookmark` block: URL input → card with title/hostname + link; no network OG fetch yet; `toExternalHTML` → `<a>`)
- `blocks/PageLinkBlock.tsx` (NEW custom `pageLink` block: creates a `document` via `useCreateOneRecord`, nesting it under the current document read from `BlockEditorDocumentContext`; renders `MentionRecordChip`)
- `contexts/BlockEditorDocumentContext.ts` (NEW: exposes `documentRecordId` to block renderers)
- `blocks/FileBlock.tsx` (category-aware render: image/video/audio inline, everything else download link)
- `blocks/Schema.ts` (registers `todoTask`/`bookmark`/`pageLink`)
- `components/BlockEditor.tsx` (wraps `BlockNoteView` in `BlockEditorDocumentContext.Provider`)
- `utils/getSlashMenu.ts` + `utils/slashMenuItemDefinitions.ts` (To-do/Web bookmark/Sub-page + Image/Video/Audio/PDF embed items in Bureau/Links/Media; drops BlockNote's own Image/Video/Audio/File items so media always routes through FileBlock)
- `export/utils/exportFidelity.ts` + `export/components/BlockEditorExportMenu.tsx` (bookmark/pageLink count as content and warn as degraded in md/docx)
- 5 NEW pure utils + 5 tests (`buildTaskFromTodoBlockInput`, `buildChildDocumentInput`, `buildBookmarkCardFromUrl`, `getFileEmbedKind`, `getInlineContentPlainText`); updated `getSlashMenu.test.ts` + `exportFidelity.test.ts`
**Checks:**
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0 (clean)
- `npx oxlint --type-aware -c .oxlintrc.json <23 touched files>` → 0 warnings / 0 errors
- `npx oxfmt --check <23 touched files>` → clean
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 28 suites / 183 tests pass (was 23/155; +5/+28)
- `npx jest --findRelatedTests <5 changed sources> --config=jest.config.mjs` → 19 suites / 160 tests pass
- no `locales/**` touched; no AI attribution
**Missing for tick:** (1) **date/reminder mention** (inline content + "creates an Agenda reminder") — not started; `CreateCalendarEventInput` needs a `connectedAccountId` and the composer owns that flow, so live reminder creation is a real sub-slice, not a chip. (2) **Storybook light/dark stories** for the new blocks — skipped: the blocks call `useCreateOneRecord` (Apollo/metadata providers), so a standalone story needs the app provider tree; shipping unverified stories would risk the storybook build. (3) **Tier 2** E14 interactive-block browser legs. (4) **Syna group** has no member — M8a defines no Syna block (Syna app is D-B1/M7e); the group scaffold was added by US-121.
**Do not redo:** **record mention for any object already ships** (`MentionInlineContent` + `useMentionMenu` search over readable/searchable objects + `LinkToRecordPicker`, existing `RecordChip`/`MentionRecordChip` rendering) — this slice touched neither. `getInlineContentPlainText`, `getBlockOutline`, `getBlockWordCount` are the three structural text extractors; reuse them. The slash-menu content seam stays `utils/getSlashMenu.ts` (called by `BlockEditor.tsx:319`), the group scaffold is `slashMenuGroups.ts`. `Math/equation` is **NO-GO this phase** per `docs/plan/p3.4-advanced-authoring-feasibility.md` (verdict row "Math/diagrams", line 112) and D07 — no `xl-math` import.
**Remaining:** US-123…US-130 (8) plus the open US-118 entry-points / US-119 save-action mount legs (2)
**Next:** add the **date/reminder** slice — a `dateReminder` inline content (chip + `buildDateReminderMention` util) whose slash item creates the `calendarEvent` through the existing calendar primitives (resolve/require a connected account, degrade with a snackbar when none), then the light/dark stories by first adding a provider-free presentational view per block; finally the orchestrator runs E14.

### Intentional behaviour change (recorded, not silent)
The Image/Video/Audio/File slash items now all insert our `file` block (FileBlock: attachments upload + category-aware inline media) instead of BlockNote's per-type image/video/audio blocks. The default block specs stay registered, so **existing** documents with those blocks still load and render; only slash-menu insertion changes. This is what the AC's "image/video/audio/PDF embed via FileBlock (attachments storage)" asks for — one upload path, not two.

CLAIMED — US-123/record-view-block — deepseek-v4.1-flash — 2026-09-30T20:54:57Z — base 9064b3b8a28d94834794b3003fa9734e0eb9807f

## 2026-09-30 21:03 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-123 M8b: inline views ('databases') in pages — embed a native view block (read-only first) · **Slice:** the first (read-only) half — the `recordView` block + embedding host + safe permission stub + object/view picker, reusing the record-table widget stack
**Claim:** partial
**Ready-to-tick:** no — the read-only embed is implemented and green, but the AC's editable half ("edits in the block reflect on /objects/tasks") and the Tier-2 E14 browser proof are still absent
**Base:** 9064b3b8a28d94834794b3003fa9734e0eb9807f
**Changed:**
- `blocks/RecordViewBlock.tsx` (NEW `recordView` atom block: props `viewId`/`viewName`/`objectMetadataId`, `content: 'none'`; render delegates to the host; `toExternalHTML` emits the view name)
- `blocks/Schema.ts` (registers `recordView`)
- `components/RecordViewEmbedHost.tsx` (NEW: resolves view→object, wraps the shared `RecordTableWidgetRendererContent` in `PageLayoutEditModeProviderContext` + a unique `PageLayoutComponentInstanceContext` + an `ErrorBoundary`; renders the picker when unconfigured and the safe stub on denied/unavailable)
- `components/RecordViewEmbedStub.tsx` (NEW: the single safe-degradation surface — lock icon + localized message, never a raw error)
- `components/RecordViewEmbedViewPicker.tsx` (NEW: two-step object→view picker over `useReadableObjectMetadataItems` + `viewsFromObjectMetadataItemFamilySelector`; writes block props via `onSelectView`)
- `constants/RecordViewEmbedPickerDropdownId.ts` (NEW)
- `utils/resolveRecordViewEmbedState.ts` (NEW pure resolver: unconfigured / unavailable / denied / ready)
- `utils/getRecordViewEmbedExportText.ts` (NEW pure serializer helper)
- `utils/getSlashMenu.ts` + `utils/slashMenuItemDefinitions.ts` (Record view item → Bureau group, fr+en aliases, `IconDatabase`)
- `export/utils/exportFidelity.ts` + `export/components/BlockEditorExportMenu.tsx` (`recordView` counts as content; `record-view-degrades` warning for md/docx)
- 4 NEW/updated tests: `resolveRecordViewEmbedState.test.ts`, `getRecordViewEmbedExportText.test.ts`, `components/__tests__/RecordViewEmbedHost.test.tsx`, and updated `getSlashMenu.test.ts` / `exportFidelity.test.ts`
**Checks:**
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `npx oxlint --type-aware -c .oxlintrc.json <17 touched files>` → 0 warnings / 0 errors; `npx oxfmt --check <17 touched files>` → clean
- `npx jest src/modules/blocknote-editor --config=jest.config.mjs` → 31 suites / 196 tests pass (was 28/183; +3 suites / +13 tests)
- `npx jest --findRelatedTests <11 changed sources> --config=jest.config.mjs` → 22 suites / 173 tests pass
- no `locales/**` touched; no AI attribution
**Missing for tick:** (1) **editable embed** — the host passes `isUIEditable={false}` (read-only first, as the AC explicitly sequences); making it editable and proving an edit reflects on `/objects/tasks` is the next bullet. (2) **Tier 2** E14 embedded-view browser proof incl. the permission stub. (3) Gallery layout does not exist in this fork (`ViewType` has no GALLERY; the 4th layout is LIST) — the widget stack already dispatches TABLE/KANBAN/LIST/CALENDAR.
**Do not redo:** the **record-table widget stack already renders a read-only native view** (`RecordTableWidgetRendererContent` + `RecordTableWidgetProvider`); the embed reuses it rather than forking a second table engine. The view host must supply `PageLayoutEditModeProviderContext value={{ isInEditMode: false }}` (a *Provider component*, not `.Provider`) AND a `PageLayoutComponentInstanceContext` with a per-block unique `instanceId` — `RecordTableWidgetRendererContent` reads a component-family draft selector that throws otherwise. `RecordIndexContainerGater` is the full index page, not the embed seam. `getObjectPermissionsForObject` defaults to *allowed* for unknown ids, so the object-existence check must precede it. `useObjectMetadataItem`/`useObjectMetadataItemById` throw when absent — the resolver guards them. Slash-menu content seam stays `utils/getSlashMenu.ts`.
**Remaining:** US-124…US-130 (7) plus the open US-118 entry-points / US-119 save-action mount legs (2)
**Next:** flip the host to `isUIEditable` driven by object `canUpdateObjectRecords`, wire the widget's field-update/draft hooks back to the view (persist path), then add the E14 browser leg (embed Tasks board filtered by project → edit → confirm on `/objects/tasks`).

CLAIMED — US-124/page-chrome — deepseek-v4.1-flash — 2026-09-30T21:09:24Z — base dfd3f1ec3b06735d5b17302abfb18239c6ff9b82

## 2026-09-30 21:14 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-124 M8c: page chrome — icon, cover, full-width/small-text toggles, breadcrumbs, word count, lock page · **Slice:** the first bullet (verbatim M8c scope): chrome fields via app `fields/` + the page-chrome surface on the document page widget
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier-0 gates green; only the Tier-2 browser pass and the fr+en catalog deviation remain (both recorded)
**Base:** dfd3f1ec3b06735d5b17302abfb18239c6ff9b82
**Changed:**
- `packages/twenty-apps/internal/a2e-documents/src/constants/universal-identifiers.ts` (+`DOCUMENT_CHROME_FIELD_IDS`: coverImage/isFullWidth/isSmallText/isLocked, object-01 own-field suffixes 00d–010)
- `.../src/fields/document-cover-image.field.ts`, `document-is-full-width.field.ts`, `document-is-small-text.field.ts`, `document-is-locked.field.ts` (NEW standalone `defineField` manifests pinned on `OBJECT_IDS.document` — the a2e-projects `document-*.field.ts` pattern; app metadata path, no server migration)
- `.../src/lib/document-breadcrumbs.ts` (NEW pure `buildBreadcrumbTrail`, depth+cycle guarded)
- `.../src/lib/document-word-count.ts` (NEW pure `countDocumentWords`/`countDocumentCharacters`, markdown projection like document-outline.ts)
- `.../src/lib/document-chrome.ts` (NEW `readDocumentChromePreferences`, `buildDocumentChromeUpdatePayload`, `DOCUMENT_COVER_COLOR_CHOICES`, `resolveDocumentCover` image/color/none)
- `.../src/lib/document-page-icons.ts` (NEW emoji/name dictionary + `resolveDocumentPageIcon`)
- `.../src/lib/__tests__/document-breadcrumbs.test.ts`, `document-word-count.test.ts`, `document-chrome.test.ts`, `document-page-icons.test.ts` (NEW, 23 tests)
- `.../src/front-components/document-page.front-component.tsx` (chrome surface: breadcrumbs, emoji icon picker, image/color cover, full-width + small-text toggles, last-edited-by from `updatedBy`, word/char count, per-member favourite via the existing documentFavorite path, managed lock banner + control gating; existing cover/outline/sub-pages/template behavior preserved)
- `.../package.json` (0.2.7 → 0.2.8)
**Checks:**
- `yarn typecheck` (tsc --noEmit, app) → exit 0
- `yarn lint` → 0 warnings / 0 errors (95 files)
- `yarn test:unit` → 252 tests pass / 0 fail (+23 new)
- `npx twenty dev:build .` → Build succeeded (30 files); manifest `fields` = 6 and includes coverImage/isFullWidth/isSmallText/isLocked on object `c31a0100-0000-4000-8000-000000000000`
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0 (no host file changed)
- no `locales/**` touched; no AI attribution
**Missing for tick:** (1) **Tier 2** browser rendering pass on real pages (orchestrator). (2) **fr+en catalog** — strings ship French-only like every `packages/twenty-apps/internal/*` front component; the executor contract forbids `locales/**`, and no app has an i18n layer (same documented deviation as US-103/104/105). (3) Chrome TSX components are not unit-tested (front components need the host provider tree); the pure seams they call ARE tested. (4) Cover image is a URL field, no upload button yet.
**Do not redo:** the existing document-page furniture (cover strip, heading outline via `extractOutline`, child-page list, template instantiate) was preserved, not rebuilt. The favourite is the personal `documentFavorite` row (`buildDocumentFavoriteToggle`); never write the deprecated `document.isFavorite` boolean. Reuse `countDocumentWords` / `buildBreadcrumbTrail` / `buildDocumentChromeUpdatePayload` rather than re-deriving. App fields on app-owned objects use the standalone-manifest path (no generated server migration).
**Remaining:** US-125…US-130 (6) plus the open US-118 entry-points / US-119 save-action mount legs (2)
**Next:** orchestrator runs the Tier-2 browser pass (open a page → set icon/cover → toggle full-width/small-text → breadcrumb nav → lock → confirm favourite persists). Optional follow-up: cover-image `uploadFile` button and surfacing the same chrome on the browser rows.
