import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isSharedDomainWorkspaceEnabledState = createAtomState<boolean>({
  key: 'isSharedDomainWorkspaceEnabledState',
  defaultValue: false,
});
