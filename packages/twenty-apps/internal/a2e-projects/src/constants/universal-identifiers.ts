// Universal identifiers for A2E Projects.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). The namespace mirrors A2E Documents' scheme:
// c31a{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object index
// (02 project, 00 = app-level) and KK the family:
//   0000 object · 0001 own field · 0002 relation field · 0003 view ·
//   0004 view field · 0005 select option · 0006 view sort ·
//   0009 page-layout tab · 000a widget · 0010 nav item ·
//   0011 command menu item · 0012 logic function · 0013 front component
//
// Relation identifiers live here so object files never import each other
// (circular imports resolve to undefined at manifest build time).

export const OBJECT_IDS = {
  project: 'c31a0200-0000-4000-8000-000000000000',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign key.
export const RELATION_IDS = {
  projectLead: 'c31a0200-0002-4000-8000-000000000001',
  memberProjects: 'c31a0200-0002-4000-8000-000000000002',
  projectCompany: 'c31a0200-0002-4000-8000-000000000003',
  companyProjects: 'c31a0200-0002-4000-8000-000000000004',
} as const;

export const LABEL_IDENTIFIER_IDS = {
  projectName: 'c31a0200-0001-4000-8000-000000000001',
} as const;

export const LOGIC_FUNCTION_IDS = {
  postInstall: 'c31a0000-0012-4000-8000-000000000003',
} as const;

export const COMMAND_MENU_ITEM_IDS = {
  createProject: 'c31a0000-0011-4000-8000-000000000004',
  goToProjects: 'c31a0000-0011-4000-8000-000000000005',
} as const;

export const NAVIGATION_MENU_ITEM_IDS = {
  projects: 'c31a0000-0010-4000-8000-000000000003',
} as const;

export const FRONT_COMPONENT_IDS = {
  createProjectCommand: 'c31a0000-0013-4000-8000-000000000004',
  goToProjects: 'c31a0000-0013-4000-8000-000000000005',
} as const;

export const VIEW_IDS = {
  allProjects: 'c31a0200-0003-4000-8000-000000000001',
} as const;

// View fields are positional, so their identifiers are derived.
export const viewFieldId = (viewIndex: number, position: number): string =>
  `c31a0200-0004-4000-8000-${viewIndex
    .toString(16)
    .padStart(2, '0')}${position.toString(16).padStart(10, '0')}`;
