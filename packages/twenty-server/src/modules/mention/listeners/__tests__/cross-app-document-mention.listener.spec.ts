import {
  buildCrossAppEventPayload,
  type CrossAppEventPayload,
} from 'twenty-shared/cross-app-events';

import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { type CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';
import { CrossAppDocumentMentionListener } from 'src/modules/mention/listeners/cross-app-document-mention.listener';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const DOCUMENT_ID = 'c31a0100-0000-4000-8000-000000000000';
const TASK_ID = 'c31a0200-0000-4000-8000-000000000000';
const ALICE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const ALICE_USER_ID = 'user-alice';
const OCCURRED_AT = '2026-10-01T22:00:00.000Z';

const buildMentionEvent = ({
  record,
  action = 'created',
  name = 'mention.created',
}: {
  record: Record<string, unknown>;
  action?: 'created' | 'deleted';
  name?: string;
}): CrossAppEventPayload =>
  buildCrossAppEventPayload({
    objectFamily: 'mention',
    action,
    workspaceId: WORKSPACE_ID,
    recordId: 'mention-row-1',
    actor: { type: 'system' },
    timestamps: {
      occurredAt: OCCURRED_AT,
      createdAt: OCCURRED_AT,
      updatedAt: OCCURRED_AT,
    },
    record: { ...record, name },
  });

const buildTaskMentionRecord = (): Record<string, unknown> => ({
  documentId: DOCUMENT_ID,
  mentionKey: `${DOCUMENT_ID}:task:${TASK_ID}`,
  targetObjectNameSingular: 'task',
  targetRecordId: TASK_ID,
  targetLabel: 'Tâche',
});

const buildBatch = (
  events: CrossAppEventPayload[],
  workspaceId: string | undefined = WORKSPACE_ID,
): CustomWorkspaceEventBatch<CrossAppEventPayload> => ({
  name: 'cross_app_lifecycle',
  workspaceId,
  events,
});

const buildListener = ({
  watchingMembers = [
    { userId: ALICE_USER_ID, workspaceMemberId: ALICE_MEMBER_ID },
  ],
  findWatchingWorkspaceMembers = jest.fn().mockResolvedValue(watchingMembers),
  notifyMentionTargets = jest.fn().mockResolvedValue([]),
}: {
  watchingMembers?: Array<{ userId: string; workspaceMemberId: string }>;
  findWatchingWorkspaceMembers?: jest.Mock;
  notifyMentionTargets?: jest.Mock;
} = {}) => {
  const notificationWatchService = {
    findWatchingWorkspaceMembers,
  } as unknown as NotificationWatchService;
  const mentionNotificationService = {
    notifyMentionTargets,
  } as unknown as MentionNotificationService;

  const listener = new CrossAppDocumentMentionListener(
    mentionNotificationService,
    notificationWatchService,
  );

  return {
    listener,
    findWatchingWorkspaceMembers,
    notifyMentionTargets,
  };
};

describe('CrossAppDocumentMentionListener', () => {
  it('fans a record mention to the record watchers with a document deep link', async () => {
    const { listener, findWatchingWorkspaceMembers, notifyMentionTargets } =
      buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([buildMentionEvent({ record: buildTaskMentionRecord() })]),
    );

    expect(findWatchingWorkspaceMembers).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      targetKind: 'RECORD',
      targetId: TASK_ID,
    });
    expect(notifyMentionTargets).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      source: { surface: 'document', documentId: DOCUMENT_ID },
      targets: [{ userId: ALICE_USER_ID, workspaceMemberId: ALICE_MEMBER_ID }],
      authorId: null,
      mentionedWorkspaceMemberIds: [],
      contextSnippet: 'Tâche',
      createdAt: new Date(OCCURRED_AT),
    });
  });

  it('treats a mentioned document target as a DOCUMENT watch', async () => {
    const { listener, findWatchingWorkspaceMembers } = buildListener({
      watchingMembers: [],
    });

    await listener.handleCrossAppLifecycle(
      buildBatch([
        buildMentionEvent({
          record: {
            documentId: DOCUMENT_ID,
            mentionKey: `${DOCUMENT_ID}:document:${TASK_ID}`,
            targetObjectNameSingular: 'document',
            targetRecordId: TASK_ID,
          },
        }),
      ]),
    );

    expect(findWatchingWorkspaceMembers).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      targetKind: 'DOCUMENT',
      targetId: TASK_ID,
    });
  });

  it('skips workspace-member mentions (owned by the body-scan listener)', async () => {
    const { listener, findWatchingWorkspaceMembers, notifyMentionTargets } =
      buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([
        buildMentionEvent({
          record: {
            documentId: DOCUMENT_ID,
            mentionKey: `${DOCUMENT_ID}:workspaceMember:${ALICE_MEMBER_ID}`,
            targetObjectNameSingular: 'workspaceMember',
            targetRecordId: ALICE_MEMBER_ID,
          },
        }),
      ]),
    );

    expect(findWatchingWorkspaceMembers).not.toHaveBeenCalled();
    expect(notifyMentionTargets).not.toHaveBeenCalled();
  });

  it('ignores mention events that are not creations', async () => {
    const { listener, notifyMentionTargets } = buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([
        buildMentionEvent({
          record: buildTaskMentionRecord(),
          action: 'deleted',
          name: 'mention.deleted',
        }),
      ]),
    );

    expect(notifyMentionTargets).not.toHaveBeenCalled();
  });

  it('ignores non-mention families', async () => {
    const { listener, findWatchingWorkspaceMembers, notifyMentionTargets } =
      buildListener();

    const documentEvent = buildCrossAppEventPayload({
      objectFamily: 'document',
      action: 'created',
      workspaceId: WORKSPACE_ID,
      recordId: DOCUMENT_ID,
      actor: { type: 'system' },
      timestamps: {
        occurredAt: OCCURRED_AT,
        createdAt: OCCURRED_AT,
        updatedAt: OCCURRED_AT,
      },
      record: { content: [] },
    });

    await listener.handleCrossAppLifecycle(buildBatch([documentEvent]));

    expect(findWatchingWorkspaceMembers).not.toHaveBeenCalled();
    expect(notifyMentionTargets).not.toHaveBeenCalled();
  });

  it('skips malformed payloads that fail the contract guard', async () => {
    const { listener, notifyMentionTargets } = buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([
        {
          name: 'task.created',
          objectFamily: 'mention',
          action: 'created',
        } as unknown as CrossAppEventPayload,
      ]),
    );

    expect(notifyMentionTargets).not.toHaveBeenCalled();
  });

  it('skips a mention row missing its target ids', async () => {
    const { listener, findWatchingWorkspaceMembers } = buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([
        buildMentionEvent({
          record: {
            documentId: DOCUMENT_ID,
            targetObjectNameSingular: 'task',
          },
        }),
      ]),
    );

    expect(findWatchingWorkspaceMembers).not.toHaveBeenCalled();
  });

  it('falls back to the mention key when the document id is not projected', async () => {
    const { listener, notifyMentionTargets } = buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([
        buildMentionEvent({
          record: {
            mentionKey: `${DOCUMENT_ID}:task:${TASK_ID}`,
            targetObjectNameSingular: 'task',
            targetRecordId: TASK_ID,
          },
        }),
      ]),
    );

    expect(notifyMentionTargets).toHaveBeenCalledWith(
      expect.objectContaining({
        source: { surface: 'document', documentId: DOCUMENT_ID },
      }),
    );
  });

  it('notifies once for a repeated mention row in the same batch', async () => {
    const { listener, notifyMentionTargets } = buildListener();

    await listener.handleCrossAppLifecycle(
      buildBatch([
        buildMentionEvent({ record: buildTaskMentionRecord() }),
        buildMentionEvent({ record: buildTaskMentionRecord() }),
      ]),
    );

    expect(notifyMentionTargets).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the mentioned record has no watchers', async () => {
    const { listener, notifyMentionTargets } = buildListener({
      watchingMembers: [],
    });

    await listener.handleCrossAppLifecycle(
      buildBatch([buildMentionEvent({ record: buildTaskMentionRecord() })]),
    );

    expect(notifyMentionTargets).not.toHaveBeenCalled();
  });

  it('does nothing without a workspace id', async () => {
    const { listener, notifyMentionTargets } = buildListener();

    await listener.handleCrossAppLifecycle({
      name: 'cross_app_lifecycle',
      workspaceId: undefined,
      events: [buildMentionEvent({ record: buildTaskMentionRecord() })],
    });

    expect(notifyMentionTargets).not.toHaveBeenCalled();
  });

  it('never fails the index write when the notification throws', async () => {
    const notifyMentionTargets = jest.fn().mockRejectedValue(new Error('boom'));
    const { listener } = buildListener({ notifyMentionTargets });

    await expect(
      listener.handleCrossAppLifecycle(
        buildBatch([buildMentionEvent({ record: buildTaskMentionRecord() })]),
      ),
    ).resolves.toBeUndefined();
  });
});
