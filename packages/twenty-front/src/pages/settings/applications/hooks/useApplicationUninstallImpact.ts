import { useQuery } from '@apollo/client/react';

import { APPLICATION_UNINSTALL_IMPACT } from '~/pages/settings/applications/graphql/queries/applicationUninstallImpact';

export type ApplicationUninstallImpact = {
  ownedObjects: {
    universalIdentifier: string;
    nameSingular: string;
  }[];
  ownedFieldsOnStandardObjects: {
    universalIdentifier: string;
    objectNameSingular: string;
    fieldName: string;
  }[];
  ownedViewsOnStandardObjects: {
    universalIdentifier: string;
    objectNameSingular: string;
    viewName: string;
  }[];
  recordLossByObject: {
    objectNameSingular: string;
    recordCount: number;
  }[];
  crossAppDependents: {
    dependentApplicationName: string;
    dependency: string;
  }[];
};

type ApplicationUninstallImpactQueryData = {
  applicationUninstallImpact: ApplicationUninstallImpact;
};

type ApplicationUninstallImpactQueryVariables = {
  universalIdentifier: string;
};

export const useApplicationUninstallImpact = ({
  universalIdentifier,
  skip,
}: {
  universalIdentifier: string;
  skip: boolean;
}) => {
  const { data, loading, error } = useQuery<
    ApplicationUninstallImpactQueryData,
    ApplicationUninstallImpactQueryVariables
  >(APPLICATION_UNINSTALL_IMPACT, {
    variables: { universalIdentifier: universalIdentifier ?? '' },
    // Only fetched for the confirmation dialog, not on page mount.
    skip: skip || !universalIdentifier,
  });

  return {
    impact: data?.applicationUninstallImpact ?? null,
    isLoading: loading && !skip,
    error,
  };
};
