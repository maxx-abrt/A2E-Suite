// Chat realtime topics follow the gateway grammar `workspace:<id>:chat:<id>`
// (server parse-realtime-topic.util.ts). The builder mirrors the server
// `chat-topic.util.ts` so subscribe and publish name the channel identically.
export const buildChatChannelTopic = ({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}): string => `workspace:${workspaceId}:chat:${channelId}`;
