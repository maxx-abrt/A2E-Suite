import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

import {
  SEND_CHAT_TYPING_INDICATOR_MUTATION,
  type SendChatTypingIndicatorResult,
  type SendChatTypingIndicatorVariables,
} from '@/chat/graphql/mutations/sendChatTypingIndicatorMutation';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

// The receiver expires a typing indicator after a fallback timeout, so a
// `true` is re-published while the author keeps typing. Throttling to one
// mutation per window keeps a keystroke storm off the network; a `false` is
// always sent so the indicator clears immediately.
const TYPING_PUBLISH_THROTTLE_MS = 3_000;

export const useSendChatTypingIndicator = () => {
  const apolloCoreClient = useApolloCoreClient();
  const [lastPublishedAtByChannelId] = useState(
    () => new Map<string, number>(),
  );

  const [sendTypingMutation] = useMutation<
    SendChatTypingIndicatorResult,
    SendChatTypingIndicatorVariables
  >(SEND_CHAT_TYPING_INDICATOR_MUTATION, { client: apolloCoreClient });

  const publishTyping = useCallback(
    async ({
      channelId,
      isTyping,
    }: {
      channelId: string;
      isTyping: boolean;
    }) => {
      if (!isDefined(channelId) || channelId.length === 0) {
        return;
      }

      if (isTyping) {
        const lastPublishedAt = lastPublishedAtByChannelId.get(channelId) ?? 0;

        if (Date.now() - lastPublishedAt < TYPING_PUBLISH_THROTTLE_MS) {
          return;
        }

        lastPublishedAtByChannelId.set(channelId, Date.now());
      } else {
        lastPublishedAtByChannelId.delete(channelId);
      }

      await sendTypingMutation({
        variables: { input: { channelId, isTyping } },
      });
    },
    [lastPublishedAtByChannelId, sendTypingMutation],
  );

  return { publishTyping };
};
