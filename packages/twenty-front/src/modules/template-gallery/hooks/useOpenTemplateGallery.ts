import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { templateGalleryCategoryPreselectState } from '@/template-gallery/states/templateGalleryCategoryPreselectState';
import { t } from '@lingui/core/macro';
import { useStore } from 'jotai';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import { SidePanelPages } from 'twenty-shared/types';
import { IconFileText } from 'twenty-ui/icon';

// The one seam every entry-point opens the gallery through (M9a-4): Cmd+K
// "Templates", the document/page New chooser and the app-landing entry-point
// all call this rather than each wiring the side panel themselves, so M13a's
// create chooser reuses it unchanged. `category` is a soft preselect, never a
// scope the user cannot clear.
export const useOpenTemplateGallery = () => {
  const { navigateSidePanelMenu } = useSidePanelMenu();
  const store = useStore();

  const openTemplateGallery = ({
    category = null,
  }: {
    category?: TemplateDescriptorCategory | null;
  } = {}) => {
    store.set(templateGalleryCategoryPreselectState.atom, category);

    navigateSidePanelMenu({
      page: SidePanelPages.TemplateGallery,
      pageTitle: t`Templates`,
      pageIcon: IconFileText,
      resetNavigationStack: true,
    });
  };

  return { openTemplateGallery };
};
