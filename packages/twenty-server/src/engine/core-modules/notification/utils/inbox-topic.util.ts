// Inbox realtime topics follow the gateway grammar `workspace:<id>:inbox:<userId>`
// (parse-realtime-topic.util.ts). The topic is user-scoped, so the repaired
// gateway's ACL keeps every subscriber on their own inbox at subscribe and on
// revocation; one builder keeps the publisher and the P8.2 inbox page naming
// the topic identically.
export const buildInboxTopic = ({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): string => `workspace:${workspaceId}:inbox:${userId}`;
