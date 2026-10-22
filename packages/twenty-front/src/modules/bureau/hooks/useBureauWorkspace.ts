import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const useBureauWorkspace = () => {
  const bureauWorkspace = useContext(BureauWorkspaceContext);

  if (!isDefined(bureauWorkspace)) {
    throw new Error('useBureauWorkspace must be used inside BureauWorkspace');
  }

  return bureauWorkspace;
};
