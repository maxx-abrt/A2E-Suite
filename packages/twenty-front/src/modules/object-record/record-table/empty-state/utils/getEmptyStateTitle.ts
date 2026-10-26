import { CoreObjectNameSingular } from 'twenty-shared/types';
import { t } from '@lingui/core/macro';

export const getEmptyStateTitle = (
  objectNameSingular: string,
  objectLabel: string,
) => {
  if (objectNameSingular === 'financeEntry') return t`No transactions yet`;

  if (objectNameSingular === CoreObjectNameSingular.WorkflowVersion) {
    return t`No workflow versions yet`;
  }

  if (objectNameSingular === CoreObjectNameSingular.WorkflowRun) {
    return t`No workflow runs yet`;
  }

  return t`Add your first ${objectLabel}`;
};
