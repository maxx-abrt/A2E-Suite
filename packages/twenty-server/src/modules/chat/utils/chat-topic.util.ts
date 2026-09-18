// Chat realtime topics follow the gateway grammar `workspace:<id>:chat:<id>`
// (parse-realtime-topic.util.ts). Kept as one pure builder so the resolver,
// the typing service and the later message/read publishers all name the
// channel identically.
export const buildChatChannelTopic = ({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}): string => `workspace:${workspaceId}:chat:${channelId}`;
