import { act, renderHook } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { AGENT_CHAT_INSTANCE_ID } from '@/ai/constants/AgentChatInstanceId';
import { useDirectToolExecution } from '@/ai/hooks/useDirectToolExecution';
import { agentChatErrorComponentFamilyState } from '@/ai/states/agentChatErrorComponentFamilyState';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

const mockGetBrowsingContext = jest.fn();
const mockStageAiChatPreprompt = jest.fn();

jest.mock('@/ai/hooks/useBrowsingContext', () => ({
  useGetBrowsingContext: () => ({
    getBrowsingContext: mockGetBrowsingContext,
  }),
}));

jest.mock('@/ai/hooks/useStageAiChatPreprompt', () => ({
  useStageAiChatPreprompt: () => ({
    stageAiChatPreprompt: mockStageAiChatPreprompt,
  }),
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <JotaiProvider store={jotaiStore}>{children}</JotaiProvider>
);

const readOnlyButton: ContextToolButton = {
  toolName: 'app_document_content',
  label: 'Document Content',
  description: 'Reads a document.',
  applicationId: 'documents-app-id',
  readOnly: true,
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: { documentId: { type: 'string' } },
    required: ['documentId'],
  },
};

const getThreadError = () =>
  jotaiStore.get(
    agentChatErrorComponentFamilyState.atomFamily({
      instanceId: AGENT_CHAT_INSTANCE_ID,
      familyKey: { threadId: null },
    }),
  );

describe('useDirectToolExecution', () => {
  beforeEach(() => {
    resetJotaiStore();
    mockGetBrowsingContext.mockReset();
    mockStageAiChatPreprompt.mockReset();
  });

  it('dispatches the invocation through the assistant and surfaces no error (happy path)', async () => {
    mockGetBrowsingContext.mockReturnValue({
      type: 'recordPage',
      objectNameSingular: 'document',
      recordId: 'document-record-id',
    });

    const { result } = renderHook(() => useDirectToolExecution(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.executeContextTool(readOnlyButton);
    });

    expect(mockStageAiChatPreprompt).toHaveBeenCalledTimes(1);
    expect(mockStageAiChatPreprompt).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'SEND' }),
    );
    expect(getThreadError()).toBeNull();
  });

  it('surfaces a refusal in the thread without dispatching (mutating tool)', async () => {
    const { result } = renderHook(() => useDirectToolExecution(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.executeContextTool({
        ...readOnlyButton,
        readOnly: false,
        requiresConfirmation: true,
      });
    });

    expect(mockStageAiChatPreprompt).not.toHaveBeenCalled();
    expect(getThreadError()?.message).toEqual(
      expect.stringContaining('cannot run directly'),
    );
  });

  it('surfaces a refusal in the thread when there is no browsing context', async () => {
    mockGetBrowsingContext.mockReturnValue(null);

    const { result } = renderHook(() => useDirectToolExecution(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.executeContextTool(readOnlyButton);
    });

    expect(mockStageAiChatPreprompt).not.toHaveBeenCalled();
    expect(getThreadError()?.message).toEqual(
      expect.stringContaining('open record or channel'),
    );
  });
});
