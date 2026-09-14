import { defineApplicationRole } from 'twenty-sdk/define';

import { PROTECTED_BANK_FIELD_PERMISSIONS } from '../lib/protected-bank-fields.ts';

export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000002';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Bilan default function role',
  description:
    "Rôle sous lequel tournent les opérations Bilan : journal automatique, relances de factures, récurrences, cumuls de budgets et ingestion du catalogue de subventions.",
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
  // No logic function reads or writes the bank identifiers; denying them here
  // means a compromised or buggy function cannot exfiltrate IBAN/BIC either.
  fieldPermissions: PROTECTED_BANK_FIELD_PERMISSIONS.map(
    (fieldPermission) => ({ ...fieldPermission }),
  ),
});
