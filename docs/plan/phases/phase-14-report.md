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
