import { ChatMentionService } from 'src/modules/chat/services/chat-mention.service';
import { type ChatMessageRecord } from 'src/modules/chat/services/chat-realtime-publisher.service';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';
const AUTHOR_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';

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

const buildService = () => {
  const notifyMentions = jest.fn().mockResolvedValue([]);
  const mentionNotificationService = {
    notifyMentions,
  } as unknown as MentionNotificationService;
  const service = new ChatMentionService(mentionNotificationService);

  return { service, notifyMentions };
};

describe('ChatMentionService', () => {
  it('maps a saved message onto the shared mentions engine chat source', async () => {
    const { service, notifyMentions } = buildService();

    await service.notifyMessageMentions({
      workspaceId: WORKSPACE_ID,
      message: buildMessage(`Salut @[Alice](${AUTHOR_MEMBER_ID})`),
    });

    expect(notifyMentions).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      source: {
        surface: 'chat',
        channelId: CHANNEL_ID,
        messageId: MESSAGE_ID,
      },
      body: `Salut @[Alice](${AUTHOR_MEMBER_ID})`,
      authorId: AUTHOR_MEMBER_ID,
      createdAt: new Date('2026-09-18T19:32:52.000Z'),
    });
  });

  it('forwards a null body unchanged so the parser decides there is nothing to do', async () => {
    const { service, notifyMentions } = buildService();

    await service.notifyMessageMentions({
      workspaceId: WORKSPACE_ID,
      message: buildMessage(null),
    });

    expect(notifyMentions).toHaveBeenCalledWith(
      expect.objectContaining({ body: null }),
    );
  });
});
