import {
  defineView,
  ViewFilterOperand,
  ViewOpenRecordIn,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = {
  title: 'c31a0100-0001-4000-8000-000000000001',
  kind: 'c31a0100-0001-4000-8000-000000000003',
  tags: 'c31a0100-0001-4000-8000-000000000008',
};

const id = (viewIndex: number) => (position: number) =>
  viewFieldId(viewIndex, position);

const fieldId = id(1);

// Template gallery: the metadata view primitive (LIST) scoped to kind =
// TEMPLATE, per the view-first decision order. Instantiation copies blocks
// from the template record; the record page renders them in the shared
// rich-text widget.
export default defineView({
  universalIdentifier: VIEW_IDS.templates,
  name: 'Modèles',
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: ViewType.LIST,
  icon: 'IconFileText',
  position: 1,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.title,
      position: 0,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.tags,
      position: 1,
      isVisible: true,
      size: 160,
    },
  ],
  filters: [
    {
      universalIdentifier: 'c31a0100-0005-4000-8000-000000000101',
      fieldMetadataUniversalIdentifier: field.kind,
      operand: ViewFilterOperand.IS,
      value: ['TEMPLATE'],
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31a0100-0005-4000-8000-000000000102',
      fieldMetadataUniversalIdentifier: field.title,
      direction: ViewSortDirection.ASC,
    },
  ],
});
