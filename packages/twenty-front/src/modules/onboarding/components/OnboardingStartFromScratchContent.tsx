import { ONBOARDING_APP_CATALOGUE } from '@/onboarding/constants/OnboardingAppCatalogue';
import { ONBOARDING_CONTENT_BLOCK_WIDTH } from '@/onboarding/constants/OnboardingContentBlockWidth';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { MainButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  max-width: 100%;
  width: ${ONBOARDING_CONTENT_BLOCK_WIDTH}px;
`;

const StyledIntro = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
  margin: 0;
`;

const StyledCard = styled.div`
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
`;

const StyledAppRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};

  & + & {
    border-top: 1px solid ${themeCssVariables.border.color.light};
  }
`;

const StyledAppText = styled.div`
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

const StyledAppLabel = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  line-height: 1.4;
`;

const StyledAppDescription = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.4;
`;

const StyledAppHint = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.xs};
  line-height: 1.4;
  text-align: right;
`;

export type OnboardingStartFromScratchContentProps = {
  // Reuses the onboarding step's existing no-install completion (the same path
  // as Skip), so the scratch routes through the job's installed /
  // already-installed / failed semantics with an empty selection.
  onConfirm: () => void;
  isCompleting: boolean;
};

export const OnboardingStartFromScratchContent = ({
  onConfirm,
  isCompleting,
}: OnboardingStartFromScratchContentProps) => {
  const { t } = useLingui();

  return (
    <StyledPanel data-testid="onboarding-start-from-scratch-catalogue">
      <StyledIntro>
        {t`Nothing is installed. Each app below can be installed later from its landing page.`}
      </StyledIntro>
      <StyledCard>
        {ONBOARDING_APP_CATALOGUE.map((app) => (
          <StyledAppRow
            key={app.key}
            data-testid={`onboarding-app-catalogue-${app.key}`}
          >
            <StyledAppText>
              <StyledAppLabel>{t(app.label)}</StyledAppLabel>
              <StyledAppDescription>{t(app.description)}</StyledAppDescription>
            </StyledAppText>
            <StyledAppHint>
              {t`Installable later from its landing page`}
            </StyledAppHint>
          </StyledAppRow>
        ))}
      </StyledCard>
      <MainButton
        title={t`Start with an empty workspace`}
        onClick={onConfirm}
        disabled={isCompleting}
        fullWidth
      />
    </StyledPanel>
  );
};
