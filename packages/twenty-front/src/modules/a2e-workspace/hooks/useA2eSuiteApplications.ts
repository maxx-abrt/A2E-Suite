import { useMarketplaceApps } from '@/marketplace/hooks/useMarketplaceApps';
import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import {
  FindManyApplicationsDocument,
  type FindManyApplicationsQuery,
  type MarketplaceApp,
} from '~/generated-metadata/graphql';
import { A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS } from '~/modules/a2e-workspace/constants/A2eSuiteApplicationUniversalIdentifiers';
import { type ApplicationWithoutRelation } from '~/pages/settings/applications/types/applicationWithoutRelation';

// findManyApplications holds workspace installs only; apps published on this
// server but not yet installed live in the marketplace catalog (whose app id
// IS the application universal identifier).
export const useA2eSuiteApplications = (): {
  installedApplications: ApplicationWithoutRelation[];
  availableApplications: MarketplaceApp[];
} => {
  const { data } = useQuery<FindManyApplicationsQuery>(
    FindManyApplicationsDocument,
  );

  const { data: catalogApps } = useMarketplaceApps({
    universalIdentifiers: A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS,
  });

  const installedUniversalIdentifiers = useMemo(
    () =>
      new Set(
        (data?.findManyApplications ?? []).map(
          (application) => application.universalIdentifier,
        ),
      ),
    [data],
  );

  const installedApplications = useMemo(
    () =>
      (data?.findManyApplications ?? []).filter((application) =>
        A2E_SUITE_APPLICATION_UNIVERSAL_IDENTIFIERS.includes(
          application.universalIdentifier,
        ),
      ),
    [data],
  );

  const availableApplications = useMemo<MarketplaceApp[]>(
    () =>
      catalogApps.filter(
        (catalogApp: MarketplaceApp) =>
          !installedUniversalIdentifiers.has(catalogApp.id),
      ),
    [catalogApps, installedUniversalIdentifiers],
  );

  return { installedApplications, availableApplications };
};
