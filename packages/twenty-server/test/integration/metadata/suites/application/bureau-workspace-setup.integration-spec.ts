import { randomUUID } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import gql from 'graphql-tag';
import { activateWorkspace } from 'test/integration/graphql/utils/activate-workspace.util';
import { getAuthTokensFromLoginToken } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { signUpInNewWorkspace } from 'test/integration/graphql/utils/sign-up-in-new-workspace.util';
import { renewToken } from 'test/integration/graphql/utils/renew-token.util';
import { signUp } from 'test/integration/graphql/utils/sign-up.util';
import { cleanupApplicationAndAppRegistration } from 'test/integration/metadata/suites/application/utils/cleanup-application-and-app-registration.util';
import { uploadAppTarball } from 'test/integration/metadata/suites/application/utils/upload-app-tarball.util';
import { findNavigationMenuItems } from 'test/integration/metadata/suites/navigation-menu-item/utils/find-navigation-menu-items.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';
import { waitForAllJobsToFinish } from 'test/integration/utils/wait-for-all-jobs-to-finish.util';

import { type LogicFunctionExecutorService } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';
import { type WorkspaceService } from 'src/engine/core-modules/workspace/services/workspace.service';
import { CRM_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';

const APPLICATION_IDS = [
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
  '4f759655-84f8-434d-9c76-ee1850e8c1a4',
  'e2dce399-87f1-4548-b307-5f368b4d5dd4',
];
const APPS_DIRECTORY = join(
  __dirname,
  '../../../../../../../packages/twenty-apps/internal',
);

type SetupResult = {
  appliedTemplateKeyVersion: { key: string } | null;
  steps: {
    kind: string;
    status: string;
    errorCode?: string;
    localizedMessage?: string;
  }[];
};

describe('new-user Bureau workspace setup with packaged apps', () => {
  let workspaceId: string | undefined;
  let userAccessToken: string;
  let workspaceAccessToken: string;

  const apply = async (
    template: string,
    idempotencyKey = randomUUID(),
  ): Promise<SetupResult> => {
    const response = await makeMetadataAPIRequest(
      {
        query: gql`
          mutation SetupBureau($input: ApplyWorkspaceTemplateOperationInput!) {
            applyWorkspaceTemplateOperation(input: $input) {
              appliedTemplateKeyVersion {
                key
              }
              steps {
                kind
                status
                errorCode
                localizedMessage
              }
            }
          }
        `,
        variables: {
          input: { template, idempotencyKey, sampleContentEnabled: true },
        },
      },
      workspaceAccessToken,
    );
    expect(response.body.errors).toBeUndefined();
    return response.body.data.applyWorkspaceTemplateOperation as SetupResult;
  };

  const readDocuments = async () => {
    const response = await makeGraphqlAPIRequest(
      {
        query: gql`
          query SetupDocuments {
            documents {
              edges {
                node {
                  id
                  title
                  kind
                }
              }
            }
          }
        `,
      },
      workspaceAccessToken,
    );
    expect(response.body.errors).toBeUndefined();
    return response.body.data.documents.edges as {
      node: { id: string; title: string; kind: string };
    }[];
  };

  beforeAll(async () => {
    jest.useRealTimers();
    for (const applicationUniversalIdentifier of [
      ...APPLICATION_IDS,
    ].reverse()) {
      await cleanupApplicationAndAppRegistration({
        applicationUniversalIdentifier,
      });
    }
  }, 120000);

  const readNavigation = async (): Promise<
    { id: string; universalIdentifier: string; link: string | null }[]
  > => {
    const { data } = await findNavigationMenuItems({
      input: undefined,
      gqlFields: 'id link',
      token: workspaceAccessToken,
    });
    const rows = (await testDataSource.query(
      'SELECT id, "universalIdentifier", link FROM core."navigationMenuItem" WHERE "workspaceId" = $1 AND "userWorkspaceId" IS NULL',
      [workspaceId],
    )) as { id: string; universalIdentifier: string; link: string | null }[];
    expect(data.navigationMenuItems.map((item) => item.id)).toEqual(
      expect.arrayContaining(rows.map((item) => item.id)),
    );
    return rows;
  };

  afterAll(async () => {
    jest.useRealTimers();
    await waitForAllJobsToFinish();
    if (workspaceId) {
      await getAppProviderByClassName<WorkspaceService>(
        'WorkspaceService',
      ).deleteWorkspace(workspaceId, true);
    }
    for (const applicationUniversalIdentifier of [
      ...APPLICATION_IDS,
    ].reverse()) {
      await cleanupApplicationAndAppRegistration({
        applicationUniversalIdentifier,
      });
    }
  }, 120000);

  it('signs up, activates, installs the Bureau bundle, verifies samples, resumes and switches CRM visibility', async () => {
    jest.useRealTimers();
    const email = `bureau-setup-${randomUUID()}@example.com`;
    const { data: signUpData } = await signUp({
      input: { email, password: 'Test123!@#' },
      expectToFail: false,
    });
    userAccessToken =
      signUpData.signUp.tokens.accessOrWorkspaceAgnosticToken.token;
    await testDataSource.query(
      'UPDATE core."user" SET "isEmailVerified" = true WHERE email = $1',
      [email],
    );
    const {
      data: { signUpInNewWorkspace: createdWorkspace },
    } = await signUpInNewWorkspace({
      accessToken: userAccessToken,
      expectToFail: false,
    });
    workspaceId = createdWorkspace.workspace.id;
    const {
      data: { getAuthTokensFromLoginToken: tokens },
    } = await getAuthTokensFromLoginToken({
      loginToken: createdWorkspace.loginToken.token,
      origin: createdWorkspace.workspace.workspaceUrls.subdomainUrl,
      expectToFail: false,
    });
    workspaceAccessToken = tokens.tokens.accessOrWorkspaceAgnosticToken.token;
    await activateWorkspace({
      accessToken: workspaceAccessToken,
      expectToFail: false,
    });
    await waitForAllJobsToFinish();
    const renewedSession = await renewToken(tokens.tokens.refreshToken.token);
    expect(renewedSession.body.errors).toBeUndefined();
    workspaceAccessToken =
      renewedSession.body.data.renewToken.tokens.accessOrWorkspaceAgnosticToken
        .token;

    for (const [index, appName] of [
      'a2e-documents',
      'a2e-projects',
      'a2e-chat',
    ].entries()) {
      const outputPath = join(APPS_DIRECTORY, appName, '.twenty/output');
      const tarball = readdirSync(outputPath).find((filename) =>
        filename.endsWith('.tgz'),
      );
      if (!tarball) {
        throw new Error(`Build ${appName} with --tarball before this test`);
      }
      await uploadAppTarball({
        tarballBuffer: readFileSync(join(outputPath, tarball)),
        universalIdentifier: APPLICATION_IDS[index],
        token: workspaceAccessToken,
        expectToFail: false,
      });
    }

    const skipEmail = await makeMetadataAPIRequest(
      {
        query: gql`
          mutation SkipEmail {
            skipSyncEmailOnboardingStep(isAutoSkipped: true) {
              success
            }
          }
        `,
      },
      workspaceAccessToken,
    );
    expect(skipEmail.body.errors).toBeUndefined();

    const operationId = randomUUID();
    const result = await apply('STUDENT', operationId);
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'SEED_SAMPLES', status: 'SUCCEEDED' }),
      ]),
    );
    expect(result.steps.filter((step) => step.status !== 'SUCCEEDED')).toEqual(
      [],
    );
    expect(result.appliedTemplateKeyVersion?.key).toBe('STUDENT');
    const continueSetup = await makeMetadataAPIRequest(
      {
        query: gql`
          mutation ContinueSetup {
            triggerInstallAppsOnboardingStep(
              universalIdentifiers: []
              isAutoSkipped: false
            ) {
              success
            }
          }
        `,
      },
      workspaceAccessToken,
    );
    expect(continueSetup.body.errors).toBeUndefined();
    const currentUser = await makeMetadataAPIRequest(
      {
        query: gql`
          query SetupStatus {
            currentUser {
              onboardingStatus
            }
          }
        `,
      },
      workspaceAccessToken,
    );
    expect(currentUser.body.errors).toBeUndefined();
    expect(currentUser.body.data.currentUser.onboardingStatus).toBe(
      'PROFILE_CREATION',
    );
    await waitForAllJobsToFinish();
    const seededApps = await makeGraphqlAPIRequest(
      {
        query: gql`
          query BureauStarterContent {
            projects(first: 100) {
              edges {
                node {
                  key
                }
              }
            }
            chatChannels {
              edges {
                node {
                  name
                }
              }
            }
            tasks(first: 100, filter: { projectId: { is: NOT_NULL } }) {
              edges {
                node {
                  id
                }
              }
            }
            milestones(first: 100) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `,
      },
      workspaceAccessToken,
    );
    expect(seededApps.body.errors).toBeUndefined();
    expect(seededApps.body.data.projects.edges).toHaveLength(12);
    expect(seededApps.body.data.tasks.edges).toHaveLength(60);
    expect(seededApps.body.data.milestones.edges).toHaveLength(36);
    expect(
      seededApps.body.data.chatChannels.edges.map(
        (edge: { node: { name: string } }) => edge.node.name,
      ),
    ).toEqual(expect.arrayContaining(['Général', 'Annonces']));

    const documents = await readDocuments();
    expect(documents.map(({ node }) => node.title)).toEqual(
      expect.arrayContaining([
        'Bienvenue dans Bureau',
        'Modèle — Notes de réunion',
        'Modèle — Brief de projet',
        'Modèle — Spécifications produit (PRD)',
      ]),
    );

    const hiddenNavigation = await readNavigation();
    expect(
      hiddenNavigation.filter((item) =>
        CRM_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.includes(
          item.universalIdentifier,
        ),
      ),
    ).toEqual([]);
    expect(hiddenNavigation).toEqual(
      expect.arrayContaining([expect.objectContaining({ link: '/calendar' })]),
    );
    expect(hiddenNavigation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          universalIdentifier: 'c31b0000-0010-4000-8000-000000000009',
        }),
        expect.objectContaining({
          universalIdentifier: 'c31b0000-0010-4000-8000-00000000000a',
          link: '/calendar',
        }),
      ]),
    );

    const seedExecutor =
      getAppProviderByClassName<LogicFunctionExecutorService>(
        'LogicFunctionExecutorService',
      );
    const postInstallFunctions = (await testDataSource.query(
      'SELECT id FROM core."logicFunction" WHERE "workspaceId" = $1 AND name = $2',
      [workspaceId, 'post-install'],
    )) as { id: string }[];
    expect(postInstallFunctions).toHaveLength(3);
    for (const logicFunction of postInstallFunctions) {
      const execution = await seedExecutor.execute({
        workspaceId: workspaceId!,
        logicFunctionId: logicFunction.id,
        payload: {},
      });
      expect(execution.error).toBeUndefined();
    }

    expect(await apply('STUDENT', operationId)).toEqual(result);
    expect(await readDocuments()).toEqual(documents);
    expect((await apply('CRM')).appliedTemplateKeyVersion?.key).toBe('CRM');
    const crmNavigation = await readNavigation();
    expect(crmNavigation.map((item) => item.universalIdentifier)).toEqual(
      expect.arrayContaining(
        CRM_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.filter(
          (identifier) => identifier !== '20202020-b00b-4b0b-8b0b-c0aba11c000b',
        ),
      ),
    );
    expect((await apply('INDIVIDUAL')).appliedTemplateKeyVersion?.key).toBe(
      'INDIVIDUAL',
    );
    expect(await readDocuments()).toEqual(documents);
  }, 240000);
});
