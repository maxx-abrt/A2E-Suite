import { isAutoSelectModelId } from 'twenty-shared/utils';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useWorkspaceAiModelAvailability = () => {
  const aiModels = useAtomStateValue(aiModelsState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  const useRecommendedModels = currentWorkspace?.useRecommendedModels ?? true;
  const enabledAiModelIds = new Set(currentWorkspace?.enabledAiModelIds ?? []);

  const realModels = aiModels.filter(
    (model) => !isAutoSelectModelId(model.modelId) && !model.isDeprecated,
  );

  const enabledModels = useRecommendedModels
    ? realModels.filter((model) => model.isRecommended === true)
    : realModels.filter((model) => enabledAiModelIds.has(model.modelId));

  // Workspace-scoped provider availability (US-141): includes the workspace's
  // own BYOK keys, unlike the instance-wide `aiModels` list. Falls back to the
  // old instance-only proxy while the field is absent (pre-codegen persisted
  // workspaces / fixtures) so existing workspaces are never falsely zero-AI.
  const hasConfiguredAiProvider =
    currentWorkspace?.hasConfiguredAiProvider ?? realModels.length > 0;

  return {
    enabledModels,
    realModels,
    useRecommendedModels,
    hasConfiguredAiProvider,
  };
};
