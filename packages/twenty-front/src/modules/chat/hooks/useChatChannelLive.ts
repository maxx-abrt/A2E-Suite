import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_MESSAGE_DELETED_EVENT_TYPE,
  CHAT_MESSAGE_UPDATED_EVENT_TYPE,
  CHAT_TYPING_EVENT_TYPE,
  type ChatRealtimeEvent,
  type ChatRealtimeMessageEvent,
} from '@/chat/types/ChatRealtimeEvent';
import { applyChatRealtimeEventToMessages } from '@/chat/utils/applyChatRealtimeEventToMessages';
import { buildChatChannelTopic } from '@/chat/utils/buildChatChannelTopic';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useRealtimeTopic } from '~/modules/realtime/hooks/useRealtimeTopic';

const TYPING_FALLBACK_TIMEOUT_MS = 6_000;

const isChatRealtimeMessageEvent = (
  event: ChatRealtimeEvent,
): event is ChatRealtimeMessageEvent =>
  event.type === CHAT_MESSAGE_CREATED_EVENT_TYPE ||
  event.type === CHAT_MESSAGE_UPDATED_EVENT_TYPE ||
  event.type === CHAT_MESSAGE_DELETED_EVENT_TYPE;

// Live layer of the chat page. The loaded keyset page stays the source of
// truth; realtime message events are kept aside and folded on top with the same
// idempotent reducer the offline replay uses, so a reconnecting socket catching
// up (or a race with the page query) can never duplicate a message. Typing is
// ephemeral and expires locally on a timer.
export const useChatChannelLive = ({
  channelId,
  loadedMessages,
}: {
  channelId: string | null;
  loadedMessages: ChatMessage[];
}) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const workspaceId = currentWorkspace?.id ?? null;
  const [realtimeMessageEvents, setRealtimeMessageEvents] = useState<
    ChatRealtimeMessageEvent[]
  >([]);
  const [typingWorkspaceMemberIds, setTypingWorkspaceMemberIds] = useState<
    string[]
  >([]);
  const [typingTimeoutsByMemberId] = useState(
    () => new Map<string, ReturnType<typeof setTimeout>>(),
  );

  // Events are retained per channel: a late event for the channel we just left
  // is filtered out by `channelId` rather than cleared by an effect that could
  // race the fold below.
  const messages = useMemo(
    () =>
      realtimeMessageEvents
        .filter(
          (event) => !isDefined(channelId) || event.channelId === channelId,
        )
        .reduce(
          (currentMessages, event) =>
            applyChatRealtimeEventToMessages({
              messages: currentMessages,
              event,
            }),
          loadedMessages,
        ),
    [channelId, loadedMessages, realtimeMessageEvents],
  );

  const clearTypingTimeout = useCallback(
    (workspaceMemberId: string) => {
      const timeout = typingTimeoutsByMemberId.get(workspaceMemberId);

      if (isDefined(timeout)) {
        clearTimeout(timeout);
        typingTimeoutsByMemberId.delete(workspaceMemberId);
      }
    },
    [typingTimeoutsByMemberId],
  );

  // Typing state is channel-scoped too: switching channels drops the previous
  // channel's roster rather than showing a stale "X is typing".
  useEffect(() => {
    setTypingWorkspaceMemberIds([]);
  }, [channelId]);

  const topic =
    isDefined(workspaceId) && isDefined(channelId)
      ? buildChatChannelTopic({ workspaceId, channelId })
      : '';

  useRealtimeTopic<ChatRealtimeEvent>({
    topic,
    enabled: topic.length > 0,
    onEvent: (event) => {
      if (event.type === CHAT_TYPING_EVENT_TYPE) {
        clearTypingTimeout(event.workspaceMemberId);

        if (!event.isTyping) {
          setTypingWorkspaceMemberIds((currentIds) =>
            currentIds.filter((id) => id !== event.workspaceMemberId),
          );

          return;
        }

        setTypingWorkspaceMemberIds((currentIds) =>
          currentIds.includes(event.workspaceMemberId)
            ? currentIds
            : [...currentIds, event.workspaceMemberId],
        );
        typingTimeoutsByMemberId.set(
          event.workspaceMemberId,
          setTimeout(() => {
            setTypingWorkspaceMemberIds((currentIds) =>
              currentIds.filter((id) => id !== event.workspaceMemberId),
            );
            typingTimeoutsByMemberId.delete(event.workspaceMemberId);
          }, TYPING_FALLBACK_TIMEOUT_MS),
        );

        return;
      }

      if (!isChatRealtimeMessageEvent(event)) {
        return;
      }

      setRealtimeMessageEvents((currentEvents) => [...currentEvents, event]);
    },
  });

  useEffect(
    () => () => {
      for (const timeout of typingTimeoutsByMemberId.values()) {
        clearTimeout(timeout);
      }
      typingTimeoutsByMemberId.clear();
    },
    [typingTimeoutsByMemberId],
  );

  return {
    messages,
    typingWorkspaceMemberIds,
  };
};
