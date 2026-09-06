import {
  SEARCH_RECORD_FREQUENCY_MAX_ENTRIES,
  type SearchRecordObjectFrecencyByObject,
} from '@/side-panel/pages/search/states/searchRecordsFrecencyByObjectState';

// Caps the localStorage payload: beyond the cap, least recently used entries
// are dropped first.
export const pruneSearchRecordObjectFrecency = ({
  frecencyByObject,
  maxEntries = SEARCH_RECORD_FREQUENCY_MAX_ENTRIES,
}: {
  frecencyByObject: SearchRecordObjectFrecencyByObject;
  maxEntries?: number;
}): SearchRecordObjectFrecencyByObject => {
  const entries = Object.entries(frecencyByObject);

  if (entries.length <= maxEntries) {
    return frecencyByObject;
  }

  return Object.fromEntries(
    entries
      .sort(
        (entryA, entryB) =>
          entryB[1].lastUsedAtTimestamp - entryA[1].lastUsedAtTimestamp,
      )
      .slice(0, maxEntries),
  );
};
