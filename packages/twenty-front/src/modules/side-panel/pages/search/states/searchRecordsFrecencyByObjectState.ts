import { isNumber, isObject } from '@sniptt/guards';

import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export type SearchRecordObjectFrecency = {
  lastUsedAtTimestamp: number;
  useCount: number;
};

export type SearchRecordObjectFrecencyByObject = Record<
  string,
  SearchRecordObjectFrecency
>;

export const SEARCH_RECORD_FREQUENCY_MAX_ENTRIES = 100;

const isSearchRecordObjectFrecency = (
  payload: unknown,
): payload is SearchRecordObjectFrecency => {
  // isObject only narrows to `object`; the cast unlocks property access.
  if (!isObject(payload)) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    isNumber(candidate.lastUsedAtTimestamp) && isNumber(candidate.useCount)
  );
};

const isSearchRecordObjectFrecencyByObject = (
  payload: unknown,
): payload is SearchRecordObjectFrecencyByObject => {
  if (!isObject(payload)) {
    return false;
  }

  return Object.values(payload as Record<string, unknown>).every(
    isSearchRecordObjectFrecency,
  );
};

export const searchRecordsFrecencyByObjectState =
  createAtomState<SearchRecordObjectFrecencyByObject>({
    key: 'side-panel/searchRecordsFrecencyByObjectState',
    defaultValue: {},
    useLocalStorage: true,
    localStorageOptions: { getOnInit: true },
    validateInitFn: isSearchRecordObjectFrecencyByObject,
  });
