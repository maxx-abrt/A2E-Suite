# A2E Drive — workspace files and folders

A2E Drive is the file-management surface of the suite: an arborescent folder
tree over Twenty's existing attachments, so a workspace can organise the files
that Documents, Projects and Bilan already produce. It is part of the intended
**Bureau** experience. See the [feature guide](../../../../docs/features.md)
for how Drive sits next to the other apps and surfaces.

## Status and installation

**Status: source present, not release-certified.** The metadata and the Drive
page described below exist in this repository; installation and every file
journey are not proven by their presence.

Drive is not a second storage service: it adds organisation (folders, folder
membership, starring, archiving) on top of Twenty's existing file storage and
attachment records. Follow the
[applications runbook](../../../../docs/applications.md) to register, publish
and install the app on a disposable workspace.

## Where users find it

- Sidebar entry **Drive** → `allDriveFolders`
  ([drive.navigation-menu-item.ts](./src/navigation-menu-items/drive.navigation-menu-item.ts)).
- Native page at route `/drive` (`AppPath.Drive`,
  [DrivePage.tsx](../../../twenty-front/src/pages/drive/DrivePage.tsx)). The
  page is a front surface that reads and writes this app's metadata.
- A Drive usage widget is registered on the workbench dock/Home dashboard
  ([registerDriveUsageWidget.ts](../../../twenty-front/src/modules/drive/registerDriveUsageWidget.ts)).

## What it does

### Folders

The `driveFolder` object ([drive-folder.object.ts](./src/objects/drive-folder.object.ts))
has `name`, `icon`, `color`, `archivedAt` and a self-relation
(`parent` / `children`, cascade) so folders form a tree. A parent-cycle guard
repairs invalid moves, and a daily cron purges folders and attachments archived
beyond the 7-day retention
([purge-drive-trash.ts](./src/logic-functions/purge-drive-trash.ts)).

### Files

Files remain standard Twenty `attachment` records. A2E Drive extends them with
`folder` (set null on delete), `archivedAt`, `description`, `sourceApp` and a
`starred` flag. The **Tous les fichiers** view lists them with folder,
source app, starred state and description
([all-drive-files.view.ts](./src/views/all-drive-files.view.ts)).

### The Drive page

`DrivePage` combines a folder tree sidebar, a breadcrumb, a list/gallery
toggle, a trash view with bulk restore/destroy, and an upload queue. It uses
the `useDriveFolders` / `useDriveFiles` hooks (record queries), `useDriveActions`
(create/update) and `useDriveUploadQueue` (uploads), and previews files through
the shared file-preview state. Retention and purge follow the 7-day trash
window. Drive does not use a realtime topic; the page refetches its records.

## Development

From this directory, after installing a compatible Node/SDK:

```sh
yarn typecheck
yarn lint
yarn test:unit
yarn twenty dev:build .
```

The unit tests cover the cycle and retention helpers; they do not prove an
installed workspace or a browser file journey. Record real results with the
[verification guide](../../../../docs/verification.md).
