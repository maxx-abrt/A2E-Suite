import { destroyOneOperationFactory } from 'test/integration/graphql/utils/destroy-one-operation-factory.util';
import { createOneOperationFactory } from 'test/integration/graphql/utils/create-one-operation-factory.util';
import { forgeLegacyHs256Token } from 'test/integration/graphql/utils/forge-legacy-hs256-token.util';
import { makeGraphqlAPIRequest } from 'test/integration/graphql/utils/make-graphql-api-request.util';
import { searchFactory } from 'test/integration/graphql/utils/search-factory.util';
import { waitForAllJobsToFinish } from 'test/integration/utils/wait-for-all-jobs-to-finish.util';
import { v4 } from 'uuid';

import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { AuthProviderEnum } from 'src/engine/core-modules/workspace/types/workspace.type';

// P2.5 caller-permission validation for the records search surface. The
// document provider's own caller-scoping is unit-covered in
// document-search-provider.service.spec.ts (an app-installed workspace is not
// available at Tier 1). Here we drive the real `search` resolver end to end on
// a seeded workspace:
// - the seeded "Object-restricted" role CAN read pets but CANNOT read rockets,
//   so a member holding it must not see rocket titles;
// - a member of the foreign seeded workspace must not see Apple titles.
// The role matrix itself was established by P1.7b; this spec asserts the
// *no leaked title* contract under those roles.

const APPLE_WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const YCOMBINATOR_WORKSPACE_ID = '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

// Seeded Tim: he holds the object-restricted role in Apple, and the admin role
// in YCombinator. Ids inlined from the dev seeder to keep this spec hermetic.
const TIM_USER_ID = '20202020-9e3b-46d4-a556-88b9ddc2b034';
const TIM_APPLE_USER_WORKSPACE_ID = '20202020-9e3b-46d4-a556-88b9ddc2b035';
const TIM_YCOMBINATOR_USER_WORKSPACE_ID =
  '20202020-e10a-4c27-a90b-b08c57b02d44';
const TIM_WORKSPACE_MEMBER_ID = '20202020-0687-4c41-b707-ed1bfca972a7';

const buildSeededUserAccessToken = ({
  workspaceId,
  userWorkspaceId,
}: {
  workspaceId: string;
  userWorkspaceId: string;
}): string =>
  forgeLegacyHs256Token(
    {
      sub: TIM_USER_ID,
      userId: TIM_USER_ID,
      userWorkspaceId,
      workspaceId,
      workspaceMemberId: TIM_WORKSPACE_MEMBER_ID,
      type: JwtTokenTypeEnum.ACCESS,
      authProvider: AuthProviderEnum.Password,
    },
    workspaceId,
  );

const restrictedMemberToken = buildSeededUserAccessToken({
  workspaceId: APPLE_WORKSPACE_ID,
  userWorkspaceId: TIM_APPLE_USER_WORKSPACE_ID,
});

const foreignWorkspaceAdminToken = buildSeededUserAccessToken({
  workspaceId: YCOMBINATOR_WORKSPACE_ID,
  userWorkspaceId: TIM_YCOMBINATOR_USER_WORKSPACE_ID,
});

const runId = v4();

const rocketId = v4();
const rocketName = `P25-Rocket-${runId}`;
const petId = v4();
const petName = `P25-Pet-${runId}`;
const appleCompanyId = v4();
const appleCompanyName = `P25-Apple-${runId}`;
const foreignCompanyId = v4();
const foreignCompanyName = `P25-Foreign-${runId}`;

const createRecord = async ({
  objectMetadataSingularName,
  data,
  token,
}: {
  objectMetadataSingularName: string;
  data: Record<string, unknown>;
  token?: string;
}) =>
  makeGraphqlAPIRequest(
    createOneOperationFactory({
      objectMetadataSingularName,
      gqlFields: 'id',
      data,
    }),
    token,
  );

const destroyRecord = async ({
  objectMetadataSingularName,
  recordId,
}: {
  objectMetadataSingularName: string;
  recordId: string;
}) =>
  makeGraphqlAPIRequest(
    destroyOneOperationFactory({
      objectMetadataSingularName,
      gqlFields: 'id',
      recordId,
    }),
  );

const searchFor = async ({
  searchInput,
  objectNameSingular,
  token,
}: {
  searchInput: string;
  objectNameSingular: string;
  token?: string;
}) =>
  makeGraphqlAPIRequest(
    searchFactory({
      searchInput,
      limit: 50,
      includedObjectNameSingulars: [objectNameSingular],
    }),
    token,
  );

describe('search caller permissions (integration)', () => {
  beforeAll(async () => {
    const rocketResponse = await createRecord({
      objectMetadataSingularName: 'rocket',
      data: { id: rocketId, name: rocketName },
    });
    expect(rocketResponse.body.errors).toBeUndefined();

    const petResponse = await createRecord({
      objectMetadataSingularName: 'pet',
      data: { id: petId, name: petName },
    });
    expect(petResponse.body.errors).toBeUndefined();

    const appleCompanyResponse = await createRecord({
      objectMetadataSingularName: 'company',
      data: { id: appleCompanyId, name: appleCompanyName },
    });
    expect(appleCompanyResponse.body.errors).toBeUndefined();

    const foreignCompanyResponse = await createRecord({
      objectMetadataSingularName: 'company',
      data: { id: foreignCompanyId, name: foreignCompanyName },
      token: foreignWorkspaceAdminToken,
    });
    expect(foreignCompanyResponse.body.errors).toBeUndefined();

    await waitForAllJobsToFinish();
  }, 60000);

  afterAll(async () => {
    await destroyRecord({
      objectMetadataSingularName: 'rocket',
      recordId: rocketId,
    });
    await destroyRecord({ objectMetadataSingularName: 'pet', recordId: petId });
    await destroyRecord({
      objectMetadataSingularName: 'company',
      recordId: appleCompanyId,
    });
    await destroyRecord({
      objectMetadataSingularName: 'company',
      recordId: foreignCompanyId,
    });
  }, 60000);

  it('lets an unrestricted admin find the rocket title (control)', async () => {
    const response = await searchFor({
      searchInput: rocketName,
      objectNameSingular: 'rocket',
    });

    expect(response.body.errors).toBeUndefined();
    expect(JSON.stringify(response.body.data)).toContain(rocketName);
  });

  it('never leaks the rocket title to the object-restricted member', async () => {
    const response = await searchFor({
      searchInput: rocketName,
      objectNameSingular: 'rocket',
      token: restrictedMemberToken,
    });

    // Fail closed: either the query is denied or the result is empty — in no
    // case does the unauthorized title surface.
    expect(JSON.stringify(response.body)).not.toContain(rocketName);
  });

  it('still lets the object-restricted member find a readable pet (scoped, not blanket denial)', async () => {
    const response = await searchFor({
      searchInput: petName,
      objectNameSingular: 'pet',
      token: restrictedMemberToken,
    });

    expect(response.body.errors).toBeUndefined();
    expect(JSON.stringify(response.body.data)).toContain(petName);
  });

  it('never lets a foreign-workspace member see Apple titles', async () => {
    const response = await searchFor({
      searchInput: appleCompanyName,
      objectNameSingular: 'company',
      token: foreignWorkspaceAdminToken,
    });

    expect(JSON.stringify(response.body)).not.toContain(appleCompanyName);
  });

  it('lets the foreign-workspace member find its own company (control)', async () => {
    const response = await searchFor({
      searchInput: foreignCompanyName,
      objectNameSingular: 'company',
      token: foreignWorkspaceAdminToken,
    });

    expect(response.body.errors).toBeUndefined();
    expect(JSON.stringify(response.body.data)).toContain(foreignCompanyName);
  });
});
