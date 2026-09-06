import { useCallback } from 'react';

import { searchRecordsFrecencyByObjectState } from '@/side-panel/pages/search/states/searchRecordsFrecencyByObjectState';
import { pruneSearchRecordObjectFrecency } from '@/side-panel/pages/search/utils/pruneSearchRecordObjectFrecency';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';

export const useRecordSearchObjectUsage = () => {
  const [, setSearchRecordsFrecencyByObject] = useAtomState(
    searchRecordsFrecencyByObjectState,
  );

  const recordSearchObjectUsage = useCallback(
    (objectKey: string) => {
      setSearchRecordsFrecencyByObject((previousFrecencyByObject) =>
        pruneSearchRecordObjectFrecency({
          frecencyByObject: {
            ...previousFrecencyByObject,
            [objectKey]: {
              lastUsedAtTimestamp: Date.now(),
              useCount:
                (previousFrecencyByObject[objectKey]?.useCount ?? 0) + 1,
            },
          },
        }),
      );
    },
    [setSearchRecordsFrecencyByObject],
  );

  return { recordSearchObjectUsage };
};
