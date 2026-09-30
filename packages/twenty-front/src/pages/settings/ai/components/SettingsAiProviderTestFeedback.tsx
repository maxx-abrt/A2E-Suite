import { styled } from '@linaria/react';

import { Trans } from '@lingui/react/macro';
import { IconAlertCircle, IconCheck } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type WorkspaceAiProviderTestResult } from '~/pages/settings/ai/types/WorkspaceAiProviderTestResult';
import { getWorkspaceAiProviderTestErrorMessage } from '~/pages/settings/ai/utils/getWorkspaceAiProviderTestErrorMessage';

const StyledFeedback = styled.div<{ isSuccess: boolean }>`
  align-items: center;
  color: ${({ isSuccess }) =>
    isSuccess
      ? themeCssVariables.color.green
      : themeCssVariables.font.color.danger};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

type SettingsAiProviderTestFeedbackProps = {
  testResult: WorkspaceAiProviderTestResult | null;
  isTesting: boolean;
};

export const SettingsAiProviderTestFeedback = ({
  testResult,
  isTesting,
}: SettingsAiProviderTestFeedbackProps) => {
  if (isTesting) {
    return (
      <StyledFeedback isSuccess={false}>
        <Trans>Testing key…</Trans>
      </StyledFeedback>
    );
  }

  if (!testResult) {
    return null;
  }

  if (testResult.success) {
    return (
      <StyledFeedback isSuccess={true}>
        <IconCheck size={16} />
        <Trans>
          Key is valid — the provider answered with {testResult.model}
        </Trans>
      </StyledFeedback>
    );
  }

  return (
    <StyledFeedback isSuccess={false}>
      <IconAlertCircle size={16} />
      {getWorkspaceAiProviderTestErrorMessage(testResult.errorCode)}
    </StyledFeedback>
  );
};
