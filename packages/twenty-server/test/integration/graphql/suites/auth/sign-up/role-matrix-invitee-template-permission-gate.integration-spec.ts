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

// P1.7b sixth leg acceptance: template operations install apps and rewrite
// workspace-wide navigation — the same blast radius as installApplication —
// so they now sit behind SettingsPermissionGuard(APPLICATIONS) instead of the
// permit-all NoPermissionGuard. An invited Guest is refused on preview and on
// both apply mutations; promoting the SAME token to Member is still refused
// (Member carries canUpdateAllSettings=false and no APPLICATIONS flag); the
// seeded workspace admin passes the gate and reads a real preview.
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const APPLE_WORKSPACE_SCHEMA = getWorkspaceSchemaName(SEED_APPLE_WORKSPACE_ID);

const inviteeEmail = `role-matrix-template-invitee-${Date.now()}@example.com`;
const inviteePassword = 'Test123!@#';
const invitationToken = `role-matrix-template-token-${Date.now()}`;
const idempotencyKey = `00000000-0000-4000-8000-${(Date.now() % 1_000_000_000).toString().padStart(12, '0')}`;

let guestRoleId: string | undefined;
let memberRoleId: string | undefined;

let inviteeAccessToken: string | undefined;
let inviteeWorkspaceMemberId: string | undefined;

const expectPermissionDenied = async (query: ASTNode, token: string) => {
  const response = await makeMetadataAPIRequest({ query }, token);

  expect(response.body.errors).toBeDefined();
  expect(response.body.errors[0].message).toBe(
    PermissionsExceptionMessage.PERMISSION_DENIED,
  );
  expect(response.body.errors[0].extensions.code).toBe(ErrorCode.FORBIDDEN);
};

const expectTemplatePreview = async (token: string) => {
  const response = await makeMetadataAPIRequest(
    {
      query: gql`
        query PreviewCrmTemplateForRoleMatrix {
          workspaceTemplatePreview(template: CRM) {
            templateKey
            version
            blocked
          }
        }
      `,
      variables: {},
    },
    token,
  );

  expect(response.body.errors).toBeUndefined();

  return response.body.data.workspaceTemplatePreview as {
    templateKey: string;
    version: number;
    blocked: boolean;
  };
};

const expectApplyOperationDenied = (token: string) =>
  expectPermissionDenied(
    gql`
      mutation ApplyTemplateOperationForRoleMatrix {
        applyWorkspaceTemplateOperation(
          input: { idempotencyKey: "${idempotencyKey}", template: CRM }
        ) {
          operationId
          steps {
            kind
            status
          }
        }
      }
    `,
    token,
  );

const expectLegacyApplyDenied = (token: string) =>
  expectPermissionDenied(
    gql`
      mutation ApplyLegacyTemplateForRoleMatrix {
        applyWorkspaceTemplate(input: { template: CRM }) {
          success
        }
      }
    `,
    token,
  );

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
  // then userWorkspace, user — same order as the previous role-matrix legs
  // because deletion by the removed user's own token fails post-removal.
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

describe('role matrix on the template surface for an invited member (integration)', () => {
  it('refuses a joined Guest the template preview and both apply mutations', async () => {
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

    await expectPermissionDenied(
      gql`
        query PreviewTemplateAsGuest {
          workspaceTemplatePreview(template: CRM) {
            templateKey
          }
        }
      `,
      inviteeAccessToken!,
    );
    await expectApplyOperationDenied(inviteeAccessToken!);
    await expectLegacyApplyDenied(inviteeAccessToken!);
  });

  it('still refuses the SAME token after promotion to Member', async () => {
    if (!isDefined(memberRoleId)) {
      throw new Error('Seeded Member role not found');
    }

    const promoteResponse = await makeMetadataAPIRequest({
      query: gql`
        mutation PromoteTemplateInviteeToMember {
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

    await expectPermissionDenied(
      gql`
        query PreviewTemplateAsMember {
          workspaceTemplatePreview(template: CRM) {
            templateKey
          }
        }
      `,
      inviteeAccessToken!,
    );
    await expectApplyOperationDenied(inviteeAccessToken!);
    await expectLegacyApplyDenied(inviteeAccessToken!);
  });

  it('lets the workspace admin read the preview through the same gate', async () => {
    const preview = await expectTemplatePreview(APPLE_JANE_ADMIN_ACCESS_TOKEN);

    expect(preview.templateKey).toBe('CRM');
    expect(preview.blocked).toBe(false);
  });
});
