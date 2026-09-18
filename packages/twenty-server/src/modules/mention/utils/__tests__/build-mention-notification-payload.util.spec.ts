import { buildMentionNotificationPayload } from 'src/modules/mention/utils/build-mention-notification-payload.util';

describe('buildMentionNotificationPayload', () => {
  it('builds the chat payload the inbox deep-link resolver reads', () => {
    expect(
      buildMentionNotificationPayload({
        source: { surface: 'chat', channelId: 'channel-1', messageId: 'msg-1' },
        authorId: 'member-author',
        mentionedWorkspaceMemberIds: ['member-alice'],
        contextSnippet: 'Salut @Alice',
      }),
    ).toEqual({
      kind: 'chat.mention',
      authorId: 'member-author',
      mentionedWorkspaceMemberIds: ['member-alice'],
      snippet: 'Salut @Alice',
      channelId: 'channel-1',
      messageId: 'msg-1',
    });
  });

  it('builds document and comment payloads with the record convention', () => {
    expect(
      buildMentionNotificationPayload({
        source: { surface: 'document', documentId: 'doc-1' },
        authorId: null,
        mentionedWorkspaceMemberIds: ['member-alice'],
        contextSnippet: 'Bonjour @Alice',
      }),
    ).toMatchObject({
      kind: 'document.mention',
      objectNameSingular: 'document',
      recordId: 'doc-1',
    });

    expect(
      buildMentionNotificationPayload({
        source: { surface: 'comment', documentId: 'doc-1', threadId: 't-1' },
        authorId: null,
        mentionedWorkspaceMemberIds: ['member-alice'],
        contextSnippet: 'Cc @Alice',
      }),
    ).toMatchObject({
      kind: 'comment.mention',
      objectNameSingular: 'document',
      recordId: 'doc-1',
      threadId: 't-1',
    });
  });
});
