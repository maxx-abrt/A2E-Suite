import { deleteUser } from 'test/integration/graphql/utils/delete-user.util';
import { getAuthTokensFromLoginToken } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.util';
import {
  deleteWorkspaceInvitationsByEmail,
  seedWorkspaceInvitation,
} from 'test/integration/graphql/utils/seed-workspace-invitation.util';
import { signUpInWorkspaceOperationFactory } from 'test/integration/graphql/utils/sign-up-in-workspace-operation-factory.util';
import { makeMetadataAPIRequest } from 'test/integration/metadata/suites/utils/make-metadata-api-request.util';
import { isDefined } from 'twenty-shared/utils';

import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

// P1.7b first leg acceptance: a personal invitation joins the invitee to the
// EXISTING configured workspace (never a fresh one), the workspace-level
// configuration and its navigation rows survive the join untouched, a member
// row is created, and the token is consumed on use. The invitation's roleId is
// honored when it points at a valid in-workspace role and refused when it
// points at another workspace's role.
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const APPLE_WORKSPACE_SCHEMA = getWorkspaceSchemaName(SEED_APPLE_WORKSPACE_ID);

// Standard CRM row managed by the template definitions (see
// workspace-template-definitions.constant.ts) — must NOT be re-created by a
// join (a reset would restore it).
const COMPANY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '20202020-b001-4b01-8b01-c0aba11c0001';

const SEED_YCOMBINATOR_WORKSPACE_ID =
  '3b8e6458-5fc1-4e63-8563-008ccddaa6db';

const inviteeEmail = `configured-join-invitee-${Date.now()}@example.com`;
const inviteePassword = 'Test123!@#';
const invitationToken = `configured-join-token-${Date.now()}`;

let otherWorkspaceRoleId: string | undefined;
let inWorkspaceRoleId: string | undefined;

let inviteeAccessToken: string | undefined;

beforeAll(async () => {
  await seedWorkspaceInvitation({
    email: inviteeEmail,
    value: invitationToken,
    expiresAt: new Date(Date.now() + ONE_HOUR_IN_MS),
  });

  // A role from the OTHER seeded workspace proves the invitation's roleId is
  // validated against the TARGET workspace, not just copied.
  const roleRows = await testDataSource.query(
    `SELECT id FROM core."role" WHERE "workspaceId" = $1 LIMIT 1`,
    [SEED_YCOMBINATOR_WORKSPACE_ID],
  );

  otherWorkspaceRoleId = roleRows[0]?.id;

  // An assignable role INSIDE the target workspace — the invitation must
  // honor it instead of silently falling back to the workspace default.
  const inWorkspaceRoleRows = await testDataSource.query(
    `SELECT id FROM core."role"
     WHERE "workspaceId" = $1 AND label = 'Guest' AND "canBeAssignedToUsers" = true
     LIMIT 1`,
    [SEED_APPLE_WORKSPACE_ID],
  );

  inWorkspaceRoleId = inWorkspaceRoleRows[0]?.id;

  // Configure the workspace: a template set, the state an invited teammate
  // must land in unchanged.
  await testDataSource.query(
    `UPDATE core."workspace" SET "workspaceTemplate" = 'INDIVIDUAL' WHERE id = $1`,
    [SEED_APPLE_WORKSPACE_ID],
  );
});

afterAll(async () => {
  await testDataSource.query(
    `UPDATE core."workspace" SET "workspaceTemplate" = NULL WHERE id = $1`,
    [SEED_APPLE_WORKSPACE_ID],
  );

  await deleteWorkspaceInvitationsByEmail({ email: inviteeEmail });

  if (isDefined(inviteeAccessToken)) {
    await deleteUser({
      accessToken: inviteeAccessToken,
      expectToFail: false,
    });
  }
});

describe('signUpInWorkspace joins a configured workspace via personal invitation (integration)', () => {
  it('lands the invitee in the existing configured workspace, joining as a member', async () => {
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

    const signUpPayload = response.body.data.signUpInWorkspace;

    expect(signUpPayload.workspace.id).toBe(SEED_APPLE_WORKSPACE_ID);

    await testDataSource.query(
      'UPDATE core."user" SET "isEmailVerified" = true WHERE email = $1',
      [inviteeEmail],
    );

    const {
      data: { getAuthTokensFromLoginToken: authTokensData },
    } = await getAuthTokensFromLoginToken({
      loginToken: signUpPayload.loginToken.token,
      origin:
        signUpPayload.workspace.workspaceUrls?.subdomainUrl ??
        'http://localhost:3001',
      expectToFail: false,
    });

    inviteeAccessToken =
      authTokensData.tokens.accessOrWorkspaceAgnosticToken.token;

    expect(inviteeAccessToken).toBeDefined();

    const userWorkspaceRows = await testDataSource.query(
      `SELECT uw.id FROM core."userWorkspace" uw
       JOIN core."user" u ON u.id = uw."userId"
       WHERE u.email = $1 AND uw."workspaceId" = $2`,
      [inviteeEmail, SEED_APPLE_WORKSPACE_ID],
    );

    expect(userWorkspaceRows).toHaveLength(1);

    // Workspace configuration survived: the template set before the join is
    // still on the row (a join must not re-run or reset workspace setup).
    const workspaceRows = await testDataSource.query(
      `SELECT "workspaceTemplate" FROM core."workspace" WHERE id = $1`,
      [SEED_APPLE_WORKSPACE_ID],
    );

    expect(workspaceRows[0].workspaceTemplate).toBe('INDIVIDUAL');

    // Navigation customization survived: the standard CRM row still exists
    // exactly once (a join must not re-seed or restore managed rows).
    const navigationRows = await testDataSource.query(
      `SELECT id FROM core."navigationMenuItem"
       WHERE "universalIdentifier" = $1 AND "workspaceId" = $2`,
      [
        COMPANY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
        SEED_APPLE_WORKSPACE_ID,
      ],
    );

    expect(navigationRows).toHaveLength(1);

    // A workspaceMember row exists for the invitee (workspaceMember links to
    // the user by userId, not by userWorkspaceId).
    const workspaceMemberRows = await testDataSource.query(
      `SELECT wm.id FROM ${APPLE_WORKSPACE_SCHEMA}."workspaceMember" wm
       JOIN core."user" u ON u.id = wm."userId"
       WHERE u.email = $1`,
      [inviteeEmail],
    );

    expect(workspaceMemberRows).toHaveLength(1);
  });

  it('consumes the personal invitation on use', async () => {
    const remainingInvitations = await testDataSource.query(
      `SELECT id FROM core."appToken"
       WHERE "workspaceId" = $1 AND context->>'email' = $2`,
      [SEED_APPLE_WORKSPACE_ID, inviteeEmail],
    );

    expect(remainingInvitations).toHaveLength(0);
  });

  it('refuses an invitation carrying a role from another workspace', async () => {
    if (!isDefined(otherWorkspaceRoleId)) {
      throw new Error('Seeded role for cross-workspace validation not found');
    }

    const conflictingEmail = `cross-role-invitee-${Date.now()}@example.com`;
    const conflictingToken = `cross-role-token-${Date.now()}`;

    try {
      await seedWorkspaceInvitation({
        email: conflictingEmail,
        value: conflictingToken,
        expiresAt: new Date(Date.now() + ONE_HOUR_IN_MS),
        roleId: otherWorkspaceRoleId,
      });

      const response = await makeMetadataAPIRequest(
        signUpInWorkspaceOperationFactory({
          email: conflictingEmail,
          workspaceId: SEED_APPLE_WORKSPACE_ID,
          workspacePersonalInviteToken: conflictingToken,
        }),
        undefined,
      );

      expect(response.body.data?.signUpInWorkspace).toBeFalsy();
      expect(response.body.errors).toBeDefined();

      // The join must not half-apply: no member row for the refused invitee.
      const userWorkspaceRows = await testDataSource.query(
        `SELECT uw.id FROM core."userWorkspace" uw
         JOIN core."user" u ON u.id = uw."userId"
         WHERE u.email = $1 AND uw."workspaceId" = $2`,
        [conflictingEmail, SEED_APPLE_WORKSPACE_ID],
      );

      expect(userWorkspaceRows).toHaveLength(0);
    } finally {
      await deleteWorkspaceInvitationsByEmail({ email: conflictingEmail });
      await testDataSource.query('DELETE FROM core."user" WHERE email = $1', [
        conflictingEmail,
      ]);
    }
  });

  it('honors a valid in-workspace role carried by the invitation', async () => {
    if (!isDefined(inWorkspaceRoleId)) {
      throw new Error('Seeded in-workspace role for honored-role case not found');
    }

    const honoredEmail = `honored-role-invitee-${Date.now()}@example.com`;
    const honoredToken = `honored-role-token-${Date.now()}`;
    let honoredAccessToken: string | undefined;

    try {
      await seedWorkspaceInvitation({
        email: honoredEmail,
        value: honoredToken,
        expiresAt: new Date(Date.now() + ONE_HOUR_IN_MS),
        roleId: inWorkspaceRoleId,
      });

      const response = await makeMetadataAPIRequest(
        signUpInWorkspaceOperationFactory({
          email: honoredEmail,
          password: inviteePassword,
          workspaceId: SEED_APPLE_WORKSPACE_ID,
          workspacePersonalInviteToken: honoredToken,
        }),
        undefined,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.signUpInWorkspace.workspace.id).toBe(
        SEED_APPLE_WORKSPACE_ID,
      );

      await testDataSource.query(
        'UPDATE core."user" SET "isEmailVerified" = true WHERE email = $1',
        [honoredEmail],
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

      honoredAccessToken =
        authTokensData.tokens.accessOrWorkspaceAgnosticToken.token;

      // The invited role wins over the workspace default: a roleTarget row
      // links the new membership to the invitation's roleId.
      const roleTargetRows = await testDataSource.query(
        `SELECT rt.id FROM core."roleTarget" rt
         JOIN core."userWorkspace" uw ON uw.id = rt."userWorkspaceId"
         JOIN core."user" u ON u.id = uw."userId"
         WHERE u.email = $1 AND rt."roleId" = $2 AND rt."workspaceId" = $3`,
        [honoredEmail, inWorkspaceRoleId, SEED_APPLE_WORKSPACE_ID],
      );

      expect(roleTargetRows).toHaveLength(1);
    } finally {
      await deleteWorkspaceInvitationsByEmail({ email: honoredEmail });

      if (isDefined(honoredAccessToken)) {
        await deleteUser({
          accessToken: honoredAccessToken,
          expectToFail: false,
        });
      }
    }
  });
});
