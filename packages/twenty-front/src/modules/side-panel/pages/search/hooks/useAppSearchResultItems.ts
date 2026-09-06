import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';

import {
  FindManyApplicationsDocument,
  type FindManyApplicationsQuery,
} from '~/generated-metadata/graphql';
import { SEARCH_APP_RECORDS_QUERY } from '~/side-panel/pages/search/graphql/queries/searchAppRecords';
import { type GroupableSearchResultItem } from '~/side-panel/pages/search/utils/groupSearchResultItems';

type AppSearchRecord = {
  recordId: string;
  label: string;
  description?: string | null;
  imageUrl?: string | null;
  path: string;
};

type AppSearchResultGroup = {
  appUniversalIdentifier: string;
  records: AppSearchRecord[];
};

type SearchAppRecordsResponse = {
  searchAppRecords: AppSearchResultGroup[];
};

export const useAppSearchResultItems = ({
  searchInput,
  skip,
}: {
  searchInput: string;
  skip: boolean;
}): { appSearchResultItems: GroupableSearchResultItem[]; loading: boolean } => {
  const { data, loading } = useQuery<SearchAppRecordsResponse>(
    SEARCH_APP_RECORDS_QUERY,
    {
      variables: { searchInput },
      skip: skip || searchInput.length === 0,
      fetchPolicy: 'no-cache',
    },
  );

  // Group headings come from the workspace application rows (install state
  // matches the server gate that produced the groups).
  const { data: applicationsData } = useQuery<FindManyApplicationsQuery>(
    FindManyApplicationsDocument,
  );

  const appNameByUniversalIdentifier = useMemo(
    () =>
      new Map(
        (applicationsData?.findManyApplications ?? []).map((application) => [
          application.universalIdentifier,
          application.name,
        ]),
      ),
    [applicationsData],
  );

  const appSearchResultItems = useMemo<GroupableSearchResultItem[]>(() => {
    return (data?.searchAppRecords ?? []).flatMap((group) =>
      group.records.map((record) => ({
        id: `app-${group.appUniversalIdentifier}-${record.recordId}`,
        label: record.label,
        objectNameSingular: '',
        recordId: record.recordId,
        imageUrl: record.imageUrl ?? undefined,
        objectLabel: isDefined(record.description)
          ? record.description
          : undefined,
        groupKey: `app:${group.appUniversalIdentifier}`,
        groupHeading:
          appNameByUniversalIdentifier.get(group.appUniversalIdentifier) ??
          group.appUniversalIdentifier,
        avatarType: 'rounded' as const,
        path: record.path,
      })),
    );
  }, [data, appNameByUniversalIdentifier]);

  return { appSearchResultItems, loading };
};
