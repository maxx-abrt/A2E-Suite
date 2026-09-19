import { styled } from '@linaria/react';

import { AiChatContextToolButtons } from '@/ai/components/context-tools/AiChatContextToolButtons';
import { AiChatSuggestedPrompts } from '@/ai/components/suggested-prompts/AiChatSuggestedPrompts';
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

  if (!shouldShowAiChatEmptyState) {
    return null;
  }

  return (
    <StyledEmptyState>
      <AiChatContextToolButtons />
      <AiChatSuggestedPrompts isCentered={isCentered} />
    </StyledEmptyState>
  );
};
