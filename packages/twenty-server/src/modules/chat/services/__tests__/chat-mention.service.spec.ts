import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { ChatMentionService } from 'src/modules/chat/services/chat-mention.service';
import { type ChatMessageRecord } from 'src/modules/chat/services/chat-realtime-publisher.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';
const AUTHOR_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const ALICE_USER_ID = 'user-alice';

const buildMessage = (body: string | null): ChatMessageRecord => ({
  id: MESSAGE_ID,
  channelId: CHANNEL_ID,
  authorId: AUTHOR_MEMBER_ID,
  body,
  threadParentId: null,
  createdAt: '2026-09-18T19:32:52.000Z',
  editedAt: null,
  deletedAt: null,
});

const buildService = ({
  memberRows = [],
  find = jest.fn().mockResolvedValue(memberRows),
}: {
  memberRows?: Array<{ id: string; userId: string }>;
  find?: jest.Mock;
} = {}) => {
  const requestNotifications = jest.fn();
  const getRepository = jest.fn(() => ({ find }));
  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) => fn(),
    getRepository,
  } as unknown as WorkspaceOrmManager;
  const notificationService = {
    requestNotifications,
  } as unknown as NotificationService;
  const service = new ChatMentionService(notificationService, ormManager);

  return { service, requestNotifications, getRepository, find };
};

describe('ChatMentionService', () => {
  it('emits a MENTION request carrying channel, message and mentioned users', async () => {
    const { service, requestNotifications, getRepository, find } = buildService(
      {
        memberRows: [{ id: ALICE_MEMBER_ID, userId: ALICE_USER_ID }],
      },
    );

    await service.notifyMessageMentions({
      workspaceId: WORKSPACE_ID,
      message: buildMessage(`Salut @[Alice](${ALICE_MEMBER_ID})`),
    });

    expect(getRepository).toHaveBeenCalledWith('workspaceMember', {
      shouldBypassPermissionChecks: true,
    });
    expect(find).toHaveBeenCalledWith({
      where: { id: expect.anything() },
      select: { id: true, userId: true },
    });
    expect(requestNotifications).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      requests: [
        {
          userId: ALICE_USER_ID,
          type: 'MENTION',
          payload: {
            kind: 'chat.mention',
            channelId: CHANNEL_ID,
            messageId: MESSAGE_ID,
            authorId: AUTHOR_MEMBER_ID,
            mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID],
          },
          createdAt: new Date('2026-09-18T19:32:52.000Z'),
        },
      ],
    });
  });

  it('does nothing when the message mentions nobody', async () => {
    const { service, requestNotifications, getRepository } = buildService();

    await service.notifyMessageMentions({
      workspaceId: WORKSPACE_ID,
      message: buildMessage('salut @tous'),
    });

    expect(getRepository).not.toHaveBeenCalled();
    expect(requestNotifications).not.toHaveBeenCalled();
  });

  it('drops a mention whose member no longer resolves to a user', async () => {
    const { service, requestNotifications } = buildService({ memberRows: [] });

    await service.notifyMessageMentions({
      workspaceId: WORKSPACE_ID,
      message: buildMessage(`Salut @[Alice](${ALICE_MEMBER_ID})`),
    });

    expect(requestNotifications).not.toHaveBeenCalled();
  });
});
