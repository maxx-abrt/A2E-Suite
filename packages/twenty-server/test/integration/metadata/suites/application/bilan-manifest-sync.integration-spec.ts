import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Manifest } from 'twenty-shared/application';

import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { setupApplicationForSync } from 'test/integration/metadata/suites/application/utils/setup-application-for-sync.util';
import { syncApplicationQueryFactory } from 'test/integration/metadata/suites/application/utils/sync-application-query-factory.util';
import { uploadApplicationFile } from 'test/integration/metadata/suites/application/utils/upload-application-file.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

// Acceptance for the a2e-accounting (Bilan) manifest: the app must sync all
// 38 previously-failing validation errors away (missing FILES settings,
// missing relation inverse sides, reserved field names, unique + default
// cache key). The manifest is the real one built by `twenty dev:build`, not
// a synthetic fixture, so this spec fails whenever the app drifts out of
// syncability again.
const BILAN_APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000001';
const BILAN_OUTPUT_PATH = join(
  __dirname,
  '../../../../../../../packages/twenty-apps/internal/a2e-accounting/.twenty/output',
);
const BILAN_MANIFEST_PATH = join(BILAN_OUTPUT_PATH, 'manifest.json');

// Sync's create actions verify the built resources exist in storage before
// applying, so every built file the manifest declares must be uploaded first
// (the real CLI does this; here we upload the same set from the build output).
const uploadBuiltResources = async (manifest: Manifest) => {
  for (const logicFunction of manifest.logicFunctions ?? []) {
    await uploadApplicationFile({
      applicationUniversalIdentifier: BILAN_APPLICATION_UNIVERSAL_IDENTIFIER,
      fileFolder: 'BuiltLogicFunction',
      filePath: logicFunction.builtHandlerPath!,
      fileBuffer: readFileSync(join(BILAN_OUTPUT_PATH, logicFunction.builtHandlerPath!)),
      filename: logicFunction.builtHandlerPath!.split('/').pop()!,
      contentType: 'application/javascript',
      expectToFail: false,
    });
  }

  for (const frontComponent of manifest.frontComponents ?? []) {
    await uploadApplicationFile({
      applicationUniversalIdentifier: BILAN_APPLICATION_UNIVERSAL_IDENTIFIER,
      fileFolder: 'BuiltFrontComponent',
      filePath: frontComponent.builtComponentPath!,
      fileBuffer: readFileSync(join(BILAN_OUTPUT_PATH, frontComponent.builtComponentPath!)),
      filename: frontComponent.builtComponentPath!.split('/').pop()!,
      contentType: 'application/javascript',
      expectToFail: false,
    });
  }
};

describe('Bilan (a2e-accounting) manifest sync', () => {
  const manifest = JSON.parse(
    readFileSync(BILAN_MANIFEST_PATH, 'utf8'),
  ) as Manifest;

  // A previous crashed run may have left the app installed; the registration
  // mutation would then fail with UNIVERSAL_IDENTIFIER_ALREADY_CLAIMED.
  beforeAll(async () => {
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: BILAN_APPLICATION_UNIVERSAL_IDENTIFIER,
    });
  }, 60000);

  beforeEach(async () => {
    await setupApplicationForSync({
      applicationUniversalIdentifier:
        BILAN_APPLICATION_UNIVERSAL_IDENTIFIER,
      name: 'Bilan Integration Test',
      description: 'Bilan manifest sync acceptance',
      sourcePath: 'bilan-manifest-sync',
    });
  }, 60000);

  afterEach(async () => {
    await cleanupApplicationAndAppRegistration({
      applicationUniversalIdentifier: BILAN_APPLICATION_UNIVERSAL_IDENTIFIER,
    });
  });

  it('syncs the full Bilan manifest without validation errors', async () => {
    jest.useRealTimers();
    await uploadBuiltResources(manifest);

    const response = await makeMetadataAPIRequest(
      syncApplicationQueryFactory({ manifest }),
    );

    type SyncValidationError = {
      code?: string;
      message: string;
    };
    type SyncValidationFailure = {
      flatEntityMinimalInformation?: { name?: string };
      errors?: SyncValidationError[];
    };
    type SyncGraphQLError = {
      extensions?: { errors?: Record<string, unknown> };
    };

    // Compact digest: the raw error payload is far too large to dump. Handles
    // both validation failures (arrays per metadata name) and migration
    // failures (nested objects like {metadata: {code, message}}).
    const syncErrors = (response.body.errors ?? []) as SyncGraphQLError[];
    const digest: {
      metadataName: string;
      entity?: string;
      code: string;
      message: string;
    }[] = syncErrors.flatMap((error: SyncGraphQLError) => {
      const errorGroups =
        (error.extensions?.errors as Record<string, unknown>) ?? {};

      return Object.entries(errorGroups).flatMap(([metadataName, failures]) => {
        const failureList = (
          Array.isArray(failures) ? failures : [failures]
        ) as SyncValidationFailure[];

        return failureList.flatMap((failure) =>
          (failure.errors ?? []).map((validationError) => ({
            metadataName,
            entity: failure.flatEntityMinimalInformation?.name,
            code: validationError.code ?? 'UNKNOWN',
            message: validationError.message,
          })),
        );
      });
    });

    if (digest.length > 0) {
      const byCode = digest.reduce<Record<string, number>>(
        (acc, entry) => {
          acc[entry.code] = (acc[entry.code] ?? 0) + 1;

          return acc;
        },
        {},
      );

      console.log(
        'Bilan sync error digest:',
        JSON.stringify({ byCode, sample: digest.slice(0, 10) }, null, 2),
      );
    }

    expect(syncErrors).toEqual([]);
    expect(
      response.body.data?.syncApplication?.applicationUniversalIdentifier,
    ).toBe(BILAN_APPLICATION_UNIVERSAL_IDENTIFIER);
  });
});
