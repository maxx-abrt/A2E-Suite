# A2E Suite internal apps — authoring guide

How to create, publish and install a first-party `a2e-*` app inside this
monorepo. The app format reference is
[`internal/real-estate/`](./internal/real-estate/); the sanctioned anatomy is
defined in [native patterns](../../docs/plan/04-twenty-native-law.md).
Start with the [applications runbook](../../docs/applications.md) for existing
Bilan/Documents/Projects, catalog visibility and current version limitations.

These apps are independent packages, not root Yarn workspaces. Bureau is a
product packaging target, not another app to copy from. Documents is no longer
an empty shell; do not clone its IDs or domain objects for a new app.

## Creating an internal app

1. Use the scaffolder matching the supported SDK version; inspect
   `internal/real-estate/` for definitions and `examples/media-notes/` for
   front components. Do not copy a published app wholesale. Typical anatomy:

   ```
   packages/twenty-apps/internal/a2e-<domain>/
     package.json          # name "a2e-<domain>", keyword "twenty-app"
     tsconfig.json
     .gitignore  .nvmrc  .yarnrc.yml  .oxlintrc.json
     src/
       application.config.ts
       roles/default-function.role.ts
       objects/  fields/  views/  page-layouts/
       navigation-menu-items/  command-menu-items/
       logic-functions/    # incl. post-install.ts
       front-components/  # only where metadata is not enough
   ```

2. Generate **two fresh UUIDs** with `node -e
   "console.log(crypto.randomUUID())"` (one per call):
   `APPLICATION_UNIVERSAL_IDENTIFIER` and the default role's universal
   identifier. Write them into `application.config.ts` /
   `default-function.role.ts` and commit them immediately — they are forever
   (the additive-only law). Never regenerate a UUID after the app has been
   published or installed on any workspace.

3. Select a tested SDK/client/server combination, not merely whatever version
   a neighboring app pins. Existing A2E apps pin 2.31.0 against workspace
   SDK/server 2.39.0; compatibility and app-local lockfile gaps are D0 work.
   Install dependencies in the app directory, preserve its lockfile, and
   establish explicit build/typecheck/unit/integration scripts.

## Naming rules

- App package name: `a2e-<domain>` (`a2e-documents`, `a2e-projects`, …).
  Internal apps live under `internal/`, examples under `examples/`.
- `displayName` carries the product name, not necessarily the package name:
  `Bilan` for `a2e-accounting`, currently `A2E Documents` / `A2E Projects`
  for their apps. Confirm Bureau packaging before changing names/identities.
- Object metadata names (`nameSingular`/`namePlural`) get **no** `a2e_`
  prefix — metadata is already workspace-scoped (`project`/`projects`,
  `invoice`/`invoices`).
- File names mirror the SDK entity they declare:
  `objects/document.object.ts`, `views/all-documents.view.ts`,
  `navigation-menu-items/documents.navigation-menu-item.ts`, etc.

## UUID discipline

- One UUIDv4 per declarable thing (application, role, object, field, view,
  nav item, command menu item, logic function). Committed once, never
  changed, never reused across apps.
- Two apps must never share a universal identifier; collisions surface as
  metadata sync conflicts on install.
- If an entity is deleted from the manifest and re-added later, keep its old
  UUID so upgrades remain no-ops instead of destructive recreations.

## Publishing and installing locally

Follow [the provisioning runbook](../../docs/applications.md) against a
confirmed disposable workspace. It gives app-local and built-workspace CLI
commands with explicit app paths/remotes and explains the version mismatch.

`app:publish --private` publishes to the server registry; bare `app:publish`
targets npm. `app:install` is a separate workspace operation. Local development
sync does not prove packaged install behavior. Test updates with populated
records and stable IDs, not just a fresh manifest build.

Uninstall can remove app-owned metadata and data. Define export, retention,
dependencies and file behavior before testing removal; never use production
uninstall as a troubleshooting reset.

## App anatomy requirements (enforced in review)

Every app object ships, at minimum: a table view, a record page layout, a
label identifier field, and a navigation menu item with a sensible
`position`. Apps pin at least two command menu items ("Create <thing>" and
"Go to <app>"). Roles grant the minimum viable permissions; the default
function role never gets hard-destroy rights unless uninstall logic
demands it.
