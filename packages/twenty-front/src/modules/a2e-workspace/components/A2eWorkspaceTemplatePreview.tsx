import { type A2eWorkspaceTemplate } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { useApplyWorkspaceTemplateOperation } from '@/a2e-workspace/hooks/useApplyWorkspaceTemplateOperation';
import { useWorkspaceTemplatePreview } from '@/a2e-workspace/hooks/useWorkspaceTemplatePreview';
import { type ApplyTemplateStep } from '@/a2e-workspace/types/apply-template-operation.types';
import { getApplyTemplateResultOutcome } from '@/a2e-workspace/utils/getApplyTemplateResultOutcome';
import {
  resolveTemplatePreview,
  type TemplatePreviewAppResolution,
} from '@/a2e-workspace/utils/resolveTemplatePreview';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useState } from 'react';
import { isDefined, isNonEmptyArray } from 'twenty-shared/utils';
import { Checkbox, MainButton } from 'twenty-ui/input';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconLoader,
  IconPlayerPause,
  IconX,
} from 'twenty-ui/icon';
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

const StyledContentList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  padding-left: ${themeCssVariables.spacing[6]};
`;

const StyledContentItem = styled.li`
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

const StyledOutcomeBanner = styled.span<{ isFailed: boolean }>`
  align-items: center;
  color: ${({ isFailed }) =>
    isFailed ? themeCssVariables.color.red : themeCssVariables.color.orange};
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

const ResolutionLabel = ({
  resolution,
}: {
  resolution: TemplatePreviewAppResolution;
}) => {
  const { t } = useLingui();

  if (resolution === 'install') {
    return <>{t`will install`}</>;
  }

  if (resolution === 'keep') {
    return <>{t`already installed`}</>;
  }

  return <>{t`unavailable`}</>;
};

const StepKindLabel = ({ kind }: { kind: ApplyTemplateStep['kind'] }) => {
  const { t } = useLingui();

  if (kind === 'INSTALL_APP') {
    return <>{t`app installation`}</>;
  }

  if (kind === 'NAVIGATION_VISIBILITY') {
    return <>{t`navigation update`}</>;
  }

  if (kind === 'SEED_SAMPLES') {
    return <>{t`sample content`}</>;
  }

  return <>{t`template activation`}</>;
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

  if (status === 'RUNNING') {
    return <IconLoader size={themeCssVariables.icon.size.sm} />;
  }

  if (status === 'PENDING') {
    return <IconClock size={themeCssVariables.icon.size.sm} />;
  }

  return <IconPlayerPause size={themeCssVariables.icon.size.sm} />;
};

const StepStatusLabel = ({
  status,
}: {
  status: ApplyTemplateStep['status'];
}) => {
  const { t } = useLingui();

  if (status === 'PENDING') {
    return <>{t`pending`}</>;
  }

  if (status === 'RUNNING') {
    return <>{t`in progress`}</>;
  }

  if (status === 'SUCCEEDED') {
    return <>{t`succeeded`}</>;
  }

  if (status === 'FAILED') {
    return <>{t`failed`}</>;
  }

  return <>{t`skipped`}</>;
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

    // A partial or failed run keeps its result: the successful steps stay,
    // exactly what failed stays visible, and the next click resumes the same
    // operation (same hook instance, so the same idempotency key). Only a run
    // whose template row was actually set is reported as applied (C2).
    if (
      isDefined(result) &&
      getApplyTemplateResultOutcome(result) === 'applied'
    ) {
      resetOperation();
      onApplied?.();
    }
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
  const operationOutcome = isDefined(operationResult)
    ? getApplyTemplateResultOutcome(operationResult)
    : null;

  const resolvedPreview = resolveTemplatePreview(
    preview,
    deselectedUniversalIdentifiers,
  );

  return (
    <StyledPreviewPanel data-testid="a2e-workspace-template-preview">
      {resolvedPreview.apps.map((resolvedApp) => (
        <StyledPreviewRow key={resolvedApp.universalIdentifier}>
          <StyledRowText>{resolvedApp.displayName}</StyledRowText>
          {resolvedApp.required && (
            <StyledRowSubText>{t`required`}</StyledRowSubText>
          )}
          <StyledRowSubText>
            <ResolutionLabel resolution={resolvedApp.resolution} />
          </StyledRowSubText>
          {resolvedApp.optional &&
            resolvedApp.available &&
            !resolvedApp.currentlyInstalled && (
              <Checkbox
                aria-label={t`Include ${resolvedApp.displayName}`}
                checked={!resolvedApp.excluded}
                onCheckedChange={() =>
                  toggleOptionalApp(resolvedApp.universalIdentifier)
                }
              />
            )}
          {!resolvedApp.available && (
            <StyledBlockedText>
              {!resolvedApp.registered
                ? t`not registered on this server`
                : t`incompatible version`}
            </StyledBlockedText>
          )}
        </StyledPreviewRow>
      ))}
      {isNonEmptyArray(resolvedPreview.prerequisites) && (
        <StyledContentList data-testid="a2e-workspace-template-preview-prerequisites">
          {resolvedPreview.prerequisites.map((prerequisite) => (
            <StyledContentItem key={prerequisite.universalIdentifier}>
              {t`Required prerequisite unavailable: ${prerequisite.displayName}`}
            </StyledContentItem>
          ))}
        </StyledContentList>
      )}
      {isNonEmptyArray(resolvedPreview.navigationChanges) && (
        <>
          <StyledRowSubText>{t`Navigation customization`}</StyledRowSubText>
          <StyledContentList data-testid="a2e-workspace-template-preview-navigation">
            {resolvedPreview.navigationChanges.map((navigationChange) => (
              <StyledContentItem
                key={`${navigationChange.action}-${navigationChange.universalIdentifier}`}
              >
                {navigationChange.action === 'hide'
                  ? t`Hide ${navigationChange.universalIdentifier}`
                  : t`Restore ${navigationChange.universalIdentifier}`}
              </StyledContentItem>
            ))}
          </StyledContentList>
        </>
      )}
      {isNonEmptyArray(preview.samples) && (
        <>
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
          {/* Previewed bundle contents: read-only proposal of what the
              persona's ready apps will seed. */}
          <StyledContentList data-testid="a2e-workspace-template-preview-contents">
            {preview.samples.map((sample) => (
              <StyledContentItem key={`${sample.locale}-${sample.label}`}>
                {sample.label}
              </StyledContentItem>
            ))}
          </StyledContentList>
        </>
      )}
      {preview.blocked && (
        <StyledBlockedText>
          <IconAlertTriangle size={themeCssVariables.icon.size.sm} />
          {t`A required app is unavailable. Apply stays disabled until it is registered and compatible.`}
        </StyledBlockedText>
      )}
      {isDefined(operationOutcome) && operationOutcome !== 'applied' && (
        <StyledOutcomeBanner
          data-testid="a2e-workspace-template-preview-operation-outcome"
          isFailed={operationOutcome === 'failed'}
        >
          <IconAlertTriangle size={themeCssVariables.icon.size.sm} />
          {operationOutcome === 'partial'
            ? t`Some steps failed. Successful steps are kept; retry re-runs only the remaining ones.`
            : t`Setup did not complete. Retry re-runs the same operation.`}
        </StyledOutcomeBanner>
      )}
      {hasSteps && (
        <StyledStepsList data-testid="a2e-workspace-template-preview-steps">
          {operationResult!.steps.map((step) => (
            <StyledStepItem
              key={[
                step.kind,
                step.targetUniversalIdentifier ?? 'workspace',
                step.status,
              ].join('-')}
            >
              <StyledStepIcon status={step.status}>
                <StepStatusIcon status={step.status} />
              </StyledStepIcon>
              <StyledRowText>
                <StepKindLabel kind={step.kind} />
                <StyledRowSubText>
                  {' '}
                  · <StepStatusLabel status={step.status} />
                </StyledRowSubText>
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
              hasSteps && operationOutcome !== 'applied'
                ? t`Retry remaining steps`
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
