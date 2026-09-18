import {
  buildChatMentionNotificationRequests,
  extractMentionedWorkspaceMemberIds,
} from 'src/modules/chat/utils/chat-mention.util';

const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';
const AUTHOR_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const BOB_MEMBER_ID = '20202020-99f5-4cb6-b60a-f4a835a85d63';
const ALICE_USER_ID = 'user-alice';
const BOB_USER_ID = 'user-bob';

describe('chat mention extraction', () => {
  it('extracts unique mentioned workspace member ids in first-seen order', () => {
    expect(
      extractMentionedWorkspaceMemberIds(
        `Bonjour @[Alice](${ALICE_MEMBER_ID}) et @[Bob](${BOB_MEMBER_ID}), encore @[Alice](${ALICE_MEMBER_ID})`,
      ),
    ).toEqual([ALICE_MEMBER_ID, BOB_MEMBER_ID]);
  });

  it('ignores plain @words that are not mention links', () => {
    expect(extractMentionedWorkspaceMemberIds('salut @tous')).toEqual([]);
  });

  it('handles a null body', () => {
    expect(extractMentionedWorkspaceMemberIds(null)).toEqual([]);
  });
});

describe('chat mention notification requests', () => {
  it('emits one MENTION request per resolved user carrying channel, message and mentioned users', () => {
    const requests = buildChatMentionNotificationRequests({
      channelId: CHANNEL_ID,
      messageId: MESSAGE_ID,
      authorId: AUTHOR_MEMBER_ID,
      mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID, BOB_MEMBER_ID],
      targets: [
        { workspaceMemberId: ALICE_MEMBER_ID, userId: ALICE_USER_ID },
        { workspaceMemberId: BOB_MEMBER_ID, userId: BOB_USER_ID },
      ],
      createdAt: new Date('2026-09-18T19:32:52.000Z'),
    });

    expect(requests).toEqual([
      {
        userId: ALICE_USER_ID,
        type: 'MENTION',
        payload: {
          kind: 'chat.mention',
          channelId: CHANNEL_ID,
          messageId: MESSAGE_ID,
          authorId: AUTHOR_MEMBER_ID,
          mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID, BOB_MEMBER_ID],
        },
        createdAt: new Date('2026-09-18T19:32:52.000Z'),
      },
      {
        userId: BOB_USER_ID,
        type: 'MENTION',
        payload: {
          kind: 'chat.mention',
          channelId: CHANNEL_ID,
          messageId: MESSAGE_ID,
          authorId: AUTHOR_MEMBER_ID,
          mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID, BOB_MEMBER_ID],
        },
        createdAt: new Date('2026-09-18T19:32:52.000Z'),
      },
    ]);
  });

  it('omits createdAt when the message moment is unknown', () => {
    const [request] = buildChatMentionNotificationRequests({
      channelId: CHANNEL_ID,
      messageId: MESSAGE_ID,
      authorId: null,
      mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID],
      targets: [{ workspaceMemberId: ALICE_MEMBER_ID, userId: ALICE_USER_ID }],
    });

    expect(request).not.toHaveProperty('createdAt');
  });

  it('emits nothing when no target resolved', () => {
    expect(
      buildChatMentionNotificationRequests({
        channelId: CHANNEL_ID,
        messageId: MESSAGE_ID,
        authorId: null,
        mentionedWorkspaceMemberIds: [ALICE_MEMBER_ID],
        targets: [],
      }),
    ).toEqual([]);
  });
});
