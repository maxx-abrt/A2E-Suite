# Vendored `@a2e/core`

This directory is a **verbatim copy** of `A2E-Core/packages/core` (the suite's
shared-data client: `CoreProvider`, `WorkspaceProvider`, typed hooks, `coreApi`
string refs, typed errors).

## Why vendored instead of `link:` or `github:`

- `link:../A2E Core/packages/core` only resolves on a machine that has the core
  repo checked out next to this one — it breaks Vercel builds **silently**
  (the install succeeds, the bundle is missing the module).
- A `github:` dependency needs a PAT with repo scope in every CI environment.
- A workspace package (`packages/a2e-core`, `"@a2e/core": "workspace:*"`) is
  resolved deterministically by pnpm on every machine, including Vercel, and
  Next transpiles it (`transpilePackages: ["@a2e/core"]`).

## Refreshing it

```bash
# from a local checkout of A2E-Core
A2E_CORE_PATH="../A2E Core" pnpm sync:core

# or straight from GitHub (needs read access to maxx-abrt/A2E-Core)
GITHUB_TOKEN=ghp_xxx pnpm sync:core --ref v0.3.0
```

The script overwrites `src/`, `package.json` and `CHANGELOG.md`, then prints a
diff summary. Run `pnpm typecheck` afterwards.

## Rules (from A2E_APP_INTEGRATION_GUIDE.md — binding)

- **Never** edit files in this directory by hand: changes belong in the A2E-Core
  repo and come back through `pnpm sync:core`.
- The core backend is **additive-only**, so a vendored copy older than the
  deployed backend always keeps working. The reverse (newer package than
  backend) is not safe.
- Brand-new core functions can be called **without** re-vendoring, by name:
  `useCoreQuery(coreRef.query("module:fn"), args)` — see `lib/core-api.ts`.
