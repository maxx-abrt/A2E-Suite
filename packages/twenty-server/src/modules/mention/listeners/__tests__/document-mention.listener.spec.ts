import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { DocumentMentionListener } from 'src/modules/mention/listeners/document-mention.listener';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const DOCUMENT_ID = 'c31a0100-0000-4000-8000-000000000000';
const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';

const buildContent = (recordId: string): string =>
  JSON.stringify([
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bonjour ' },
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
  ]);

type DocumentRecord = { id: string; content: unknown };

const buildListener = () => {
  const notifyMentions = jest.fn().mockResolvedValue([]);
  const mentionNotificationService = {
    notifyMentions,
  } as unknown as MentionNotificationService;
  const listener = new DocumentMentionListener(mentionNotificationService);

  return { listener, notifyMentions };
};

describe('DocumentMentionListener', () => {
  it('emits document mentions without excludes on creation', async () => {
    const { listener, notifyMentions } = buildListener();

    await listener.handleDocumentCreated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            after: { id: DOCUMENT_ID, content: buildContent(ALICE_MEMBER_ID) },
          },
        } as unknown as ObjectRecordCreateEvent<DocumentRecord>,
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordCreateEvent<DocumentRecord>
    >);

    expect(notifyMentions).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        source: { surface: 'document', documentId: DOCUMENT_ID },
        excludeWorkspaceMemberIds: [],
      }),
    );
  });

  it('excludes mentions already present before an edit', async () => {
    const { listener, notifyMentions } = buildListener();

    await listener.handleDocumentUpdated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            updatedFields: ['content'],
            before: { id: DOCUMENT_ID, content: buildContent(ALICE_MEMBER_ID) },
            after: { id: DOCUMENT_ID, content: buildContent(ALICE_MEMBER_ID) },
          },
        },
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordUpdateEvent<DocumentRecord>
    >);

    expect(notifyMentions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeWorkspaceMemberIds: [ALICE_MEMBER_ID],
      }),
    );
  });

  it('does nothing when the edit did not touch content', async () => {
    const { listener, notifyMentions } = buildListener();

    await listener.handleDocumentUpdated({
      workspaceId: WORKSPACE_ID,
      events: [
        {
          properties: {
            updatedFields: ['title'],
            before: { id: DOCUMENT_ID, content: buildContent(ALICE_MEMBER_ID) },
            after: { id: DOCUMENT_ID, content: buildContent(ALICE_MEMBER_ID) },
          },
        },
      ],
    } as unknown as WorkspaceEventBatch<
      ObjectRecordUpdateEvent<DocumentRecord>
    >);

    expect(notifyMentions).not.toHaveBeenCalled();
  });

  it('never fails the document write when the notification throws', async () => {
    const { listener } = buildListener();
    const mentionNotificationService = {
      notifyMentions: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as MentionNotificationService;
    const throwingListener = new DocumentMentionListener(
      mentionNotificationService,
    );

    await expect(
      throwingListener.handleDocumentCreated({
        workspaceId: WORKSPACE_ID,
        events: [
          {
            properties: {
              after: {
                id: DOCUMENT_ID,
                content: buildContent(ALICE_MEMBER_ID),
              },
            },
          },
        ],
      } as unknown as WorkspaceEventBatch<
        ObjectRecordCreateEvent<DocumentRecord>
      >),
    ).resolves.toBeUndefined();

    expect(listener).toBeDefined();
  });
});
