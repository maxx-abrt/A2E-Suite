// Server-enforced protection of the organization bank identifiers. A role
// fieldPermission with canRead/canUpdate false compiles into the server's
// restrictedFields map, which the ORM read/update guards check on EVERY query
// (workspace-roles-permissions-cache.service.ts → permissions.utils.ts) —
// unlike field descriptions or UI locks, which are advisory only.
//
// One shared list so the assignable Bilan role and the default function role
// can never drift apart on which fields count as protected bank data.
import { FIELD_IDS } from '../constants/field-identifiers.ts';
import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

export const PROTECTED_BANK_FIELD_PERMISSIONS = [
  {
    objectUniversalIdentifier: OBJECT_IDS.orgProfile,
    fieldUniversalIdentifier: FIELD_IDS.orgProfile.iban,
    canReadFieldValue: false,
    canUpdateFieldValue: false,
  },
  {
    objectUniversalIdentifier: OBJECT_IDS.orgProfile,
    fieldUniversalIdentifier: FIELD_IDS.orgProfile.bic,
    canReadFieldValue: false,
    canUpdateFieldValue: false,
  },
] as const;
