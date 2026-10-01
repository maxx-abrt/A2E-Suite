import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { isDriveApplicationInstalled } from '@/drive/utils/isDriveApplicationInstalled';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMemo } from 'react';

export const useIsDriveApplicationInstalled = (): boolean => {
  const applications = useAtomStateValue(applicationsSelector);

  return useMemo(
    () =>
      isDriveApplicationInstalled(
        // The metadata store can be uninitialized before ApplicationsLoadEffect
        // runs; treat that as "not installed" instead of crashing the page.
        Array.isArray(applications)
          ? applications.map((application) => application.universalIdentifier)
          : [],
      ),
    [applications],
  );
};
