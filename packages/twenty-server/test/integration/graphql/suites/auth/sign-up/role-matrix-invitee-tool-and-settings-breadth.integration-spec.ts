import gql from 'graphql-tag';
import { type ASTNode } from 'graphql';

import { getAuthTokensFromLoginToken } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.util';
import {
  deleteWorkspaceInvitationsByEmail,
  seedWorkspaceInvitation,
} from 'test/integration/graphql/utils/seed-workspace-invitation.util';
import { signUpInWorkspaceOperationFactory } from 'test/integration/graphql/utils/sign-up-in-workspace-operation-factory.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { ErrorCode } from 'src/engine/core-modules/graphql/utils/graphql-errors.util';
import { PermissionsExceptionMessage } from 'src/engine/metadata-modules/permissions/permissions.exception';
import { isDefined } from 'twenty-shared/utils';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

// P1.7b fifth leg acceptance: the AI tool index and the settings surfaces run
// under the caller's role. An invited Guest sees read-only database tools but
// no write/role/metadata tools and no write schemas; promoting the SAME token
// to Member unlocks the write tools without unlocking the settings surface
// (Member has canUpdateAllSettings=false); a removed member loses the tool
// index entirely.
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const APPLE_WORKSPACE_SCHEMA = getWorkspaceSchemaName(SEED_APPLE_WORKSPACE_ID);

const inviteeEmail = `role-matrix-tool-invitee-${Date.now()}@example.com`;
const inviteePassword = 'Test123!@#';
const invitationToken = `role-matrix-tool-token-${Date.now()}`;

let guestRoleId: string | undefined;
let memberRoleId: string | undefined;

let inviteeAccessToken: string | undefined;
let inviteeWorkspaceMemberId: string | undefined;

const TOOL_INDEX_QUERY = gql`
  query GetToolIndexForRoleMatrix {
    getToolIndex {
      name
      label
      description
      category
    }
  }
`;

const getToolIndexNames = async (
  token: string,
): Promise<Array<{ name: string; category: string }>> => {
  const response = await makeMetadataAPIRequest(
    { query: TOOL_INDEX_QUERY, variables: {} },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.getToolIndex.map(
    (entry: { name: string; category: string }) => entry,
  );
};

const getToolInputSchema = async (token: string, toolName: string) => {
  const response = await makeMetadataAPIRequest(
    {
      query: gql`
        query GetToolInputSchemaForRoleMatrix($toolName: String!) {
          getToolInputSchema(toolName: $toolName)
        }
      `,
      variables: { toolName },
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.getToolInputSchema;
};

const expectPermissionDenied = async (
  query: ASTNode,
  token: string,
) => {
  const response = await makeMetadataAPIRequest({ query }, token);

  expect(response.body.errors).toBeDefined();
  expect(response.body.errors[0].message).toBe(
    PermissionsExceptionMessage.PERMISSION_DENIED,
  );
  expect(response.body.errors[0].extensions.code).toBe(
    ErrorCode.FORBIDDEN,
  );
};

const expectToolNamesAbsent = (
  index: Array<{ name: string }>,
  toolNames: string[],
) => {
  const presentNames = index.map((entry) => entry.name);

  for (const toolName of toolNames) {
    expect(presentNames).not.toContain(toolName);
  }
};

const expectToolCategoriesAbsent = (
  index: Array<{ category: string }>,
  categories: string[],
) => {
  const presentCategories = index.map((entry) => entry.category);

  for (const category of categories) {
    expect(presentCategories).not.toContain(category);
  }
};

beforeAll(async () => {
  const roleRows = await testDataSource.query(
    `SELECT id, label FROM core."role"
     WHERE "workspaceId" = $1 AND label IN ('Guest', 'Member') AND "canBeAssignedToUsers" = true`,
    [SEED_APPLE_WORKSPACE_ID],
  );

  guestRoleId = roleRows.find((row: { label: string }) => row.label === 'Guest')
    ?.id;
  memberRoleId = roleRows.find(
    (row: { label: string }) => row.label === 'Member',
  )?.id;

  await seedWorkspaceInvitation({
    email: inviteeEmail,
    value: invitationToken,
    expiresAt: new Date(Date.now() + ONE_HOUR_IN_MS),
    roleId: guestRoleId,
  });
}, 60000);

afterAll(async () => {
  await deleteWorkspaceInvitationsByEmail({ email: inviteeEmail });

  // Hard cleanup of the invitee: roleTarget first (references userWorkspace),
  // then userWorkspace, workspaceMember, user — same order as the previous
  // role-matrix legs because deleteUser by the removed user's own token fails
  // post-removal.
  await testDataSource.query(
    `DELETE FROM core."roleTarget" WHERE "userWorkspaceId" IN (
       SELECT uw.id FROM core."userWorkspace" uw
       JOIN core."user" u ON u.id = uw."userId" WHERE u.email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query(
    `DELETE FROM core."userWorkspace" WHERE "userId" IN (
       SELECT id FROM core."user" WHERE email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query(
    `DELETE FROM core."user" WHERE email = $1`,
    [inviteeEmail],
  );
}, 60000);

describe('role matrix on the tool index and settings surface for an invited member (integration)', () => {
  it('joins as a Guest and sees read-only database tools with no write schemas', async () => {
    if (!isDefined(guestRoleId)) {
      throw new Error('Seeded Guest role not found');
    }

    const response = await makeMetadataAPIRequest(
      signUpInWorkspaceOperationFactory({
        email: inviteeEmail,
        password: inviteePassword,
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        workspacePersonalInviteToken: invitationToken,
      }),
      undefined,
    );

    expect(response.body.errors).toBeUndefined();

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

    inviteeAccessToken = authTokensData.tokens.accessOrWorkspaceAgnosticToken.token;

    expect(inviteeAccessToken).toBeDefined();

    const workspaceMemberRows = await testDataSource.query(
      `SELECT wm.id FROM ${APPLE_WORKSPACE_SCHEMA}."workspaceMember" wm
       JOIN core."user" u ON u.id = wm."userId"
       WHERE u.email = $1`,
      [inviteeEmail],
    );

    expect(workspaceMemberRows).toHaveLength(1);
    inviteeWorkspaceMemberId = workspaceMemberRows[0].id;

    const toolIndex = await getToolIndexNames(inviteeAccessToken!);

    expectToolNamesAbsent(toolIndex, [
      'create_one_company',
      'update_one_company',
      'delete_one_company',
    ]);
    expectToolCategoriesAbsent(toolIndex, ['ROLE', 'METADATA', 'WEBHOOK', 'WORKFLOW']);

    const writeSchema = await getToolInputSchema(
      inviteeAccessToken!,
      'create_one_company',
    );

    expect(writeSchema).toBeNull();
  });

  it('unlocks the write tools on the SAME token after promotion to Member, without unlocking settings', async () => {
    if (!isDefined(memberRoleId)) {
      throw new Error('Seeded Member role not found');
    }

    const promoteResponse = await makeMetadataAPIRequest({
      query: gql`
        mutation PromoteToolInviteeToMember {
          updateWorkspaceMemberRole(
            workspaceMemberId: "${inviteeWorkspaceMemberId}"
            roleId: "${memberRoleId}"
          ) {
            id
          }
        }
      `,
    });

    expect(promoteResponse.body.errors).toBeUndefined();

    const toolIndex = await getToolIndexNames(inviteeAccessToken!);

    const toolNames = toolIndex.map((entry) => entry.name);

    expect(toolNames).toContain('create_one_company');
    expect(toolNames).toContain('update_one_company');
    expect(toolNames).toContain('delete_one_company');

    const writeSchema = await getToolInputSchema(
      inviteeAccessToken!,
      'create_one_company',
    );

    expect(writeSchema).not.toBeNull();

    // Member still has canUpdateAllSettings=false: the settings surface stays
    // closed even though the record-write tools opened.
    await expectPermissionDenied(
      gql`
        mutation SendInvitationsForToolMatrix {
          sendInvitations(emails: ["tool-matrix-retry@example.com"]) {
            success
          }
        }
      `,
      inviteeAccessToken!,
    );

    await expectPermissionDenied(
      gql`
        query GetRolesForToolMatrix {
          getRoles {
            id
            label
          }
        }
      `,
      inviteeAccessToken!,
    );
  });

  it('revokes the removed member’s tool index immediately', async () => {
    const removeResponse = await makeMetadataAPIRequest({
      query: gql`
        mutation RemoveToolInviteeFromWorkspace {
          deleteUserFromWorkspace(
            workspaceMemberIdToDelete: "${inviteeWorkspaceMemberId}"
          ) {
            id
          }
        }
      `,
    });

    expect(removeResponse.body.errors).toBeUndefined();

    const toolIndexResponse = await makeMetadataAPIRequest(
      { query: TOOL_INDEX_QUERY, variables: {} },
      inviteeAccessToken,
    );

    expect(toolIndexResponse.body.errors).toBeDefined();
  });
});
