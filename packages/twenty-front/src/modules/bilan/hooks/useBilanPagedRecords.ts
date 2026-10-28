import { useEffect, useState } from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';

import {
  useFindManyRecords,
  type UseFindManyRecordsParams,
} from '@/object-record/hooks/useFindManyRecords';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';

type UseBilanPagedRecordsParams<T extends ObjectRecord> = Omit<
  UseFindManyRecordsParams<T>,
  'limit'
> & {
  maxPages: number;
};

// The server caps a find-many page at QUERY_MAX_RECORDS. A dashboard that
// claims "last 6 months" must page a bounded number of times rather than ask
// for an impossible limit and silently under-count.
export const useBilanPagedRecords = <T extends ObjectRecord>({
  maxPages,
  ...params
}: UseBilanPagedRecordsParams<T>) => {
  const [pageCount, setPageCount] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const result = useFindManyRecords<T>({
    ...params,
    limit: QUERY_MAX_RECORDS,
  });
  const { loading, hasNextPage, fetchMoreRecords } = result;

  useEffect(() => {
    if (loading || !hasNextPage || pageCount >= maxPages || isFetchingMore) {
      return;
    }

    setIsFetchingMore(true);
    setPageCount((currentPageCount) => currentPageCount + 1);
    void fetchMoreRecords().finally(() => {
      setIsFetchingMore(false);
    });
  }, [
    fetchMoreRecords,
    hasNextPage,
    isFetchingMore,
    loading,
    maxPages,
    pageCount,
  ]);

  return result;
};
