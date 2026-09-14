import { defineRole } from 'twenty-sdk/define';

import { PROTECTED_BANK_FIELD_PERMISSIONS } from '../lib/protected-bank-fields.ts';

export const FINANCE_USER_ROLE_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000003';

// The assignable Bilan role: full finance surface EXCEPT the bank identifiers.
// The denies are server-enforced (restrictedFields in the ORM guards), so an
// admin assignee querying orgProfiles.iban over the API gets a field-level
// denial, not a hidden column. Workspace admins keep full access through the
// admin role; granting someone bank data means assigning that role instead.
// defineRole, not defineApplicationRole: the SDK allows exactly one
// application role per app, and the default function role is it.
export default defineRole({
  universalIdentifier: FINANCE_USER_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'Bilan utilisateur',
  description:
    "Accès Bilan complet (factures, devis, écritures, budgets, fiches, subventions) sans les données bancaires de l'organisation : IBAN et BIC sont masqués et non modifiables au niveau serveur.",
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  fieldPermissions: PROTECTED_BANK_FIELD_PERMISSIONS.map(
    (fieldPermission) => ({ ...fieldPermission }),
  ),
});
