import { defineApplicationRole } from 'twenty-sdk/define';

import { DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER } from '../constants/universal-identifiers.ts';

// Reads only. The CRM tools supply caller-authorized content for the assistant
// to draft from; the actual reply or enrichment is a separate, human-confirmed
// write performed elsewhere, so this role grants no update or destroy.
export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'A2E CRM default function role',
  description: 'Role the A2E CRM app operations run as',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
});
