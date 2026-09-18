// Universal identifiers for A2E Drive.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). A2E Documents owns c31a*, A2E Projects owns c31b*,
// A2E Chat owns c31c*, so Drive claims the next free block, c31d*:
// c31d{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object index
// (01 driveFolder; 00 = app-level) and KK the family:
//   0000 object · 0001 own field · 0002 relation field · 0003 view ·
//   0004 view field · 0006 view sort · 0009 page-layout tab ·
//   000a widget · 0010 nav item · 0012 logic function
//
// `driveFolder` is the only workspace object Drive owns. The attachment
// extensions live on the standard `attachment` object, so their fields are
// namespaced under c31d0200, a field block next to the object family (the
// same shape A2E Projects uses for its task-extension fields).
//
// Relation identifiers live here so object and field files never import each
// other (circular imports resolve to undefined at manifest build time).

export const OBJECT_IDS = {
  driveFolder: 'c31d0100-0000-4000-8000-000000000000',
} as const;

// Both sides of the folder self-relation. The FK lives on `driveFolder`; the
// attachment → folder membership FK lives on the standard `attachment` and is
// identified in ATTACHMENT_FIELD_IDS below.
export const RELATION_IDS = {
  folderParent: 'c31d0100-0002-4000-8000-000000000001',
  folderChildren: 'c31d0100-0002-4000-8000-000000000002',
} as const;

export const FOLDER_FIELD_IDS = {
  name: 'c31d0100-0001-4000-8000-000000000001',
  icon: 'c31d0100-0001-4000-8000-000000000002',
  color: 'c31d0100-0001-4000-8000-000000000003',
  archivedAt: 'c31d0100-0001-4000-8000-000000000004',
} as const;

// Fields pinned on the standard `attachment` object. The relation field is
// named `folder` and its join column `folderId`, so the workspace scalar stays
// `folderId` (the A2E Projects `projectId` pattern). The inverse `files` lives
// on `driveFolder`.
export const ATTACHMENT_FIELD_IDS = {
  folder: 'c31d0200-0002-4000-8000-000000000001',
  driveFolderFiles: 'c31d0200-0002-4000-8000-000000000002',
  starred: 'c31d0200-0001-4000-8000-000000000003',
  sourceApp: 'c31d0200-0001-4000-8000-000000000004',
  description: 'c31d0200-0001-4000-8000-000000000005',
  archivedAt: 'c31d0200-0001-4000-8000-000000000006',
} as const;

export const VIEW_IDS = {
  allDriveFolders: 'c31d0100-0003-4000-8000-000000000001',
  allDriveFiles: 'c31d0200-0003-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  guardDriveFolderParentCycle: 'c31d0000-0012-4000-8000-000000000001',
  purgeDriveTrash: 'c31d0000-0012-4000-8000-000000000002',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  drive: 'c31d0000-0010-4000-8000-000000000001',
} as const;

// View fields are positional, so their identifiers are derived. `viewFamily`
// is the two-hex-digit family block the view belongs to (01 folders, 02
// attachment files), keeping every view field in its view's family.
export const viewFieldId = (viewFamily: string, position: number): string =>
  `c31d${viewFamily}00-0004-4000-8000-${position
    .toString(16)
    .padStart(12, '0')}`;
