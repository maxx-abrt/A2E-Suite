import { currentWorkspaceMembersState } from '@/auth/states/currentWorkspaceMembersState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { WORKSPACE_PRESENCE_QUERY } from '~/modules/realtime/graphql/queries/workspacePresence';
import { useRealtimeConnectionStatus } from '~/modules/realtime/hooks/useRealtimeConnectionStatus';
import { useRealtimeTopic } from '~/modules/realtime/hooks/useRealtimeTopic';
import {
  type WorkspacePresenceEvent,
  type WorkspacePresenceMember,
} from '~/modules/realtime/types/WorkspacePresence';
import { applyWorkspacePresenceEvent } from '~/modules/realtime/utils/applyWorkspacePresenceEvent';
import { realtimeConnectionManager } from '~/modules/realtime/utils/realtimeConnectionManager';

const TYPING_FALLBACK_TIMEOUT_MS = 6_000;

type WorkspacePresenceQueryResponse = {
  workspacePresence: WorkspacePresenceMember[];
};

export const useWorkspacePresence = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const currentWorkspaceMembers = useAtomStateValue(
    currentWorkspaceMembersState,
  );
  const [presenceMembers, setPresenceMembers] = useState<
    WorkspacePresenceMember[]
  >([]);
  const [typingTimeoutsByUserId] = useState(
    () => new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const workspaceId = currentWorkspace?.id;
  const topic = `workspace:${workspaceId ?? '00000000-0000-0000-0000-000000000000'}:presence`;
  const { status } = useRealtimeConnectionStatus();
  const { data, refetch } = useQuery<WorkspacePresenceQueryResponse>(
    WORKSPACE_PRESENCE_QUERY,
    {
      fetchPolicy: 'network-only',
      skip: !isDefined(workspaceId),
    },
  );

  useEffect(() => {
    if (isDefined(data?.workspacePresence)) {
      setPresenceMembers(data.workspacePresence);
    }
  }, [data]);

  useEffect(() => {
    if (status === 'connected' && isDefined(workspaceId)) {
      void refetch();
    }
  }, [refetch, status, workspaceId]);

  const clearTypingTimeout = useCallback(
    (userId: string) => {
      const timeout = typingTimeoutsByUserId.get(userId);

      if (isDefined(timeout)) {
        clearTimeout(timeout);
        typingTimeoutsByUserId.delete(userId);
      }
    },
    [typingTimeoutsByUserId],
  );

  useRealtimeTopic<WorkspacePresenceEvent>({
    topic,
    enabled: isDefined(workspaceId),
    onEvent: (event) => {
      setPresenceMembers((currentMembers) =>
        applyWorkspacePresenceEvent(currentMembers, event),
      );
      clearTypingTimeout(event.member.userId);

      if (event.event === 'typing' && event.isTyping) {
        typingTimeoutsByUserId.set(
          event.member.userId,
          setTimeout(() => {
            setPresenceMembers((currentMembers) =>
              currentMembers.map((member) =>
                member.userId === event.member.userId
                  ? { ...member, isTyping: false, typingContext: undefined }
                  : member,
              ),
            );
            typingTimeoutsByUserId.delete(event.member.userId);
          }, TYPING_FALLBACK_TIMEOUT_MS),
        );
      }
    },
  });

  useEffect(
    () => () => {
      for (const timeout of typingTimeoutsByUserId.values()) {
        clearTimeout(timeout);
      }
      typingTimeoutsByUserId.clear();
    },
    [typingTimeoutsByUserId],
  );

  const onlineWorkspaceMembers = useMemo(
    () =>
      presenceMembers.flatMap((presenceMember) => {
        const workspaceMember = currentWorkspaceMembers.find(
          (candidate) => candidate.id === presenceMember.workspaceMemberId,
        );

        return isDefined(workspaceMember) ? [workspaceMember] : [];
      }),
    [presenceMembers, currentWorkspaceMembers],
  );

  const typingWorkspaceMembers = useMemo(
    () =>
      presenceMembers
        .filter((presenceMember) => presenceMember.isTyping)
        .flatMap((presenceMember) => {
          const workspaceMember = currentWorkspaceMembers.find(
            (candidate) => candidate.id === presenceMember.workspaceMemberId,
          );

          return isDefined(workspaceMember) ? [workspaceMember] : [];
        }),
    [presenceMembers, currentWorkspaceMembers],
  );

  const publishTyping = useCallback(
    (isTyping: boolean, typingContext?: string) =>
      isDefined(workspaceId) &&
      realtimeConnectionManager.sendPresence({
        topic,
        event: isTyping ? 'typing-started' : 'typing-stopped',
        typingContext,
      }),
    [topic, workspaceId],
  );

  return {
    onlineWorkspaceMembers,
    presenceMembers,
    publishTyping,
    status,
    typingWorkspaceMembers,
  };
};
