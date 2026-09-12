# 2026-09-12 — Issue #2 documentation reorganization

Issue: [#2](https://gitlab.com/rfrfrfr-group/A2E-Suite/-/work_items/2)

Baseline: `3e664c89`; branch: `duo/docs/2-agent-navigation-and-product-plan`.

**Status:** documentation changes verified by scoped checks; runtime product
work remains partial/unverified. No app installation or production changes.

## Delivered

- A task-oriented documentation home; short kickoff and multi-agent entry
  points; retained `AGENTS.md` → `CLAUDE.md` symlink rather than duplicating rules.
- Source-backed lookup paths, corrected React/GraphQL/realtime descriptions,
  tracked inspiration locations and native SDK pattern exceptions.
- A prioritized delivery plan with explicit current readiness and historical
  P1–P10 scope preserved. Project junction/milestone and Bilan catalogue claims
  reconciled without pretending source inventory proves completion.
- An app provisioning/troubleshooting guide tracing source → package →
  registration/catalog → workspace install → navigation/runtime verification.
- Product names, intuitive native UX, six proposed starter packs, workflow
  boundaries, file lifecycle and collaboration acceptance contracts.
- Reusable task/handoff templates; verification guide; dependency-free
  documentation checker and tests.
- Corrected root README positioning, app authoring/Bilan caveats, GitLab versus
  GitHub deployment assumptions, and unsafe live-database backup advice.

Scope is maintained fork entry points/guides, not a rewrite of every upstream
Markdown file, generated manual, specialist skill or historical phase report.
No runtime source, app identity, dependency manifest, migration, translation
catalog or deployment configuration was changed.

## Root causes and tradeoffs

The A2E section returns no UI when both install/catalog lists are empty; Bilan
source is not deployment provisioning. Projects is missing from the A2E
allowlist and presets. Bureau has no independent app definition. Preset install
errors can be skipped and generic sample seeding is absent. These are observed
source facts, not a diagnosis of an inspected live deployment.

The simplest documentation repair is a linked, task-oriented set of guides,
not another giant prompt or indiscriminate rewrite of upstream docs. Preserve
historical scope/evidence but stop using old checkboxes as release status.
For Bureau, recommend composing existing Documents/Projects; a separate app
registration versus bundle/preset is a maintainer decision, not guessed here.

## Verification actually performed

Environment: Node `v20.20.2`, bundled Yarn `4.13.0`, Python `3.9.25`;
workspace dependencies absent. Commands run from repository root.

| Check | Observed result | Coverage |
| --- | --- | --- |
| `node --test docs/scripts/check-docs.test.mjs` | PASS, 6 tests | Relative/encoded/spaced/image links, missing paths, malformed encoding, external/code examples, fence handling, real temporary file integration |
| `node docs/scripts/check-docs.mjs` | PASS, 18 maintained documents | Local inline link targets and code-fence balance; not remote URLs, anchors or product behavior |
| `git diff --check` | PASS after correcting a trailing blank line in the multi-agent entry point | Whitespace |
| Concrete package-path and object-count check (Python/Path) | No missing concrete package paths in checked entry/map/product docs; 1 Documents, 6 Projects, 14 Bilan object definitions | Source inventory only |
| `node .yarn/releases/yarn-4.13.0.cjs nx test twenty-front --skip-nx-cache` | BLOCKED, exit 1: missing `node_modules` state file | Front tests did not start |
| `node .yarn/releases/yarn-4.13.0.cjs nx test twenty-server --skip-nx-cache` | BLOCKED, exit 1: missing `node_modules` state file | Server tests did not start |
| `node .yarn/releases/yarn-4.13.0.cjs nx build twenty-shared --skip-nx-cache` | BLOCKED, exit 1: missing `node_modules` state file | Shared build did not start |
| `node --test --experimental-strip-types 'packages/twenty-apps/internal/a2e-accounting/src/lib/__tests__/*.test.ts'` | BLOCKED, exit 9: Node rejects `--experimental-strip-types` | Bilan tests did not start |

**Application tests/builds, typechecks, installation commands, browser flows,
migrations and restore drills are UNVERIFIED.** Fallback: source review plus
scoped documentation checks, not a substitute application test pass. No full
monorepo install was attempted for this documentation-focused task. Provision
Node 24, dependencies and isolated services through
`.gitlab/duo/agent-config.yml` for runtime follow-up.

## Next action

1. Confirm Bureau packaging and authoritative CI/release source with the
   maintainer; preserve existing app IDs.
2. Start D0 with compatible SDK/server versions, app-local scripts/lockfiles and
   disposable install tests. Existing 2.31.0 app pins versus 2.39.0 workspace
   tooling must not be bypassed silently.
3. D1 should test `SettingsA2eSuiteSection`, `useA2eSuiteApplications` and
   `WorkspaceTemplateService` together with actual catalog/install behavior.
   Cover missing registration, Projects discovery, visible partial state,
   retries and Individual → CRM navigation restoration.
4. D2 starter packs are specifications only. Complete app installation and
   domain safety gates before advertising full templates/collaboration/finance.

The issue should remain open for the runtime gaps; this handoff does not mark
the entire multi-app product complete.
