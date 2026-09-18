import { defineApplicationRole } from 'twenty-sdk/define';

export const DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER =
  '01e14521-9688-48e9-8163-e2b3da11f6c5';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  label: 'A2E Chat default function role',
  description: 'Role the A2E Chat app operations run as',
  canReadAllObjectRecords: true,
  canUpdateAllObjectRecords: true,
  canSoftDeleteAllObjectRecords: true,
  canDestroyAllObjectRecords: false,
});
