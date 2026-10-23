import { useCallback } from 'react';

import { useEnrichHeadlessCommandContextApiWithWorkflowVersionTriggerInformation } from '@/command-menu-item/engine-command/hooks/useEnrichHeadlessCommandContextApiWithWorkflowVersionTriggerInformation';
import { headlessCommandContextApisState } from '@/command-menu-item/engine-command/states/headlessCommandContextApisState';
import { buildHeadlessCommandContextApi } from '@/command-menu-item/engine-command/utils/buildHeadlessCommandContextApi';
import { useStore } from 'jotai';
import { isDefined } from 'twenty-shared/utils';
import {
  type CommandMenuItemAvailabilityType,
  type EngineComponentKey,
  type CommandMenuItemPayload,
} from '~/generated-metadata/graphql';

type MountCommandParams = {
  engineCommandId: string;
  contextStoreInstanceId: string;
  engineComponentKey: EngineComponentKey;
  frontComponentId?: string;
  workflowVersionId?: string;
  availabilityType?: CommandMenuItemAvailabilityType;
  availabilityObjectMetadataId?: string | null;
  payload?: CommandMenuItemPayload | null;
  navigationTargetObjectMetadataId?: string | null;
  isInSidePanel?: boolean;
  recordIndexId?: string;
};

export const useMountCommand = () => {
  const store = useStore();

  const {
    enrichHeadlessCommandContextApiWithWorkflowVersionTriggerInformation,
  } = useEnrichHeadlessCommandContextApiWithWorkflowVersionTriggerInformation();

  const mountCommand = useCallback(
    async ({
      engineCommandId,
      contextStoreInstanceId,
      engineComponentKey,
      frontComponentId,
      workflowVersionId,
      availabilityType,
      availabilityObjectMetadataId,
      payload,
      navigationTargetObjectMetadataId,
      isInSidePanel,
      recordIndexId,
    }: MountCommandParams) => {
      const baseContextApi = buildHeadlessCommandContextApi({
        store,
        contextStoreInstanceId,
        engineComponentKey,
        payload,
        navigationTargetObjectMetadataId,
        isInSidePanel,
      });
      // Embedded tables keep separate filter state even when they share a saved view.
      const headlessEngineCommandContextApi = isDefined(recordIndexId)
        ? { ...baseContextApi, recordIndexId }
        : baseContextApi;

      const commandState = isDefined(frontComponentId)
        ? { ...headlessEngineCommandContextApi, frontComponentId }
        : isDefined(workflowVersionId) && isDefined(availabilityType)
          ? await enrichHeadlessCommandContextApiWithWorkflowVersionTriggerInformation(
              {
                headlessEngineCommandContextApi,
                workflowVersionId,
                availabilityType,
                availabilityObjectMetadataId,
              },
            )
          : headlessEngineCommandContextApi;

      if (!isDefined(commandState)) {
        return;
      }

      store.set(headlessCommandContextApisState.atom, (previousMap) => {
        const newMap = new Map(previousMap);

        newMap.set(engineCommandId, commandState);

        return newMap;
      });
    },
    [
      store,
      enrichHeadlessCommandContextApiWithWorkflowVersionTriggerInformation,
    ],
  );

  return mountCommand;
};
