import { parseRealtimeTopic } from 'src/engine/core-modules/realtime-gateway/utils/parse-realtime-topic.util';
import { buildChatChannelTopic } from 'src/modules/chat/utils/chat-topic.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';

describe('buildChatChannelTopic', () => {
  it('names the channel topic in the gateway grammar', () => {
    expect(
      buildChatChannelTopic({
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
      }),
    ).toBe(`workspace:${WORKSPACE_ID}:chat:${CHANNEL_ID}`);
  });

  it('parses back to the workspace + channel scope the gateway authorizes', () => {
    expect(
      parseRealtimeTopic(
        buildChatChannelTopic({
          workspaceId: WORKSPACE_ID,
          channelId: CHANNEL_ID,
        }),
      ),
    ).toEqual({
      kind: 'chat',
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
    });
  });
});
