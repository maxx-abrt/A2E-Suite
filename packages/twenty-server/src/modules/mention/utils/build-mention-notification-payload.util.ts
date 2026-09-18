import { type MentionSource } from 'src/modules/mention/types/mention.type';

// One payload shape per surface, all carrying the mention kind, the snippet the
// inbox previews and the ids the front deep-links from. Chat keeps `channelId`/
// `messageId` (the P5.1 contract `resolveNotificationDeepLink` reads); documents
// and comments carry the `{ objectNameSingular, recordId }` convention.
export const buildMentionNotificationPayload = ({
  source,
  authorId,
  mentionedWorkspaceMemberIds,
  contextSnippet,
}: {
  source: MentionSource;
  authorId: string | null;
  mentionedWorkspaceMemberIds: string[];
  contextSnippet: string;
}): Record<string, unknown> => {
  const basePayload = {
    kind: `${source.surface}.mention`,
    authorId,
    mentionedWorkspaceMemberIds,
    snippet: contextSnippet,
  };

  switch (source.surface) {
    case 'chat':
      return {
        ...basePayload,
        channelId: source.channelId,
        messageId: source.messageId,
      };

    case 'document':
      return {
        ...basePayload,
        objectNameSingular: 'document',
        recordId: source.documentId,
        documentId: source.documentId,
      };

    case 'comment':
      return {
        ...basePayload,
        objectNameSingular: 'document',
        recordId: source.documentId,
        documentId: source.documentId,
        threadId: source.threadId,
      };
  }
};
