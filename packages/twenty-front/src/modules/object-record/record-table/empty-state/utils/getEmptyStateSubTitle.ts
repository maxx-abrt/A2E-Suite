import { CoreObjectNameSingular } from 'twenty-shared/types';
import { t } from '@lingui/core/macro';

export const getEmptyStateSubTitle = (
  objectNameSingular: string,
  objectLabel: string,
) => {
  if (objectNameSingular === 'financeEntry')
    return t`Add a transaction or upload an invoice to get started.`;

  if (objectNameSingular === CoreObjectNameSingular.WorkflowVersion) {
    return t`Create a workflow and return here to view its versions`;
  }

  if (objectNameSingular === CoreObjectNameSingular.WorkflowRun) {
    return t`Run a workflow and return here to view its executions`;
  }

  return t`Use our API or add your first ${objectLabel} manually`;
};
