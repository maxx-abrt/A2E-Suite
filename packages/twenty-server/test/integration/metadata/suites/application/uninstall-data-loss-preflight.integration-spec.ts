import { buildBaseManifest } from 'test/integration/metadata/suites/application/utils/build-base-manifest.util';
import { buildDefaultObjectManifest } from 'test/integration/metadata/suites/application/utils/build-default-object-manifest.util';
import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { setupApplicationForSync } from 'test/integration/metadata/suites/application/utils/setup-application-for-sync.util';
import { syncApplication } from 'test/integration/metadata/suites/application/utils/sync-application.util';
import { uninstallApplication } from 'test/integration/metadata/suites/application/utils/uninstall-application.util';
import { v4 as uuidv4 } from 'uuid';

const TEST_APP_ID = uuidv4();
const TEST_ROLE_ID = uuidv4();

// A run-unique object name keeps the workspace-schema table/enum names free
// of collisions with leftovers of aborted runs (enum creation is not
// transactional with the metadata rollback).
const OBJECT_NAME_SUFFIX = uuidv4().slice(0, 8);

const TEST_OBJECT = buildDefaultObjectManifest({
  applicationUniversalIdentifier: TEST_APP_ID,
  universalIdentifier: uuidv4(),
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
    overrides: { objects: [TEST_OBJECT] },
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
});
