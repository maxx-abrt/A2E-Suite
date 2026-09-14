// Role-level bank data protection: the deny list must stay server-shaped
// (denies, not grants — the ORM guards treat canRead:false as a restricted
// field) and both Bilan roles must carry the exact same set, so no assignable
// or function path can read IBAN/BIC.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FIELD_IDS } from '../../constants/field-identifiers.ts';
import { OBJECT_IDS } from '../../constants/universal-identifiers.ts';
import { PROTECTED_BANK_FIELD_PERMISSIONS } from '../protected-bank-fields.ts';

const FINANCE_USER_ROLE_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000003';

type RoleDefinition = {
  success: boolean;
  config: {
    universalIdentifier: string;
    canBeAssignedToUsers?: boolean;
    canReadAllObjectRecords?: boolean;
    canUpdateAllObjectRecords?: boolean;
    canSoftDeleteAllObjectRecords?: boolean;
    fieldPermissions?: {
      objectUniversalIdentifier: string;
      fieldUniversalIdentifier: string;
      canReadFieldValue?: boolean | null;
      canUpdateFieldValue?: boolean | null;
    }[];
  };
};

// defineApplicationRole returns a { success, config } validation result;
// the manifest consumes `.config`, so tests assert on that shape.
const importRole = async (rolePath: string) => {
  const module = await import(rolePath);
  const definition = module.default as RoleDefinition;

  assert.equal(definition.success, true, `invalid role: ${rolePath}`);

  return definition.config;
};

test('the protected list targets exactly the orgProfile iban and bic fields', () => {
  assert.deepEqual(
    PROTECTED_BANK_FIELD_PERMISSIONS.map(
      (fieldPermission) => fieldPermission.fieldUniversalIdentifier,
    ),
    [FIELD_IDS.orgProfile.iban, FIELD_IDS.orgProfile.bic],
  );
  assert.ok(
    PROTECTED_BANK_FIELD_PERMISSIONS.every(
      (fieldPermission) =>
        fieldPermission.objectUniversalIdentifier === OBJECT_IDS.orgProfile,
    ),
  );
});

test('every protected entry is a full read+update deny', () => {
  assert.ok(
    PROTECTED_BANK_FIELD_PERMISSIONS.every(
      (fieldPermission) =>
        fieldPermission.canReadFieldValue === false &&
        fieldPermission.canUpdateFieldValue === false,
    ),
    'a canRead:null entry would silently fall back to unrestricted access',
  );
});

test('the finance-user role denies bank fields and is user-assignable', async () => {
  const role = await importRole('../../roles/finance-user.role.ts');

  assert.equal(
    role.universalIdentifier,
    FINANCE_USER_ROLE_UNIVERSAL_IDENTIFIER,
  );
  assert.equal(role.canBeAssignedToUsers, true);
  assert.equal(role.canReadAllObjectRecords, true);
  assert.equal(role.canUpdateAllObjectRecords, true);
  assert.deepEqual(role.fieldPermissions, [
    ...PROTECTED_BANK_FIELD_PERMISSIONS,
  ]);
});

test('the default function role carries the same bank denies', async () => {
  const role = await importRole('../../roles/default-function.role.ts');

  assert.deepEqual(role.fieldPermissions, [
    ...PROTECTED_BANK_FIELD_PERMISSIONS,
  ]);
  // Functions never need to soft-delete beyond what their flows do; the
  // function-role baseline stays untouched apart from fieldPermissions.
  assert.equal(role.canSoftDeleteAllObjectRecords, true);
});
