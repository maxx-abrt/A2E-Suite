import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { ChatUnreadCountService } from 'src/modules/chat/services/chat-unread-count.service';
import { type ChatUnreadMessage } from 'src/modules/chat/utils/chat-unread-count.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const FOREIGN_WORKSPACE_ID = '3b8e6458-5fc1-4e63-8563-008ccddaa6db';
const USER_WORKSPACE_ID = '20202020-1e7c-43d9-a5db-685b5069d816';
const WORKSPACE_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const OTHER_MEMBER_ID = '20202020-0687-4c41-b707-ed1bfca972a7';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000001';
const SECOND_CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000002';
const AMBIENT_ROLE_ID = 'role-restricted-member';

type ReadCursorRow = {
  channelId: string;
  lastReadAt: string | null;
};

const buildUserWorkspaceContext = ({
  roleId,
}: {
  roleId: string | null | undefined;
}): ORMWorkspaceContext =>
  ({
    authContext: {
      type: 'user',
      workspace: { id: WORKSPACE_ID },
      userWorkspaceId: USER_WORKSPACE_ID,
      user: { id: USER_WORKSPACE_ID },
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      workspaceMember: { id: WORKSPACE_MEMBER_ID },
    },
    userWorkspaceRoleMap: roleId ? { [USER_WORKSPACE_ID]: roleId } : {},
    apiKeyRoleMap: {},
  }) as unknown as ORMWorkspaceContext;

const buildOrmManagerMock = ({
  readCursors,
  messages,
  roleId = AMBIENT_ROLE_ID,
}: {
  readCursors: ReadCursorRow[];
  messages: ChatUnreadMessage[];
  roleId?: string | null;
}): {
  ormManager: WorkspaceOrmManager;
  getRepository: jest.Mock;
  readCursorFind: jest.Mock;
  messageFind: jest.Mock;
} => {
  const readCursorFind = jest.fn().mockResolvedValue(readCursors);
  const messageFind = jest.fn().mockResolvedValue(messages);

  const getRepository = jest.fn((objectName: string) =>
    objectName === 'chatReadCursor'
      ? { find: readCursorFind }
      : { find: messageFind },
  );

  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) =>
      withWorkspaceContext(buildUserWorkspaceContext({ roleId }), fn),
    getRepository,
  } as unknown as WorkspaceOrmManager;

  return { ormManager, getRepository, readCursorFind, messageFind };
};

describe('ChatUnreadCountService.listUnreadCounts', () => {
  it('counts newer messages from other members and ignores own/deleted ones', async () => {
    const { ormManager } = buildOrmManagerMock({
      readCursors: [
        { channelId: CHANNEL_ID, lastReadAt: '2026-09-18T10:00:00.000Z' },
      ],
      messages: [
        {
          channelId: CHANNEL_ID,
          authorId: OTHER_MEMBER_ID,
          createdAt: '2026-09-18T10:00:01.000Z',
          deletedAt: null,
        },
        {
          channelId: CHANNEL_ID,
          authorId: OTHER_MEMBER_ID,
          createdAt: '2026-09-18T10:00:02.000Z',
          deletedAt: null,
        },
        {
          channelId: CHANNEL_ID,
          authorId: WORKSPACE_MEMBER_ID,
          createdAt: '2026-09-18T10:00:03.000Z',
          deletedAt: null,
        },
        {
          channelId: CHANNEL_ID,
          authorId: OTHER_MEMBER_ID,
          createdAt: '2026-09-18T10:00:04.000Z',
          deletedAt: '2026-09-18T10:00:05.000Z',
        },
        {
          channelId: CHANNEL_ID,
          authorId: OTHER_MEMBER_ID,
          createdAt: '2026-09-18T09:59:59.000Z',
          deletedAt: null,
        },
      ],
    });
    const service = new ChatUnreadCountService(ormManager);

    const counts = await service.listUnreadCounts({
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(counts).toEqual([{ channelId: CHANNEL_ID, unreadCount: 2 }]);
  });

  it('returns zero for a followed channel with a null read position', async () => {
    const { ormManager } = buildOrmManagerMock({
      readCursors: [
        { channelId: CHANNEL_ID, lastReadAt: null },
        { channelId: SECOND_CHANNEL_ID, lastReadAt: null },
      ],
      messages: [
        {
          channelId: CHANNEL_ID,
          authorId: OTHER_MEMBER_ID,
          createdAt: '2026-09-18T10:00:01.000Z',
          deletedAt: null,
        },
      ],
    });
    const service = new ChatUnreadCountService(ormManager);

    const counts = await service.listUnreadCounts({
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(counts).toEqual([
      { channelId: CHANNEL_ID, unreadCount: 1 },
      { channelId: SECOND_CHANNEL_ID, unreadCount: 0 },
    ]);
  });

  it('skips the message read entirely when the member follows no channel', async () => {
    const { ormManager, getRepository, messageFind } = buildOrmManagerMock({
      readCursors: [],
      messages: [],
    });
    const service = new ChatUnreadCountService(ormManager);

    const counts = await service.listUnreadCounts({
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(counts).toEqual([]);
    expect(getRepository).not.toHaveBeenCalledWith(
      'chatMessage',
      expect.anything(),
    );
    expect(messageFind).not.toHaveBeenCalled();
  });

  it('rejects a workspace that does not match the authenticated context', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      readCursors: [],
      messages: [],
    });
    const service = new ChatUnreadCountService(ormManager);

    await expect(
      service.listUnreadCounts({
        workspaceId: FOREIGN_WORKSPACE_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
      }),
    ).rejects.toThrow();

    expect(getRepository).not.toHaveBeenCalled();
  });

  it('runs under the caller role, never a permission bypass', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      readCursors: [],
      messages: [],
    });
    const service = new ChatUnreadCountService(ormManager);

    await service.listUnreadCounts({
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(getRepository).toHaveBeenCalledWith('chatReadCursor', {
      intersectionOf: [AMBIENT_ROLE_ID],
    });
    expect(getRepository).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ shouldBypassPermissionChecks: true }),
    );
  });

  it('fails closed with no role permission config when the caller has no role', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      readCursors: [],
      messages: [],
      roleId: null,
    });
    const service = new ChatUnreadCountService(ormManager);

    await service.listUnreadCounts({
      workspaceId: WORKSPACE_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
    });

    expect(getRepository).toHaveBeenCalledWith('chatReadCursor', undefined);
  });
});
