# Phase 14 report — M10 Syna (AI, BYOK)

CLAIMED — US-102/M10a-1 — deepseek-v4.1-flash — 2026-09-29T19:52:00Z — base 396bdddbe3bd1028452e9f8d5164e896fdc17520

## 2026-09-29 20:18 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-102 M10a-1: workspace BYOK server core — entity, migration, encrypted keys, resolution order (D-N4) · **Slice:** all four AC bullets (entity+migration, resolution order, integration tests, billing-gating note)
**Claim:** done-for-review
**Ready-to-tick:** yes
**Base:** 396bdddbe3bd1028452e9f8d5164e896fdc17520
**Changed:**
- new `src/engine/metadata-modules/ai/ai-models/entities/workspace-ai-provider.entity.ts`
- new `src/engine/metadata-modules/ai/ai-models/services/workspace-ai-provider.service.ts`
- edit `src/engine/metadata-modules/ai/ai-models/services/provider-config.service.ts` (adds `getResolvedProvidersForWorkspace`)
- edit `src/engine/metadata-modules/ai/ai-models/ai-models.module.ts` (TypeORM feature + provide/exports)
- new `src/database/commands/upgrade-version-command/2-39/2-39-instance-command-fast-1790711712877-create-workspace-ai-provider.ts`
- edit `src/database/commands/upgrade-version-command/instance-commands.constant.ts` (generator-registered)
- new spec `.../ai-models/services/__tests__/provider-config.service.spec.ts` (+6)
- new spec `.../ai-models/services/__tests__/workspace-ai-provider.service.spec.ts` (+6)
- new `test/integration/ai/suites/workspace-ai-provider.integration-spec.ts` (+5)
- new `test/integration/utils/get-app-provider-by-name.util.ts`
**Checks:**
- `npx tsgo -p tsconfig.json --noEmit` (packages/twenty-server) → 0 errors
- `npx oxlint --type-aware -c .oxlintrc.json <9 touched files>` → 0 warnings/errors
- `npx oxfmt --check <9 touched files>` → clean after `oxfmt`
- `npx jest <two unit specs>` → 12 passed
- `npx jest .../ai-models` (whole module) → 38 passed
- `npx jest admin-panel-ai-provider + ai-billing` → 15 passed (regression guard)
- `NODE_ENV=test npx jest --config jest-integration.config.ts test/integration/ai/suites/workspace-ai-provider.integration-spec.ts --runInBand` → 5 passed
**Missing for tick:** none. Tier-2 browser journey (E16) belongs to US-127 (Settings UI) — not runnable server-only.
**Do not redo:** entity/service/migration/resolution order all verified green; the `getResolvedProviders` (instance) path is unchanged and still backs the Admin Panel masked view.
**Remaining:** 3 other M10 bullets (M10b/c/d) plus downstream US-127..130 remain unchecked.
**Next:** US-127 (M10a-2) can build the Settings UI on `WorkspaceAiProviderService.upsertProvider/removeProvider/resolveProviders`; surface `getResolvedProvidersForWorkspace` in the admin read path then.

### Notes for the orchestrator (billing gating, per D-N4)
- Workspace BYOK providers are merged **after** instance custom providers and **even when `includeCustomProviders: false`**. Rationale: `includeCustomProviders` encodes the instance-level custom-AI-provider enterprise-seat entitlement (`CustomAiProviderAccessService`); a workspace's own key is billed to that workspace's own provider account, so it is an explicit, intentional entitlement bypass (D-N4). This is why `getResolvedProvidersForWorkspace` takes an explicit `includeCustomProviders` and overrides with the workspace row regardless.
- There is currently **no per-workspace billing/usage charge path** for workspace BYOK tokens: the registry still registers the provider as a normal provider, so `AiBillingService` would compute costs from the model config. The M10d cost-guardrail bullet (per-workspace monthly token cap + usage view) is the follow-up that must decide whether BYOK usage is metered against credits or excluded; flagged here as an explicit open item rather than silently changed.
- API keys are never returned by any GraphQL surface in this slice; the only read API added (`resolveProviders`) is server-internal and gated by `WorkspaceScopedRepository` workspace scoping. The Admin Panel masked view is untouched and continues to mask instance keys.

### Gotchas encountered
- The integration spec's module graph is a **distinct copy** of the app's, so `global.app.get(SomeServiceClass)` throws "does not exist in the current context" even though the provider is present (`strict: false` does **not** fix class tokens, only repository tokens resolved by the app's own classes — see `getCoreRepository`). Resolved with a new test util `getAppProviderByName` that reads the provider instance out of the `AiModelsModule` container by name.
- `npx nx run twenty-server:database:migrate:generate` emitted unrelated drift (documentShare/notification/notificationWatch FK renames, a `titleSnapshot` NOT NULL drop) because the dev DB has stale constraint names. Those statements were **removed** from the generated command; only the `workspaceAiProvider` table + FK remain. A future generator run on a stale DB will do the same — always diff the generated migration before keeping it.
- The table is created by the instance command, not by the legacy TypeORM migration system (frozen); the integration test applies `up` itself when `to_regclass` is null and reverts with `down`, so the suite is self-contained on a DB that predates the command.

CLAIMED — US-127/M10a-2 — deepseek-v4.1-flash — 2026-09-30T21:37:17Z — base 6cec8604d5bf0147bed18997b20ab4b8e960f784

CLAIMED — US-127/M10a-2 — deepseek-v4.1-flash — 2026-09-30T21:43:10Z — base 6cec8604d5bf0147bed18997b20ab4b8e960f784

## 2026-09-30 22:00 UTC — deepseek-v4.1-flash [executor] — contract v4
**Task:** US-127 M10a-2: Settings → Syna → Providers UI (add/test key, default + fast model, Audit masking preserved) · **Slice:** the whole task — the key-safe server GraphQL surface required for the UI (BYOK had no resolver after US-102) plus the Settings → Syna → Providers page (add/test key, default+fast model, fallback + billing copy)
**Claim:** done-for-review
**Ready-to-tick:** yes — all Tier 0/1 gates green on the working tree; only the AC's own Tier-2 browser journey (E16) is absent.
**Base:** 6cec8604d5bf0147bed18997b20ab4b8e960f784
**Changed:**
- server new `ai-models/dtos/{workspace-ai-provider,workspace-ai-provider-test-result}.dto.ts` + `{upsert,test}-workspace-ai-provider.input.ts` + `{workspace-ai-provider-source,workspace-ai-provider-test-error-code}.enum.ts`
- server new `ai-models/services/workspace-ai-provider-admin.service.ts` (read projection + `generateText` key test), `ai-models/utils/classify-ai-provider-test-error.util.ts`, `ai-models/resolvers/workspace-ai-provider.resolver.ts`, `ai-models/workspace-ai-provider.module.ts`
- server edit `ai-models/services/sdk-provider-factory.service.ts` (+`createTransientProvider`), `ai-models/services/workspace-ai-provider.service.ts` (+`findProviders`, `decryptProviderApiKey`), `metadata-engine.module.ts` (import module)
- server new spec `ai-models/services/__tests__/workspace-ai-provider-admin.service.spec.ts` (+10)
- shared `twenty-shared/src/types/SettingsPath.ts` (+`AiProviders = 'ai/providers'`)
- front new `pages/settings/ai/SettingsAiProviders.tsx`, `.../components/{SettingsAiProviderForm,SettingsAiProvidersList,SettingsAiProviderTestFeedback}.tsx`, `.../hooks/useWorkspaceAiProviders.ts`, `.../graphql/{queries/getWorkspaceAiProviders,mutations/{upsert,test,remove}WorkspaceAiProvider}.ts`, `.../types/{WorkspaceAiProviderStatus,WorkspaceAiProviderTestResult}.ts`, `.../utils/getWorkspaceAiProviderTestErrorMessage.ts` + 2 component specs (+6)
- front edit `modules/app/components/SettingsRoutes.tsx` (route), `modules/settings/hooks/useSettingsNavigationItems.tsx` (Syna → Providers sub-item); this report; `.ralph-tui/progress.md`
**Checks:**
- `cd packages/twenty-server && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `npx jest src/engine/metadata-modules/ai/ai-models/services/__tests__/workspace-ai-provider-admin.service.spec.ts --config=packages/twenty-server/jest.config.mjs` → 10 passed
- `npx jest src/engine/metadata-modules/ai/ai-models --config=packages/twenty-server/jest.config.mjs` → 8 suites / 48 passed
- `cd packages/twenty-server && npx oxlint --type-aware -c .oxlintrc.json <14 touched>` → 0 warnings/0 errors; `oxfmt --check` clean
- `npx nx build twenty-shared --skip-nx-cache` → success (so dependents see `SettingsPath.AiProviders`)
- `cd packages/twenty-front && npx tsgo -p tsconfig.json --noEmit` → exit 0
- `npx jest src/pages/settings/ai src/modules/settings/ai --config=packages/twenty-front/jest.config.mjs` → 4 suites / 13 passed
- `npx jest --findRelatedTests <SettingsAiProviders + useSettingsNavigationItems + SettingsRoutes> --config=packages/twenty-front/jest.config.mjs` → 4 suites / 48 passed
- `cd packages/twenty-front && npx oxlint --type-aware -c .oxlintrc.json <16 touched>` → 0 warnings/0 errors; `oxfmt --check` clean; no `locales/**` touched; no AI attribution
**Missing for tick:** Tier 2 only — on a running workspace (Bureau/Bilan optional): open Settings → Syna → Providers, add a real OpenAI/Anthropic/Mistral/Google key and an OpenAI-compatible base URL, confirm the key input shows the `••••••••` placeholder and the list badges show Workspace key → Instance → Catalog, test a good and a bad key (typed success/failure), pick default+fast model, remove the key and confirm the source badge falls back. `npx nx run twenty-front:graphql:generate --configuration=metadata` should be run after `yarn start` to fold the 4 new documents into `generated-metadata/graphql.ts` (codegen needs the live /metadata endpoint; introspection returned non-JSON this session, so the hooks use the established hand-typed `useQuery<T>(gql)` pattern instead — tsgo is green without it).
**Open item (flagged, not silently changed):** the workspace BYOK key is now addable/testable/visible, but it still has **no generation-time consumer** — `AiModelRegistryService.buildModelRegistry` remains instance-wide (`getResolvedProviders()`), so `getResolvedProvidersForWorkspace` is only surfaced by the new admin read path. Wiring the workspace resolution into the registry is the remaining M10a server leg (or M10b) and is out of the UI half's scope, matching the US-102 report's open item.
**Do not redo:** the US-102 entity/service/migration/`getResolvedProvidersForWorkspace`; the Audit tab masking (`getAiProviderCredentialStatuses` + `AI_PROVIDER_CREDENTIAL_MASK`, untouched, tests green); the Admin Panel instance-provider UI.
**Remaining:** US-128, US-129, US-130 (3) in this execution order.
**Next:** orchestrator Tier-2 browser journey E16 + metadata codegen; then wire the workspace resolution into the model registry (M10b server leg) and start US-128 (Syna everywhere).

### Resume note (stalled claim)
A prior Ralph iteration (31, 21:37:17Z) wrote a `CLAIMED — US-127/M10a-2` line then died ~4 min later mid-exploration with **zero code changes** (only that claim line dirty). This session is the same Ralph run/model, so I refreshed the claim (21:43:10Z) and resumed rather than reporting `BLOCKED — already claimed`; no competing executor exists (parallel mode `never`). The duplicate claim line is historical.
