// Universal identifiers for A2E Links.
//
// One UUIDv4-class identifier per declarable thing, committed forever
// (additive-only law). A2E Documents owns c31a*, A2E Projects c31b*,
// A2E Chat c31c*, A2E Drive c31d*, A2E CRM c31e*, so Links claims the next
// free block, c31f*:
// c31f{OO}00-{KK}00-4000-8000-0000000000{NN} where OO is the object index
// (01 a2eLink; 00 = app-level) and KK the family:
//   0000 object · 0001 own field · 0002 relation field · 0005 select option ·
//   0006 morph group
//
// Relation identifiers live here so object files never import each other
// (circular imports resolve to undefined at manifest build time).

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '895bb7aa-3ae3-400f-9dfa-72116f0021e2';

export const DEFAULT_ROLE_UNIVERSAL_IDENTIFIER =
  '3f1473e6-cdb1-4396-af3a-39dfb24cf3dd';

export const OBJECT_IDS = {
  a2eLink: 'c31f0100-0000-4000-8000-000000000000',
} as const;

// Cross-app relation target. A2E Documents owns `document` (c31a*), so it must
// be installed before A2E Links (D-P4.3-DOC provider-before-consumer). `task`
// is a standard object and is always present, so it is referenced through the
// SDK standard-ids constant in the task field files instead of here.
export const EXTERNAL_OBJECT_IDS = {
  document: 'c31a0100-0000-4000-8000-000000000000',
} as const;

// One morphId per endpoint group. Every leg of a group shares the morphId;
// Twenty stores the group as one MORPH_RELATION field row per target object.
export const MORPH_IDS = {
  source: 'c31f0100-0006-4000-8000-000000000001',
  target: 'c31f0100-0006-4000-8000-000000000002',
} as const;

// Both sides of every relation, grouped by the record that owns the foreign
// key. The morph legs live on the app-owned a2eLink object (foreign objects
// are the targets); the inverse O2M fields are standalone app-owned field
// manifests on the foreign/standard target objects.
export const RELATION_IDS = {
  sourceDocument: 'c31f0100-0002-4000-8000-000000000001',
  sourceTask: 'c31f0100-0002-4000-8000-000000000002',
  targetDocument: 'c31f0100-0002-4000-8000-000000000003',
  targetTask: 'c31f0100-0002-4000-8000-000000000004',
  documentOutgoingLinks: 'c31f0100-0002-4000-8000-000000000005',
  documentIncomingLinks: 'c31f0100-0002-4000-8000-000000000006',
  taskOutgoingLinks: 'c31f0100-0002-4000-8000-000000000007',
  taskIncomingLinks: 'c31f0100-0002-4000-8000-000000000008',
} as const;

export const FIELD_IDS = {
  linkKey: 'c31f0100-0001-4000-8000-000000000001',
  label: 'c31f0100-0001-4000-8000-000000000002',
  linkType: 'c31f0100-0001-4000-8000-000000000003',
} as const;

export const SELECT_OPTION_IDS = {
  linkTypeUserLink: 'c31f0100-0005-4000-8000-000000000001',
  linkTypeMention: 'c31f0100-0005-4000-8000-000000000002',
} as const;

// M11a-i3 "Related" surface. App-level (OO=00) identifiers: the front
// components and the standalone tabs are cross-object surfaces (document +
// task), not fields of the a2eLink object. Families follow A2E Documents:
// 0009 page-layout tab, 000a widget, 0013 front component.
export const FRONT_COMPONENT_IDS = {
  documentRelatedLinks: 'c31f0000-0013-4000-8000-000000000001',
  taskRelatedLinks: 'c31f0000-0013-4000-8000-000000000002',
} as const;

export const PAGE_LAYOUT_TAB_IDS = {
  documentRelated: 'c31f0000-0009-4000-8000-000000000001',
  documentRelatedWidget: 'c31f0000-000a-4000-8000-000000000001',
  taskRelated: 'c31f0000-0009-4000-8000-000000000002',
  taskRelatedWidget: 'c31f0000-000a-4000-8000-000000000002',
} as const;

// A2E Documents owns the document record page (c31a…), so its page-layout
// universal identifier is a known cross-app target at install time — the same
// coupling as EXTERNAL_OBJECT_IDS.document. A2E Documents installs first
// (provider-before-consumer), so the referenced layout always exists when the
// Related tab is added.
export const DOCUMENT_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  'c31a0100-0008-4000-8000-000000000001';
