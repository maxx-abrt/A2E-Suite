import { getCoreRepository } from 'test/integration/utils/get-core-repository.util';
import { WORKSPACE_REQUEST_HEADER } from 'twenty-shared/constants';
import { makeRestAPIRequest } from 'test/integration/rest/utils/make-rest-api-request.util';

import {
  extractSessionCookie,
  hasClearingCookie,
  postMetadataOperationWithHeaders,
  signInWithCookieCapture,
} from 'test/integration/graphql/suites/auth/user-sessions/utils/sign-in-with-cookie-capture.util';
import { currentUserWorkspaceContextQueryFactory } from 'test/integration/graphql/suites/auth/user-sessions/utils/user-session-operations.util';

import { ALLOWED_ORIGIN } from 'test/integration/graphql/suites/auth/user-sessions/constants/session-origins.constants';

import {
  SEED_APPLE_WORKSPACE_ID,
  SEED_YCOMBINATOR_WORKSPACE_ID,
} from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { USER_WORKSPACE_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/core/utils/seed-user-workspaces.util';
import { UserSessionEntity } from 'src/engine/core-modules/user-session/user-session.entity';
import { hashUserSessionToken } from 'src/engine/core-modules/user-session/utils/hash-user-session-token.util';

// Tim is seeded in both the apple and yc workspaces, which is what makes this
// provable: same user, same credentials, two sessions, and each cookie can
// only ever reach the workspace its exchange selected. No request-side input
// (header, variable, origin) lets a session pivot to another workspace; the
// context is rebuilt from the session row alone.
describe('successful session workspace binding (integration)', () => {
  let appleSessionToken: string;
  let ycSessionToken: string;
  let appleSessionCookieHeader: string;
  let ycSessionCookieHeader: string;

  const fetchWorkspaceContext = async (sessionCookieHeader: string) => {
    const response = await postMetadataOperationWithHeaders(
      currentUserWorkspaceContextQueryFactory(),
      {
        originHeader: ALLOWED_ORIGIN,
        cookieHeader: sessionCookieHeader,
      },
    );

    expect(response.body.errors).toBeUndefined();

    return response.body.data.currentUser;
  };

  beforeAll(async () => {
    const appleResponse = await signInWithCookieCapture({
      originHeader: ALLOWED_ORIGIN,
    });
    const ycResponse = await signInWithCookieCapture({
      workspaceSubdomain: 'yc',
      originHeader: ALLOWED_ORIGIN,
    });

    const appleCookie = extractSessionCookie(appleResponse);
    const ycCookie = extractSessionCookie(ycResponse);

    if (!appleCookie || !ycCookie) {
      throw new Error('Expected session cookies from both workspace sign-ins');
    }

    appleSessionToken = appleCookie.sessionToken;
    ycSessionToken = ycCookie.sessionToken;
    appleSessionCookieHeader = appleCookie.cookieHeader;
    ycSessionCookieHeader = ycCookie.cookieHeader;
  });

  it('should persist each session bound to the workspace its exchange selected', async () => {
    const userSessionRepository =
      getCoreRepository<UserSessionEntity>(UserSessionEntity);

    const appleSession = await userSessionRepository.findOneBy({
      tokenHash: hashUserSessionToken(appleSessionToken),
    });
    const ycSession = await userSessionRepository.findOneBy({
      tokenHash: hashUserSessionToken(ycSessionToken),
    });

    expect(appleSession?.workspaceId).toBe(SEED_APPLE_WORKSPACE_ID);
    expect(appleSession?.userWorkspaceId).toBe(
      USER_WORKSPACE_DATA_SEED_IDS.TIM,
    );
    expect(ycSession?.workspaceId).toBe(SEED_YCOMBINATOR_WORKSPACE_ID);
    expect(ycSession?.userWorkspaceId).toBe(
      USER_WORKSPACE_DATA_SEED_IDS.TIM_ACME,
    );
  });

  it('should resolve the auth context of each cookie to its own workspace, with no cross-workspace pivot', async () => {
    const appleContext = await fetchWorkspaceContext(appleSessionCookieHeader);
    const ycContext = await fetchWorkspaceContext(ycSessionCookieHeader);

    expect(appleContext.email).toBe('tim@apple.dev');
    expect(appleContext.currentWorkspace.id).toBe(SEED_APPLE_WORKSPACE_ID);
    expect(appleContext.currentUserWorkspace.id).toBe(
      USER_WORKSPACE_DATA_SEED_IDS.TIM,
    );

    expect(ycContext.email).toBe('tim@apple.dev');
    expect(ycContext.currentWorkspace.id).toBe(SEED_YCOMBINATOR_WORKSPACE_ID);
    expect(ycContext.currentUserWorkspace.id).toBe(
      USER_WORKSPACE_DATA_SEED_IDS.TIM_ACME,
    );
  });

  it('accepts a workspace assertion matching the authenticated session', async () => {
    const response = await postMetadataOperationWithHeaders(
      currentUserWorkspaceContextQueryFactory(),
      {
        originHeader: ALLOWED_ORIGIN,
        cookieHeader: appleSessionCookieHeader,
        workspaceIdHeader: SEED_APPLE_WORKSPACE_ID,
      },
    );

    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.currentUser.currentWorkspace.id).toBe(
      SEED_APPLE_WORKSPACE_ID,
    );
  });

  it('rejects an old tab after another workspace cookie is presented without clearing that cookie', async () => {
    const response = await postMetadataOperationWithHeaders(
      currentUserWorkspaceContextQueryFactory(),
      {
        originHeader: ALLOWED_ORIGIN,
        cookieHeader: ycSessionCookieHeader,
        workspaceIdHeader: SEED_APPLE_WORKSPACE_ID,
      },
    );

    expect(response.body.data).toBeUndefined();
    expect(response.body.errors).toEqual([
      expect.objectContaining({
        extensions: expect.objectContaining({
          code: 'FORBIDDEN',
          subCode: 'WORKSPACE_CONTEXT_MISMATCH',
        }),
      }),
    ]);
    expect(hasClearingCookie(response)).toBe(false);

    const context = await fetchWorkspaceContext(ycSessionCookieHeader);

    expect(context.currentWorkspace.id).toBe(SEED_YCOMBINATOR_WORKSPACE_ID);
  });

  it('rejects REST API key requests that assert another workspace', async () => {
    const response = await makeRestAPIRequest({
      method: 'get',
      path: '/companies?limit=1',
    })
      .set(WORKSPACE_REQUEST_HEADER, SEED_YCOMBINATOR_WORKSPACE_ID)
      .expect(403);

    expect(response.body.error).toBe('WORKSPACE_CONTEXT_MISMATCH');
  });
});
