import { useCreateNewPage } from '@/quick-capture/hooks/useCreateNewPage';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { useGlobalHotkeys } from '@/ui/utilities/hotkey/hooks/useGlobalHotkeys';
import { useCallback, useRef } from 'react';

const NewPageHotKeyListener = () => {
  const { createNewPage } = useCreateNewPage();

  // `createNewPage` closes over a record-creator rebuilt every render, so the
  // ref carries the latest callback while the hotkey subscription stays stable.
  const createNewPageRef = useRef(createNewPage);
  createNewPageRef.current = createNewPage;

  const handleHotKey = useCallback(() => {
    void createNewPageRef.current();
  }, []);

  useGlobalHotkeys({
    keys: ['ctrl+shift+n', 'meta+shift+n'],
    callback: handleHotKey,
    containsModifier: true,
    dependencies: [handleHotKey],
  });

  return null;
};

// The global "capture a page" shortcut (M8e). The layout renders it only while
// a2e-documents is installed, so the chord is never registered — and never
// steals the browser's new-window shortcut — before the app exists.
export const NewPageHotKeyEffect = () => {
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();

  if (!isDocumentApplicationInstalled) {
    return null;
  }

  return <NewPageHotKeyListener />;
};
