import { useCallback } from 'react';
import { useStore } from 'jotai';

import { AGENT_CHAT_INSTANCE_ID } from '@/ai/constants/AgentChatInstanceId';
import { useGetBrowsingContext } from '@/ai/hooks/useBrowsingContext';
import { useStageAiChatPreprompt } from '@/ai/hooks/useStageAiChatPreprompt';
import { AGENT_CHAT_NEW_THREAD_DRAFT_KEY } from '@/ai/states/agentChatDraftsByThreadIdState';
import { agentChatErrorComponentFamilyState } from '@/ai/states/agentChatErrorComponentFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import { buildDirectToolExecutionMessage } from '@/ai/utils/buildDirectToolExecutionMessage';
import { createAiChatCodedError } from '@/ai/utils/createAiChatCodedError';
import { executeDirectContextTool } from '@/ai/utils/executeDirectContextTool';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const DIRECT_TOOL_EXECUTION_ERROR_CODE = 'DIRECT_TOOL_EXECUTION_FAILED';

// Direct execution runs a context tool from its button without the user
// composing a prompt: the invocation is built from the browsing context and
// handed to the assistant thread. The dispatch seam stays swappable so the
// behavior is unit-testable with a mocked dispatch.
export const useDirectToolExecution = () => {
  const { getBrowsingContext } = useGetBrowsingContext();
  const { stageAiChatPreprompt } = useStageAiChatPreprompt();
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);
  const store = useStore();

  const executeContextTool = useCallback(
    async (contextToolButton: ContextToolButton) => {
      const outcome = await executeDirectContextTool({
        contextToolButton,
        browsingContext: getBrowsingContext(),
        dispatch: (invocation) => {
          stageAiChatPreprompt({
            text: buildDirectToolExecutionMessage(invocation),
            mode: 'SEND',
            draftKey: currentAiChatThread ?? AGENT_CHAT_NEW_THREAD_DRAFT_KEY,
          });

          return Promise.resolve({ success: true as const });
        },
      });

      if (outcome.status !== 'executed') {
        store.set(
          agentChatErrorComponentFamilyState.atomFamily({
            instanceId: AGENT_CHAT_INSTANCE_ID,
            familyKey: { threadId: currentAiChatThread },
          }),
          createAiChatCodedError(
            outcome.message,
            DIRECT_TOOL_EXECUTION_ERROR_CODE,
          ),
        );
      }

      return outcome;
    },
    [getBrowsingContext, stageAiChatPreprompt, currentAiChatThread, store],
  );

  return { executeContextTool };
};
