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

const createAccessService = () => ({
  assertCanAccessObjectRecord: jest.fn().mockResolvedValue(undefined),
  assertCanAccessChatChannel: jest.fn().mockResolvedValue(undefined),
});

const createService = (
  overrides: {
    userSessionService?: Record<string, unknown>;
    workspaceCacheService?: Record<string, unknown>;
    accessService?: Record<string, unknown>;
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
  const accessService = {
    ...createAccessService(),
    ...overrides.accessService,
  };

  return {
    service: new RealtimeTopicAuthorizationService(
      {} as never,
      (overrides.userSessionService ?? {}) as never,
      workspaceCacheService as never,
      accessService as never,
    ),
    workspaceCacheService,
    accessService,
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
        createAccessService() as never,
      );

      const context = await service.authenticate('token');

      expect(context).toEqual({
        userId: USER_ID,
        workspaceId: WORKSPACE_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        userWorkspaceId: '20202020-1e7c-43d9-a5db-685b506d816',
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
        createAccessService() as never,
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
        createAccessService() as never,
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
        createAccessService() as never,
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
        createAccessService() as never,
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
        createAccessService() as never,
      );

      await expect(service.authenticate('bad')).rejects.toThrow(
        'Token invalid.',
      );
    });
  });

  describe('assertTopicAuthorized', () => {
    it('accepts a workspace topic of the authenticated workspace', async () => {
      const { service } = createService();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}`,
        ),
      ).resolves.toBeUndefined();
    });

    it('accepts a presence topic of the authenticated workspace', async () => {
      const { service, accessService } = createService();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:presence`,
        ),
      ).resolves.toBeUndefined();
      expect(accessService.assertCanAccessObjectRecord).not.toHaveBeenCalled();
      expect(accessService.assertCanAccessChatChannel).not.toHaveBeenCalled();
    });

    it('rejects a topic of another workspace', async () => {
      const { service } = createService();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${OTHER_WORKSPACE_ID}`,
        ),
      ).rejects.toThrow('Topic workspace does not match the authenticated one');
    });

    it('rejects invalid topic shapes', async () => {
      const { service } = createService();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          'workspace:not-a-uuid',
        ),
      ).rejects.toThrow();
      await expect(
        service.assertTopicAuthorized(buildSocketContext(), 'other:thing'),
      ).rejects.toThrow();
      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:object`,
        ),
      ).rejects.toThrow();
    });

    it('rejects another user inbox topic but allows the own one', async () => {
      const { service } = createService();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:inbox:${USER_ID}`,
        ),
      ).resolves.toBeUndefined();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:inbox:someone-else`,
        ),
      ).rejects.toThrow('Inbox topics are scoped to the owning user');
    });

    it('rejects everything for workspace-agnostic sockets', async () => {
      const { service } = createService();

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext({ isWorkspaceAgnostic: true }),
          `workspace:${WORKSPACE_ID}`,
        ),
      ).rejects.toThrow('Workspace-agnostic tokens cannot subscribe to topics');
    });

    it('delegates an object topic to the record ACL check for the named record', async () => {
      const { service, accessService } = createService();

      await service.assertTopicAuthorized(
        buildSocketContext(),
        `workspace:${WORKSPACE_ID}:object:document:record-1`,
      );

      expect(accessService.assertCanAccessObjectRecord).toHaveBeenCalledWith({
        socketContext: expect.objectContaining({ workspaceId: WORKSPACE_ID }),
        objectNameSingular: 'document',
        recordId: 'record-1',
      });
    });

    it('propagates a record ACL denial', async () => {
      const { service } = createService({
        accessService: {
          assertCanAccessObjectRecord: jest
            .fn()
            .mockRejectedValue(
              new Error('You do not have access to this record'),
            ),
        },
      });

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:object:document:record-1`,
        ),
      ).rejects.toThrow('You do not have access to this record');
    });

    it('delegates a chat topic to the channel ACL check', async () => {
      const { service, accessService } = createService();

      await service.assertTopicAuthorized(
        buildSocketContext(),
        `workspace:${WORKSPACE_ID}:chat:channel-1`,
      );

      expect(accessService.assertCanAccessChatChannel).toHaveBeenCalledWith({
        socketContext: expect.objectContaining({ workspaceId: WORKSPACE_ID }),
        channelId: 'channel-1',
      });
    });

    it('propagates a channel ACL denial', async () => {
      const { service } = createService({
        accessService: {
          assertCanAccessChatChannel: jest
            .fn()
            .mockRejectedValue(
              new Error('You do not have access to this channel'),
            ),
        },
      });

      await expect(
        service.assertTopicAuthorized(
          buildSocketContext(),
          `workspace:${WORKSPACE_ID}:chat:channel-1`,
        ),
      ).rejects.toThrow('You do not have access to this channel');
    });
  });

  describe('assertStillAMember', () => {
    it('resolves while the workspace membership is unchanged', async () => {
      const { service } = createService();

      await expect(
        service.assertStillAMember(buildSocketContext()),
      ).resolves.toBeUndefined();
    });

    it('rejects a member removed after subscribing', async () => {
      const { service } = createService({
        workspaceCacheService: {
          getOrRecompute: jest.fn().mockResolvedValue({
            flatWorkspaceMemberMaps: { byId: {}, idByUserId: {} },
          }),
        },
      });

      await expect(
        service.assertStillAMember(buildSocketContext()),
      ).rejects.toThrow('User is not a member of the workspace');
    });

    it('rejects when the member id changed since subscribe (rejoin)', async () => {
      const { service } = createService({
        workspaceCacheService: {
          getOrRecompute: jest.fn().mockResolvedValue({
            flatWorkspaceMemberMaps: {
              byId: {},
              idByUserId: { [USER_ID]: '99999999-1c25-4d02-bf25-6aeccf7ea419' },
            },
          }),
        },
      });

      await expect(
        service.assertStillAMember(buildSocketContext()),
      ).rejects.toThrow('Workspace membership changed; resubscribe required');
    });
  });
});
