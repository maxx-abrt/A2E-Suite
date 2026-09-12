// Universal identifiers for A2E Documents.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). The namespace mirrors Bilan's scheme so a reviewer can
// read it: c31a{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object
// index (01 document, 00 = app-level) and KK the family:
//   0000 object · 0001 own field · 0002 relation field · 0003 view ·
//   0004 view field · 0005 select option · 0009 page-layout tab ·
//   000a widget · 0010 nav item · 0011 command menu item · 0012 logic function
//
// Relation identifiers live here so object files never import each other
// (circular imports resolve to undefined at manifest build time).

export const OBJECT_IDS = {
  document: 'c31a0100-0000-4000-8000-000000000000',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign key.
export const RELATION_IDS = {
  documentParent: 'c31a0100-0002-4000-8000-000000000001',
  documentChildren: 'c31a0100-0002-4000-8000-000000000002',
  documentCompany: 'c31a0100-0002-4000-8000-000000000003',
  companyDocuments: 'c31a0100-0002-4000-8000-000000000004',
  documentPerson: 'c31a0100-0002-4000-8000-000000000005',
  personDocuments: 'c31a0100-0002-4000-8000-000000000006',
} as const;

export const LABEL_IDENTIFIER_IDS = {
  documentTitle: 'c31a0100-0001-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  postInstall: 'c31a0000-0012-4000-8000-000000000001',
  purgeArchivedDocuments: 'c31a0000-0012-4000-8000-000000000002',
} as const;

export const COMMAND_MENU_ITEM_IDS = {
  createDocument: 'c31a0000-0011-4000-8000-000000000001',
  goToDocuments: 'c31a0000-0011-4000-8000-000000000002',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  documents: 'c31a0000-0010-4000-8000-000000000001',
} as const;

export const VIEW_IDS = {
  allDocuments: 'c31a0100-0003-4000-8000-000000000001',
  templates: 'c31a0100-0003-4000-8000-000000000002',
  archived: 'c31a0100-0003-4000-8000-000000000003',
} as const;

// View fields are positional, so their identifiers are derived.
export const viewFieldId = (viewIndex: number, position: number): string =>
  `c31a0100-0004-4000-8000-${viewIndex
    .toString(16)
    .padStart(2, '0')}${position.toString(16).padStart(10, '0')}`;
