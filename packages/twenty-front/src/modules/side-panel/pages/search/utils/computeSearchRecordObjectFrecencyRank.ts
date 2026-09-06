import { isDefined } from 'twenty-shared/utils';

import { type SearchRecordObjectFrecency } from '@/side-panel/pages/search/states/searchRecordsFrecencyByObjectState';

// Classic frecency: useCount decays with hours since last use. The offset
// keeps brand-new entries from infinitely outranking everything on day one.
const FRECENCY_AGE_OFFSET_HOURS = 2;

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export const computeSearchRecordObjectFrecencyRank = ({
  frecency,
  nowTimestamp,
}: {
  frecency: SearchRecordObjectFrecency | undefined;
  nowTimestamp: number;
}): number => {
  if (!isDefined(frecency)) {
    return 0;
  }

  const hoursSinceLastUse = Math.max(
    (nowTimestamp - frecency.lastUsedAtTimestamp) / MILLISECONDS_PER_HOUR,
    0,
  );

  return frecency.useCount / (hoursSinceLastUse + FRECENCY_AGE_OFFSET_HOURS);
};
