import gql from 'graphql-tag';

import { deleteUser } from 'test/integration/graphql/utils/delete-user.util';
import { getAuthTokensFromLoginToken } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.util';
import {
  deleteWorkspaceInvitationsByEmail,
  seedWorkspaceInvitation,
} from 'test/integration/graphql/utils/seed-workspace-invitation.util';
import { signUpInWorkspaceOperationFactory } from 'test/integration/graphql/utils/sign-up-in-workspace-operation-factory.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { isDefined } from 'twenty-shared/utils';

import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

// P1.7b fourth leg acceptance: preferences are stored per workspace, not per
// user — a member who customizes their profile in one workspace, then joins a
// second one, starts from fresh defaults there; changing preferences in the
// second workspace leaves the first untouched; the core user locale is never
// rewritten by per-workspace locale updates; and self-removal from the second
// workspace deletes only that membership, preserving the first.
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const APPLE_WORKSPACE_SCHEMA = getWorkspaceSchemaName(SEED_APPLE_WORKSPACE_ID);
const YCOMBINATOR_WORKSPACE_SCHEMA = getWorkspaceSchemaName(
  SEED_YCOMBINATOR_WORKSPACE_ID,
);

const inviteeEmail = `role-matrix-pref-isolation-${Date.now()}@example.com`;
const inviteePassword = 'Test123!@#';
const appleInvitationToken = `role-matrix-pref-token-apple-${Date.now()}`;
const ycombinatorInvitationToken = `role-matrix-pref-token-yc-${Date.now()}`;

let inviteeAppleAccessToken: string | undefined;
let inviteeYcombinatorAccessToken: string | undefined;
let inviteeAppleWorkspaceMemberId: string | undefined;
let inviteeYcombinatorWorkspaceMemberId: string | undefined;

type WorkspaceMemberPreferences = {
  id: string;
  colorScheme: string | null;
  locale: string | null;
  dateFormat: string | null;
  timeFormat: string | null;
};

const CURRENT_USER_PREFERENCES_QUERY = gql`
  query CurrentUserForPreferenceIsolation {
    currentUser {
      id
      locale
      workspaceMember {
        id
        colorScheme
        locale
        dateFormat
        timeFormat
      }
    }
  }
`;

// Core user mutations (currentUser, updateWorkspaceMemberSettings,
// deleteUserFromWorkspace) are served on the /metadata endpoint, not /graphql.
const getCurrentUserPreferences = async (
  token: string,
): Promise<{
  userLocale: string;
  workspaceMember: WorkspaceMemberPreferences;
}> => {
  const response = await makeMetadataAPIRequest(
    { query: CURRENT_USER_PREFERENCES_QUERY, variables: {} },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  const workspaceMember = response.body.data.currentUser.workspaceMember;

  expect(workspaceMember).toBeDefined();

  return {
    userLocale: response.body.data.currentUser.locale,
    workspaceMember,
  };
};

const updateOwnPreferencesWithToken = async (
  token: string,
  workspaceMemberId: string,
  update: Record<string, unknown>,
) =>
  makeMetadataAPIRequest(
    {
      query: gql`
        mutation UpdatePreferencesForIsolation(
          $input: UpdateWorkspaceMemberSettingsInput!
        ) {
          updateWorkspaceMemberSettings(input: $input)
        }
      `,
      variables: { input: { workspaceMemberId, update } },
    },
    token,
  );

const getWorkspaceMemberIdForToken = async (token: string): Promise<string> => {
  const { workspaceMember } = await getCurrentUserPreferences(token);

  return workspaceMember.id;
};

const getUserWorkspaceRows = async (email: string) =>
  testDataSource.query(
    `SELECT uw."workspaceId", uw.locale FROM core."userWorkspace" uw
     JOIN core."user" u ON u.id = uw."userId" WHERE u.email = $1`,
    [email],
  );

beforeAll(async () => {
  await seedWorkspaceInvitation({
    email: inviteeEmail,
    value: appleInvitationToken,
    expiresAt: new Date(Date.now() + ONE_HOUR_IN_MS),
  });

  await seedWorkspaceInvitation({
    email: inviteeEmail,
    value: ycombinatorInvitationToken,
    expiresAt: new Date(Date.now() + ONE_HOUR_IN_MS),
    workspaceId: SEED_YCOMBINATOR_WORKSPACE_ID,
  });
});

afterAll(async () => {
  await deleteWorkspaceInvitationsByEmail({ email: inviteeEmail });
  await deleteWorkspaceInvitationsByEmail({
    email: inviteeEmail,
    workspaceId: SEED_YCOMBINATOR_WORKSPACE_ID,
  });

  if (isDefined(inviteeAppleAccessToken)) {
    await deleteUser({
      accessToken: inviteeAppleAccessToken,
      expectToFail: false,
    });
  }

  // Backstop hard cleanup: roleTarget first (references userWorkspace), then
  // workspaceMember in both schemas, userWorkspace, user.
  await testDataSource.query(
    `DELETE FROM core."roleTarget" WHERE "userWorkspaceId" IN (
       SELECT uw.id FROM core."userWorkspace" uw
       JOIN core."user" u ON u.id = uw."userId" WHERE u.email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query(
    `DELETE FROM ${APPLE_WORKSPACE_SCHEMA}."workspaceMember" WHERE "userId" IN (
       SELECT id FROM core."user" WHERE email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query(
    `DELETE FROM ${YCOMBINATOR_WORKSPACE_SCHEMA}."workspaceMember" WHERE "userId" IN (
       SELECT id FROM core."user" WHERE email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query(
    `DELETE FROM core."userWorkspace" WHERE "userId" IN (
       SELECT id FROM core."user" WHERE email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query('DELETE FROM core."user" WHERE email = $1', [
    inviteeEmail,
  ]);
}, 60000);

describe('personal preferences stay isolated across workspace switches (integration)', () => {
  it('joins the first workspace via invitation and customizes its preferences', async () => {
    const response = await makeMetadataAPIRequest(
      signUpInWorkspaceOperationFactory({
        email: inviteeEmail,
        password: inviteePassword,
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        workspacePersonalInviteToken: appleInvitationToken,
      }),
      undefined,
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.signUpInWorkspace.workspace.id).toBe(
      SEED_APPLE_WORKSPACE_ID,
    );

    await testDataSource.query(
      'UPDATE core."user" SET "isEmailVerified" = true WHERE email = $1',
      [inviteeEmail],
    );

    const {
      data: { getAuthTokensFromLoginToken: authTokensData },
    } = await getAuthTokensFromLoginToken({
      loginToken: response.body.data.signUpInWorkspace.loginToken.token,
      origin:
        response.body.data.signUpInWorkspace.workspace.workspaceUrls
          ?.subdomainUrl ?? 'http://localhost:3001',
      expectToFail: false,
    });

    inviteeAppleAccessToken =
      authTokensData.tokens.accessOrWorkspaceAgnosticToken.token;

    inviteeAppleWorkspaceMemberId = await getWorkspaceMemberIdForToken(
      inviteeAppleAccessToken,
    );

    const updateResponse = await updateOwnPreferencesWithToken(
      inviteeAppleAccessToken,
      inviteeAppleWorkspaceMemberId,
      {
        colorScheme: 'Dark',
        dateFormat: 'DAY_FIRST',
        timeFormat: 'HOUR_24',
        locale: 'fr-FR',
      },
    );

    expect(updateResponse.body.errors).toBeUndefined();
    expect(updateResponse.body.data.updateWorkspaceMemberSettings).toBe(true);
  }, 60000);

  it('lands the same user in the second workspace with fresh default preferences', async () => {
    const response = await makeMetadataAPIRequest(
      signUpInWorkspaceOperationFactory({
        email: inviteeEmail,
        password: inviteePassword,
        workspaceId: SEED_YCOMBINATOR_WORKSPACE_ID,
        workspacePersonalInviteToken: ycombinatorInvitationToken,
      }),
      undefined,
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.signUpInWorkspace.workspace.id).toBe(
      SEED_YCOMBINATOR_WORKSPACE_ID,
    );

    const {
      data: { getAuthTokensFromLoginToken: authTokensData },
    } = await getAuthTokensFromLoginToken({
      loginToken: response.body.data.signUpInWorkspace.loginToken.token,
      origin:
        response.body.data.signUpInWorkspace.workspace.workspaceUrls
          ?.subdomainUrl ?? 'http://localhost:3001',
      expectToFail: false,
    });

    inviteeYcombinatorAccessToken =
      authTokensData.tokens.accessOrWorkspaceAgnosticToken.token;

    const { userLocale, workspaceMember } = await getCurrentUserPreferences(
      inviteeYcombinatorAccessToken,
    );

    inviteeYcombinatorWorkspaceMemberId = workspaceMember.id;

    // The join must not carry over the first workspace's customization, and
    // the fresh member locale comes from the USER locale (en), not from the
    // other membership's fr-FR.
    expect(userLocale).toBe('en');
    expect(workspaceMember.colorScheme).toBe('System');
    expect(workspaceMember.locale).toBe('en');
  }, 60000);

  it('keeps the first workspace preferences untouched when the second workspace is customized', async () => {
    const updateResponse = await updateOwnPreferencesWithToken(
      inviteeYcombinatorAccessToken!,
      inviteeYcombinatorWorkspaceMemberId!,
      {
        colorScheme: 'Light',
        dateFormat: 'MONTH_FIRST',
        locale: 'de-DE',
      },
    );

    expect(updateResponse.body.errors).toBeUndefined();

    const applePreferences = await getCurrentUserPreferences(
      inviteeAppleAccessToken!,
    );

    expect(applePreferences.workspaceMember.colorScheme).toBe('Dark');
    expect(applePreferences.workspaceMember.dateFormat).toBe('DAY_FIRST');
    expect(applePreferences.workspaceMember.timeFormat).toBe('HOUR_24');
    expect(applePreferences.workspaceMember.locale).toBe('fr-FR');

    const ycombinatorPreferences = await getCurrentUserPreferences(
      inviteeYcombinatorAccessToken!,
    );

    expect(ycombinatorPreferences.workspaceMember.colorScheme).toBe('Light');
    expect(ycombinatorPreferences.workspaceMember.dateFormat).toBe(
      'MONTH_FIRST',
    );
    expect(ycombinatorPreferences.workspaceMember.locale).toBe('de-DE');

    // The core user locale is account-scoped: per-workspace locale updates
    // must never rewrite it.
    expect(applePreferences.userLocale).toBe('en');
    expect(ycombinatorPreferences.userLocale).toBe('en');

    const userWorkspaceRows = await getUserWorkspaceRows(inviteeEmail);

    const appleUserWorkspace = userWorkspaceRows.find(
      (row: { workspaceId: string }) =>
        row.workspaceId === SEED_APPLE_WORKSPACE_ID,
    );
    const ycombinatorUserWorkspace = userWorkspaceRows.find(
      (row: { workspaceId: string }) =>
        row.workspaceId === SEED_YCOMBINATOR_WORKSPACE_ID,
    );

    expect(appleUserWorkspace?.locale).toBe('fr-FR');
    expect(ycombinatorUserWorkspace?.locale).toBe('de-DE');
  }, 60000);

  it('removes only the second membership on self-removal, preserving the first', async () => {
    const removeResponse = await makeMetadataAPIRequest(
      {
        query: gql`
          mutation LeaveSecondWorkspace {
            deleteUserFromWorkspace(
              workspaceMemberIdToDelete: "${inviteeYcombinatorWorkspaceMemberId}"
            ) {
              id
            }
          }
        `,
      },
      inviteeYcombinatorAccessToken,
    );

    expect(removeResponse.body.errors).toBeUndefined();

    const userWorkspaceRows = await getUserWorkspaceRows(inviteeEmail);

    expect(
      userWorkspaceRows.find(
        (row: { workspaceId: string }) =>
          row.workspaceId === SEED_YCOMBINATOR_WORKSPACE_ID,
      ),
    ).toBeUndefined();

    const appleUserWorkspace = userWorkspaceRows.find(
      (row: { workspaceId: string }) =>
        row.workspaceId === SEED_APPLE_WORKSPACE_ID,
    );

    expect(appleUserWorkspace).toBeDefined();
    expect(appleUserWorkspace?.locale).toBe('fr-FR');

    const appleMemberRows = await testDataSource.query(
      `SELECT wm.id, wm."colorScheme" FROM ${APPLE_WORKSPACE_SCHEMA}."workspaceMember" wm
       JOIN core."user" u ON u.id = wm."userId" WHERE u.email = $1`,
      [inviteeEmail],
    );

    expect(appleMemberRows).toHaveLength(1);
    expect(appleMemberRows[0].colorScheme).toBe('Dark');
  }, 60000);
});
