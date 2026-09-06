# A2E Suite internal apps — authoring guide

How to create, publish and install a first-party `a2e-*` app inside this
monorepo. The app format reference is
[`internal/real-estate/`](./internal/real-estate/); the sanctioned anatomy is
defined in [`docs/plan/04-twenty-native-law.md`](../../docs/plan/04-twenty-native-law.md)
§2 (read it before your first app).

## Creating an internal app

1. Copy the skeleton from `internal/real-estate/` (or, for an empty shell,
   `internal/a2e-documents/`):

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
       components/         # front components only where metadata is not enough
   ```

2. Generate **two fresh UUIDs** with `node -e
   "console.log(crypto.randomUUID())"` (one per call):
   `APPLICATION_UNIVERSAL_IDENTIFIER` and the default role's universal
   identifier. Write them into `application.config.ts` /
   `default-function.role.ts` and commit them immediately — they are forever
   (the additive-only law). Never regenerate a UUID after the app has been
   published or installed on any workspace.

3. Keep the devDependencies pinned to the same `twenty-sdk` /
   `twenty-client-sdk` version as the other internal apps, then run
   `cd packages/twenty-apps/internal/a2e-<domain> && yarn install`.

## Naming rules

- App package name: `a2e-<domain>` (`a2e-documents`, `a2e-projects`, …).
  Internal apps live under `internal/`, examples under `examples/`.
- `displayName` carries the user-facing brand: `A2E <Domain>` (e.g.
  "A2E Documents").
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

Against a running dev server (from the repo root):

```bash
node packages/twenty-sdk/dist/cli.cjs app:publish --private
node packages/twenty-sdk/dist/cli.cjs app:install
```

- `app:publish --private` builds the app and pushes it to the dev server's
  app registry (npm publishing is the default and is NOT what internal apps
  use).
- `app:install` installs the published app on the connected workspace.
- Run both from the repo root; pass the app path as the optional `[appPath]`
  argument to target one app.
- Re-publish + install after manifest changes; the server treats an install
  of a newer version as an upgrade (downgrades are rejected).

Uninstalling removes the app-owned metadata (objects, fields, views, page
layouts, nav items, command menu items) — verified per app before shipping;
see the P1 acceptance criteria in `docs/plan/PLAN.md`.

## App anatomy requirements (enforced in review)

Every app object ships, at minimum: a table view, a record page layout, a
label identifier field, and a navigation menu item with a sensible
`position`. Apps pin at least two command menu items ("Create <thing>" and
"Go to <app>"). Roles grant the minimum viable permissions; the default
function role never gets hard-destroy rights unless uninstall logic
demands it.
