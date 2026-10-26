import { type BUREAU_STARTER_PROFILES } from '@/bureau/constants/BureauStarterProfiles';
import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';

export const bureauStarterProfileState = createAtomFamilyState<
  keyof typeof BUREAU_STARTER_PROFILES,
  { workspaceId: string; workspaceMemberId: string }
>({
  key: 'bureauStarterProfileState',
  defaultValue: 'team',
  useLocalStorage: true,
});
