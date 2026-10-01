import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { logicFunctionsSelector } from '@/logic-functions/states/logicFunctionsSelector';
import { collectTemplateApplyLogicFunctions } from '@/template-gallery/utils/collectTemplateApplyLogicFunctions';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMutation } from '@apollo/client/react';
import { useCallback, useMemo, useState } from 'react';
import {
  ExecuteOneLogicFunctionDocument,
  type ExecuteOneLogicFunctionMutation,
} from '~/generated-metadata/graphql';
import {
  isTemplateApplyResult,
  type TemplateApplyResult,
} from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';
import { v4 as uuidv4 } from 'uuid';

// The gallery's write path (US-132, per the US-131 handoff). Resolving the
// owning app's `apply-template` function and executing it with the descriptor
// key keeps the write in the app that owns the descriptor, so the gallery never
// forks a template-copy implementation. One operation id per gallery session
// makes a retried apply idempotent inside the app.
export const useApplyTemplate = () => {
  const applications = useAtomStateValue(applicationsSelector);
  const logicFunctions = useAtomStateValue(logicFunctionsSelector);
  const [executeOneLogicFunction] =
    useMutation<ExecuteOneLogicFunctionMutation>(
      ExecuteOneLogicFunctionDocument,
    );
  const [isApplying, setIsApplying] = useState(false);
  const [operationId] = useState(() => uuidv4());

  const targets = useMemo(
    () => collectTemplateApplyLogicFunctions({ logicFunctions, applications }),
    [logicFunctions, applications],
  );

  const applyTemplate = useCallback(
    async (item: TemplateGalleryItem): Promise<TemplateApplyResult | null> => {
      const target = targets.find(
        (candidate) =>
          candidate.application.universalIdentifier ===
          item.sourceApplication.universalIdentifier,
      );

      if (!isDefined(target)) {
        return null;
      }

      setIsApplying(true);

      try {
        const response = await executeOneLogicFunction({
          variables: {
            input: {
              id: target.logicFunctionId,
              payload: {
                key: item.descriptor.key,
                inputs: null,
                operationId,
              },
            },
          },
        });

        const result = response.data?.executeOneLogicFunction?.data;

        return isTemplateApplyResult(result) ? result : null;
      } catch {
        return null;
      } finally {
        setIsApplying(false);
      }
    },
    [executeOneLogicFunction, operationId, targets],
  );

  return { applyTemplate, isApplying };
};
