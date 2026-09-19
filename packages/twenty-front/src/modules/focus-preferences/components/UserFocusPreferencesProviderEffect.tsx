import { useEffect } from 'react';

import { focusPreferencesState } from '@/focus-preferences/states/focusPreferencesState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

// The density/easy-read CSS in index.css keys off these root attributes, so a
// single effect publishes the preference without every surface subscribing.
export const UserFocusPreferencesProviderEffect = () => {
  const focusPreferences = useAtomStateValue(focusPreferencesState);

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-a2e-density', focusPreferences.density);
    root.setAttribute('data-a2e-easy-read', String(focusPreferences.easyRead));

    return () => {
      root.removeAttribute('data-a2e-density');
      root.removeAttribute('data-a2e-easy-read');
    };
  }, [focusPreferences.density, focusPreferences.easyRead]);

  return <></>;
};
