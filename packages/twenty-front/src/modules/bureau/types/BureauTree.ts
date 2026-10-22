import { type BureauDocument } from '@/bureau/types/BureauDocument';

// `parentIdById` is the effective parent used for rendering: a missing,
// trashed or cyclic parent resolves to the root (`null`) so no page is ever
// unreachable from the sidebar.
export type BureauTree = {
  documentsById: Map<string, BureauDocument>;
  childrenByParentId: Map<string | null, BureauDocument[]>;
  parentIdById: Map<string, string | null>;
};
