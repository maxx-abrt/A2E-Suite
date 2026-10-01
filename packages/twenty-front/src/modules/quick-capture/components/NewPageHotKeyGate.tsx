import { useCreateNewPage } from '@/quick-capture/hooks/useCreateNewPage';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { useGlobalHotkeys } from '@/ui/utilities/hotkey/hooks/useGlobalHotkeys';
import { useCallback } from 'react';

const NewPageHotKeyEffect = () => {
  const { createNewPage } = useCreateNewPage();

  const handleHotKey = useCallback(() => {
    void createNewPage();
  }, [createNewPage]);

  useGlobalHotkeys({
    keys: ['ctrl+shift+n', 'meta+shift+n'],
    callback: handleHotKey,
    containsModifier: true,
    dependencies: [handleHotKey],
  });

  return null;
};

// The global "capture a page" shortcut (M8e). The layout renders this gate only
// while a2e-documents is installed, so the chord is never registered — and
// never steals the browser's new-window shortcut — before the app exists.
export const NewPageHotKeyGate = () => {
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();

  return isDocumentApplicationInstalled ? <NewPageHotKeyEffect /> : null;
};
