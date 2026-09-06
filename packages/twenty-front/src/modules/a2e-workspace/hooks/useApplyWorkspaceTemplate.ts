import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';

import { type A2eWorkspaceTemplate } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { APPLY_WORKSPACE_TEMPLATE } from '@/a2e-workspace/graphql/mutations/applyWorkspaceTemplate';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';

type ApplyWorkspaceTemplateMutationData = {
  applyWorkspaceTemplate: {
    success: boolean;
  };
};

type ApplyWorkspaceTemplateMutationVariables = {
  input: {
    template: A2eWorkspaceTemplate;
  };
};

export const useApplyWorkspaceTemplate = () => {
  const { t } = useLingui();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [applyWorkspaceTemplateMutation, { loading }] = useMutation<
    ApplyWorkspaceTemplateMutationData,
    ApplyWorkspaceTemplateMutationVariables
  >(APPLY_WORKSPACE_TEMPLATE);
  const [appliedTemplate, setAppliedTemplate] =
    useState<A2eWorkspaceTemplate | null>(null);

  const applyWorkspaceTemplate = useCallback(
    async (template: A2eWorkspaceTemplate) => {
      try {
        const result = await applyWorkspaceTemplateMutation({
          variables: { input: { template } },
        });

        if (isDefined(result.error)) {
          throw result.error;
        }

        setAppliedTemplate(template);
        enqueueSuccessSnackBar(t`Workspace template applied`);
      } catch {
        enqueueErrorSnackBar(t`Failed to apply the workspace template`);
      }
    },
    [
      applyWorkspaceTemplateMutation,
      enqueueSuccessSnackBar,
      enqueueErrorSnackBar,
      t,
    ],
  );

  return { applyWorkspaceTemplate, appliedTemplate, isLoading: loading };
};
