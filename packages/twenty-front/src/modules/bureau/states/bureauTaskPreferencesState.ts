import { type BureauTaskScope } from '@/bureau/types/BureauTaskScope';
import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';

export const bureauTaskPreferencesState = createAtomFamilyState<
  {
    scope: BureauTaskScope;
    viewId?: string;
    showCompleted: boolean;
  },
  { objectMetadataId: string; workspaceMemberId: string }
>({
  key: 'bureauTaskPreferencesState',
  defaultValue: { scope: 'mine', showCompleted: false },
  useLocalStorage: true,
});
