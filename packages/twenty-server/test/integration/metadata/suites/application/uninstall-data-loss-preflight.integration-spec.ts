import { buildBaseManifest } from 'test/integration/metadata/suites/application/utils/build-base-manifest.util';
import { recreateDevelopmentApplication } from 'test/integration/metadata/suites/application/utils/recreate-development-application.util';
import { buildDefaultObjectManifest } from 'test/integration/metadata/suites/application/utils/build-default-object-manifest.util';
import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { setupApplicationForSync } from 'test/integration/metadata/suites/application/utils/setup-application-for-sync.util';
import { syncApplication } from 'test/integration/metadata/suites/application/utils/sync-application.util';
import { uninstallApplication } from 'test/integration/metadata/suites/application/utils/uninstall-application.util';
import { createOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/create-one-field-metadata.util';
import { deleteOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/delete-one-field-metadata.util';
import { findManyObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/find-many-object-metadata.util';
import { type ObjectManifest } from 'twenty-shared/application';
import { FieldMetadataType } from 'twenty-shared/types';
import { v4 as uuidv4 } from 'uuid';
import { type RelationType as ServerRelationType } from 'src/engine/metadata-modules/field-metadata/interfaces/relation-type.interface';

const TEST_APP_ID = uuidv4();
const TEST_ROLE_ID = uuidv4();
const DEPENDENT_APP_ID = uuidv4();
const DEPENDENT_ROLE_ID = uuidv4();
const DEPENDENT_OBJECT_ID = uuidv4();
const DEPENDENT_NAME_FIELD_ID = uuidv4();

// A run-unique object name keeps the workspace-schema table/enum names free
// of collisions with leftovers of aborted runs (enum creation is not
// transactional with the metadata rollback).
const OBJECT_NAME_SUFFIX = uuidv4().slice(0, 8);
const TEST_OBJECT_ID = uuidv4();

const TEST_OBJECT = buildDefaultObjectManifest({
  applicationUniversalIdentifier: TEST_APP_ID,
  universalIdentifier: TEST_OBJECT_ID,
  nameSingular: `coupon${OBJECT_NAME_SUFFIX}`,
  namePlural: `coupons${OBJECT_NAME_SUFFIX}`,
  labelSingular: 'Coupon',
  labelPlural: 'Coupons',
  description: 'App-owned object used to prove data-loss refusal',
});

const buildManifest = () =>
  buildBaseManifest({
    appId: TEST_APP_ID,
    roleId: TEST_ROLE_ID,
    // role labels are workspace-unique; the run-unique suffix avoids
    // collisions with leftovers of aborted runs
    overrides: {
      objects: [TEST_OBJECT],
      roles: [
        {
          universalIdentifier: TEST_ROLE_ID,
          label: `Preflight Role ${OBJECT_NAME_SUFFIX}`,
          description: 'A test role',
        },
      ],
    },
  });

// A second application owning an object with a relation field targeting the
// first application's object: uninstalling the first application must be
// refused while this dependent exists.
const buildDependentManifest = () =>
  buildBaseManifest({
    appId: DEPENDENT_APP_ID,
    roleId: DEPENDENT_ROLE_ID,
    overrides: {
      // role labels are workspace-unique; keep this distinct from the
      // target app's 'Test Role'
      // role labels are workspace-unique; the run-unique suffix avoids
      // collisions with leftovers of aborted runs
      roles: [
        {
          universalIdentifier: DEPENDENT_ROLE_ID,
          label: `Preflight Dependent Role ${OBJECT_NAME_SUFFIX}`,
          description: 'A dependent test role',
        },
      ],
      application: {
        universalIdentifier: DEPENDENT_APP_ID,
        defaultRoleUniversalIdentifier: DEPENDENT_ROLE_ID,
        displayName: 'Preflight Dependent App',
        description: 'App depending on the preflight target app',
        applicationVariables: {},
        packageJsonChecksum: null,
        yarnLockChecksum: null,
      },
      objects: [
        buildDefaultObjectManifest({
          applicationUniversalIdentifier: DEPENDENT_APP_ID,
          universalIdentifier: DEPENDENT_OBJECT_ID,
          nameSingular: `dependent${OBJECT_NAME_SUFFIX}`,
          namePlural: `dependents${OBJECT_NAME_SUFFIX}`,
          labelSingular: 'Dependent',
          labelPlural: 'Dependents',
          description: 'Object relating to the target app object',
          labelIdentifierFieldMetadataUniversalIdentifier:
            DEPENDENT_NAME_FIELD_ID,
          additionalFields: [
            {
              universalIdentifier: DEPENDENT_NAME_FIELD_ID,
              type: FieldMetadataType.TEXT,
              name: 'name',
              label: 'Name',
            } satisfies ObjectManifest['fields'][number],
          ],
        }),
      ],
    },
  });

// The per-object GraphQL mutations are not in the booted app's static schema,
// so records are written straight to the object's workspace table. The
// testDataSource connection has no workspace search_path, so the schema is
// resolved explicitly (single match enforced).
const resolveCouponTable = async () => {
  const tableName = `_${TEST_OBJECT.nameSingular}`;

  const rows: { table_schema: string }[] = await globalThis.testDataSource.query(
    `SELECT table_schema FROM information_schema.tables WHERE table_name = $1`,
    [tableName],
  );

  expect(rows).toHaveLength(1);

  return { schema: rows[0].table_schema, tableName };
};

const insertCouponRecord = async () => {
  const { schema, tableName } = await resolveCouponTable();

  // createdByName/updatedByName are NOT NULL without engine defaults
  await globalThis.testDataSource.query(
    `INSERT INTO "${schema}"."${tableName}" ("id", "createdByName", "updatedByName")
     VALUES (gen_random_uuid(), 'preflight-test', 'preflight-test')`,
  );
};

const deleteCouponRecords = async () => {
  const { schema, tableName } = await resolveCouponTable();

  await globalThis.testDataSource.query(
    `DELETE FROM "${schema}"."${tableName}"`,
  );
};

// The preflight relies on pg_class.reltuples, refreshed by ANALYZE; a
// just-inserted row is invisible to it until statistics are recomputed.
const analyzeCouponTable = async () => {
  const { schema, tableName } = await resolveCouponTable();

  await globalThis.testDataSource.query(
    `ANALYZE "${schema}"."${tableName}"`,
  );
};

describe('Uninstall application data-loss preflight', () => {
  beforeEach(async () => {
    await setupApplicationForSync({
      applicationUniversalIdentifier: TEST_APP_ID,
      name: 'Test Application',
      description: 'App for testing uninstall data-loss preflight',
      sourcePath: 'test-uninstall-preflight',
    });

    await syncApplication({
      manifest: buildManifest(),
      expectToFail: false,
    });
  }, 60000);

  afterEach(async () => {
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: TEST_APP_ID,
    });
  }, 60000);

  it('refuses to uninstall an application whose owned objects still hold records', async () => {
    await insertCouponRecord();
    await analyzeCouponTable();

    const { data, errors } = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: true,
    });

    expect(errors).toBeDefined();
    expect(errors?.[0]?.message).toContain(TEST_OBJECT.nameSingular);
    expect(errors?.[0]?.message).toContain('still holds data');
    expect(data?.uninstallApplication).toBeUndefined();

    // the application itself must survive the refused uninstall
    const [application] = await globalThis.testDataSource.query(
      `SELECT id FROM core."application"
       WHERE "universalIdentifier" = $1 AND "deletedAt" IS NULL`,
      [TEST_APP_ID],
    );

    expect(application).toBeDefined();

    // recovery path: once the records are gone the same uninstall succeeds,
    // so this test leaves no orphaned metadata behind in the shared workspace
    await deleteCouponRecords();
    await analyzeCouponTable();

    const retry = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: false,
    });

    expect(retry.errors).toBeUndefined();
    expect(retry.data?.uninstallApplication).toBe(true);
  }, 60000);

  it('allows the uninstall once the owned objects are empty again', async () => {
    await insertCouponRecord();
    await deleteCouponRecords();
    await analyzeCouponTable();

    const { data, errors } = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: false,
    });

    expect(errors).toBeUndefined();
    expect(data?.uninstallApplication).toBe(true);
  }, 60000);

  it('uninstalls an application with owned objects that never received records', async () => {
    const { data, errors } = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: false,
    });

    expect(errors).toBeUndefined();
    expect(data?.uninstallApplication).toBe(true);
  }, 60000);

  // C3: reinstall restores supported defaults, not deleted data. The same
  // manifest (fixed universal identifiers) re-syncs after a completed
  // uninstall; the object's table is re-created empty, proving nothing was
  // retained or restored.
  it('reinstalls the same manifest after a completed uninstall, starting from empty data', async () => {
    // setupApplicationForSync leaves fake timers active; the reinstall's
    // GraphQL calls need the real clock
    jest.useRealTimers();

    await insertCouponRecord();

    const uninstall = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: false,
    });

    expect(uninstall.errors).toBeUndefined();
    expect(uninstall.data?.uninstallApplication).toBe(true);

    const tableGone = await globalThis.testDataSource.query(
      `SELECT table_schema FROM information_schema.tables WHERE table_name = $1`,
      [`_${TEST_OBJECT.nameSingular}`],
    );

    expect(tableGone).toHaveLength(0);

    // the uninstall removed the development application row, so the
    // reinstall re-creates it (the registration survived the uninstall)
    await recreateDevelopmentApplication({
      applicationUniversalIdentifier: TEST_APP_ID,
      name: 'Test Application',
      sourcePath: 'test-uninstall-preflight',
    });

    await syncApplication({
      manifest: buildManifest(),
      expectToFail: false,
    });

    // same object identity, re-created from the manifest defaults
    const { objects } = await findManyObjectMetadata({
      input: { filter: {}, paging: { first: 200 } },
      gqlFields: 'id universalIdentifier nameSingular',
      expectToFail: false,
    });

    const reinstalledObject = objects.find(
      (object) =>
        object.universalIdentifier === TEST_OBJECT.universalIdentifier,
    );

    expect(reinstalledObject).toBeDefined();

    const { schema, tableName } = await resolveCouponTable();

    const recordCount: { count: string }[] = await globalThis.testDataSource.query(
      `SELECT count(*) AS count FROM "${schema}"."${tableName}"`,
    );

    expect(recordCount[0]?.count).toBe('0');
  }, 60000);

  it('refuses uninstall while another application relates to the owned object, naming the dependent', async () => {
    await setupApplicationForSync({
      applicationUniversalIdentifier: DEPENDENT_APP_ID,
      name: 'Preflight Dependent App',
      description: 'App depending on the preflight target app',
      sourcePath: 'test-uninstall-preflight-dependent',
    });

    await syncApplication({
      manifest: buildDependentManifest(),
      expectToFail: false,
    });

    // Cross-app relation: a manifest sync cannot reference another app's
    // object (it is not in the same validation batch), so the relation is
    // created through the native field-metadata API, exactly as a user or
    // dependent app would at runtime.
    const { objects } = await findManyObjectMetadata({
      input: { filter: {}, paging: { first: 200 } },
      gqlFields: 'id universalIdentifier nameSingular',
      expectToFail: false,
    });

    const couponObject = objects.find(
      (object) =>
        object.universalIdentifier === TEST_OBJECT.universalIdentifier,
    );
    const dependentObject = objects.find(
      (object) =>
        object.universalIdentifier === DEPENDENT_OBJECT_ID,
    );

    expect(couponObject).toBeDefined();
    expect(dependentObject).toBeDefined();

    const { data: relationFieldData } = await createOneFieldMetadata({
      input: {
        objectMetadataId: dependentObject?.id ?? '',
        name: `linkedCoupon${OBJECT_NAME_SUFFIX}`,
        label: 'Linked coupon',
        isLabelSyncedWithName: false,
        type: FieldMetadataType.RELATION,
        relationCreationPayload: {
          targetObjectMetadataId: couponObject?.id ?? '',
          targetFieldLabel: `coupons${OBJECT_NAME_SUFFIX}`,
          targetFieldIcon: 'IconTicket',
          type: 'MANY_TO_ONE' as ServerRelationType,
        },
      },
      gqlFields: 'id name',
      expectToFail: false,
    });

    const linkedFieldId = relationFieldData?.createOneField?.id;

    expect(linkedFieldId).toBeDefined();

    const refusal = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: true,
    });

    expect(refusal.errors).toBeDefined();
    expect(refusal.errors?.[0]?.message).toContain(
      'other applications depend on it',
    );
    // Fields created through the bare metadata API are attributed to the
    // workspace's 'Custom' application, so that is the dependent named.
    expect(refusal.errors?.[0]?.message).toContain('Custom');
    expect(refusal.errors?.[0]?.message).toContain(
      `linkedCoupon${OBJECT_NAME_SUFFIX}`,
    );

    // recovery path: once the dependency is removed, the same uninstall
    // succeeds, so no orphaned metadata is left in the shared workspace.
    // Deleting the relation field through the native mutation removes both
    // sides consistently.
    await deleteOneFieldMetadata({
      input: { idToDelete: linkedFieldId ?? '' },
      gqlFields: 'id',
      expectToFail: false,
    });
    // and the dependent app itself, which no longer holds any dependency
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: DEPENDENT_APP_ID,
    });

    const retry = await uninstallApplication({
      universalIdentifier: TEST_APP_ID,
      expectToFail: false,
    });

    expect(retry.errors).toBeUndefined();
    expect(retry.data?.uninstallApplication).toBe(true);
  }, 120000);
});
