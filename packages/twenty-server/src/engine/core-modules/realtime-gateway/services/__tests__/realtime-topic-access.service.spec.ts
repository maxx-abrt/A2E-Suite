import {
  REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE,
  REALTIME_RECORD_ACCESS_DENIED_MESSAGE,
  RealtimeTopicAccessService,
} from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { type RealtimeAuthenticatedSocketContext } from 'src/engine/core-modules/realtime-gateway/types/realtime-topic-context.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-e6b5-4680-8a32-b8209737156b';
const WORKSPACE_MEMBER_ID = '40404040-1c25-4d02-bf25-6aeccf7ea419';
const USER_WORKSPACE_ID = '20202020-1e7c-43d9-a5db-685b506d816c';
const ROLE_ID = '50505050-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = '60606060-1c25-4d02-bf25-6aeccf7ea419';

const buildSocketContext = (
  overrides: Partial<RealtimeAuthenticatedSocketContext> = {},
): RealtimeAuthenticatedSocketContext => ({
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  workspaceMemberId: WORKSPACE_MEMBER_ID,
  userWorkspaceId: USER_WORKSPACE_ID,
  isWorkspaceAgnostic: false,
  ...overrides,
});

type RepositoryMock = { findOne: jest.Mock };

const createService = (
  overrides: {
    roleId?: string | undefined;
    memberById?: Record<string, unknown>;
    repositories?: Map<string, RepositoryMock>;
  } = {},
) => {
  const repositories =
    overrides.repositories ?? new Map<string, RepositoryMock>();
  const roleId = 'roleId' in overrides ? overrides.roleId : ROLE_ID;
  const userWorkspaceRoleMap: Record<string, string> = {};

  if (typeof roleId === 'string') {
    userWorkspaceRoleMap[USER_WORKSPACE_ID] = roleId;
  }

  const workspaceCacheService = {
    getOrRecompute: jest.fn().mockResolvedValue({
      userWorkspaceRoleMap,
      flatWorkspaceMemberMaps: {
        byId: overrides.memberById ?? {
          [WORKSPACE_MEMBER_ID]: { id: WORKSPACE_MEMBER_ID },
        },
        idByUserId: { [USER_ID]: WORKSPACE_MEMBER_ID },
      },
    }),
  };

  const getRepository = jest.fn((name: string) => repositories.get(name));
  const executeInWorkspaceContext = jest.fn(
    (fn: () => Promise<unknown>, _authContext: unknown) => fn(),
  );
  const workspaceOrmManager = {
    getRepository,
    executeInWorkspaceContext,
  };

  const service = new RealtimeTopicAccessService(
    workspaceCacheService as never,
    workspaceOrmManager as never,
  );

  return {
    service,
    repositories,
    getRepository,
    executeInWorkspaceContext,
  };
};

describe('RealtimeTopicAccessService', () => {
  describe('assertCanAccessObjectRecord', () => {
    it('accepts a record the caller may read, using the caller role for permissions', async () => {
      const repositories = new Map<string, RepositoryMock>([
        ['document', { findOne: jest.fn().mockResolvedValue({ id: 'rec-1' }) }],
      ]);
      const { service, getRepository, executeInWorkspaceContext } =
        createService({ repositories });

      await expect(
        service.assertCanAccessObjectRecord({
          socketContext: buildSocketContext(),
          objectNameSingular: 'document',
          recordId: 'rec-1',
        }),
      ).resolves.toBeUndefined();

      expect(executeInWorkspaceContext).toHaveBeenCalledTimes(1);
      expect(getRepository).toHaveBeenCalledWith('document', {
        intersectionOf: [ROLE_ID],
      });
    });

    it('denies a record the caller cannot read (permission layer yields no row)', async () => {
      const repositories = new Map<string, RepositoryMock>([
        ['document', { findOne: jest.fn().mockResolvedValue(null) }],
      ]);
      const { service } = createService({ repositories });

      await expect(
        service.assertCanAccessObjectRecord({
          socketContext: buildSocketContext(),
          objectNameSingular: 'document',
          recordId: 'secret',
        }),
      ).rejects.toThrow(REALTIME_RECORD_ACCESS_DENIED_MESSAGE);
    });

    it('fails closed when the object does not exist or the app is not installed', async () => {
      const repositories = new Map<string, RepositoryMock>([
        [
          'document',
          {
            findOne: jest.fn().mockRejectedValue(new Error('Object not found')),
          },
        ],
      ]);
      const { service } = createService({ repositories });

      await expect(
        service.assertCanAccessObjectRecord({
          socketContext: buildSocketContext(),
          objectNameSingular: 'document',
          recordId: 'rec-1',
        }),
      ).rejects.toThrow(REALTIME_RECORD_ACCESS_DENIED_MESSAGE);
    });

    it('denies without touching the database when the socket has no user workspace', async () => {
      const { service, executeInWorkspaceContext } = createService();

      await expect(
        service.assertCanAccessObjectRecord({
          socketContext: buildSocketContext({ userWorkspaceId: undefined }),
          objectNameSingular: 'document',
          recordId: 'rec-1',
        }),
      ).rejects.toThrow(REALTIME_RECORD_ACCESS_DENIED_MESSAGE);
      expect(executeInWorkspaceContext).not.toHaveBeenCalled();
    });

    it('denies when the caller has no role in the workspace', async () => {
      const repositories = new Map<string, RepositoryMock>([
        ['document', { findOne: jest.fn().mockResolvedValue({ id: 'rec-1' }) }],
      ]);
      const { service, executeInWorkspaceContext } = createService({
        repositories,
        roleId: undefined,
      });

      await expect(
        service.assertCanAccessObjectRecord({
          socketContext: buildSocketContext(),
          objectNameSingular: 'document',
          recordId: 'rec-1',
        }),
      ).rejects.toThrow(REALTIME_RECORD_ACCESS_DENIED_MESSAGE);
      expect(executeInWorkspaceContext).not.toHaveBeenCalled();
    });
  });

  describe('assertCanAccessChatChannel', () => {
    const setChannel = (
      repositories: Map<string, RepositoryMock>,
      channel: { id: string; visibility: string } | null,
    ) => {
      repositories.set('chatChannel', {
        findOne: jest.fn().mockResolvedValue(channel),
      });
    };

    it('accepts a public channel for any workspace member without a membership row', async () => {
      const repositories = new Map<string, RepositoryMock>();

      setChannel(repositories, { id: CHANNEL_ID, visibility: 'PUBLIC' });

      const membershipFindOne = jest.fn();

      repositories.set('chatChannelMember', { findOne: membershipFindOne });

      const { service } = createService({ repositories });

      await expect(
        service.assertCanAccessChatChannel({
          socketContext: buildSocketContext(),
          channelId: CHANNEL_ID,
        }),
      ).resolves.toBeUndefined();
      expect(membershipFindOne).not.toHaveBeenCalled();
    });

    it('accepts a private channel when the member has a membership row', async () => {
      const repositories = new Map<string, RepositoryMock>();

      setChannel(repositories, { id: CHANNEL_ID, visibility: 'PRIVATE' });

      const membershipFindOne = jest
        .fn()
        .mockResolvedValue({ id: 'membership-1' });

      repositories.set('chatChannelMember', { findOne: membershipFindOne });

      const { service } = createService({ repositories });

      await expect(
        service.assertCanAccessChatChannel({
          socketContext: buildSocketContext(),
          channelId: CHANNEL_ID,
        }),
      ).resolves.toBeUndefined();
      expect(membershipFindOne).toHaveBeenCalledWith({
        where: {
          membershipChannelId: CHANNEL_ID,
          membershipWorkspaceMemberId: WORKSPACE_MEMBER_ID,
        },
        select: { id: true },
      });
    });

    it('denies a private channel when the member has no membership row', async () => {
      const repositories = new Map<string, RepositoryMock>();

      setChannel(repositories, { id: CHANNEL_ID, visibility: 'PRIVATE' });
      repositories.set('chatChannelMember', {
        findOne: jest.fn().mockResolvedValue(null),
      });

      const { service } = createService({ repositories });

      await expect(
        service.assertCanAccessChatChannel({
          socketContext: buildSocketContext(),
          channelId: CHANNEL_ID,
        }),
      ).rejects.toThrow(REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE);
    });

    it('denies an unknown or unreadable channel', async () => {
      const repositories = new Map<string, RepositoryMock>();

      setChannel(repositories, null);

      const { service } = createService({ repositories });

      await expect(
        service.assertCanAccessChatChannel({
          socketContext: buildSocketContext(),
          channelId: CHANNEL_ID,
        }),
      ).rejects.toThrow(REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE);
    });

    it('denies without touching the database when the socket has no user workspace', async () => {
      const { service, executeInWorkspaceContext } = createService();

      await expect(
        service.assertCanAccessChatChannel({
          socketContext: buildSocketContext({ userWorkspaceId: undefined }),
          channelId: CHANNEL_ID,
        }),
      ).rejects.toThrow(REALTIME_CHANNEL_ACCESS_DENIED_MESSAGE);
      expect(executeInWorkspaceContext).not.toHaveBeenCalled();
    });
  });
});
