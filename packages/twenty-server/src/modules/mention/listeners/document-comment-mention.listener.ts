import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';
import { selectNewCommentEntries } from 'src/modules/mention/utils/parse-blocknote-mentions.util';

// Raw app-owned `documentCommentThread` row projection: `comments` is the
// RAW_JSON array of BlockNote CommentData, `documentId` the relation join
// column (a2e-documents metadata object).
type DocumentCommentThreadMentionRecord = {
  id: string;
  threadId: string;
  documentId: string;
  comments: unknown;
};

// Comments are appended to one thread row, so the update path notifies only the
// comments whose id was absent from the previous revision. Best-effort, like
// the chat listener — a notification failure must never fail the comment write.
@Injectable()
export class DocumentCommentMentionListener {
  private readonly logger = new Logger(DocumentCommentMentionListener.name);

  constructor(
    private readonly mentionNotificationService: MentionNotificationService,
  ) {}

  @OnDatabaseBatchEvent('documentCommentThread', DatabaseEventAction.CREATED)
  async handleThreadCreated(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<DocumentCommentThreadMentionRecord>
    >,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.notifyNewComments({
        workspaceId: payload.workspaceId,
        after: event.properties.after,
      });
    }
  }

  @OnDatabaseBatchEvent('documentCommentThread', DatabaseEventAction.UPDATED)
  async handleThreadUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<DocumentCommentThreadMentionRecord>
    >,
  ): Promise<void> {
    for (const event of payload.events) {
      if (!event.properties.updatedFields.includes('comments')) {
        continue;
      }

      await this.notifyNewComments({
        workspaceId: payload.workspaceId,
        before: event.properties.before,
        after: event.properties.after,
      });
    }
  }

  private async notifyNewComments({
    workspaceId,
    before,
    after,
  }: {
    workspaceId: string;
    before?: DocumentCommentThreadMentionRecord;
    after: DocumentCommentThreadMentionRecord;
  }): Promise<void> {
    const newComments = selectNewCommentEntries({
      before: before?.comments,
      after: after.comments,
    });

    for (const comment of newComments) {
      try {
        await this.mentionNotificationService.notifyMentions({
          workspaceId,
          source: {
            surface: 'comment',
            documentId: after.documentId,
            threadId: after.threadId,
          },
          // Wrapped so the shared comment parser projects the CommentData body.
          body: [comment],
          authorId: this.resolveCommentAuthorId(comment),
          createdAt: this.resolveCommentCreatedAt(comment),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to emit a comment mention notification: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  private resolveCommentAuthorId(comment: unknown): string | null {
    if (
      typeof comment === 'object' &&
      comment !== null &&
      'userId' in comment &&
      typeof comment.userId === 'string' &&
      comment.userId.length > 0
    ) {
      return comment.userId;
    }

    return null;
  }

  private resolveCommentCreatedAt(comment: unknown): Date | undefined {
    if (
      typeof comment === 'object' &&
      comment !== null &&
      'createdAt' in comment
    ) {
      const createdAt = comment.createdAt;

      if (typeof createdAt === 'string') {
        return new Date(createdAt);
      }

      if (createdAt instanceof Date) {
        return createdAt;
      }
    }

    return undefined;
  }
}
