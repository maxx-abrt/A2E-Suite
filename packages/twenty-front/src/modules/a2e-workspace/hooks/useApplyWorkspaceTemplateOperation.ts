import { useMutation } from '@apollo/client/react';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { type A2eWorkspaceTemplate } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { APPLY_WORKSPACE_TEMPLATE_OPERATION } from '@/a2e-workspace/graphql/mutations/applyWorkspaceTemplateOperation';
import { type ApplyTemplateResult } from '@/a2e-workspace/types/apply-template-operation.types';
import { getApplyTemplateResultOutcome } from '@/a2e-workspace/utils/getApplyTemplateResultOutcome';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';

type ApplyWorkspaceTemplateOperationMutationData = {
  applyWorkspaceTemplateOperation: ApplyTemplateResult;
};

type ApplyWorkspaceTemplateOperationMutationVariables = {
  input: {
    idempotencyKey: string;
    template: A2eWorkspaceTemplate;
    templateVersion?: number;
    deselectedOptionalAppUniversalIdentifiers?: string[];
    sampleContentEnabled?: boolean;
  };
};

export type ApplyTemplateOperationArgs = {
  template: A2eWorkspaceTemplate;
  templateVersion?: number;
  deselectedOptionalAppUniversalIdentifiers?: string[];
  sampleContentEnabled?: boolean;
};

// One hook instance owns one idempotency key: the first call generates it and
// every retry with the same template reuses it, so the server resumes the
// same operation instead of duplicating seeds.
export const useApplyWorkspaceTemplateOperation = () => {
  const { t } = useLingui();
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();
  const [applyTemplateOperationMutation, { loading }] = useMutation<
    ApplyWorkspaceTemplateOperationMutationData,
    ApplyWorkspaceTemplateOperationMutationVariables
  >(APPLY_WORKSPACE_TEMPLATE_OPERATION);

  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [operationResult, setOperationResult] =
    useState<ApplyTemplateResult | null>(null);

  const applyTemplateOperation = useCallback(
    async ({
      template,
      templateVersion,
      deselectedOptionalAppUniversalIdentifiers,
      sampleContentEnabled,
    }: ApplyTemplateOperationArgs): Promise<ApplyTemplateResult | null> => {
      const operationKey = idempotencyKey ?? uuidv4();

      if (idempotencyKey === null) {
        setIdempotencyKey(operationKey);
      }

      try {
        const result = await applyTemplateOperationMutation({
          variables: {
            input: {
              idempotencyKey: operationKey,
              template,
              ...(isDefined(templateVersion) ? { templateVersion } : {}),
              ...(isDefined(deselectedOptionalAppUniversalIdentifiers)
                ? { deselectedOptionalAppUniversalIdentifiers }
                : {}),
              ...(isDefined(sampleContentEnabled)
                ? { sampleContentEnabled }
                : {}),
            },
          },
        });

        if (isDefined(result.error)) {
          throw result.error;
        }

        const applyTemplateResult =
          result.data?.applyWorkspaceTemplateOperation ?? null;

        if (isDefined(applyTemplateResult)) {
          setOperationResult(applyTemplateResult);
        }

        // A partial/failed run is not a finished setup: never report the whole
        // preset applied. The result is still returned so the caller can show
        // exactly which steps failed and retry them (C2).
        if (
          isDefined(applyTemplateResult) &&
          getApplyTemplateResultOutcome(applyTemplateResult) === 'applied'
        ) {
          enqueueSuccessSnackBar({
            message: t`Workspace template operation finished`,
          });
        } else {
          enqueueErrorSnackBar({
            message: t`Some setup steps failed. Successful steps are kept; retry re-runs only the remaining ones.`,
          });
        }

        return applyTemplateResult;
      } catch {
        enqueueErrorSnackBar({
          message: t`Failed to apply the workspace template. You can retry: only failed steps are re-run.`,
        });

        return null;
      }
    },
    [
      applyTemplateOperationMutation,
      enqueueSuccessSnackBar,
      enqueueErrorSnackBar,
      idempotencyKey,
      t,
    ],
  );

  const resetOperation = useCallback(() => {
    setIdempotencyKey(null);
    setOperationResult(null);
  }, []);

  return {
    applyTemplateOperation,
    resetOperation,
    operationResult,
    idempotencyKey,
    isLoading: loading,
  };
};
