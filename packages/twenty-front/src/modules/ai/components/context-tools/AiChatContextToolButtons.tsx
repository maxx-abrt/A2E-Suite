import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconSparkles } from 'twenty-ui/icon';
import { LightButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useContextToolButtons } from '@/ai/hooks/useContextToolButtons';
import { useStageAiChatPreprompt } from '@/ai/hooks/useStageAiChatPreprompt';
import { AGENT_CHAT_NEW_THREAD_DRAFT_KEY } from '@/ai/states/agentChatDraftsByThreadIdState';
import { currentAiChatThreadState } from '@/ai/states/currentAiChatThreadState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  height: 24px;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

const StyledToolList = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

export const AiChatContextToolButtons = () => {
  const { t } = useLingui();
  const contextToolButtons = useContextToolButtons();
  const { stageAiChatPreprompt } = useStageAiChatPreprompt();
  const currentAiChatThread = useAtomStateValue(currentAiChatThreadState);

  if (contextToolButtons.length === 0) {
    return null;
  }

  return (
    <StyledContainer>
      <StyledTitle>{t`App actions for this context`}</StyledTitle>
      <StyledToolList>
        {contextToolButtons.map((contextToolButton) => (
          <LightButton
            key={contextToolButton.toolName}
            Icon={IconSparkles}
            title={contextToolButton.label}
            accent="secondary"
            onClick={() =>
              stageAiChatPreprompt({
                text: t`Use the "${contextToolButton.label}" action on what I am looking at.`,
                mode: contextToolButton.requiresConfirmation
                  ? 'PREFILL'
                  : 'SEND',
                draftKey:
                  currentAiChatThread ?? AGENT_CHAT_NEW_THREAD_DRAFT_KEY,
              })
            }
          />
        ))}
      </StyledToolList>
    </StyledContainer>
  );
};
