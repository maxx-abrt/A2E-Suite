# Development and verification

[Documentation home](README.md) · [App provisioning](applications.md)

## Establish the environment before debugging the code

- Root [package.json](../package.json) requires Node **^24.5.0** and Yarn 4;
  the committed Yarn bundle is **4.13.0**. Inspect package-specific engines too.
- Install root dependencies with the committed lockfile; do not replace Yarn
  with npm or accept lockfile churn as part of an unrelated fix.
- Apps under `packages/twenty-apps` install independently. Their current SDK
  pins/scripts/lockfiles differ from the root; see the applications runbook.
- Database and browser tests require PostgreSQL, Redis and Playwright browsers.
  Use isolated development/test services, never a production workspace.

From the repository root, after selecting a supported Node runtime:

```sh
node --version
node .yarn/releases/yarn-4.13.0.cjs --version
node .yarn/releases/yarn-4.13.0.cjs install --immutable
npx nx build twenty-shared --skip-nx-cache
```

For tasks needing a running platform, inspect and use
[`setup-dev-env.sh`](../packages/twenty-utils/setup-dev-env.sh), then `yarn start`.
The setup script creates/configures development services and initializes the
DB. Its reset option and Nx database-reset targets are destructive. Confirm
the target before running them; do not start the full app for prose-only work.

## Checks by change type

Commands below are run from the root unless noted. Replace placeholders with
the actual package/test path, and inspect that package's manifest/Nx config.

| Change | Minimum useful evidence |
| --- | --- |
| Fork docs / prompts | Documentation checker + its tests, diff whitespace review, manual source/command review; no claim of runtime certification |
| Pure utility or service | Focused regression test, package tests, uncached typecheck, lint; test empty/error inputs and caller composition |
| Host UI | Component behavior tests and real browser flow; light/dark, keyboard, narrow screen, loading/empty/error/permission states; neighboring CRM flow |
| Metadata / server entity | Validator/integration tests, generated migrations/clients where required, fresh install plus populated upgrade, tenant/role checks |
| App definition / packaging | App-local build/typecheck/unit checks, packaged publish/install on scratch, metadata/roles/nav verification, post-install logs and lifecycle tests |
| Files / sharing / finance / realtime | Real API and multi-user checks, negative permissions, retries/concurrency/recovery, worker logs and persisted effects |
| Deployment | Image build, intentional upgrade failure, readiness/worker checks, DB+file restore drill |

```sh
npx jest path/to/file.spec.ts --config=packages/<pkg>/jest.config.mjs
npx nx test <pkg> --skip-nx-cache
npx nx lint:diff-with-main <pkg>
# Inside each changed package, not the repository root:
npx tsgo -p tsconfig.json --noEmit
```

Rebuild `twenty-shared` with `--skip-nx-cache` after switching branches or
changing shared code before trusting dependent tests. Run the relevant package
build too when its build/runtime boundary changed. Nx cached success alone is
not sufficient evidence for a fix.

For DB behavior, use the existing server integration target on a disposable DB:

```sh
npx nx run twenty-server:test:integration:with-db-reset
```

For UI integration against a running test stack:

```sh
npx nx test twenty-e2e-testing
```

Follow [AGENTS.md](../AGENTS.md) for GraphQL generation, current-version upgrade
commands, migration timestamp rules and translation-catalog exclusions. Avoid
hard-coded migration-version directories copied from historical reports.

## App test caveats at this baseline

- Bilan's `yarn test` is a Node unit-test command for `src/lib/__tests__`, not
  an install/integration suite. It requires a Node runtime with type stripping.
- Documents contains helper test files but no package test script; Projects
  has no local test files at this baseline. Do not invent `yarn test:unit`
  success for either. D0 must establish explicit scripts and integration gates.
- A manifest build does not exercise sandbox rendering, actual API selections,
  authorization, post-install jobs, durable saves or cross-app dependencies.
- An app-local SDK at 2.31.0 and workspace SDK/server at 2.39.0 need a verified
  compatibility choice; do not bypass checks or rewrite stable identifiers.

## Documentation checks

```sh
node --test docs/scripts/check-docs.test.mjs
node docs/scripts/check-docs.mjs
git diff --check
```

The dependency-free checker has a bounded list of maintained fork guides. It
checks local inline Markdown link targets and code-fence balance, including
links with encoded/spaced paths. Tests cover broken links, fences and ignored
external/code-block examples. It is not a full Markdown parser and deliberately
does not check remote URLs, reference-style links, heading anchors, generated
upstream docs or historical phase reports. Review prose against source too.

## Reporting a result honestly

For each check record **command, working directory, revision, environment,
exit result and what behavior it covers**. Separate `passed`, `failed`,
`blocked/unverified` and `not applicable`. Never weaken a test, hide a failure,
turn an old report into a current pass, or equate a source read with runtime
verification.

When tooling blocks a check, capture the error, state the fallback and keep the
item unverified. GitLab agent environments can be provisioned through
`.gitlab/duo/agent-config.yml` with the required runtime/dependencies/services;
that path is a provisioning option, not an existing configuration promised by
this guide. Use the [handoff template](templates/handoff.md) for exact next steps.
