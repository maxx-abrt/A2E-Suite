# Applications: finding, provisioning and verifying Bureau · Agenda · Bilan · Syna · Archive

[Documentation home](README.md) · [Product names and template contracts](product-experience.md)

The suite reads as five apps. **Bureau** is the work/knowledge experience
(documents, projects, discussions), **Agenda** is the calendar host page,
**Bilan** is finance, **Syna** is the AI assistant, and **Archive** is files.
The names are display surfaces only: package directories, npm names and
universal identifiers never change.

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

These are separate states. From **HEAD (2026-09-22+)**, building the production
Docker image **does** provision the A2E apps: the `twenty-apps-build` Dockerfile
stage builds each app's tarball; `entrypoint.sh` runs `app:provision-bundled`
at every boot, which registers any unregistered bundled app and marks it
`isPreInstalled=true`; then `install-pre-installed-apps` auto-installs it on
all workspaces. Set `DISABLE_BUNDLED_APP_PROVISIONING=true` to opt out.
Provisioning runs only in the container that owns migrations (the server):
every shipped worker definition sets `DISABLE_BUNDLED_APP_PROVISIONING=true`,
and a container started with `DISABLE_DB_MIGRATIONS=true` skips it unless
`DISABLE_BUNDLED_APP_PROVISIONING=false` forces it (for deployments that
migrate out-of-band). Before US-087 each worker boot re-ran both commands
concurrently with the server. Helm, k8s manifests and terraform override the
worker `command`, which bypasses `entrypoint.sh` entirely.
A successful workspace installation is not proof every background job or user flow works.

## What exists at baseline `3e664c89`?

| Product | Source and current display name | Universal identifier | Discovery/preset wiring |
| --- | --- | --- | --- |
| Bureau (Pages) | [a2e-documents](../packages/twenty-apps/internal/a2e-documents/src/application.config.ts), `Bureau` | `19126a9c-7cc0-4368-aaba-c7e5a87b0c48` | A2E allowlist; all non-CRM presets |
| Bilan | [a2e-accounting](../packages/twenty-apps/internal/a2e-accounting/src/application.config.ts), `Bilan` | `b11a0000-0000-4000-8000-000000000001` | A2E allowlist; Non-profit and Small business presets |
| Bureau Projets | [a2e-projects](../packages/twenty-apps/internal/a2e-projects/src/application.config.ts), `Bureau Projets` | `4f759655-84f8-434d-9c76-ee1850e8c1a4` | A2E allowlist (added US-077); no preset yet (D-B1 pending) |
| Bureau Discussions | [a2e-chat](../packages/twenty-apps/internal/a2e-chat/src/application.config.ts), `Bureau Discussions` | `e2dce399-87f1-4548-b307-5f368b4d5dd4` | A2E allowlist (added US-077); no preset yet |
| Archive | [a2e-drive](../packages/twenty-apps/internal/a2e-drive/src/application.config.ts), `Archive` | `b11cd01f-75de-4acd-8e67-0e9c484fde02` | A2E allowlist (added US-077); no preset yet |
| Syna CRM | [a2e-crm](../packages/twenty-apps/internal/a2e-crm/src/application.config.ts), `Syna CRM` | `c31e0000-0000-4000-8000-000000000000` | A2E allowlist, bundled image and onboarding app list (added US-086); no preset |
| Agenda | Host page `/calendar`; no separate application definition | None assigned | Host-seeded nav entry pending (PLAN M7d) |
| Bureau | Composed from the Bureau apps above; no separate application definition in `internal/` | See the Bureau rows | Product packaging decision pending; do not create duplicate domain objects |

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
| Projects absent from A2E section | Its ID was not in the allowlist | Fixed US-077: Projects, Chat, Drive IDs added to the A2E allowlist and OnboardingInstallableApps |
| Bureau absent | No Bureau manifest or bundle contract | Confirm packaging decision, reuse Documents/Projects; not a spelling fix |
| Preset selected but apps absent | Service logs/skips unregistered apps and catches install failures | Inspect each registration/install result; D1 needs explicit partial status and retry |
| Individual → CRM leaves entries hidden | Caller invokes navigation helper only for nonempty hidden lists | Regression-test reverse transition before repairing the caller |
| No sample content | All current preset flags off; generic seeder unimplemented | Implement versioned, idempotent starter packs under D2 |
| App installed, finance/document action fails | Schema/UI/job boundaries incomplete | Reproduce a real action, inspect permissions and logs; do not retick a roadmap from source presence |

Preset evidence:
[WorkspaceTemplateService](../packages/twenty-server/src/engine/core-modules/onboarding/workspace-template.service.ts).
Installation evidence:
[ApplicationInstallService](../packages/twenty-server/src/engine/core-modules/application/application-install/application-install.service.ts).

## Bureau host experience (2026-10-22)

With `a2e-documents` installed, `/bureau` opens its home and
`/bureau/:documentId` opens a full-page document using the existing host editor.
The tree, favorites, search, trash and Notion HTML/Markdown import live in the
native drawer. The native app folder focuses when one of its configured links
is opened; **All apps** returns to workspace navigation without leaving the
document. Existing record views and side panels continue to use the same IDs.
Missing installation/metadata offers an Applications link; older schemas hide
page controls whose fields are not installed.

Local evidence: the existing package built/published privately to the local
scratch registry and upgraded the populated Apple seed workspace to `0.2.14`
with **1 upgraded, 0 failed**. Its pre-upgrade document survived; a browser
HTML ZIP import reconstructed two pages, nesting, a table, working links and a
workspace-stored image. This is not a clean-container or all-app lifecycle pass.
See [the delivery checklist](BUREAU_PLAN.md) for conversion limits and open gates.

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

## Workspace setup reliability (2026-10-23)

Bureau templates install Pages, Projects and Discussions in dependency order.
Their app-owned post-install hooks now finish before installation is reported
as ready and run again on version upgrades to recover missing starter content.
The packaged versions for this repair are Documents **0.2.15**, Projects
**0.1.23** and Discussions **0.1.4**. Deploy the rebuilt packages alongside the
server changes; a source-only server update cannot replace an old app hook.

All non-CRM presets and Start from scratch hide the six managed CRM shortcuts.
CRM explicitly restores shortcuts hidden by setup, preserving user-removed
entries and records. Sample confirmation reads persisted reusable templates,
so a completed background seed can be recognized on retry. Successful setup
advances onboarding to profile creation.

Projects 0.1.23 also supplies native Tasks and Events shortcuts in the shared
Bureau folder. Tasks opens the editable project-task table; Events opens the
host calendar. Bureau home mirrors the folder as a compact shortcut row, so
native layout customization remains the place to rename, reorder, add or remove
shortcuts. No second shortcut configuration is stored. Existing workspaces need
the packaged application upgrade to receive the new managed entries.

Local acceptance covers account signup, activation and token renewal, packaged
Bureau installation, starter pages, 12 projects, 60 tasks, 36 milestones, both
discussion channels, onboarding continuation, repeat-safe seeds, operation
replay and CRM visibility in both directions. Production rollout and Bilan
preset installation are separate verification.
