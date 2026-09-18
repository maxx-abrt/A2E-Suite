import { buildInboxTopic } from '@/inbox/utils/buildInboxTopic';

describe('buildInboxTopic', () => {
  it('names the inbox topic with the workspace and user ids', () => {
    expect(
      buildInboxTopic({ workspaceId: 'workspace-1', userId: 'user-1' }),
    ).toBe('workspace:workspace-1:inbox:user-1');
  });
});
