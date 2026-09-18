import { parseRealtimeTopic } from 'src/engine/core-modules/realtime-gateway/utils/parse-realtime-topic.util';
import { buildInboxTopic } from 'src/engine/core-modules/notification/utils/inbox-topic.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';

describe('buildInboxTopic', () => {
  it('names the user-scoped inbox topic in the gateway grammar', () => {
    expect(
      buildInboxTopic({ workspaceId: WORKSPACE_ID, userId: USER_ID }),
    ).toBe(`workspace:${WORKSPACE_ID}:inbox:${USER_ID}`);
  });

  it('parses back to the workspace + user scope the gateway authorizes', () => {
    expect(
      parseRealtimeTopic(
        buildInboxTopic({ workspaceId: WORKSPACE_ID, userId: USER_ID }),
      ),
    ).toEqual({
      kind: 'inbox',
      workspaceId: WORKSPACE_ID,
      userId: USER_ID,
    });
  });
});
