import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { DocumentCommentMentionListener } from 'src/modules/mention/listeners/document-comment-mention.listener';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const DOCUMENT_ID = 'c31a0100-0000-4000-8000-000000000000';
const THREAD_ID = 'thread-1';
const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const BOB_MEMBER_ID = '20202020-99f5-4cb6-b60a-f4a835a85d63';

const buildComment = (id: string, recordId: string) => ({
  id,
  userId: BOB_MEMBER_ID,
  createdAt: '2026-09-18T10:00:00.000Z',
  body: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Cc ' },
        {
          type: 'mention',
          props: {
            objectNameSingular: 'workspaceMember',
            recordId,
            label: 'Alice',
          },
        },
      ],
    },
  ],
});

type CommentThreadRecord = {
  id: string;
  threadId: string;
  documentId: string;
  comments: unknown;
};

const buildListener = () => {
  const notifyMentions = jest.fn().mockResolvedValue([]);
  const mentionNotificationService = {
    notifyMentions,
  } as unknown as MentionNotificationService;
  const listener = new DocumentCommentMentionListener(
    mentionNotificationService,
  );

  return { listener, notifyMentions };
};

describe('DocumentCommentMentionListener', () => {
  it('notifies each comment on thread creation with the document deep link', async () => {
    const { listener, notifyMentions } = buildListener();

    await listener.handleThreadCreated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            after: {
              id: 'thread-row-1',
              threadId: THREAD_ID,
              documentId: DOCUMENT_ID,
              comments: [buildComment('comment-1', ALICE_MEMBER_ID)],
            },
          },
        },
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordCreateEvent<CommentThreadRecord>
    >);

    expect(notifyMentions).toHaveBeenCalledTimes(1);
    expect(notifyMentions).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        source: {
          surface: 'comment',
          documentId: DOCUMENT_ID,
          threadId: THREAD_ID,
        },
        authorId: BOB_MEMBER_ID,
      }),
    );
  });

  it('notifies only the comments appended since the previous revision', async () => {
    const { listener, notifyMentions } = buildListener();

    await listener.handleThreadUpdated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            updatedFields: ['comments'],
            before: {
              id: 'thread-row-1',
              threadId: THREAD_ID,
              documentId: DOCUMENT_ID,
              comments: [buildComment('comment-1', ALICE_MEMBER_ID)],
            },
            after: {
              id: 'thread-row-1',
              threadId: THREAD_ID,
              documentId: DOCUMENT_ID,
              comments: [
                buildComment('comment-1', ALICE_MEMBER_ID),
                buildComment('comment-2', BOB_MEMBER_ID),
              ],
            },
          },
        },
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordUpdateEvent<CommentThreadRecord>
    >);

    expect(notifyMentions).toHaveBeenCalledTimes(1);
    expect(notifyMentions.mock.calls[0][0].body[0].id).toBe('comment-2');
  });

  it('does nothing when the edit did not touch comments', async () => {
    const { listener, notifyMentions } = buildListener();

    await listener.handleThreadUpdated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            updatedFields: ['resolved'],
            before: {
              id: 'thread-row-1',
              threadId: THREAD_ID,
              documentId: DOCUMENT_ID,
              comments: [buildComment('comment-1', ALICE_MEMBER_ID)],
            },
            after: {
              id: 'thread-row-1',
              threadId: THREAD_ID,
              documentId: DOCUMENT_ID,
              comments: [buildComment('comment-1', ALICE_MEMBER_ID)],
            },
          },
        },
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordUpdateEvent<CommentThreadRecord>
    >);

    expect(notifyMentions).not.toHaveBeenCalled();
  });
});
