import { type CommentData, type ThreadData } from '@blocknote/core/comments';

// Server rows of the a2e-documents `documentCommentThread` object map to the
// blocknote ThreadData shape. Dates travel as ISO strings over GraphQL and
// come back as Date objects the editor mutates; comments/reactions/metadata
// are RAW_JSON columns projected verbatim from ThreadData by the store.
export type DocumentCommentThreadRecord = {
  id: string;
  threadId: string;
  comments: CommentData[] | null;
  resolved: boolean;
  resolvedBy: string | null;
  metadata: unknown | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

const toDate = (value: string | Date): Date =>
  value instanceof Date ? value : new Date(value);

export const mapDocumentCommentThreadRecordToThreadData = (
  record: DocumentCommentThreadRecord,
) => ({
  type: 'thread' as const,
  id: record.threadId,
  createdAt: toDate(record.createdAt),
  updatedAt: toDate(record.updatedAt),
  comments: record.comments ?? [],
  resolved: record.resolved,
  resolvedUpdatedAt: toDate(record.updatedAt),
  resolvedBy: record.resolvedBy ?? undefined,
  metadata: record.metadata ?? {},
});

export type DocumentCommentThreadInput = {
  comments: unknown;
  resolved: boolean;
  resolvedBy: string | null;
  metadata: unknown;
};

export const mapThreadDataToDocumentCommentThreadInput = (
  thread: ThreadData,
): DocumentCommentThreadInput => ({
  comments: thread.comments,
  resolved: thread.resolved,
  resolvedBy: thread.resolvedBy ?? null,
  metadata: thread.metadata ?? {},
});
