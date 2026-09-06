import { defineApplicationRole } from 'twenty-sdk/define';

export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  '1e0eda2a-8319-4211-93f7-e0e185ee35b1';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'A2E Documents default function role',
  description: 'Role the A2E Documents app operations run as',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
