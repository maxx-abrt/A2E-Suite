import { randomUUID } from 'node:crypto';
import { gql } from 'graphql-tag';

import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';
import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { ALLOWED_ORIGIN } from 'test/integration/graphql/suites/auth/user-sessions/constants/session-origins.constants';
import {
  extractSessionCookie,
  postMetadataOperationWithHeaders,
} from 'test/integration/graphql/suites/auth/user-sessions/utils/sign-in-with-cookie-capture.util';
import {
  currentUserWorkspaceContextQueryFactory,
  signOutQueryFactory,
} from 'test/integration/graphql/suites/auth/user-sessions/utils/user-session-operations.util';
import { deleteUser } from 'test/integration/graphql/utils/delete-user.util';
import { getAuthTokensFromLoginTokenQueryFactory } from 'test/integration/graphql/utils/get-auth-tokens-from-login-token.query-factory.util';
import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';

const signInOperation = () => ({
  query: gql`
    mutation {
      signIn(email: "tim@apple.dev", password: "tim@apple.dev") {
        availableWorkspaces {
          availableWorkspacesForSignIn {
            id
            loginToken
            workspaceUrls {
              subdomainUrl
              customUrl
            }
          }
        }
      }
    }
  `,
  variables: {},
});

describe('shared-domain account entry (integration)', () => {
  beforeAll(() => {
    // Run explicitly in shared mode so this suite cannot silently test legacy routing.
    expect(process.env.IS_SHARED_DOMAIN_WORKSPACE_ENABLED).toBe('true');
  });

  it('signs in globally, then binds each selected workspace on the same origin', async () => {
    const configurationResponse = await fetch(
      `http://localhost:${APP_PORT}/client-config`,
    );
    expect(configurationResponse.ok).toBe(true);
    expect(await configurationResponse.json()).toMatchObject({
      isMultiWorkspaceEnabled: true,
      isSharedDomainWorkspaceEnabled: true,
    });
    const accountResponse = await postMetadataOperationWithHeaders(
      signInOperation(),
      { originHeader: ALLOWED_ORIGIN },
    );
    expect(accountResponse.body.errors).toBeUndefined();
    const accountCookie = extractSessionCookie(accountResponse);
    expect(accountCookie).toBeDefined();
    const accountContext = await postMetadataOperationWithHeaders(
      currentUserWorkspaceContextQueryFactory(),
      {
        originHeader: ALLOWED_ORIGIN,
        cookieHeader: accountCookie?.cookieHeader,
      },
    );
    expect(accountContext.body.errors).toBeUndefined();
    expect(accountContext.body.data.currentUser.currentWorkspace).toBeNull();

    const workspaces = accountResponse.body.data.signIn.availableWorkspaces
      .availableWorkspacesForSignIn as Array<{
      id: string;
      loginToken: string;
      workspaceUrls: { subdomainUrl: string; customUrl?: string };
    }>;
    let activeCookieHeader = accountCookie?.cookieHeader;
    for (const workspaceId of [
      SEED_APPLE_WORKSPACE_ID,
      SEED_YCOMBINATOR_WORKSPACE_ID,
    ]) {
      const workspace = workspaces.find(({ id }) => id === workspaceId);
      expect(workspace).toBeDefined();
      if (!workspace) throw new Error('Expected seeded membership');
      expect(new URL(workspace.workspaceUrls.subdomainUrl).origin).toBe(
        ALLOWED_ORIGIN,
      );
      const exchange = await postMetadataOperationWithHeaders(
        getAuthTokensFromLoginTokenQueryFactory({
          loginToken: workspace.loginToken,
          origin: ALLOWED_ORIGIN,
        }),
        {
          originHeader: ALLOWED_ORIGIN,
          cookieHeader: activeCookieHeader,
        },
      );
      expect(exchange.body.errors).toBeUndefined();
      const workspaceCookie = extractSessionCookie(exchange);
      expect(workspaceCookie).toBeDefined();
      activeCookieHeader = workspaceCookie?.cookieHeader;
      const context = await postMetadataOperationWithHeaders(
        currentUserWorkspaceContextQueryFactory(),
        {
          originHeader: ALLOWED_ORIGIN,
          cookieHeader: workspaceCookie?.cookieHeader,
        },
      );
      expect(context.body.errors).toBeUndefined();
      expect(context.body.data.currentUser.currentWorkspace.id).toBe(
        workspaceId,
      );

      const wrongWorkspace = await postMetadataOperationWithHeaders(
        currentUserWorkspaceContextQueryFactory(),
        {
          originHeader: ALLOWED_ORIGIN,
          cookieHeader: workspaceCookie?.cookieHeader,
          workspaceIdHeader:
            workspaceId === SEED_APPLE_WORKSPACE_ID
              ? SEED_YCOMBINATOR_WORKSPACE_ID
              : SEED_APPLE_WORKSPACE_ID,
        },
      );
      expect(wrongWorkspace.body.errors).toBeDefined();
    }
  });

  it('allows a different email to register after logout without joining the previous workspace or becoming an admin', async () => {
    const accountResponse = await postMetadataOperationWithHeaders(
      signInOperation(),
      { originHeader: ALLOWED_ORIGIN },
    );
    const accountCookie = extractSessionCookie(accountResponse);
    expect(accountCookie).toBeDefined();
    const logout = await postMetadataOperationWithHeaders(
      signOutQueryFactory(),
      {
        originHeader: ALLOWED_ORIGIN,
        cookieHeader: accountCookie?.cookieHeader,
      },
    );
    expect(logout.body.errors).toBeUndefined();

    const email = `shared-entry-${randomUUID()}@example.test`;
    const signup = await postMetadataOperationWithHeaders(
      {
        query: gql`
          mutation SignUp($email: String!, $password: String!) {
            signUp(email: $email, password: $password) {
              tokens {
                accessOrWorkspaceAgnosticToken {
                  token
                }
              }
            }
          }
        `,
        variables: { email, password: `Test-${randomUUID()}!` },
      },
      { originHeader: ALLOWED_ORIGIN },
    );
    expect(signup.body.errors).toBeUndefined();
    const token = signup.body.data?.signUp.tokens.accessOrWorkspaceAgnosticToken
      .token as string | undefined;
    if (!token) throw new Error('Expected native account token');
    try {
      const newCookie = extractSessionCookie(signup);
      expect(newCookie).toBeDefined();
      const context = await postMetadataOperationWithHeaders(
        currentUserWorkspaceContextQueryFactory(),
        { originHeader: ALLOWED_ORIGIN, cookieHeader: newCookie?.cookieHeader },
      );
      expect(context.body.errors).toBeUndefined();
      expect(context.body.data.currentUser.email).toBe(email);
      expect(context.body.data.currentUser.currentWorkspace).toBeNull();
      const user = await getCoreRepository<UserEntity>(
        UserEntity,
      ).findOneByOrFail({ email });
      expect(user.canAccessFullAdminPanel).toBe(false);
      expect(
        await getCoreRepository<UserWorkspaceEntity>(
          UserWorkspaceEntity,
        ).countBy({ userId: user.id }),
      ).toBe(0);
    } finally {
      const cleanup = await deleteUser({
        accessToken: token,
        expectToFail: false,
      });
      expect(cleanup.errors).toBeUndefined();
    }
  });

  it('still refuses an uninvited signup directly into an existing workspace', async () => {
    const response = await postMetadataOperationWithHeaders(
      {
        query: gql`
          mutation SignUpInWorkspace($email: String!, $workspaceId: UUID!) {
            signUpInWorkspace(
              email: $email
              password: "Test-password-123!"
              workspaceId: $workspaceId
            ) {
              workspace {
                id
              }
            }
          }
        `,
        variables: {
          email: `uninvited-${randomUUID()}@example.test`,
          workspaceId: SEED_APPLE_WORKSPACE_ID,
        },
      },
      { originHeader: ALLOWED_ORIGIN },
    );
    expect(response.body.data).toBeNull();
    expect(response.body.errors[0].message).toBe(
      'User does not have access to this workspace',
    );
  });
});
