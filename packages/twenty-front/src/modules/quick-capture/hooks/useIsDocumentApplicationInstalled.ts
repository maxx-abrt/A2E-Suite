import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { isDocumentApplicationInstalled } from '@/quick-capture/utils/newPageDocument';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useMemo } from 'react';

export const useIsDocumentApplicationInstalled = (): boolean => {
  const applications = useAtomStateValue(applicationsSelector);

  return useMemo(
    () =>
      isDocumentApplicationInstalled(
        applications.map((application) => application.universalIdentifier),
      ),
    [applications],
  );
};
