import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import { isDefined } from 'twenty-shared/utils';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';
import { extractDocumentMentionedWorkspaceMemberIds } from 'src/modules/mention/utils/parse-blocknote-mentions.util';

// Raw app-owned `document` row projection: `content` is the BlockNote RICH_TEXT
// string (metadata-engine generated object, a2e-documents).
type DocumentMentionRecord = {
  id: string;
  content: unknown;
  createdAt?: string;
  updatedAt?: string;
};

// Document mentions live in the BlockNote body, so notification can only be
// decided on the save events. Best-effort and creation/edited-mention only:
// re-notification policy subtracts ids already present in the previous body.
@Injectable()
export class DocumentMentionListener {
  private readonly logger = new Logger(DocumentMentionListener.name);

  constructor(
    private readonly mentionNotificationService: MentionNotificationService,
  ) {}

  @OnDatabaseBatchEvent('document', DatabaseEventAction.CREATED)
  async handleDocumentCreated(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<DocumentMentionRecord>
    >,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.notifyDocumentMentions({
        workspaceId: payload.workspaceId,
        after: event.properties.after,
      });
    }
  }

  @OnDatabaseBatchEvent('document', DatabaseEventAction.UPDATED)
  async handleDocumentUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<DocumentMentionRecord>
    >,
  ): Promise<void> {
    for (const event of payload.events) {
      if (!event.properties.updatedFields.includes('content')) {
        continue;
      }

      await this.notifyDocumentMentions({
        workspaceId: payload.workspaceId,
        before: event.properties.before,
        after: event.properties.after,
      });
    }
  }

  private async notifyDocumentMentions({
    workspaceId,
    before,
    after,
  }: {
    workspaceId: string;
    before?: DocumentMentionRecord;
    after: DocumentMentionRecord;
  }): Promise<void> {
    try {
      const excludeWorkspaceMemberIds = isDefined(before)
        ? extractDocumentMentionedWorkspaceMemberIds(before.content)
        : [];

      await this.mentionNotificationService.notifyMentions({
        workspaceId,
        source: { surface: 'document', documentId: after.id },
        body: after.content,
        authorId: null,
        createdAt: this.resolveMoment(after, isDefined(before)),
        excludeWorkspaceMemberIds,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to emit a document mention notification: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private resolveMoment(
    record: DocumentMentionRecord,
    isUpdate: boolean,
  ): Date | undefined {
    const moment = isUpdate
      ? (record.updatedAt ?? record.createdAt)
      : record.createdAt;

    return isDefined(moment) ? new Date(moment) : undefined;
  }
}
