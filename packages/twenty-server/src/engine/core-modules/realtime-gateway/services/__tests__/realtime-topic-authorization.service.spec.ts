import { JwtTokenTypeEnum } from 'src/engine/core-modules/auth/types/jwt-token-type.enum';
import { RealtimeTopicAuthorizationService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-authorization.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const OTHER_WORKSPACE_ID = '30303030-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';
const WORKSPACE_MEMBER_ID = '40404040-1c25-4d02-bf25-6aeccf7ea419';

const buildAccessToken = (overrides: Record<string, unknown> = {}) => ({
  sub: USER_ID,
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  userWorkspaceId: '20202020-1e7c-43d9-a5db-685b506d816',
  type: JwtTokenTypeEnum.ACCESS,
  authProvider: 'password',
  ...overrides,
});

const buildSocketContext = (
  overrides: Partial<
    Parameters<RealtimeTopicAuthorizationService['assertTopicAuthorized']>[0]
  > = {},
) => ({
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  workspaceMemberId: WORKSPACE_MEMBER_ID,
  isWorkspaceAgnostic: false,
  ...overrides,
});

const createService = (
  overrides: {
    userSessionService?: Record<string, unknown>;
    workspaceCacheService?: Record<string, unknown>;
  } = {},
) => {
  const workspaceCacheService = {
    getOrRecompute: jest.fn().mockResolvedValue({
      flatWorkspaceMemberMaps: {
        byId: { [WORKSPACE_MEMBER_ID]: { id: WORKSPACE_MEMBER_ID } },
        idByUserId: { [USER_ID]: WORKSPACE_MEMBER_ID },
      },
    }),
    ...overrides.workspaceCacheService,
  };

  return {
    service: new RealtimeTopicAuthorizationService(
      {} as never,
      (overrides.userSessionService ?? {}) as never,
      workspaceCacheService as never,
    ),
    workspaceCacheService,
  };
};

describe('RealtimeTopicAuthorizationService', () => {
  describe('authenticate', () => {
    it('throws when no token is provided', async () => {
      const { service } = createService();

      await expect(service.authenticate(undefined)).rejects.toThrow(
        'Missing realtime auth token',
      );
    });

    it('resolves an access token to its workspace context with the member id', async () => {
      const payload = buildAccessToken();
      const jwtWrapperService = {
        verifyJwtToken: jest.fn().mockResolvedValue(payload),
      };

      const service = new RealtimeTopicAuthorizationService(
        jwtWrapperService as never,
        {} as never,
        {
          getOrRecompute: jest.fn().mockResolvedValue({
            flatWorkspaceMemberMaps: {
              byId: { [WORKSPACE_MEMBER_ID]: { id: WORKSPACE_MEMBER_ID } },
              idByUserId: { [USER_ID]: WORKSPACE_MEMBER_ID },
            },
          }),
        } as never,
      );

      const context = await service.authenticate('token');

      expect(context).toEqual({
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        isWorkspaceAgnostic: false,
      });
    });

    it('resolves a session token through the user session service', async () => {
      const payload = buildAccessToken();
      const userSessionService = {
        resolveSession: jest.fn().mockResolvedValue({ payload }),
      };

      const service = new RealtimeTopicAuthorizationService(
        {} as never,
        userSessionService as never,
        {
          getOrRecompute: jest.fn().mockResolvedValue({
            flatWorkspaceMemberMaps: {
              byId: { [WORKSPACE_MEMBER_ID]: { id: WORKSPACE_MEMBER_ID } },
              idByUserId: { [USER_ID]: WORKSPACE_MEMBER_ID },
            },
          }),
        } as never,
      );

      const context = await service.authenticate('sess_session-token');

      expect(userSessionService.resolveSession).toHaveBeenCalledWith(
        'sess_session-token',
      );
      expect(context.workspaceMemberId).toBe(WORKSPACE_MEMBER_ID);
    });

    it('rejects a revoked or unknown workspace member (revalidated per subscribe)', async () => {
      const payload = buildAccessToken();

      const service = new RealtimeTopicAuthorizationService(
        {
          verifyJwtToken: jest.fn().mockResolvedValue(payload),
        } as never,
        {} as never,
        {
          getOrRecompute: jest.fn().mockResolvedValue({
            flatWorkspaceMemberMaps: {
              byId: {},
              idByUserId: {},
            },
          }),
        } as never,
      );

      await expect(service.authenticate('token')).rejects.toThrow(
        'User is not a member of the workspace',
      );
    });

    it('rejects refresh/other non-access JWT token types', async () => {
      const service = new RealtimeTopicAuthorizationService(
        {
          verifyJwtToken: jest.fn().mockResolvedValue({
            ...buildAccessToken(),
            type: JwtTokenTypeEnum.REFRESH,
          }),
        } as never,
        {} as never,
        {} as never,
      );

      await expect(service.authenticate('token')).rejects.toThrow(
        'Only access tokens or session tokens can subscribe to topics',
      );
    });

    it('rejects workspace-agnostic tokens', async () => {
      const service = new RealtimeTopicAuthorizationService(
        {
          verifyJwtToken: jest.fn().mockResolvedValue({
            sub: USER_ID,
            userId: USER_ID,
            type: JwtTokenTypeEnum.WORKSPACE_AGNOSTIC,
            authProvider: 'password',
          }),
        } as never,
        {} as never,
        {} as never,
      );

      await expect(service.authenticate('token')).rejects.toThrow(
        'Workspace-agnostic tokens cannot subscribe to topics',
      );
    });

    it('propagates verification failures', async () => {
      const service = new RealtimeTopicAuthorizationService(
        {
          verifyJwtToken: jest
            .fn()
            .mockRejectedValue(new Error('Token invalid.')),
        } as never,
        {} as never,
        {} as never,
      );

      await expect(service.authenticate('bad')).rejects.toThrow(
        'Token invalid.',
      );
    });
  });

  describe('assertTopicAuthorized', () => {
    it('accepts a workspace topic of the authenticated workspace', () => {
      const { service } = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}`,
        ),
      ).not.toThrow();
    });

    it('rejects a topic of another workspace', () => {
      const { service } = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${OTHER_WORKSPACE_ID}`,
        ),
      ).toThrow('Topic workspace does not match the authenticated one');
    });

    it('rejects invalid topic shapes', () => {
      const { service } = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          'workspace:not-a-uuid',
        ),
      ).toThrow();
      expect(() =>
        service.assertTopicAuthorized(buildSocketContext(), 'other:thing'),
      ).toThrow();
      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:object`,
        ),
      ).toThrow();
    });

    it('rejects another user inbox topic but allows the own one', () => {
      const { service } = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:inbox:${USER_ID}`,
        ),
      ).not.toThrow();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:inbox:someone-else`,
        ),
      ).toThrow('Inbox topics are scoped to the owning user');
    });

    it('rejects everything for workspace-agnostic sockets', () => {
      const { service } = createService();

      expect(() =>
        service.assertTopicAuthorized(
          buildSocketContext({ isWorkspaceAgnostic: true }),
          `workspace:${WORKSPACE_ID}`,
        ),
      ).toThrow('Workspace-agnostic tokens cannot subscribe to topics');
    });
  });
});
