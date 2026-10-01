import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import {
  type CrossAppEventPayload,
  isCrossAppEventPayload,
} from 'twenty-shared/cross-app-events';
import { isDefined } from 'twenty-shared/utils';

import { OnCustomBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-custom-batch-event.decorator';
import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { type CustomWorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/custom-workspace-batch-event.type';
import { CROSS_APP_LIFECYCLE_EVENT } from 'src/modules/cross-app-events/constants/cross-app-lifecycle-event.constant';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

const WORKSPACE_MEMBER_OBJECT_NAME = 'workspaceMember';

// The US-139 mention index row fields this listener reads. The index is written
// by a2e-documents and carries the polymorphic target plus the source document
// join column; `mentionKey` is the stable `${documentId}:${objectName}:${id}`
// fallback when the join column is absent from the snapshot.
type DocumentMentionEventRecord = Record<string, unknown>;

const getRecordString = (
  record: DocumentMentionEventRecord,
  key: string,
): string | null => {
  const value = record[key];

  return isNonEmptyString(value) ? value : null;
};

// `documentId` is a UUID with no colon, so the first segment of the key is the
// source document even when the relation join column is not projected.
const readDocumentIdFromMentionKey = (
  record: DocumentMentionEventRecord,
): string | null => {
  const mentionKey = getRecordString(record, 'mentionKey');

  if (!isDefined(mentionKey)) {
    return null;
  }

  const [documentId] = mentionKey.split(':');

  return isNonEmptyString(documentId) ? documentId : null;
};

// Document record mentions flow into the Inbox through the C5 contract: the
// a2e-documents save-time index (US-139) emits one `mention.created` event per
// saved record mention, and this subscriber fans it to the watchers of the
// mentioned record, deep-linking to the source document. Workspace-member
// mentions are already owned by DocumentMentionListener (the created/updated
// body scan), so they are skipped here to keep exactly one path per mention.
@Injectable()
export class CrossAppDocumentMentionListener {
  private readonly logger = new Logger(CrossAppDocumentMentionListener.name);

  constructor(
    private readonly mentionNotificationService: MentionNotificationService,
    private readonly notificationWatchService: NotificationWatchService,
  ) {}

  @OnCustomBatchEvent(CROSS_APP_LIFECYCLE_EVENT)
  async handleCrossAppLifecycle(
    payload: CustomWorkspaceEventBatch<CrossAppEventPayload>,
  ): Promise<void> {
    const workspaceId = payload.workspaceId;

    if (!isDefined(workspaceId)) {
      return;
    }

    // One save can emit several index rows; a repeated row for the same
    // (document, target) is the same mention and must not notify twice.
    const handledMentionKeys = new Set<string>();

    for (const event of payload.events) {
      await this.handleEventSafely({
        workspaceId,
        event,
        handledMentionKeys,
      });
    }
  }

  private async handleEventSafely({
    workspaceId,
    event,
    handledMentionKeys,
  }: {
    workspaceId: string;
    event: CrossAppEventPayload;
    handledMentionKeys: Set<string>;
  }): Promise<void> {
    try {
      if (!isCrossAppEventPayload(event)) {
        return;
      }

      if (event.objectFamily !== 'mention' || event.action !== 'created') {
        return;
      }

      await this.notifyRecordMentionWatchers({
        workspaceId,
        record: event.record,
        occurredAt: event.timestamps.occurredAt,
        handledMentionKeys,
      });
    } catch (error) {
      // Best-effort: an inbox fan-out failure never breaks the index write.
      this.logger.warn(
        `Failed to build record mention notifications: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async notifyRecordMentionWatchers({
    workspaceId,
    record,
    occurredAt,
    handledMentionKeys,
  }: {
    workspaceId: string;
    record: DocumentMentionEventRecord;
    occurredAt: string;
    handledMentionKeys: Set<string>;
  }): Promise<void> {
    const targetObjectNameSingular = getRecordString(
      record,
      'targetObjectNameSingular',
    );
    const targetRecordId = getRecordString(record, 'targetRecordId');
    const documentId =
      getRecordString(record, 'documentId') ??
      readDocumentIdFromMentionKey(record);

    if (
      !isDefined(targetObjectNameSingular) ||
      !isDefined(targetRecordId) ||
      !isDefined(documentId)
    ) {
      return;
    }

    // The existing document mention path already notifies mentioned members;
    // this subscriber owns the record targets, so the two never overlap.
    if (targetObjectNameSingular === WORKSPACE_MEMBER_OBJECT_NAME) {
      return;
    }

    const mentionKey = `${documentId}:${targetObjectNameSingular}:${targetRecordId}`;

    if (handledMentionKeys.has(mentionKey)) {
      return;
    }

    handledMentionKeys.add(mentionKey);

    const watchingMembers =
      await this.notificationWatchService.findWatchingWorkspaceMembers({
        workspaceId,
        targetKind:
          targetObjectNameSingular === 'document' ? 'DOCUMENT' : 'RECORD',
        targetId: targetRecordId,
      });

    if (watchingMembers.length === 0) {
      return;
    }

    await this.mentionNotificationService.notifyMentionTargets({
      workspaceId,
      source: { surface: 'document', documentId },
      targets: watchingMembers,
      authorId: null,
      mentionedWorkspaceMemberIds: [],
      contextSnippet: getRecordString(record, 'targetLabel') ?? '',
      createdAt: isNonEmptyString(occurredAt)
        ? new Date(occurredAt)
        : undefined,
    });
  }
}
