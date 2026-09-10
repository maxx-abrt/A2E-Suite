import { releaseRoutedFlowStateScope } from '@/ui/utilities/state/jotai/utils/routedFlowStateScopeRegistry';
import { isDefined } from 'twenty-shared/utils';

// Widened to the scope-carrying shape so serialized tab stacks can be released
// with the exact same rule as live navigation stack entries.
type RoutedFlowScopeCarrier = {
  routedFlowStateScopeId?: string;
};

export const releaseRemovedRoutedFlowStateScopes = ({
  removedItems,
  remainingItems,
}: {
  removedItems: RoutedFlowScopeCarrier[];
  remainingItems: RoutedFlowScopeCarrier[];
}) => {
  const remainingScopeIds = new Set(
    remainingItems.map((item) => item.routedFlowStateScopeId).filter(isDefined),
  );
  const removedScopeIds = new Set(
    removedItems.map((item) => item.routedFlowStateScopeId).filter(isDefined),
  );

  removedScopeIds.forEach((scopeId) => {
    if (!remainingScopeIds.has(scopeId)) {
      releaseRoutedFlowStateScope(scopeId);
    }
  });
};
