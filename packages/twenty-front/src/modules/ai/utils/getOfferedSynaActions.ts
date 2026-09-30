import { type SynaAiAction } from '@/ai/types/SynaAiAction';

// Entry gating for the "Syna in context" actions. Three independent gates,
// all fail-closed:
// - the AI permission flag and an available model are the zero-AI gate
//   (without them the entries are hidden, per the US-130 contract);
// - a non-read-only action is never offered (the confirm-first contract);
// - an action whose backing tool is absent from the current context is never
//   offered, so a slash entry can only appear where its tool can actually run.
export const getOfferedSynaActions = ({
  actions,
  hasAiPermissionFlag,
  hasAvailableModel,
  availableReadOnlyToolNames,
}: {
  actions: SynaAiAction[];
  hasAiPermissionFlag: boolean;
  hasAvailableModel: boolean;
  availableReadOnlyToolNames: Set<string>;
}): SynaAiAction[] => {
  if (!hasAiPermissionFlag || !hasAvailableModel) {
    return [];
  }

  return actions.filter(
    (action) =>
      action.readOnly &&
      action.requiredToolNames.length > 0 &&
      action.requiredToolNames.some((toolName) =>
        availableReadOnlyToolNames.has(toolName),
      ),
  );
};
