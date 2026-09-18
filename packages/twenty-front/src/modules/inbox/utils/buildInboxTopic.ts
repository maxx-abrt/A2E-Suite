// Inbox realtime topics follow the gateway grammar `workspace:<id>:inbox:<userId>`
// (server parse-realtime-topic.util.ts). The builder mirrors the server
// `inbox-topic.util.ts` so subscribe and publish name the topic identically.
export const buildInboxTopic = ({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): string => `workspace:${workspaceId}:inbox:${userId}`;
