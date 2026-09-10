import { defineView, ViewSortDirection } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.invoice;
const id = (position: number) => viewFieldId('01', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.invoices,
  name: 'Toutes les factures',
  objectUniversalIdentifier: OBJECT_IDS.invoice,
  icon: 'IconFileInvoice',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.number,
      position: 0,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.status,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.clientName,
      position: 2,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.issueDate,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.dueDate,
      position: 4,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.amountTotal,
      position: 5,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(6),
      fieldMetadataUniversalIdentifier: field.amountPaid,
      position: 6,
      isVisible: true,
      size: 140,
    },
  ],
  sorts: [
    {
      universalIdentifier: viewFieldId('01', 0, 100),
      fieldMetadataUniversalIdentifier: field.issueDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
