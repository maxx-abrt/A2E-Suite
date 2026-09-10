import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useCallback, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { realtimeConnectionManager } from '~/modules/realtime/utils/realtimeConnectionManager';
import { useRealtimeTopic } from '~/modules/realtime/hooks/useRealtimeTopic';
import {
  type WorkspacePresenceMember,
  type WorkspacePresenceEvent,
} from '~/modules/realtime/types/WorkspacePresence';
import { applyWorkspacePresenceEvent } from '~/modules/realtime/utils/applyWorkspacePresenceEvent';

import {
  buildDocumentCursorContext,
  parseDocumentCursorContext,
} from '~/modules/blocknote-editor/co-editing/utils/documentCursorContext';

const CURSOR_FALLBACK_TIMEOUT_MS = 6_000;

export type RemoteDocumentCursor = {
  userId: string;
  blockId: string;
};

// Remote carets for one document. Publishes the local caret block id over
// the workspace presence channel (typingContext = doc:<documentId>:<blockId>)
// and folds incoming typing events of OTHER members into a per-user cursor
// map; events for other documents are filtered out client-side.
export const useDocumentCursors = ({
  documentRecordId,
}: {
  documentRecordId: string;
}) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const workspaceId = currentWorkspace?.id;
  const topic = `workspace:${workspaceId ?? '00000000-0000-0000-0000-000000000000'}:presence`;

  const [presenceMembers, setPresenceMembers] = useState<
    WorkspacePresenceMember[]
  >([]);
  const [cursorTimeoutsByUserId] = useState(
    () => new Map<string, ReturnType<typeof setTimeout>>(),
  );

  useRealtimeTopic<WorkspacePresenceEvent>({
    topic,
    enabled: isDefined(workspaceId),
    onEvent: (event) => {
      setPresenceMembers((currentMembers) =>
        applyWorkspacePresenceEvent(currentMembers, event),
      );

      const existingTimeout = cursorTimeoutsByUserId.get(event.member.userId);

      if (isDefined(existingTimeout)) {
        clearTimeout(existingTimeout);
        cursorTimeoutsByUserId.delete(event.member.userId);
      }

      if (event.event === 'typing' && event.isTyping) {
        cursorTimeoutsByUserId.set(
          event.member.userId,
          setTimeout(() => {
            setPresenceMembers((currentMembers) =>
              currentMembers.map((member) =>
                member.userId === event.member.userId
                  ? { ...member, isTyping: false, typingContext: undefined }
                  : member,
              ),
            );
            cursorTimeoutsByUserId.delete(event.member.userId);
          }, CURSOR_FALLBACK_TIMEOUT_MS),
        );
      }
    },
  });

  const remoteCursors = useMemo<RemoteDocumentCursor[]>(
    () =>
      presenceMembers.flatMap((presenceMember) => {
        const cursorContext = parseDocumentCursorContext(
          presenceMember.typingContext ?? '',
        );

        if (
          cursorContext === null ||
          cursorContext.documentRecordId !== documentRecordId
        ) {
          return [];
        }

        return [
          {
            userId: presenceMember.userId,
            blockId: cursorContext.blockId,
          },
        ];
      }),
    [presenceMembers, documentRecordId],
  );

  const publishCursor = useCallback(
    (blockId: string | null) =>
      isDefined(workspaceId) &&
      realtimeConnectionManager.sendPresence({
        topic,
        event: blockId === null ? 'typing-stopped' : 'typing-started',
        typingContext:
          blockId === null
            ? undefined
            : buildDocumentCursorContext({ documentRecordId, blockId }),
      }),
    [topic, workspaceId, documentRecordId],
  );

  return { remoteCursors, publishCursor };
};
