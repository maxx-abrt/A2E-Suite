# Bureau and connected workspace — execution evidence

[Program overview](../../NOTION_WORKSPACE_PLAN.md) ·
[Execution contract](../../../PROMPT.md)

Append canonical executor reports and orchestrator review entries here. Cite the
matching existing phase report for mapped M/P work. Planning completion is not
feature completion; no implementation task starts accepted.

## 2026-10-27 20:47 UTC — Codex [executor]

**Task:** Additional Notion/workspace plan · **Slice:** documentation package · **Claim:** done-for-review
**Changed:** `docs/NOTION_WORKSPACE_PLAN.md`, five workstream guides and execution prompts under `docs/plan/notion-workspace/`, documentation index/checker registration, this report.
**Evidence:** Read the supplied feature list, canonical workflow and relevant source at `3e9cf316` plus the existing dirty tree. Corrected read-only embed, universal-link and bilingual-template assumptions; current behavior remains Observed.
**Checks:** `node --test docs/scripts/check-docs.test.mjs` → 6 passed; `node docs/scripts/check-docs.mjs` → 35 documents / 335 local links passed; `git diff --check` → passed.
**Checks:** `python3 -` one-off dependency/batch audit → 66 unique workstream IDs plus NW-00, no missing/cyclic dependencies, every workstream task assigned exactly one batch.
**Missing for tick:** Orchestrator review/scheduling; no implementation, live app, migration, performance or feature acceptance was run or claimed.
**Do not redo:** Planning structure and source corrections; unrelated dirty import/application files were preserved. PLAN.md and the pending task queue were not changed.
**Next:** If this program is selected, execute NW-00 to reconcile A1 with current code/reports and prepare one exact brief; otherwise retain the root plan's normal execution order.

## 2026-10-27 20:53 UTC — Codex [executor]

**Task:** A5 bilingual templates (M9) · **Slice:** A5.1 student family + locale transport · **Claim:** done-for-review
**Changed:** Documents `starter-templates.ts`, `lib/apply-template.ts`, `logic-functions/apply-template.ts`, apply tests; host `useApplyTemplate.ts` and hook tests; workstream progress notes.
**Decision:** The user's request selects this program. NW-00 candidate audit confirms A1 cannot safely use the public `/client-config` endpoint for private workspace configuration; authenticated model-discovery design remains open. Scheduled independent A5 student-family slice instead. Existing pending briefs and unrelated dirty import work were preserved.
**Contract:** Add optional locale to gallery apply payload; three student templates supply English title/body for non-French locales, including fallback languages. Omitted locale preserves legacy French. Stable descriptor keys/version and existing operation identity stay unchanged; retry in another locale returns the existing document without rewriting it. Other templates retain French. No schema change.
**Checks:** Documents `node --test --experimental-strip-types src/lib/__tests__/apply-template.test.ts src/lib/__tests__/starter-templates.test.ts src/lib/__tests__/document-template-descriptors.test.ts` → 43 passed; `yarn typecheck`, `yarn lint`, `npx twenty dev:build .` → passed (36-file build).
**Checks:** Front `npx jest src/modules/template-gallery/hooks/__tests__/useApplyTemplate.test.tsx --config=jest.config.mjs --runInBand` → 5 passed; `npx tsgo -p tsconfig.json --noEmit` → passed; direct type-aware oxlint and oxfmt check for the two touched host files → passed.
**Baseline failure:** `npx nx lint:diff-with-main twenty-front` fails on existing `PublicSiteSections.tsx:385` strict-boolean-expressions (`children &&`); that committed file was not edited. The target compares main...HEAD, so direct touched-file lint was also run. Initial hook test needed its Lingui mock changed to the runtime module after macro expansion; final tests pass.
**Missing for tick:** Installed Documents app upgrade and FR/EN gallery/create/reload acceptance; production behavior is not verified. Full A5 remains partial; NW-00/A1 model-discovery brief remains unfinished. No root-plan tick or commit.
**Do not redo:** Three localized student bodies, host locale forwarding and retry regression coverage; no translation catalogs changed.
**Next:** Orchestrator verifies installed A5.1 flow and unchanged existing pages, then accepts release status or schedules the next single slice.

## 2026-10-27 21:07 UTC — Codex [executor]

**Task:** NW-00 reconciliation · **Slice:** A1 source and scheduling audit · **Claim:** partial
**Changed:** This report only. Baseline `3e9cf316` plus dirty tree; `docs/tasks/` contains two existing briefs, not a clear single pending pin. Preserve both and the extensive dirty import, Bureau and A5 template work.
**Evidence:** `useWorkspaceAiModelAvailability` filters instance `aiModelsState`, even when the workspace provider flag is true; `useAiModelOptions` also resolves its default from that list. The public `ClientConfigController` uses `PublicEndpointGuard` and `NoPermissionGuard`, and its service uses admin registry methods. The authenticated `ClientConfigResolver` has workspace/user guards, but no model-discovery query. `runWithWorkspaceRegistry` exists for workspace execution. This is source evidence, not a live reproduction. See [M10 report](phase-14-report.md), especially US-135/US-141 and its 2026-10-11 review; historical suggestion to make public client config workspace-scoped needs a revised security contract.
**Candidate brief for review:** A1.1 design/reproduction: goal is an authenticated, secret-free workspace model list with instance fallback and workspace/key-change invalidation. Inspect `client-config.resolver.ts`, `client-config.service.ts`, `ai-model-registry.service.ts`, `useAiModelOptions.ts` and `useAiModelOptions.test.tsx`; exclude public endpoint changes, schema migrations and generation changes. Decide response fields, workspace authorization, registry filtering and refresh/error semantics before implementation. Add a focused reproduction only once its contract is accepted; proposed Tier-0 command: `cd packages/twenty-front && npx jest src/modules/ai/hooks/__tests__/useAiModelOptions.test.tsx --config=jest.config.mjs --runInBand`; then direct front typecheck and touched-file lint. A failing reproduction alone is not a completed fix.
**Checks:** `node --test docs/scripts/check-docs.test.mjs` → 6 passed; `node docs/scripts/check-docs.mjs` → 35 documents / 335 links passed; `git diff --check` → passed. No application tests run.
**Missing for tick:** Accepted authenticated discovery/refresh contract, concrete reproduction, orchestrator scheduling and Tier-2 BYOK-only, zero-provider and workspace-switch journeys. A5.1 also awaits installed-app acceptance. No dependency-ready implementation batch established.
**Do not redo:** Existing workspace provider availability flag, registry execution path, or dirty A5.1 localized student templates. Do not publish workspace-specific data through the public client-config endpoint.
**Next:** Orchestrator resolve the two pending task briefs and accept NW-00 plus the A1.1 discovery contract; then pin one bounded reproduction or server discovery slice.

## 2026-10-27 21:08 UTC — Codex [executor]

**Task:** NW-00 reconciliation · **Slice:** batch readiness review · **Claim:** blocked
**Changed:** This report only; preserved the existing dirty tree and both task briefs.
**Evidence:** Foundations requires NW-00 and orchestrator scheduling for every row; the latest NW-00 report remains partial. A5.1 is implemented but awaiting installed-app acceptance, and overlaps dirty template files. The two existing task briefs conflict with the queue's one-pending-brief rule. Source still shows the picker using `aiModelsState` and the client-config controller using public/no-permission guards; see [M10 report](phase-14-report.md).
**Checks:** `node --test docs/scripts/check-docs.test.mjs` → 6 passed; `node docs/scripts/check-docs.mjs` → 35 documents and 335 links passed; `git diff --check` → passed before this entry. No application tests run.
**Missing for tick:** Orchestrator acceptance of NW-00, resolution of the pending-brief queue and an accepted A1 authenticated discovery/refresh contract; live A5.1 installation and locale journeys remain unverified.
**Do not redo:** Existing A5.1 student localization or the workspace availability flag; do not expose workspace model configuration through the public endpoint.
**Next:** Orchestrator resolves the task queue and accepts NW-00 with a bounded, security-reviewed A1.1 design/reproduction brief; then schedule its first dependency-ready slice.

## 2026-10-27 — Codex [executor]

**Task:** A5 bilingual templates (M9a; [original report](phase-13-report.md)) · **Slice:** A5.2 meeting family · **Claim:** done-for-review
**Changed:** Documents `starter-templates.ts` and `lib/__tests__/apply-template.test.ts`: English meeting notes, recurring agenda and one-on-one titles and bodies. Existing French content, keys and operation identity remain intact.
**Evidence:** A5.1 locale transport and retry path inspected and exercised in the same focused tests; it is sufficient for this extension. The two pending root-plan briefs conflict with this explicitly selected program and were preserved; A1's authenticated discovery decision remains unresolved.
**Checks:** Documents `node --test --experimental-strip-types src/lib/__tests__/apply-template.test.ts src/lib/__tests__/starter-templates.test.ts src/lib/__tests__/document-template-descriptors.test.ts` → 46 passed; `yarn typecheck`, `yarn lint`, `npx twenty dev:build .` → passed; `git diff --check` → passed before formatting-only adjustment. Reviewed diff including pre-existing A5.1 changes.
**Missing for tick:** Installed app upgrade and FR/EN gallery → create → reload, existing-page and retry journeys; release acceptance remains with orchestrator.
**Do not redo:** A5.1 locale forwarding, localized student templates or the existing template apply/idempotency path.
**Next:** A5.3 personal planning family using the same verified path.

## 2026-10-27 — Codex [executor]

**Task:** A5 bilingual templates (M9a; [original report](phase-13-report.md)) · **Slice:** A5.3 personal planning family · **Claim:** done-for-review
**Changed:** Documents `starter-templates.ts` and `lib/__tests__/apply-template.test.ts`: English journal, weekly review and daily note titles and bodies, through the existing A5.1 apply path. French originals and stable identities are unchanged.
**Checks:** Documents `node --test --experimental-strip-types src/lib/__tests__/apply-template.test.ts src/lib/__tests__/starter-templates.test.ts src/lib/__tests__/document-template-descriptors.test.ts` → 49 passed; `yarn typecheck`, `yarn lint`, `npx twenty dev:build .` → passed; `git diff --check` → passed. Reviewed the cumulative diff.
**Missing for tick:** Installed app upgrade, FR/EN gallery → create → reload and existing-page/retry journeys; release acceptance remains with orchestrator. Daily note identity/creation automation belongs to A8 and is not implemented here.
**Do not redo:** A5.1 locale forwarding, student family, A5.2 meeting family or existing idempotency path.
**Next:** Translate a bounded project/team template family under A5; verify installed flow separately.
