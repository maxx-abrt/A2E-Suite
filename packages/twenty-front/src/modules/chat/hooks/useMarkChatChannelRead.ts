import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// Durable read position: the (channel, member) read cursor row stores both the
// timestamp the server unread count uses and the last message id the divider
// uses. One row per pair, so this updates in place when one exists.
export const useMarkChatChannelRead = ({
  channelId,
}: {
  channelId: string | null;
}) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const workspaceMemberId = currentWorkspaceMember?.id ?? null;

  const { records: readCursors, loading } = useFindManyRecords({
    objectNameSingular: 'chatReadCursor',
    filter: {
      channelId: { eq: channelId ?? '' },
      workspaceMemberId: { eq: workspaceMemberId ?? '' },
    },
    skip: channelId === null || workspaceMemberId === null,
    limit: 1,
  });

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'chatReadCursor',
  });
  const { updateOneRecord } = useUpdateOneRecord();

  const markChannelRead = useCallback(
    async ({ lastReadMessageId }: { lastReadMessageId: string | null }) => {
      if (!isDefined(channelId) || !isDefined(workspaceMemberId)) {
        return;
      }

      const lastReadAt = new Date().toISOString();
      const existingCursor = readCursors[0];

      if (isDefined(existingCursor)) {
        await updateOneRecord({
          objectNameSingular: 'chatReadCursor',
          idToUpdate: existingCursor.id,
          updateOneRecordInput: { lastReadAt, lastReadMessageId },
        });

        return;
      }

      await createOneRecord({
        channelId,
        workspaceMemberId,
        lastReadAt,
        lastReadMessageId,
      });
    },
    [
      channelId,
      workspaceMemberId,
      readCursors,
      createOneRecord,
      updateOneRecord,
    ],
  );

  return {
    markChannelRead,
    lastReadMessageId: readCursors[0]?.lastReadMessageId ?? null,
    loading,
  };
};
