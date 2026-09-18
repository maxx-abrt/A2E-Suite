import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import type { ObjectManifest } from 'twenty-shared/application';
import { v4 as uuidv4 } from 'uuid';

import { buildBaseManifest } from 'test/integration/metadata/suites/application/utils/build-base-manifest.util';
import { buildDefaultObjectManifest } from 'test/integration/metadata/suites/application/utils/build-default-object-manifest.util';
import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { createAppTarball } from 'test/integration/metadata/suites/application/utils/create-app-tarball.util';
import { installApplication } from 'test/integration/metadata/suites/application/utils/install-application.util';
import { uploadAppTarball } from 'test/integration/metadata/suites/application/utils/upload-app-tarball.util';

// The install flow runs cache-lock retries with real delays, so fake timers
// would hang it — mirror the other application suites.
jest.setTimeout(180000);

const APP_UNIVERSAL_IDENTIFIER = uuidv4();
const ROLE_UNIVERSAL_IDENTIFIER = uuidv4();
const SECOND_ROLE_UNIVERSAL_IDENTIFIER = uuidv4();
const OBJECT_UNIVERSAL_IDENTIFIER = uuidv4();
const NAME_FIELD_UNIVERSAL_IDENTIFIER = uuidv4();
const SERIAL_NUMBER_FIELD_UNIVERSAL_IDENTIFIER = uuidv4();

// Run-unique object name keeps the workspace-schema table/enum names free of
// collisions with leftovers of aborted runs (enum creation is not
// transactional with the metadata rollback).
const OBJECT_NAME_SUFFIX = uuidv4().slice(0, 8);
const OBJECT_NAME_SINGULAR = `upgradeWidget${OBJECT_NAME_SUFFIX}`;
const OBJECT_NAME_PLURAL = `upgradeWidgets${OBJECT_NAME_SUFFIX}`;
const OWNED_TABLE_NAME = `_${OBJECT_NAME_SINGULAR}`;

const buildObjectManifest = ({
  includeSerialNumber,
}: {
  includeSerialNumber: boolean;
}): ObjectManifest => {
  const additionalFields: ObjectManifest['fields'] = [
    {
      universalIdentifier: NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldMetadataType.TEXT,
      name: 'name',
      label: 'Name',
    },
  ];

  if (includeSerialNumber) {
    additionalFields.push({
      universalIdentifier: SERIAL_NUMBER_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldMetadataType.TEXT,
      name: 'serialNumber',
      label: 'Serial number',
    });
  }

  return buildDefaultObjectManifest({
    applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
    universalIdentifier: OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: OBJECT_NAME_SINGULAR,
    namePlural: OBJECT_NAME_PLURAL,
    labelSingular: 'Upgrade widget',
    labelPlural: 'Upgrade widgets',
    description: 'App-owned object used to prove upgrade data preservation',
    labelIdentifierFieldMetadataUniversalIdentifier:
      NAME_FIELD_UNIVERSAL_IDENTIFIER,
    additionalFields,
  });
};

const buildValidManifest = ({
  includeSerialNumber,
}: {
  includeSerialNumber: boolean;
}) =>
  buildBaseManifest({
    appId: APP_UNIVERSAL_IDENTIFIER,
    roleId: ROLE_UNIVERSAL_IDENTIFIER,
    overrides: {
      roles: [
        {
          universalIdentifier: ROLE_UNIVERSAL_IDENTIFIER,
          label: `Upgrade Role ${OBJECT_NAME_SUFFIX}`,
          description: 'A test role',
        },
      ],
      objects: [buildObjectManifest({ includeSerialNumber })],
    },
  });

// Reuses the cross-entity universalIdentifier conflict the native validation
// suite proved is rejected before any metadata is written, so a failed upgrade
// cannot partially apply the incoming manifest.
const buildInvalidManifest = () =>
  buildBaseManifest({
    appId: APP_UNIVERSAL_IDENTIFIER,
    roleId: ROLE_UNIVERSAL_IDENTIFIER,
    overrides: {
      roles: [
        {
          universalIdentifier: ROLE_UNIVERSAL_IDENTIFIER,
          label: `Upgrade Role ${OBJECT_NAME_SUFFIX}`,
          description: 'A test role',
        },
        {
          universalIdentifier: SECOND_ROLE_UNIVERSAL_IDENTIFIER,
          label: `Upgrade Role 2 ${OBJECT_NAME_SUFFIX}`,
          description: 'A role whose object permission reuses its identifier',
          objectPermissions: [
            {
              universalIdentifier: SECOND_ROLE_UNIVERSAL_IDENTIFIER,
              objectUniversalIdentifier:
                STANDARD_OBJECTS.company.universalIdentifier,
              canReadObjectRecords: true,
              canUpdateObjectRecords: false,
              canSoftDeleteObjectRecords: false,
              canDestroyObjectRecords: false,
            },
          ],
        },
      ],
      objects: [buildObjectManifest({ includeSerialNumber: true })],
    },
  });

const buildTarball = ({
  version,
  manifest,
}: {
  version: string;
  manifest: ReturnType<typeof buildValidManifest>;
}): Promise<Buffer> =>
  createAppTarball({
    'manifest.json': JSON.stringify(manifest),
    'package.json': JSON.stringify({
      name: `test-upgrade-lifecycle-${OBJECT_NAME_SUFFIX}`,
      version,
    }),
  });

const uploadVersion = async ({
  version,
  manifest,
}: {
  version: string;
  manifest: ReturnType<typeof buildValidManifest>;
}): Promise<void> => {
  const { errors } = await uploadAppTarball({
    tarballBuffer: await buildTarball({ version, manifest }),
    universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
  });

  expect(errors).toBeUndefined();
};

const findApplication = async (): Promise<{
  state: string;
  version: string | null;
}> => {
  const [application] = await globalThis.testDataSource.query(
    `SELECT state, version FROM core."application"
     WHERE "universalIdentifier" = $1 AND "deletedAt" IS NULL`,
    [APP_UNIVERSAL_IDENTIFIER],
  );

  return application;
};

const findOwnedTableSchema = async (): Promise<string | undefined> => {
  const rows: { table_schema: string }[] =
    await globalThis.testDataSource.query(
      `SELECT table_schema FROM information_schema.tables WHERE table_name = $1`,
      [OWNED_TABLE_NAME],
    );

  return rows[0]?.table_schema;
};

const ownedTableHasColumn = async (columnName: string): Promise<boolean> => {
  const schema = await findOwnedTableSchema();

  if (schema === undefined) {
    return false;
  }

  const rows: unknown[] = await globalThis.testDataSource.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
    [schema, OWNED_TABLE_NAME, columnName],
  );

  return rows.length > 0;
};

// createdByName/updatedByName are NOT NULL without engine defaults.
const insertOwnedRecord = async (): Promise<void> => {
  const schema = await findOwnedTableSchema();

  expect(schema).toBeDefined();

  await globalThis.testDataSource.query(
    `INSERT INTO "${schema}"."${OWNED_TABLE_NAME}"
       ("id", "name", "createdByName", "updatedByName")
     VALUES (gen_random_uuid(), 'Upgrade widget record', 'upgrade-test', 'upgrade-test')`,
  );
};

const countOwnedRecords = async (): Promise<string> => {
  const schema = await findOwnedTableSchema();

  expect(schema).toBeDefined();

  const rows: { count: string }[] = await globalThis.testDataSource.query(
    `SELECT count(*) AS count FROM "${schema}"."${OWNED_TABLE_NAME}"`,
  );

  return rows[0].count;
};

const deleteOwnedRecords = async (): Promise<void> => {
  const schema = await findOwnedTableSchema();

  // The table is gone after a completed uninstall.
  if (schema === undefined) {
    return;
  }

  await globalThis.testDataSource.query(
    `DELETE FROM "${schema}"."${OWNED_TABLE_NAME}"`,
  );
};

describe('Application upgrade preserves owned data', () => {
  beforeAll(async () => {
    jest.useRealTimers();
  });

  afterAll(async () => {
    // C3 refuses uninstalling an app that still holds records; emptying the
    // table first lets the cleanup drop the metadata instead of orphaning it.
    await deleteOwnedRecords();

    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
    });

    jest.useFakeTimers();
  });

  it('upgrades to a higher version, keeps the records and applies the additive field', async () => {
    await uploadVersion({
      version: '1.0.0',
      manifest: buildValidManifest({ includeSerialNumber: false }),
    });

    const install = await installApplication({
      input: { universalIdentifier: APP_UNIVERSAL_IDENTIFIER },
    });

    expect(install.errors).toBeUndefined();

    expect(await findApplication()).toEqual({
      state: 'INSTALLED',
      version: '1.0.0',
    });

    expect(await ownedTableHasColumn('serialNumber')).toBe(false);

    await insertOwnedRecord();

    await uploadVersion({
      version: '1.1.0',
      manifest: buildValidManifest({ includeSerialNumber: true }),
    });

    const upgrade = await installApplication({
      input: { universalIdentifier: APP_UNIVERSAL_IDENTIFIER },
    });

    expect(upgrade.errors).toBeUndefined();

    expect(await findApplication()).toEqual({
      state: 'INSTALLED',
      version: '1.1.0',
    });

    // the owned record survived the version change
    expect(await countOwnedRecords()).toBe('1');

    // the additive manifest change landed
    expect(await ownedTableHasColumn('serialNumber')).toBe(true);
  });

  it('reverts a failed upgrade to INSTALLED without touching the data, then retries to the next version', async () => {
    // the record inserted by the previous case must survive the failed upgrade
    expect(await countOwnedRecords()).toBe('1');

    // 1.2.0 carries a manifest the validation rejects, so the upgrade fails
    // after the state flipped to UPGRADING and must roll back.
    await uploadVersion({
      version: '1.2.0',
      manifest: buildInvalidManifest(),
    });

    const failedUpgrade = await installApplication({
      input: { universalIdentifier: APP_UNIVERSAL_IDENTIFIER },
      expectToFail: true,
    });

    expect(failedUpgrade.errors).toBeDefined();
    expect(failedUpgrade.errors?.[0]?.extensions?.code).toBe(
      'METADATA_VALIDATION_FAILED',
    );

    // the failed upgrade neither loses data nor leaves the app mid-upgrade
    expect(await findApplication()).toEqual({
      state: 'INSTALLED',
      version: '1.1.0',
    });
    expect(await countOwnedRecords()).toBe('1');
    expect(await ownedTableHasColumn('serialNumber')).toBe(true);

    // retry with the next valid version succeeds on the same data
    await uploadVersion({
      version: '1.3.0',
      manifest: buildValidManifest({ includeSerialNumber: true }),
    });

    const retry = await installApplication({
      input: { universalIdentifier: APP_UNIVERSAL_IDENTIFIER },
    });

    expect(retry.errors).toBeUndefined();

    expect(await findApplication()).toEqual({
      state: 'INSTALLED',
      version: '1.3.0',
    });
    expect(await countOwnedRecords()).toBe('1');
  });
});
