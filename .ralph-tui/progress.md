# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Detect Apollo permission denials with `isGraphqlErrorOfType(error, 'FORBIDDEN')`** (`twenty-front/src/utils/is-graphql-error-of-type.util.ts`). It handles Apollo v4 `CombinedGraphQLErrors` (`.errors[0].extensions`) as well as plain `{extensions}`/`{code}` shapes; do NOT read `error.graphQLErrors` directly — v4 mutation errors do not expose that property, so a manual check silently falls through to "network error".
- **Template preview/apply error vocabulary is mirrored by hand** between `twenty-server/.../onboarding/types/apply-template-operation.types.ts` and `twenty-front/.../a2e-workspace/types/apply-template-operation.types.ts`; the GraphQL DTO enum registers by MEMBER NAME (wire value == member name). The front union may add client-only codes (`NETWORK_ERROR`) that the server enum omits.

---

## 2026-09-20 - US-047
- Implemented the P1.6c distinct-error-surface leg: additive `ApplyTemplateErrorCode` (`PERMISSION_DENIED` | `NO_APPS_AVAILABLE` server-side, `+ NETWORK_ERROR` client-side), a `TemplatePreview.errorCode` discriminator the server sets only when a template expects apps but none are registered, and a shared front classifier `getWorkspaceTemplateSetupErrorCode`.
- `A2eWorkspaceTemplatePreview` now renders three distinct panels (`…-permission-denied` / `…-network-error` / `…-no-apps-available`) plus a distinct apply-error banner instead of the single "Preview unavailable" panel; `useWorkspaceTemplatePreview` exposes `refetch`, `useApplyWorkspaceTemplateOperation` exposes `operationErrorCode` + distinct snackbars. Template choice is never discarded.
- Files changed: server onboarding types/DTO/service + service spec; front a2e-workspace types, new classifier + spec, preview component + spec, picker spec, both hooks + apply hook spec, preview query document.
- **Learnings:**
  - Apollo v4 wraps GraphQL errors in `CombinedGraphQLErrors` (`.errors`, not `.graphQLErrors`); reuse `isGraphqlErrorOfType`.
  - `TemplatePreview` has no committed generated GraphQL schema here — the front query is a hand-written `gql` document, so an additive server field needs a matching hand-written selection + a Tier-2 `graphql:generate` later.
  - `npx nx lint:diff-with-main` diffs `main...HEAD`, so it prints "No changed files." on an uncommitted slice; run `npx oxlint --type-aware` / `npx oxfmt --check` on the touched files directly for real coverage.
---

