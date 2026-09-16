import gql from 'graphql-tag';

import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import {
  deleteWorkspaceInvitationsByEmail,
  seedWorkspaceInvitation,
} from 'test/integration/graphql/utils/seed-workspace-invitation.util';
import { signUpInWorkspaceOperationFactory } from 'test/integration/graphql/utils/sign-up-in-workspace-operation-factory.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { getAuthTokensFromLoginToken } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.util';
import { searchFactory } from 'test/integration/graphql/utils/search-factory.util';
import { isDefined } from 'twenty-shared/utils';
import { v4 } from 'uuid';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

// P1.7b third leg acceptance: the unified search surface runs under the
// caller's role — an invited Guest (viewer) finds a record through search but
// cannot write through the search-identified id, a Guest→Member role change
// unlocks that write on the SAME token, a removed member loses the search
// surface entirely, and a soft-deleted record leaves search results.
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const APPLE_WORKSPACE_SCHEMA = getWorkspaceSchemaName(SEED_APPLE_WORKSPACE_ID);

const inviteeEmail = `role-matrix-search-invitee-${Date.now()}@example.com`;
const inviteePassword = 'Test123!@#';
const invitationToken = `role-matrix-search-token-${Date.now()}`;

const testCompanyId = v4();
const companyNameAtCreation = `Search Matrix Co ${testCompanyId}`;
const companyNameAfterPromotion = `Search Matrix Co promoted ${testCompanyId}`;

let guestRoleId: string | undefined;
let memberRoleId: string | undefined;

let inviteeAccessToken: string | undefined;
let inviteeWorkspaceMemberId: string | undefined;

let companyDestroyed = false;

// Seeded companies share tokens with the test name (Co*, *Matrix*), so search
// returns the whole token-matching workspace — assert on the specific
// recordId's presence, not on the edge count.
const searchCompanyByName = async (
  token: string,
  searchInput: string,
): Promise<Array<{ recordId: string; label: string | null }>> => {
  const response = await makeGraphqlAPIRequest(
    searchFactory({
      searchInput,
      limit: 50,
      includedObjectNameSingulars: ['company'],
    }),
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.search.edges.map(
    (edge: { node: { recordId: string; label: string | null } }) => edge.node,
  );
};

const expectSearchFindsRecord = (
  edges: Array<{ recordId: string }>,
  recordId: string,
) => {
  expect(edges.filter((edge) => edge.recordId === recordId)).toHaveLength(1);
};

const expectSearchOmitsRecord = (
  edges: Array<{ recordId: string }>,
  recordId: string,
) => {
  expect(edges.filter((edge) => edge.recordId === recordId)).toHaveLength(0);
};

const updateCompanyNameWithToken = async (token: string, name: string) =>
  makeGraphqlAPIRequest({
    query: gql`
      mutation UpdateCompanyForSearchMatrix($id: UUID!, $data: companyUpdateInput!) {
        updateCompany(id: $id, data: $data) {
          id
          name
        }
      }
    `,
    variables: { id: testCompanyId, data: { name } },
  }, token);

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

  const createResponse = await makeGraphqlAPIRequest(
    createOneOperationFactory({
      objectMetadataSingularName: 'company',
      gqlFields: 'id name',
      data: { id: testCompanyId, name: companyNameAtCreation },
    }),
  );

  expect(createResponse.body.errors).toBeUndefined();
}, 60000);

afterAll(async () => {
  if (!companyDestroyed) {
    const destroyResponse = await makeGraphqlAPIRequest({
      query: gql`
        mutation DestroyCompanyForSearchMatrix($id: UUID!) {
          deleteCompany(id: $id) {
            id
          }
        }
      `,
      variables: { id: testCompanyId },
    });

    companyDestroyed = !isDefined(destroyResponse.body.errors);
  }

  await deleteWorkspaceInvitationsByEmail({ email: inviteeEmail });

  // Hard cleanup of the invitee: roleTarget first (references userWorkspace),
  // then userWorkspace, workspaceMember, user.
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
    `DELETE FROM core."userWorkspace" WHERE "userId" IN (
       SELECT id FROM core."user" WHERE email = $1
     )`,
    [inviteeEmail],
  );
  await testDataSource.query('DELETE FROM core."user" WHERE email = $1', [
    inviteeEmail,
  ]);
}, 60000);

describe('role matrix on the search surface for an invited member (integration)', () => {
  it('joins via the invitation carrying the Guest role and finds the record through search as a viewer', async () => {
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

    inviteeAccessToken =
      authTokensData.tokens.accessOrWorkspaceAgnosticToken.token;

    expect(inviteeAccessToken).toBeDefined();

    const workspaceMemberRows = await testDataSource.query(
      `SELECT wm.id FROM ${APPLE_WORKSPACE_SCHEMA}."workspaceMember" wm
       JOIN core."user" u ON u.id = wm."userId"
       WHERE u.email = $1`,
      [inviteeEmail],
    );

    expect(workspaceMemberRows).toHaveLength(1);
    inviteeWorkspaceMemberId = workspaceMemberRows[0].id;

    const searchEdges = await searchCompanyByName(
      inviteeAccessToken!,
      companyNameAtCreation,
    );

    expectSearchFindsRecord(searchEdges, testCompanyId);
  });

  it('refuses the Guest write through the search-identified record id, leaving the data unchanged', async () => {
    const searchEdges = await searchCompanyByName(
      inviteeAccessToken!,
      companyNameAtCreation,
    );

    expectSearchFindsRecord(searchEdges, testCompanyId);

    const writeResponse = await updateCompanyNameWithToken(
      inviteeAccessToken!,
      companyNameAfterPromotion,
    );

    expect(writeResponse.body.data?.updateCompany).toBeFalsy();
    expect(writeResponse.body.errors).toBeDefined();

    const searchAfterRefusedWrite = await searchCompanyByName(
      inviteeAccessToken!,
      companyNameAtCreation,
    );

    expectSearchFindsRecord(searchAfterRefusedWrite, testCompanyId);
  });

  it('applies an admin role change to Member on the SAME token, unlocking the write through search', async () => {
    if (!isDefined(memberRoleId)) {
      throw new Error('Seeded Member role not found');
    }

    const promoteResponse = await makeMetadataAPIRequest({
      query: gql`
        mutation PromoteSearchInviteeToMember {
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

    const searchEdges = await searchCompanyByName(
      inviteeAccessToken!,
      companyNameAtCreation,
    );

    expectSearchFindsRecord(searchEdges, testCompanyId);

    const writeResponse = await updateCompanyNameWithToken(
      inviteeAccessToken!,
      companyNameAfterPromotion,
    );

    expect(writeResponse.body.errors).toBeUndefined();
    expect(writeResponse.body.data.updateCompany.name).toBe(
      companyNameAfterPromotion,
    );

    const searchAfterRename = await searchCompanyByName(
      inviteeAccessToken!,
      companyNameAfterPromotion,
    );

    expectSearchFindsRecord(searchAfterRename, testCompanyId);
  });

  it('drops the soft-deleted record from search results', async () => {
    const deleteResponse = await makeGraphqlAPIRequest({
      query: gql`
        mutation DeleteCompanyForSearchMatrix($id: UUID!) {
          deleteCompany(id: $id) {
            id
          }
        }
      `,
      variables: { id: testCompanyId },
    });

    expect(deleteResponse.body.errors).toBeUndefined();
    companyDestroyed = true;

    const searchAfterDelete = await searchCompanyByName(
      inviteeAccessToken!,
      companyNameAfterPromotion,
    );

    expectSearchOmitsRecord(searchAfterDelete, testCompanyId);
  });

  it('revokes the removed member’s search access immediately', async () => {
    const removeResponse = await makeMetadataAPIRequest({
      query: gql`
        mutation RemoveSearchInviteeFromWorkspace {
          deleteUserFromWorkspace(
            workspaceMemberIdToDelete: "${inviteeWorkspaceMemberId}"
          ) {
            id
          }
        }
      `,
    });

    expect(removeResponse.body.errors).toBeUndefined();

    const searchResponse = await makeGraphqlAPIRequest(
      searchFactory({
        searchInput: companyNameAfterPromotion,
        limit: 50,
        includedObjectNameSingulars: ['company'],
      }),
      inviteeAccessToken,
    );

    expect(searchResponse.body.errors).toBeDefined();
  });
});
