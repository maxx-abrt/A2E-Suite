import {
  type ApplyTemplateResult,
  type ApplyTemplateStep,
} from '@/a2e-workspace/types/apply-template-operation.types';
import { isDefined } from 'twenty-shared/utils';

// Whether a setup operation reads as fully applied, partially applied (some
// steps succeeded, some did not) or not applied at all. `applied` needs the
// server to have set the template row AND no step left failed or in flight —
// a failed seed/navigation step must never read as the whole preset applied
// (docs/plan/05-template-contracts.md §5, C2).
export type ApplyTemplateResultOutcome = 'applied' | 'partial' | 'failed';

export const isApplyTemplateStepFailed = (step: ApplyTemplateStep): boolean =>
  step.status === 'FAILED';

const isApplyTemplateStepInFlight = (step: ApplyTemplateStep): boolean =>
  step.status === 'PENDING' || step.status === 'RUNNING';

export const getApplyTemplateResultOutcome = (
  result: ApplyTemplateResult,
): ApplyTemplateResultOutcome => {
  const hasUnfinishedStep = result.steps.some(
    (step) =>
      isApplyTemplateStepFailed(step) || isApplyTemplateStepInFlight(step),
  );

  if (isDefined(result.appliedTemplateKeyVersion) && !hasUnfinishedStep) {
    return 'applied';
  }

  return result.steps.some((step) => step.status === 'SUCCEEDED')
    ? 'partial'
    : 'failed';
};
