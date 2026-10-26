import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { useSynaRecipeApply } from '@/ai/hooks/useSynaRecipeApply';
import { findSynaRecipeDescriptor } from '@/ai/utils/findSynaRecipeDescriptor';
import { useAgendaTemplateApply } from '@/calendar/hooks/useAgendaTemplateApply';
import { findAgendaTemplateDescriptor } from '@/calendar/utils/findAgendaTemplateDescriptor';
import { logicFunctionsSelector } from '@/logic-functions/states/logicFunctionsSelector';
import { collectTemplateApplyLogicFunctions } from '@/template-gallery/utils/collectTemplateApplyLogicFunctions';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMutation } from '@apollo/client/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ExecuteOneLogicFunctionDocument,
  type ExecuteOneLogicFunctionMutation,
} from '~/generated-metadata/graphql';
import {
  isTemplateApplyResult,
  type TemplateApplyResult,
} from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Each descriptor keeps its own retry identity within the gallery session.
// A shared identity would make another template resolve to the previous copy.
export const useApplyTemplate = () => {
  const applications = useAtomStateValue(applicationsSelector);
  const logicFunctions = useAtomStateValue(logicFunctionsSelector);
  const [executeOneLogicFunction] =
    useMutation<ExecuteOneLogicFunctionMutation>(
      ExecuteOneLogicFunctionDocument,
    );
  const { applyAgendaTemplateItem, isApplying: isApplyingAgendaTemplate } =
    useAgendaTemplateApply();
  const { applySynaRecipeItem, isApplying: isApplyingSynaRecipe } =
    useSynaRecipeApply();
  const [isApplying, setIsApplying] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  // Pending promises must coalesce clicks before React can render the busy state.
  // oxlint-disable-next-line twenty/no-state-useref
  const inFlight = useRef(
    new Map<string, Promise<TemplateApplyResult | null>>(),
  );

  const targets = useMemo(
    () => collectTemplateApplyLogicFunctions({ logicFunctions, applications }),
    [logicFunctions, applications],
  );

  const applyTemplate = useCallback(
    (item: TemplateGalleryItem): Promise<TemplateApplyResult | null> => {
      const operationId = uuidv5(
        JSON.stringify([
          item.sourceApplication.universalIdentifier,
          item.descriptor.key,
        ]),
        sessionId,
      );
      const pending = inFlight.current.get(operationId);
      if (isDefined(pending)) return pending;
      const apply = async (): Promise<TemplateApplyResult | null> => {
        try {
          if (isDefined(findSynaRecipeDescriptor(item.descriptor.key)))
            return await applySynaRecipeItem(item.descriptor.key, operationId);
          if (isDefined(findAgendaTemplateDescriptor(item.descriptor.key)))
            return await applyAgendaTemplateItem(
              item.descriptor.key,
              operationId,
            );
          const target = targets.find(
            (candidate) =>
              candidate.application.universalIdentifier ===
              item.sourceApplication.universalIdentifier,
          );
          if (!isDefined(target)) return null;
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
        }
      };
      setIsApplying(true);
      const operation = apply().finally(() => {
        inFlight.current.delete(operationId);
        setIsApplying(inFlight.current.size > 0);
      });
      inFlight.current.set(operationId, operation);
      return operation;
    },
    [
      applyAgendaTemplateItem,
      applySynaRecipeItem,
      executeOneLogicFunction,
      sessionId,
      targets,
    ],
  );

  return {
    applyTemplate,
    isApplying: isApplying || isApplyingAgendaTemplate || isApplyingSynaRecipe,
  };
};
