import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Manifest } from 'twenty-shared/application';

import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { setupApplicationForSync } from 'test/integration/metadata/suites/application/utils/setup-application-for-sync.util';
import { syncApplicationQueryFactory } from 'test/integration/metadata/suites/application/utils/sync-application-query-factory.util';
import { uploadApplicationFile } from 'test/integration/metadata/suites/application/utils/upload-application-file.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

const BUREAU_APPS = ['a2e-documents', 'a2e-projects', 'a2e-chat'].map(
  (name) => {
    const outputPath = join(
      __dirname,
      '../../../../../../../packages/twenty-apps/internal',
      name,
      '.twenty/output',
    );
    const manifest = JSON.parse(
      readFileSync(join(outputPath, 'manifest.json'), 'utf8'),
    ) as Manifest;
    return { name, outputPath, manifest };
  },
);

// Sync's create actions verify the built resources exist in storage before
// applying, so every built file the manifest declares must be uploaded first
// (the real CLI does this; here we upload the same set from the build output).
const uploadBuiltResources = async (manifest: Manifest, outputPath: string) => {
  for (const logicFunction of manifest.logicFunctions ?? []) {
    await uploadApplicationFile({
      applicationUniversalIdentifier: manifest.application.universalIdentifier,
      fileFolder: 'BuiltLogicFunction',
      filePath: logicFunction.builtHandlerPath!,
      fileBuffer: readFileSync(
        join(outputPath, logicFunction.builtHandlerPath!),
      ),
      filename: logicFunction.builtHandlerPath!.split('/').pop()!,
      contentType: 'application/javascript',
      expectToFail: false,
    });
  }

  for (const frontComponent of manifest.frontComponents ?? []) {
    await uploadApplicationFile({
      applicationUniversalIdentifier: manifest.application.universalIdentifier,
      fileFolder: 'BuiltFrontComponent',
      filePath: frontComponent.builtComponentPath!,
      fileBuffer: readFileSync(
        join(outputPath, frontComponent.builtComponentPath!),
      ),
      filename: frontComponent.builtComponentPath!.split('/').pop()!,
      contentType: 'application/javascript',
      expectToFail: false,
    });
  }
};

describe('Bureau onboarding bundle manifest sync', () => {
  beforeAll(async () => {
    for (const { manifest } of [...BUREAU_APPS].reverse()) {
      await cleanupApplicationAndAppRegistration({
        applicationUniversalIdentifier:
          manifest.application.universalIdentifier,
      });
    }
  }, 120000);
  afterAll(async () => {
    for (const { manifest } of [...BUREAU_APPS].reverse()) {
      await cleanupApplicationAndAppRegistration({
        applicationUniversalIdentifier:
          manifest.application.universalIdentifier,
      });
    }
  }, 120000);

  it('installs Documents, Projects and Discussions in prerequisite order', async () => {
    jest.useRealTimers();
    for (const { name, manifest, outputPath } of BUREAU_APPS) {
      await setupApplicationForSync({
        applicationUniversalIdentifier:
          manifest.application.universalIdentifier,
        name,
        description: 'Bureau onboarding regression',
        sourcePath: name,
      });
      jest.useRealTimers();
      await uploadBuiltResources(manifest, outputPath);
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

        return Object.entries(errorGroups).flatMap(
          ([metadataName, failures]) => {
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
          },
        );
      });

      if (digest.length > 0) {
        const byCode = digest.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.code] = (acc[entry.code] ?? 0) + 1;

          return acc;
        }, {});

        // oxlint-disable-next-line no-console
        console.log(
          `${name} sync error digest:`,
          JSON.stringify({ byCode, sample: digest.slice(0, 10) }, null, 2),
        );
      }

      expect(syncErrors).toEqual([]);
      expect(
        response.body.data?.syncApplication?.applicationUniversalIdentifier,
      ).toBe(manifest.application.universalIdentifier);
    }
  }, 120000);
});
