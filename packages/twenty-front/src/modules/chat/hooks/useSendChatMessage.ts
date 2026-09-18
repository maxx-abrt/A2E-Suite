import { useCallback } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// Writes a message through the metadata `chatMessage` object. `channelId`,
// `authorId` and `threadParentId` are the relation joins the metadata engine
// generates from the app-side `channel`/`author`/`threadParent` fields.
export const useSendChatMessage = () => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { createOneRecord, loading } = useCreateOneRecord({
    objectNameSingular: 'chatMessage',
  });

  const sendChatMessage = useCallback(
    async ({
      channelId,
      body,
      threadParentId = null,
    }: {
      channelId: string;
      body: string;
      threadParentId?: string | null;
    }) => {
      const normalizedBody = body.replace(/\r\n/g, '\n').trim();

      if (
        !isDefined(currentWorkspaceMember) ||
        !isNonEmptyString(normalizedBody)
      ) {
        return;
      }

      await createOneRecord({
        body: normalizedBody,
        channelId,
        authorId: currentWorkspaceMember.id,
        threadParentId,
      });
    },
    [createOneRecord, currentWorkspaceMember],
  );

  return { sendChatMessage, loading };
};
