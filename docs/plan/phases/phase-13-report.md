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
