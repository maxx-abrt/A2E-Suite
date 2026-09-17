import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';

import { APPLICATION_INSTALL_READINESS } from '~/pages/settings/applications/graphql/queries/applicationInstallReadiness';

export type ApplicationInstallBlockedReason =
  | 'APP_NOT_REGISTERED'
  | 'VERSION_INCOMPATIBLE'
  | null;

export type ApplicationInstallReadiness = {
  universalIdentifier: string;
  registered: boolean;
  versionCompatible: boolean;
  currentlyInstalled: boolean;
  ready: boolean;
  blockedReason: ApplicationInstallBlockedReason;
};

type ApplicationInstallReadinessQueryData = {
  applicationInstallReadiness: ApplicationInstallReadiness[];
};

type ApplicationInstallReadinessQueryVariables = {
  universalIdentifiers: string[];
};

// Read-only pre-install report. Kept out of the cached marketplace catalog
// because readiness is workspace-specific (server-side app registration and
// version compatibility cannot leak across workspaces through a global cache).
export const useApplicationInstallReadiness = ({
  universalIdentifiers,
}: {
  universalIdentifiers: string[];
}) => {
  const { data, loading, error } = useQuery<
    ApplicationInstallReadinessQueryData,
    ApplicationInstallReadinessQueryVariables
  >(APPLICATION_INSTALL_READINESS, {
    variables: { universalIdentifiers },
    skip: universalIdentifiers.length === 0,
  });

  const readinessByIdentifier = useMemo(
    () =>
      new Map<string, ApplicationInstallReadiness>(
        (data?.applicationInstallReadiness ?? []).map((readiness) => [
          readiness.universalIdentifier,
          readiness,
        ]),
      ),
    [data],
  );

  return {
    readinessByIdentifier,
    isLoading: loading && universalIdentifiers.length > 0,
    error,
  };
};
