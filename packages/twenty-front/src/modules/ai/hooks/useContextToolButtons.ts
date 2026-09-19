import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { useGetToolIndex } from '@/ai/hooks/useGetToolIndex';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import { getContextToolButtons } from '@/ai/utils/getContextToolButtons';
import { useAiChatSuggestedPromptsContext } from '@/ai/hooks/useAiChatSuggestedPromptsContext';
import { useInstalledApplications } from '@/applications/hooks/useInstalledApplications';
import { logicFunctionsSelector } from '@/logic-functions/states/logicFunctionsSelector';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// Consumes the native registry (getToolIndex) plus the metadata store; the
// context and its permissions come from the context-store-backed hooks.
export const useContextToolButtons = (): ContextToolButton[] => {
  const { toolIndex } = useGetToolIndex();
  const logicFunctions = useAtomStateValue(logicFunctionsSelector);
  const installedApplications = useInstalledApplications();
  const aiChatSuggestedPromptsContext = useAiChatSuggestedPromptsContext();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  const objectMetadataItem = objectMetadataItems.find(
    (item) =>
      item.nameSingular === aiChatSuggestedPromptsContext?.objectNameSingular,
  );

  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem?.id ?? '',
  );

  const installedApplicationIds = useMemo(
    () => new Set(installedApplications.map((application) => application.id)),
    [installedApplications],
  );

  const context = useMemo(
    () =>
      isDefined(aiChatSuggestedPromptsContext) && isDefined(objectMetadataItem)
        ? { applicationId: objectMetadataItem.applicationId }
        : null,
    [aiChatSuggestedPromptsContext, objectMetadataItem],
  );

  return useMemo(
    () =>
      getContextToolButtons({
        toolIndex,
        logicFunctions,
        installedApplicationIds,
        context,
        canReadContextObject: objectPermissions.canReadObjectRecords,
      }),
    [
      toolIndex,
      logicFunctions,
      installedApplicationIds,
      context,
      objectPermissions.canReadObjectRecords,
    ],
  );
};
