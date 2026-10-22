import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useBureauWorkspaceValue } from '@/bureau/hooks/useBureauWorkspaceValue';
import { useIsBureauAvailable } from '@/bureau/hooks/useIsBureauAvailable';
import { type ReactNode } from 'react';
import { useMatch } from 'react-router-dom';

type BureauWorkspaceProviderProps = { children: ReactNode };

export const BureauWorkspaceProvider = ({
  children,
}: BureauWorkspaceProviderProps) => {
  const match = useMatch('/bureau/:documentId?');
  const isAvailable = useIsBureauAvailable();

  if (!match || !isAvailable) return children;

  return (
    <OpenedBureauWorkspaceProvider
      activeDocumentId={match.params.documentId ?? null}
    >
      {children}
    </OpenedBureauWorkspaceProvider>
  );
};

const OpenedBureauWorkspaceProvider = ({
  children,
  activeDocumentId,
}: BureauWorkspaceProviderProps & { activeDocumentId: string | null }) => {
  const value = useBureauWorkspaceValue(activeDocumentId);

  return (
    <BureauWorkspaceContext.Provider value={value}>
      {children}
    </BureauWorkspaceContext.Provider>
  );
};
