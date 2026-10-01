import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { type ReactNode } from 'react';

import { AiChatEmptyState } from '@/ai/components/AiChatEmptyState';
import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import { AgentChatComponentInstanceContext } from '@/ai/contexts/AgentChatComponentInstanceContext';
import { AiChatSurfaceContext } from '@/ai/contexts/AiChatSurfaceContext';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatIsAwaitingFirstChunkComponentFamilyState } from '@/ai/states/agentChatIsAwaitingFirstChunkComponentFamilyState';
import { agentChatIsStreamingComponentFamilyState } from '@/ai/states/agentChatIsStreamingComponentFamilyState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { type AiChatSurface } from '@/ai/types/AiChatSurface';
import {
  jotaiStore,
  resetJotaiStore,
} from '@/ui/utilities/state/jotai/jotaiStore';

jest.mock('@/ai/components/suggested-prompts/AiChatSuggestedPrompts', () => ({
  AiChatSuggestedPrompts: () => <div data-testid="suggested-prompts" />,
}));

jest.mock('@/ai/components/context-tools/AiChatContextToolButtons', () => ({
  AiChatContextToolButtons: () => <div data-testid="context-tool-buttons" />,
}));

jest.mock('@/ai/components/SynaLanding', () => ({
  SynaLanding: () => <div data-testid="syna-landing" />,
}));

const INSTANCE_ID = 'aiChatEmptyStateTest';
const THREAD_ID = 'thread-1';

const buildWrapper =
  (surface: AiChatSurface = AI_CHAT_SURFACE.SIDE_PANEL) =>
  ({ children }: { children: ReactNode }) => (
    <JotaiProvider store={jotaiStore}>
      <AgentChatComponentInstanceContext.Provider
        value={{ instanceId: INSTANCE_ID }}
      >
        <AiChatSurfaceContext.Provider value={surface}>
          {children}
        </AiChatSurfaceContext.Provider>
      </AgentChatComponentInstanceContext.Provider>
    </JotaiProvider>
  );

const Wrapper = buildWrapper();

describe('AiChatEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetJotaiStore();
    jotaiStore.set(currentAiChatThreadState.atom, THREAD_ID);
    jotaiStore.set(agentChatDisplayedThreadState.atom, THREAD_ID);
  });

  it('should render the suggested prompts when there is no message, no error and nothing loading', () => {
    const { getByTestId } = render(<AiChatEmptyState />, {
      wrapper: Wrapper,
    });

    expect(getByTestId('suggested-prompts')).toBeInTheDocument();
  });

  it('should render the context tool buttons alongside the suggested prompts', () => {
    const { getByTestId } = render(<AiChatEmptyState />, {
      wrapper: Wrapper,
    });

    expect(getByTestId('context-tool-buttons')).toBeInTheDocument();
  });

  it('should render the Syna landing on the page surface', () => {
    const { getByTestId } = render(<AiChatEmptyState />, {
      wrapper: buildWrapper(AI_CHAT_SURFACE.PAGE),
    });

    expect(getByTestId('syna-landing')).toBeInTheDocument();
  });

  it('should not render the Syna landing on the side panel surface', () => {
    const { queryByTestId } = render(<AiChatEmptyState />, {
      wrapper: buildWrapper(AI_CHAT_SURFACE.SIDE_PANEL),
    });

    expect(queryByTestId('syna-landing')).not.toBeInTheDocument();
  });

  it('should render nothing when the current thread is awaiting its first chunk', () => {
    jotaiStore.set(
      agentChatIsAwaitingFirstChunkComponentFamilyState.atomFamily({
        instanceId: INSTANCE_ID,
        familyKey: { threadId: THREAD_ID },
      }),
      true,
    );

    const { container } = render(<AiChatEmptyState />, {
      wrapper: Wrapper,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing when the current thread is streaming', () => {
    jotaiStore.set(
      agentChatIsStreamingComponentFamilyState.atomFamily({
        instanceId: INSTANCE_ID,
        familyKey: { threadId: THREAD_ID },
      }),
      true,
    );

    const { container } = render(<AiChatEmptyState />, {
      wrapper: Wrapper,
    });

    expect(container).toBeEmptyDOMElement();
  });
});
