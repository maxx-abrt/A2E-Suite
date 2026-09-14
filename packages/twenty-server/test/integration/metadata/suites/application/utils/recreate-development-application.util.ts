import gql from 'graphql-tag';

import { uploadApplicationFile } from 'test/integration/metadata/suites/application/utils/upload-application-file.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';

// Uninstall removes the workspace application row but keeps the application
// registration, so a reinstall must re-create only the development
// application (setupApplicationForSync would fail on the registration).
export const recreateDevelopmentApplication = async ({
  applicationUniversalIdentifier,
  name,
  sourcePath,
  token,
}: {
  applicationUniversalIdentifier: string;
  name: string;
  sourcePath: string;
  token?: string;
}) => {
  const developmentApplicationResponse = await makeMetadataAPIRequest(
    {
      query: gql`
        mutation CreateDevelopmentApplication(
          $universalIdentifier: String!
          $name: String!
        ) {
          createDevelopmentApplication(
            universalIdentifier: $universalIdentifier
            name: $name
          ) {
            id
          }
        }
      `,
      variables: {
        universalIdentifier: applicationUniversalIdentifier,
        name,
      },
    },
    token,
  );

  if (developmentApplicationResponse.body.errors) {
    throw new Error(
      `Failed to create development application: ${JSON.stringify(
        developmentApplicationResponse.body.errors,
      )}`,
    );
  }

  // the uninstall deleted the dependency file rows the sync checksums rely on
  const packageJson = JSON.stringify({
    name: sourcePath,
    version: '1.0.0',
  });

  await uploadApplicationFile({
    applicationUniversalIdentifier,
    fileFolder: 'Dependencies',
    filePath: 'package.json',
    fileBuffer: Buffer.from(packageJson),
    filename: 'package.json',
    expectToFail: false,
    token,
  });
};
