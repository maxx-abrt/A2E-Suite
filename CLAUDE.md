# AGENTS.md — A2E Suite

Guidance for AI coding agents (GitLab Duo Workflow, Codex, Cursor, …) working in this repository. `agent-config.yml` at the root defines the environment setup and verification commands for agents that support it (GitLab Duo Workflow). Claude Code reads this file through the `CLAUDE.md` symlink — keep a single source of truth, never let the two diverge.

A2E Suite is a modular workspace platform in development, built on Twenty's CRM — an Nx / Yarn 4 monorepo. Preserve the CRM while adding native work/knowledge (Bureau) and finance (Bilan) experiences. Bureau is a product target, not an existing standalone app; Bilan is `a2e-accounting`. Main packages: `twenty-front` (React 19, Jotai, Linaria, Vite), `twenty-server` (NestJS, TypeORM, PostgreSQL, Redis, GraphQL Yoga), `twenty-shared` (isomorphic types/utils), `twenty-ui`, `twenty-sdk` (application SDK + CLI), `twenty-e2e-testing` (Playwright). Package directory names and npm names remain `twenty-*` intentionally.

## Find the relevant context first

- Start with the assigned issue, then [docs/README.md](docs/README.md). Read only the guides relevant to that task; do not automatically implement the first unchecked roadmap item.
- [Codebase map](docs/plan/01-codebase-map.md): task-to-path lookup. [Product experience](docs/product-experience.md): names, UX and template contracts. [Applications](docs/applications.md): why source presence is not installation.
- [PLAN.md](PLAN.md): delivery priorities and historical feature scope. Old checkmarks and reports are not current verification.
- [PROMPT.md](PROMPT.md): execution/handoff workflow. [Verification](docs/verification.md): setup and checks. `AGENTS.md` is a symlink to this file; preserve that single source of repository rules.
- Reference trees under `Inspiration apps (bureaubilan)` supply feature ideas only. Do not run or integrate their backends as part of the suite.
- Read directory-specific guidance before editing. Preserve unrelated dirty files; never revert another contributor's work to obtain a clean tree.

## Role

You are a senior software engineer on this repository. Before modifying code: inspect the existing architecture, understand the dependencies, and avoid unnecessary rewrites.

Match the surrounding code — the adjacent files in the directory you are editing beat any written rule, including for file naming, which varies by area.

## Rules

Always:
- keep the existing architecture and preserve current features
- follow existing patterns and write clean TypeScript
- explain important decisions (trade-offs, workarounds) in your final report

Never:
- delete features without explicit approval
- introduce duplicate or parallel systems when a primitive already exists
- change the database schema without a generated migration (see Gotchas)

## House rules

Where this repo differs from your defaults:

- Short-form `//` comments, never JSDoc blocks; comment only WHY (a constraint the code cannot express, still true for a reader who never saw your change), never WHAT.
- Types over interfaces (except when extending third-party interfaces); string literals over enums (except GraphQL enums); no `any`; descriptive generics (`TData`, not `T`).
- Named exports only. Functional components only.
- Prefer event handlers over `useEffect` for state updates.
- No abbreviations in names (`fieldMetadata`, not `fm`); constants in SCREAMING_SNAKE_CASE; component props types suffixed `Props`.
- Use `twenty-shared/utils` guards (`isDefined`, `isNonEmptyString`, …) and other existing helpers before writing your own — reimplementing an existing util is the most common AI-authored defect here.
- Lingui for user-facing strings; Linaria (zero-runtime, styled-components pattern) for twenty-front styling.
- For Twenty product concepts, consult `packages/twenty-ui/src/icon/icon-dictionary.md` and use the canonical icon.
- Import icons from `twenty-ui/icon`, never directly from `@tabler/icons-react`; action and status concepts should use their action or status icons.
- Test behavior, not implementation: query by user-visible text/roles, `@testing-library/user-event` for interactions.

Longer-form guides remain in `.cursor/rules/` (from the Cursor era).

## Commands

```bash
bash packages/twenty-utils/setup-dev-env.sh   # Postgres/Redis + DB init; only for tasks needing a running app
yarn start                                    # front + server + worker

npx jest path/to/file.spec.ts --config=packages/<pkg>/jest.config.mjs   # single test file (preferred)
npx nx test twenty-server                     # package unit tests (same for twenty-front, ...)
npx nx run twenty-server:test:integration:with-db-reset
npx nx storybook:build twenty-front && npx nx storybook:test twenty-front

npx nx lint:diff-with-main twenty-server      # diff-based lint (fast; add --configuration=fix); run with typecheck after changes
npx nx fmt <pkg>                              # format
npx nx build twenty-shared                    # required before building/testing packages that depend on it
npx nx database:reset twenty-server
npx nx run twenty-front:graphql:generate      # after GraphQL schema changes (--configuration=metadata for metadata schema)
```

Before finishing a change: run the tests covering what you touched, lint, and typecheck. Do not stop while tests are red.

## Git workflow

- One focused task per commit; small, testable changes.
- Never push to `main` directly — work on a feature branch and open a merge request.
- Commit messages must not carry AI attribution; CI rejects `@anthropic.com` co-author trailers and "Generated with …" lines.

## Gotchas

- **`twenty-shared/dist` is per-branch state nothing tracks.** After switching branches or editing `twenty-shared`, run `npx nx build twenty-shared --skip-nx-cache` before trusting any typecheck or test failure in a dependent package.
- **Nx caching can serve a stale pass.** To verify a fix, run `npx tsgo -p tsconfig.json --noEmit` in the package directly rather than `nx typecheck`.
- **Do not commit translation catalogs unless translations are the task.** `lingui extract`/`compile` regenerate `packages/twenty-server/src/engine/core-modules/i18n/locales/*.po` and `locales/generated/*` with thousands of lines of churn as a side effect of touching any `msg` string. The i18n pipeline maintains them; leave them out of your commit.
- **Upgrade commands** (`packages/twenty-server/src/database/commands/upgrade-version-command/`): add or edit files only under the current `TWENTY_CURRENT_VERSION` directory, with a real epoch-ms timestamp strictly greater than every existing one in that directory — CI enforces both, and the upgrade cursor silently skips a command that sorts before an already-applied one. Include `up` and `down`; never rewrite committed command logic. See `packages/twenty-server/docs/UPGRADE_COMMANDS.md`.
- **Entity file changes need a generated instance command**: `npx nx run twenty-server:database:migrate:generate --name <name> --type <fast|slow>` (slow = adds a data-backfill step).
- A read-only Postgres MCP server is configured in `.mcp.json` for inspecting workspace data, metadata, and migration results. Writes go through the CLI commands above.
- E2E login: click "Continue with Email" and use the prefilled credentials.
