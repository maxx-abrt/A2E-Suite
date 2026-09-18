import { RealtimeTopicAccessService } from 'src/engine/core-modules/realtime-gateway/services/realtime-topic-access.service';
import { UserWorkspaceService } from 'src/engine/core-modules/user-workspace/user-workspace.service';
import { MentionAccessService } from 'src/modules/mention/services/mention-access.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const USER_ID = 'user-alice';
const WORKSPACE_MEMBER_ID = '20202020-88e5-4cb6-b60a-f4a835a85d62';
const USER_WORKSPACE_ID = '20202020-1e7c-43d9-a5db-685b506d816c';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const DOCUMENT_ID = 'c31a0100-0000-4000-8000-000000000000';

const buildService = ({
  userWorkspace = { id: USER_WORKSPACE_ID },
  canReadObjectRecord = jest.fn().mockResolvedValue(true),
  canReadChatChannel = jest.fn().mockResolvedValue(true),
}: {
  userWorkspace?: { id: string } | null;
  canReadObjectRecord?: jest.Mock;
  canReadChatChannel?: jest.Mock;
} = {}) => {
  const getUserWorkspaceForUser = jest.fn().mockResolvedValue(userWorkspace);
  const userWorkspaceService = {
    getUserWorkspaceForUser,
  } as unknown as UserWorkspaceService;
  const realtimeTopicAccessService = {
    canWorkspaceMemberReadObjectRecord: canReadObjectRecord,
    canWorkspaceMemberReadChatChannel: canReadChatChannel,
  } as unknown as RealtimeTopicAccessService;

  const service = new MentionAccessService(
    userWorkspaceService,
    realtimeTopicAccessService,
  );

  return {
    service,
    getUserWorkspaceForUser,
    canReadObjectRecord,
    canReadChatChannel,
  };
};

const target = {
  workspaceMemberId: WORKSPACE_MEMBER_ID,
  userId: USER_ID,
};

describe('MentionAccessService', () => {
  it('checks chat reads through the channel ACL with the target member identity', async () => {
    const { service, canReadChatChannel, canReadObjectRecord } = buildService();

    await expect(
      service.canMentionTargetReadSource({
        workspaceId: WORKSPACE_ID,
        target,
        source: { surface: 'chat', channelId: CHANNEL_ID, messageId: 'm1' },
      }),
    ).resolves.toBe(true);

    expect(canReadChatChannel).toHaveBeenCalledWith({
      identity: {
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        userWorkspaceId: USER_WORKSPACE_ID,
      },
      channelId: CHANNEL_ID,
    });
    expect(canReadObjectRecord).not.toHaveBeenCalled();
  });

  it('checks document and comment reads through the document record ACL', async () => {
    const { service, canReadObjectRecord, canReadChatChannel } = buildService();

    await service.canMentionTargetReadSource({
      workspaceId: WORKSPACE_ID,
      target,
      source: { surface: 'document', documentId: DOCUMENT_ID },
    });
    await service.canMentionTargetReadSource({
      workspaceId: WORKSPACE_ID,
      target,
      source: {
        surface: 'comment',
        documentId: DOCUMENT_ID,
        threadId: 'thread-1',
      },
    });

    expect(canReadObjectRecord).toHaveBeenCalledTimes(2);
    expect(canReadObjectRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        objectNameSingular: 'document',
        recordId: DOCUMENT_ID,
      }),
    );
    expect(canReadChatChannel).not.toHaveBeenCalled();
  });

  it('denies when the mentioned user is no longer in the workspace', async () => {
    const { service, canReadObjectRecord, canReadChatChannel } = buildService({
      userWorkspace: null,
    });

    await expect(
      service.canMentionTargetReadSource({
        workspaceId: WORKSPACE_ID,
        target,
        source: { surface: 'chat', channelId: CHANNEL_ID, messageId: 'm1' },
      }),
    ).resolves.toBe(false);

    expect(canReadObjectRecord).not.toHaveBeenCalled();
    expect(canReadChatChannel).not.toHaveBeenCalled();
  });

  it('fails closed when the access primitive throws', async () => {
    const { service } = buildService({
      canReadChatChannel: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      service.canMentionTargetReadSource({
        workspaceId: WORKSPACE_ID,
        target,
        source: { surface: 'chat', channelId: CHANNEL_ID, messageId: 'm1' },
      }),
    ).resolves.toBe(false);
  });
});
