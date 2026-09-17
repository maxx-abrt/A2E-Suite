import { type A2eWorkspaceTemplate } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { useApplyWorkspaceTemplateOperation } from '@/a2e-workspace/hooks/useApplyWorkspaceTemplateOperation';
import { useWorkspaceTemplatePreview } from '@/a2e-workspace/hooks/useWorkspaceTemplatePreview';
import { type ApplyTemplateStep } from '@/a2e-workspace/types/apply-template-operation.types';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Checkbox, MainButton } from 'twenty-ui/input';
import { IconAlertTriangle, IconCheck, IconMinus, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPreviewPanel = styled.div`
  background-color: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledPreviewRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledRowText = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledRowSubText = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledBlockedText = styled.span`
  align-items: center;
  color: ${themeCssVariables.color.red};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledStepsList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  padding: 0;
`;

const StyledStepItem = styled.li`
  align-items: center;
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  list-style: none;
`;

const StyledStepIcon = styled.span<{ status: ApplyTemplateStep['status'] }>`
  align-items: center;
  color: ${({ status }) =>
    status === 'SUCCEEDED'
      ? themeCssVariables.color.green
      : status === 'FAILED'
        ? themeCssVariables.color.red
        : themeCssVariables.font.color.tertiary};
  display: flex;
`;

const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
`;

const StyledApplyButton = styled.div`
  width: 220px;
`;

const STEP_KIND_LABELS: Record<ApplyTemplateStep['kind'], string> = {
  INSTALL_APP: 'app installation',
  NAVIGATION_VISIBILITY: 'navigation update',
  SEED_SAMPLES: 'sample content',
  SET_WORKSPACE_TEMPLATE: 'template activation',
};

const StepStatusIcon = ({
  status,
}: {
  status: ApplyTemplateStep['status'];
}) => {
  if (status === 'SUCCEEDED') {
    return <IconCheck size={themeCssVariables.icon.size.sm} />;
  }

  if (status === 'FAILED') {
    return <IconX size={themeCssVariables.icon.size.sm} />;
  }

  return <IconMinus size={themeCssVariables.icon.size.sm} />;
};

export type A2eWorkspaceTemplatePreviewProps = {
  template: A2eWorkspaceTemplate;
  onApplied?: () => void;
};

export const A2eWorkspaceTemplatePreview = ({
  template,
  onApplied,
}: A2eWorkspaceTemplatePreviewProps) => {
  const { t } = useLingui();
  const [deselectedUniversalIdentifiers, setDeselectedUniversalIdentifiers] =
    useState<string[]>([]);
  const [sampleContentEnabled, setSampleContentEnabled] = useState(false);
  const { preview, isLoading: isLoadingPreview } = useWorkspaceTemplatePreview({
    template,
  });
  const {
    applyTemplateOperation,
    resetOperation,
    operationResult,
    isLoading: isApplying,
  } = useApplyWorkspaceTemplateOperation();

  const toggleOptionalApp = useCallback((universalIdentifier: string) => {
    setDeselectedUniversalIdentifiers((current) =>
      current.includes(universalIdentifier)
        ? current.filter((identifier) => identifier !== universalIdentifier)
        : [...current, universalIdentifier],
    );
  }, []);

  const handleApply = useCallback(async () => {
    const result = await applyTemplateOperation({
      template,
      templateVersion: preview?.version,
      deselectedOptionalAppUniversalIdentifiers: deselectedUniversalIdentifiers,
      sampleContentEnabled,
    });

    if (isDefined(result)) {
      resetOperation();
      onApplied?.();
    }
    // On partial failure the result is kept: failed steps stay visible with
    // their error codes and a later click retries only them (same hook, so
    // the same idempotency key).
  }, [
    applyTemplateOperation,
    deselectedUniversalIdentifiers,
    onApplied,
    preview?.version,
    resetOperation,
    sampleContentEnabled,
    template,
  ]);

  if (isLoadingPreview) {
    return null;
  }

  if (!isDefined(preview)) {
    return (
      <StyledPreviewPanel>
        <StyledRowSubText>
          {t`Preview unavailable — the template can still be applied.`}
        </StyledRowSubText>
        <StyledFooter>
          <StyledApplyButton>
            <MainButton
              title={t`Apply template`}
              onClick={handleApply}
              disabled={isApplying}
              fullWidth
            />
          </StyledApplyButton>
        </StyledFooter>
      </StyledPreviewPanel>
    );
  }

  const hasSteps = isNonEmptyArray(operationResult?.steps ?? []);

  return (
    <StyledPreviewPanel data-testid="a2e-workspace-template-preview">
      {preview.apps.map((previewApp) => (
        <StyledPreviewRow key={previewApp.universalIdentifier}>
          <StyledRowText>{previewApp.displayName}</StyledRowText>
          {previewApp.required ? (
            <StyledRowSubText>{t`required`}</StyledRowSubText>
          ) : previewApp.currentlyInstalled ? (
            <StyledRowSubText>{t`already installed`}</StyledRowSubText>
          ) : (
            <Checkbox
              aria-label={t`Include ${previewApp.displayName}`}
              checked={
                !deselectedUniversalIdentifiers.includes(
                  previewApp.universalIdentifier,
                )
              }
              onCheckedChange={() =>
                toggleOptionalApp(previewApp.universalIdentifier)
              }
            />
          )}
          {(!previewApp.registered || !previewApp.versionCompatible) && (
            <StyledBlockedText>
              {!previewApp.registered
                ? t`not registered on this server`
                : t`incompatible version`}
            </StyledBlockedText>
          )}
        </StyledPreviewRow>
      ))}
      {isNonEmptyArray(preview.samples) && (
        <StyledPreviewRow>
          <Checkbox
            aria-label={t`Include sample content`}
            checked={sampleContentEnabled}
            onCheckedChange={setSampleContentEnabled}
          />
          <StyledRowSubText>
            {t`Add sample content (${preview.samples.length})`}
          </StyledRowSubText>
        </StyledPreviewRow>
      )}
      {preview.blocked && (
        <StyledBlockedText>
          <IconAlertTriangle size={themeCssVariables.icon.size.sm} />
          {t`A required app is unavailable. Apply stays disabled until it is registered and compatible.`}
        </StyledBlockedText>
      )}
      {hasSteps && (
        <StyledStepsList>
          {operationResult!.steps.map((step) => (
            <StyledStepItem
              key={`${step.kind}-${step.targetUniversalIdentifier ?? 'workspace'}`}
            >
              <StyledStepIcon status={step.status}>
                <StepStatusIcon status={step.status} />
              </StyledStepIcon>
              <StyledRowText>
                {t({
                  id: STEP_KIND_LABELS[step.kind],
                  message: STEP_KIND_LABELS[step.kind],
                })}
                {isDefined(step.targetUniversalIdentifier) && (
                  <StyledRowSubText>
                    {' '}
                    · {step.targetUniversalIdentifier}
                  </StyledRowSubText>
                )}
              </StyledRowText>
              {step.status === 'FAILED' && (
                <StyledBlockedText>
                  {isDefined(step.localizedMessage)
                    ? step.localizedMessage
                    : (step.errorCode ?? t`failed`)}
                </StyledBlockedText>
              )}
            </StyledStepItem>
          ))}
        </StyledStepsList>
      )}
      <StyledFooter>
        <StyledApplyButton>
          <MainButton
            title={
              hasSteps &&
              operationResult!.steps.some((step) => step.status === 'FAILED')
                ? t`Retry failed steps`
                : t`Apply template`
            }
            onClick={handleApply}
            disabled={preview.blocked || isApplying}
            fullWidth
          />
        </StyledApplyButton>
      </StyledFooter>
    </StyledPreviewPanel>
  );
};
