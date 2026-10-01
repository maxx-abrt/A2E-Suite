import { styled } from '@linaria/react';
import { useContext } from 'react';

import { AiChatContextToolButtons } from '@/ai/components/context-tools/AiChatContextToolButtons';
import { SynaLanding } from '@/ai/components/SynaLanding';
import { AiChatSuggestedPrompts } from '@/ai/components/suggested-prompts/AiChatSuggestedPrompts';
import { AI_CHAT_SURFACE } from '@/ai/constants/AiChatSurface';
import { AiChatSurfaceContext } from '@/ai/contexts/AiChatSurfaceContext';
import { useShouldShowAiChatEmptyState } from '@/ai/hooks/useShouldShowAiChatEmptyState';

const StyledEmptyState = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
`;

type AiChatEmptyStateProps = {
  isCentered?: boolean;
};

export const AiChatEmptyState = ({
  isCentered = false,
}: AiChatEmptyStateProps) => {
  const shouldShowAiChatEmptyState = useShouldShowAiChatEmptyState();
  const aiChatSurface = useContext(AiChatSurfaceContext);

  if (!shouldShowAiChatEmptyState) {
    return null;
  }

  return (
    <StyledEmptyState>
      {/* The Syna home is the page's landing, never the side panel's compact
          ask box, so it is gated on the page surface only. */}
      {aiChatSurface === AI_CHAT_SURFACE.PAGE && <SynaLanding />}
      <AiChatContextToolButtons />
      <AiChatSuggestedPrompts isCentered={isCentered} />
    </StyledEmptyState>
  );
};
