# Applications: finding, provisioning and verifying Bilan / Bureau

[Documentation home](README.md) · [Product names and template contracts](product-experience.md)

## Where is the installation system?

Open **Settings → Applications**. The page has **Marketplace**, **Installed**,
and (with the appropriate permission) **Developer** tabs, plus an A2E Suite
section. Source: [SettingsApplications](../packages/twenty-front/src/pages/settings/applications/SettingsApplications.tsx).

The important distinction is:

```text
App source in Git
  → SDK build / packaged manifest
  → registration + published package on the target server
  → catalog visibility (for discovery)
  → installation into a specific workspace
  → metadata / roles / views / navigation + post-install effects
  → verified user journey
```

These are separate states. Building the platform Docker image does **not**
provision the A2E apps: its production stages do not copy `twenty-apps/internal`.
A successful private publish is not a workspace installation. A successful
workspace installation is not proof every background job or user flow works.

## What exists at baseline `3e664c89`?

| Product | Source and current display name | Universal identifier | Discovery/preset wiring |
| --- | --- | --- | --- |
| Documents | [a2e-documents](../packages/twenty-apps/internal/a2e-documents/src/application.config.ts), `A2E Documents` | `19126a9c-7cc0-4368-aaba-c7e5a87b0c48` | A2E allowlist; all non-CRM presets |
| Bilan | [a2e-accounting](../packages/twenty-apps/internal/a2e-accounting/src/application.config.ts), `Bilan` | `b11a0000-0000-4000-8000-000000000001` | A2E allowlist; Non-profit and Small business presets |
| Projects | [a2e-projects](../packages/twenty-apps/internal/a2e-projects/src/application.config.ts), `A2E Projects` | `4f759655-84f8-434d-9c76-ee1850e8c1a4` | Not in A2E allowlist or presets |
| Bureau | No separate application definition in `internal/` | None assigned | Product packaging decision pending; do not create duplicate domain objects |

The IDs above belong to existing apps and must not be regenerated to fix
installation. The old Texxel and A2EMoney directories are inspiration, not
installable Twenty packages.

### Why the A2E section can disappear

[useA2eSuiteApplications](../packages/twenty-front/src/modules/a2e-workspace/hooks/useA2eSuiteApplications.ts)
combines workspace installs with a catalog query filtered by the
[A2E allowlist](../packages/twenty-front/src/modules/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers.ts).
[SettingsA2eSuiteSection](../packages/twenty-front/src/modules/a2e-workspace/components/SettingsA2eSuiteSection.tsx)
returns `null` when both lists are empty. No source-folder scan or fallback
Bilan/Bureau card happens. This explains a possible empty state; it is not a
runtime diagnosis of a particular deployed server.

The [marketplace query service](../packages/twenty-server/src/engine/core-modules/application/application-marketplace/marketplace-query.service.ts)
reads the catalog cache. Registration, listing eligibility, cache state and
installation should be investigated separately; refreshing the catalog cannot
create a missing app package.

## Development provisioning runbook

**Use a disposable workspace. Do not publish, sync or uninstall against
production without explicit approval.** This runbook is source-checked against
the workspace SDK CLI; the commands have not been run against a live server in
this documentation change.

### 1. Establish tooling and version compatibility

Follow [verification setup](verification.md). Root Node requirement is
`^24.5.0`, bundled Yarn is `4.13.0`. The three A2E app manifests currently pin
SDK/client SDK **2.31.0**, while workspace SDK/server are **2.39.0**. Do not
silently mix these or assume `engines.twenty` proves compatibility. Establish
and test a supported pair as delivery task D0.

Apps are independent packages, not root Yarn workspaces. Accounting/Projects
have app-local lockfiles; Documents does not at this baseline. Resolve that
reproducibility gap deliberately, not with a root lockfile rewrite.

### 2. Select the app and an authenticated scratch remote

The examples below run **inside the selected app directory**, after its
compatible dependencies are installed. `scratch` is an example remote name;
configure it for your disposable workspace. Use interactive authentication or
the platform's secret store; never paste API keys into documentation or logs.

```sh
# Working directory: packages/twenty-apps/internal/a2e-accounting
# Check the installed CLI's options before using the runbook.
yarn twenty --version
yarn twenty remote:add --help
yarn twenty remote:list
```

For the current workspace SDK, `remote:add` configures a remote and `--remote`
selects it. Verify the target URL/workspace before any write. Remote listing can
contain internal deployment names: do not paste it wholesale into a public MR.

### 3. Build, privately publish, then install

```sh
# Same app directory; scratch must already be configured.
yarn twenty dev:build .
yarn twenty app:publish . --private --remote scratch
yarn twenty app:install . --remote scratch
```

`app:publish` without `--private` targets **npm**. Do not use it to provision
internal apps accidentally. For an update, inspect the server's installed and
published versions and follow version-progression validation; do not bypass
compatibility checks. Review generated manifests and preserve universal IDs.

If using the **built workspace SDK** instead of an app-local CLI, run from the
repository root and supply the app path on **both** commands:

```sh
node packages/twenty-sdk/dist/cli.cjs app:publish packages/twenty-apps/internal/a2e-accounting --private --remote scratch
node packages/twenty-sdk/dist/cli.cjs app:install packages/twenty-apps/internal/a2e-accounting --remote scratch
```

This requires `dist/cli.cjs` and a compatible app SDK. It is not an instruction
to bypass the version mismatch above. CLI definitions:
[app commands](../packages/twenty-sdk/src/cli/commands/app/index.ts),
[dev commands](../packages/twenty-sdk/src/cli/commands/dev/index.ts).
Local `plan`/`apply` development sync is different from testing packaged
publication and installation; do not substitute one for the other.

### 4. Verify the installed result

- Confirm the correct workspace and app version in Installed; inspect
  registration/catalog separately if the discovery card is absent.
- Confirm objects/fields, minimum permissions, views, record layouts and
  navigation. Open a real record via sidebar, search and side panel.
- Check server **and worker/function** logs for post-install failures. Bilan's
  seed/categories/profile/catalog functions are not proven by a nav folder.
- Apply a relevant preset; compare the resulting installed app list rather
  than trusting only the saved `workspaceTemplate` value.
- Repeat installation/upgrade with populated records on a disposable workspace;
  verify no duplicate seeds and no lost user data.
- Record evidence with the [handoff template](templates/handoff.md).

## Troubleshooting by layer

| Symptom | Source-backed possibility | Next check / proposed repair |
| --- | --- | --- |
| No A2E section | Both hook result lists empty | Verify catalog registration/listing/cache and workspace installs; proposed visible unavailable/empty state is D1 |
| Bilan absent after platform deployment | App packaging/provisioning separate from Docker build | Verify published package and registration on that server, then install in the intended workspace |
| Projects absent from A2E section | Its ID is not in the allowlist | D1 must wire discovery and chosen presets after compatibility/install tests |
| Bureau absent | No Bureau manifest or bundle contract | Confirm packaging decision, reuse Documents/Projects; not a spelling fix |
| Preset selected but apps absent | Service logs/skips unregistered apps and catches install failures | Inspect each registration/install result; D1 needs explicit partial status and retry |
| Individual → CRM leaves entries hidden | Caller invokes navigation helper only for nonempty hidden lists | Regression-test reverse transition before repairing the caller |
| No sample content | All current preset flags off; generic seeder unimplemented | Implement versioned, idempotent starter packs under D2 |
| App installed, finance/document action fails | Schema/UI/job boundaries incomplete | Reproduce a real action, inspect permissions and logs; do not retick a roadmap from source presence |

Preset evidence:
[WorkspaceTemplateService](../packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts).
Installation evidence:
[ApplicationInstallService](../packages/twenty-server/src/engine/core-modules/application/application-install/application-install.service.ts).

## Uninstall is not a harmless off switch

[ApplicationSyncService](../packages/twenty-server/src/engine/core-modules/application/application-manifest/application-sync.service.ts)
builds a migration toward empty app-owned metadata, deletes the application and
cleans runtime resources. This is not merely hiding sidebar entries. Treat
uninstall as potentially destructive; establish record/file retention,
cross-app relations and export/backup requirements before using it on real data.

Only run lifecycle acceptance on disposable workspaces: install → create/link
records → upgrade → export/backup as specified → uninstall → inspect dependent
apps and files → reinstall. A fresh reinstall does not prove data restoration.
No uninstall or live provisioning was performed for this documentation MR.
