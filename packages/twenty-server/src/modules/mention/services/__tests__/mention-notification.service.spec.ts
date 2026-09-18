import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { MentionAccessService } from 'src/modules/mention/services/mention-access.service';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';
import { type MentionTarget } from 'src/modules/mention/types/mention.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';
const DOCUMENT_ID = 'c31a0100-0000-4000-8000-000000000000';
const THREAD_ID = 'thread-1';
const AUTHOR_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const BOB_MEMBER_ID = '20202020-99f5-4cb6-b60a-f4a835a85d63';
const ALICE_USER_ID = 'user-alice';
const BOB_USER_ID = 'user-bob';

const buildService = ({
  memberRows = [{ id: ALICE_MEMBER_ID, userId: ALICE_USER_ID }],
  canMentionTargetReadSource = jest.fn().mockResolvedValue(true),
}: {
  memberRows?: Array<{ id: string; userId: string }>;
  canMentionTargetReadSource?: jest.Mock;
} = {}) => {
  const requestNotifications = jest.fn();
  const find = jest.fn().mockResolvedValue(memberRows);
  const getRepository = jest.fn(() => ({ find }));
  const ormManager = {
    executeInWorkspaceContext: (fn: () => Promise<unknown>) => fn(),
    getRepository,
  } as unknown as WorkspaceOrmManager;
  const notificationService = {
    requestNotifications,
  } as unknown as NotificationService;
  const mentionAccessService = {
    canMentionTargetReadSource,
  } as unknown as MentionAccessService;

  const service = new MentionNotificationService(
    notificationService,
    ormManager,
    mentionAccessService,
  );

  return { service, requestNotifications, canMentionTargetReadSource, find };
};

describe('MentionNotificationService', () => {
  it('emits one MENTION request per permitted chat target with kind and snippet', async () => {
    const { service, requestNotifications } = buildService();

    await service.notifyMentions({
      workspaceId: WORKSPACE_ID,
      source: { surface: 'chat', channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      body: `Salut @[Alice](${ALICE_MEMBER_ID})`,
      authorId: AUTHOR_MEMBER_ID,
      createdAt: new Date('2026-09-18T19:32:52.000Z'),
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
            snippet: 'Salut @Alice',
          },
          createdAt: new Date('2026-09-18T19:32:52.000Z'),
        },
      ],
    });
  });

  it('suppresses a target that cannot read the mention target (private channel / unreadable doc)', async () => {
    const canMentionTargetReadSource = jest.fn(
      (input: { target: MentionTarget }) =>
        Promise.resolve(input.target.userId === ALICE_USER_ID),
    );
    const { service, requestNotifications } = buildService({
      memberRows: [
        { id: ALICE_MEMBER_ID, userId: ALICE_USER_ID },
        { id: BOB_MEMBER_ID, userId: BOB_USER_ID },
      ],
      canMentionTargetReadSource,
    });

    await service.notifyMentions({
      workspaceId: WORKSPACE_ID,
      source: { surface: 'chat', channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      body: `Salut @[Alice](${ALICE_MEMBER_ID}) et @[Bob](${BOB_MEMBER_ID})`,
      authorId: AUTHOR_MEMBER_ID,
    });

    expect(requestNotifications).toHaveBeenCalledTimes(1);

    const [call] = requestNotifications.mock.calls;

    expect(call[0].requests).toHaveLength(1);
    expect(call[0].requests[0].userId).toBe(ALICE_USER_ID);
  });

  it('emits nothing when every target is suppressed', async () => {
    const canMentionTargetReadSource = jest.fn().mockResolvedValue(false);
    const { service, requestNotifications } = buildService({
      canMentionTargetReadSource,
    });

    await service.notifyMentions({
      workspaceId: WORKSPACE_ID,
      source: { surface: 'chat', channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      body: `Salut @[Alice](${ALICE_MEMBER_ID})`,
      authorId: AUTHOR_MEMBER_ID,
    });

    expect(requestNotifications).not.toHaveBeenCalled();
  });

  it('does not re-notify a mention already present in the previous revision', async () => {
    const { service, requestNotifications, find } = buildService();

    await service.notifyMentions({
      workspaceId: WORKSPACE_ID,
      source: { surface: 'document', documentId: DOCUMENT_ID },
      body: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              props: {
                objectNameSingular: 'workspaceMember',
                recordId: ALICE_MEMBER_ID,
                label: 'Alice',
              },
            },
          ],
        },
      ],
      authorId: null,
      excludeWorkspaceMemberIds: [ALICE_MEMBER_ID],
    });

    expect(find).not.toHaveBeenCalled();
    expect(requestNotifications).not.toHaveBeenCalled();
  });

  it('deep-links document and comment mentions through the record convention', async () => {
    const { service, requestNotifications } = buildService();

    await service.notifyMentions({
      workspaceId: WORKSPACE_ID,
      source: {
        surface: 'comment',
        documentId: DOCUMENT_ID,
        threadId: THREAD_ID,
      },
      body: [
        {
          id: 'comment-1',
          userId: BOB_MEMBER_ID,
          body: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Cc ' },
                {
                  type: 'mention',
                  props: {
                    objectNameSingular: 'workspaceMember',
                    recordId: ALICE_MEMBER_ID,
                    label: 'Alice',
                  },
                },
              ],
            },
          ],
        },
      ],
      authorId: BOB_MEMBER_ID,
    });

    expect(requestNotifications).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      requests: [
        {
          userId: ALICE_USER_ID,
          type: 'MENTION',
          payload: {
            kind: 'comment.mention',
            objectNameSingular: 'document',
            recordId: DOCUMENT_ID,
            documentId: DOCUMENT_ID,
            threadId: THREAD_ID,
            authorId: BOB_MEMBER_ID,
            mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID],
            snippet: 'Cc @Alice',
          },
        },
      ],
    });
  });

  it('drops a mention whose member no longer resolves to a user', async () => {
    const { service, requestNotifications } = buildService({ memberRows: [] });

    const notifiedTargets = await service.notifyMentions({
      workspaceId: WORKSPACE_ID,
      source: { surface: 'chat', channelId: CHANNEL_ID, messageId: MESSAGE_ID },
      body: `Salut @[Alice](${ALICE_MEMBER_ID})`,
      authorId: AUTHOR_MEMBER_ID,
    });

    expect(notifiedTargets).toEqual([]);
    expect(requestNotifications).not.toHaveBeenCalled();
  });
});
