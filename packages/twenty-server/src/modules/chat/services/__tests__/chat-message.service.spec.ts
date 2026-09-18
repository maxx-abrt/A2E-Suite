import {
  type ORMWorkspaceContext,
  withWorkspaceContext,
} from 'src/engine/twenty-orm/storage/orm-workspace-context.storage';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import {
  ChatMessageService,
  MAX_CHAT_MESSAGE_PAGE_SIZE,
} from 'src/modules/chat/services/chat-message.service';
import { type ChatMessageRecord } from 'src/modules/chat/types/chat-message.type';
import { encodeChatMessageCursor } from 'src/modules/chat/utils/chat-message-cursor.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const FOREIGN_WORKSPACE_ID = '3b8e6458-5fc1-4e63-8563-008ccddaa6db';
const USER_WORKSPACE_ID = '20202020-1e7c-43d9-a5db-685b5069d816';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const AMBIENT_ROLE_ID = 'role-restricted-member';

const messageRecord = (id: string, createdAt: string): ChatMessageRecord => ({
  id,
  body: `body-${id}`,
  channelId: CHANNEL_ID,
  authorId: null,
  threadParentId: null,
  createdAt,
  editedAt: null,
  deletedAt: null,
});

// Mirrors what WorkspaceOrmManager.loadWorkspaceContext puts in the ambient
// AsyncLocalStorage: the user auth context plus the role maps the permission
// resolver reads. Only the fields touched below are populated.
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
      workspaceMemberId: '20202020-77d5-4cb6-b60a-f4a835a85d61',
      workspaceMember: { id: '20202020-77d5-4cb6-b60a-f4a835a85d61' },
    },
    userWorkspaceRoleMap: roleId ? { [USER_WORKSPACE_ID]: roleId } : {},
    apiKeyRoleMap: {},
  }) as unknown as ORMWorkspaceContext;

const buildOrmManagerMock = ({
  records,
  roleId = AMBIENT_ROLE_ID,
}: {
  records: ChatMessageRecord[];
  roleId?: string | null;
}): {
  ormManager: WorkspaceOrmManager;
  getRepository: jest.Mock;
  find: jest.Mock;
} => {
  const find = jest.fn().mockResolvedValue(records);
  const getRepository = jest.fn(() => ({ find }));

  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) =>
      withWorkspaceContext(buildUserWorkspaceContext({ roleId }), fn),
    getRepository,
  } as unknown as WorkspaceOrmManager;

  return { ormManager, getRepository, find };
};

describe('ChatMessageService.listChannelMessages', () => {
  it('returns a newest-first page with cursors', async () => {
    const { ormManager } = buildOrmManagerMock({
      records: [
        messageRecord('message-2', '2026-09-18T10:00:02.000Z'),
        messageRecord('message-1', '2026-09-18T10:00:01.000Z'),
      ],
    });
    const service = new ChatMessageService(ormManager);

    const page = await service.listChannelMessages({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      limit: 2,
    });

    expect(page.edges.map((edge) => edge.node.id)).toEqual([
      'message-2',
      'message-1',
    ]);
    expect(page.pageInfo.hasNextPage).toBe(false);
    expect(page.pageInfo.endCursor).toBe(
      encodeChatMessageCursor(
        messageRecord('message-1', '2026-09-18T10:00:01.000Z'),
      ),
    );
  });

  it('scopes the query to the channel only — never a workspaceId column', async () => {
    const { ormManager, find } = buildOrmManagerMock({ records: [] });
    const service = new ChatMessageService(ormManager);

    await service.listChannelMessages({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      limit: 2,
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { channelId: CHANNEL_ID },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: 3,
      }),
    );

    const [{ where }] = find.mock.calls[0] as [{ where: unknown }];

    expect(where).not.toHaveProperty('workspaceId');
  });

  it('builds a keyset where clause from the opaque cursor', async () => {
    const { ormManager, find } = buildOrmManagerMock({ records: [] });
    const service = new ChatMessageService(ormManager);

    const after = encodeChatMessageCursor(
      messageRecord('message-2', '2026-09-18T10:00:02.000Z'),
    );

    await service.listChannelMessages({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      limit: 2,
      after,
    });

    const [{ where }] = find.mock.calls[0] as [{ where: unknown }];

    expect(Array.isArray(where)).toBe(true);
    expect(where).toHaveLength(2);

    for (const clause of where as Record<string, unknown>[]) {
      expect(clause.channelId).toBe(CHANNEL_ID);
    }

    expect((where as Record<string, unknown>[])[1].id).toBeDefined();
  });

  it('rejects a workspace that does not match the authenticated context', async () => {
    const { ormManager, find } = buildOrmManagerMock({ records: [] });
    const service = new ChatMessageService(ormManager);

    await expect(
      service.listChannelMessages({
        workspaceId: FOREIGN_WORKSPACE_ID,
        channelId: CHANNEL_ID,
        limit: 2,
      }),
    ).rejects.toThrow();

    expect(find).not.toHaveBeenCalled();
  });

  it('runs under the caller role, never a permission bypass', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({ records: [] });
    const service = new ChatMessageService(ormManager);

    await service.listChannelMessages({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      limit: 2,
    });

    expect(getRepository).toHaveBeenCalledWith('chatMessage', {
      intersectionOf: [AMBIENT_ROLE_ID],
    });
    expect(getRepository).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ shouldBypassPermissionChecks: true }),
    );
  });

  it('fails closed with no role permission config when the caller has no role', async () => {
    const { ormManager, getRepository } = buildOrmManagerMock({
      records: [],
      roleId: null,
    });
    const service = new ChatMessageService(ormManager);

    await service.listChannelMessages({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      limit: 2,
    });

    expect(getRepository).toHaveBeenCalledWith('chatMessage', undefined);
  });

  it('clamps an oversized limit to the maximum page size', async () => {
    const { ormManager, find } = buildOrmManagerMock({ records: [] });
    const service = new ChatMessageService(ormManager);

    await service.listChannelMessages({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      limit: 10_000,
    });

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ take: MAX_CHAT_MESSAGE_PAGE_SIZE + 1 }),
    );
  });
});
