import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { isA2eLinksApplicationInstalled } from '@/a2e-links/utils/isA2eLinksApplicationInstalled';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMemo } from 'react';

export const useIsA2eLinksApplicationInstalled = (): boolean => {
  const applications = useAtomStateValue(applicationsSelector);

  return useMemo(
    () =>
      isA2eLinksApplicationInstalled(
        // The metadata store can be uninitialized before ApplicationsLoadEffect
        // runs; treat that as "not installed" instead of crashing the page.
        Array.isArray(applications)
          ? applications.map((application) => application.universalIdentifier)
          : [],
      ),
    [applications],
  );
};
