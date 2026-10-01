import { useCreateNewPage } from '@/quick-capture/hooks/useCreateNewPage';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { CreateChooserModal } from '@/template-gallery/components/CreateChooserModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useGlobalHotkeys } from '@/ui/utilities/hotkey/hooks/useGlobalHotkeys';
import { useCallback } from 'react';

const NEW_PAGE_HOTKEY_CHOOSER_MODAL_ID = 'new-page-hotkey-create-chooser';

const NewPageHotKeyChooser = () => {
  const { createNewPage } = useCreateNewPage();
  const { openModal } = useModal();

  // M13a: the shortcut opens the dual-entry chooser rather than creating
  // immediately; its Blank runs the same create the hotkey performed before.
  const handleHotKey = useCallback(() => {
    openModal(NEW_PAGE_HOTKEY_CHOOSER_MODAL_ID);
  }, [openModal]);

  useGlobalHotkeys({
    keys: ['ctrl+shift+n', 'meta+shift+n'],
    callback: handleHotKey,
    containsModifier: true,
    dependencies: [handleHotKey],
  });

  const handleBlank = useCallback(() => {
    void createNewPage();
  }, [createNewPage]);

  return (
    <CreateChooserModal
      modalInstanceId={NEW_PAGE_HOTKEY_CHOOSER_MODAL_ID}
      category="Pages"
      onBlank={handleBlank}
    />
  );
};

// The global "capture a page" shortcut (M8e). The layout renders this gate only
// while a2e-documents is installed, so the chord is never registered — and
// never steals the browser's new-window shortcut — before the app exists.
export const NewPageHotKeyGate = () => {
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();

  return isDocumentApplicationInstalled ? <NewPageHotKeyChooser /> : null;
};
