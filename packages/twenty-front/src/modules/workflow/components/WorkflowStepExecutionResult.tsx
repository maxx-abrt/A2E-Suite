import { LightCopyIconButton } from '@/object-record/record-field/ui/components/LightCopyIconButton';
import { MONOSPACE_FONT_FAMILY } from '@/ui/theme/constants/MonospaceFontFamily';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import {
  IconLoader,
  IconSquareRoundedCheck,
  IconSquareRoundedX,
} from 'twenty-ui/icon';
import { CodeEditor, CoreEditorHeader } from 'twenty-ui/input';
import { AnimatedCircleLoading } from 'twenty-ui/layout';
import { themeCssVariables, ThemeContext } from 'twenty-ui/theme-constants';
import { useContext } from 'react';
const StyledContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

const StyledCodeEditorWrapper = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

const StyledPlainTextOutput = styled.pre<{ height: string | number }>`
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: ${MONOSPACE_FONT_FAMILY};
  font-size: ${themeCssVariables.font.size.md};
  height: ${({ height }) =>
    typeof height === 'number' ? `${height}px` : height};
  margin: 0;
  min-height: 0;
  overflow: auto;
  overflow-wrap: anywhere;
  padding: ${themeCssVariables.spacing[3]};
  white-space: pre-wrap;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -2px;
  }
`;

type OutputAccent = 'default' | 'success' | 'error';

const StyledInfoContainer = styled.div`
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
`;

const StyledOutput = styled.div<{ accent?: OutputAccent }>`
  align-items: center;
  color: ${({ accent }) =>
    accent === 'success'
      ? themeCssVariables.color.turquoise
      : accent === 'error'
        ? themeCssVariables.color.red
        : themeCssVariables.font.color.secondary};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledStatusInfo = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

export type ExecutionStatus = {
  isSuccess: boolean;
  isError: boolean;
  successMessage?: string;
  errorMessage?: string;
  additionalInfo?: string;
};

type WorkflowStepExecutionResultProps = {
  result: string;
  language: 'plaintext' | 'json';
  height?: string | number;
  status: ExecutionStatus;
  isTesting?: boolean;
  loadingMessage?: string;
  idleMessage?: string;
};

export const WorkflowStepExecutionResult = ({
  result,
  language,
  height = '100%',
  status,
  isTesting = false,
  loadingMessage = t`Processing...`,
  idleMessage = t`Output`,
}: WorkflowStepExecutionResultProps) => {
  const { theme } = useContext(ThemeContext);

  const SuccessLeftNode = (
    <StyledOutput accent="success">
      <IconSquareRoundedCheck size={theme.icon.size.md} />
      <div>
        <div>{status.successMessage}</div>
        {status.additionalInfo && (
          <StyledStatusInfo>{status.additionalInfo}</StyledStatusInfo>
        )}
      </div>
    </StyledOutput>
  );

  const ErrorLeftNode = (
    <StyledOutput accent="error">
      <IconSquareRoundedX size={theme.icon.size.md} />
      <div>
        <div>{status.errorMessage}</div>
        {status.additionalInfo && (
          <StyledStatusInfo>{status.additionalInfo}</StyledStatusInfo>
        )}
      </div>
    </StyledOutput>
  );

  const IdleLeftNode = idleMessage;

  const PendingLeftNode = isTesting && (
    <StyledOutput>
      <AnimatedCircleLoading>
        <IconLoader size={theme.icon.size.md} />
      </AnimatedCircleLoading>
      <StyledInfoContainer>{loadingMessage}</StyledInfoContainer>
    </StyledOutput>
  );

  const computeLeftNode = () => {
    if (isTesting) {
      return PendingLeftNode;
    }
    if (status.isError) {
      return ErrorLeftNode;
    }
    if (status.isSuccess) {
      return SuccessLeftNode;
    }
    return IdleLeftNode;
  };

  return (
    <StyledContainer>
      <CoreEditorHeader
        leftNodes={[computeLeftNode()]}
        rightNodes={[<LightCopyIconButton copyText={result} />]}
      />
      <StyledCodeEditorWrapper>
        {language === 'plaintext' && !isTesting ? (
          <StyledPlainTextOutput
            height={height}
            role="region"
            aria-label={t`Output`}
            tabIndex={0}
          >
            {result}
          </StyledPlainTextOutput>
        ) : (
          <CodeEditor
            resizable={true}
            value={result}
            language={language}
            height={height}
            options={{ readOnly: true, domReadOnly: true }}
            isLoading={isTesting}
            variant="with-header"
          />
        )}
      </StyledCodeEditorWrapper>
    </StyledContainer>
  );
};
