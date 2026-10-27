import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { bureauTaskPreferencesState } from '@/bureau/states/bureauTaskPreferencesState';
import { useAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useBureauTaskSheetPreferences = (objectMetadataId: string) => {
  const workspaceMemberId = useAtomStateValue(currentWorkspaceMemberState)?.id;

  return useAtomFamilyState(bureauTaskPreferencesState, {
    objectMetadataId,
    // Must stay byte-identical to the task sheet's key or writers and readers
    // resolve different preference buckets.
    workspaceMemberId: workspaceMemberId ?? 'anonymous',
  });
};
