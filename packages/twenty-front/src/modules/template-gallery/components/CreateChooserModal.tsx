import { CreateChooser } from '@/template-gallery/components/CreateChooser';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { useTemplateGalleryItems } from '@/template-gallery/hooks/useTemplateGalleryItems';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { selectSuggestedTemplates } from '@/template-gallery/utils/selectSuggestedTemplates';
import { isModalOpenedComponentState } from '@/ui/layout/modal/states/isModalOpenedComponentState';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useWorkspaceSurfaceScopedComponentInstanceId } from '@/ui/layout/hooks/useWorkspaceSurfaceScopedComponentInstanceId';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useMemo } from 'react';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';

export type CreateChooserModalProps = {
  // The modal instance every surface keys its open state by (the useModal seam).
  modalInstanceId: string;
  // The current app/category whose top descriptors become the suggestions.
  // `null` widens the surface to every available template.
  category: TemplateDescriptorCategory | null;
  // The surface's original create action, run unchanged by "Blank".
  onBlank: () => void;
  onClose?: () => void;
};

// Wires the presentational chooser to the gallery data and the open seam for a
// create surface. It is the only place that reads descriptors for the chooser:
// a surface mounts it and supplies its own `onBlank`, so no surface re-implements
// suggestion selection or a second gallery open path. `Browse all` and a
// suggestion both land in the shared gallery (US-132), the suggestion also
// preselecting its descriptor key — the gallery owns the preview and apply with
// inputs, so the chooser never writes content blind.
export const CreateChooserModal = ({
  modalInstanceId,
  category,
  onBlank,
  onClose,
}: CreateChooserModalProps) => {
  const scopedModalInstanceId =
    useWorkspaceSurfaceScopedComponentInstanceId(modalInstanceId);
  const isModalOpened = useAtomComponentStateValue(
    isModalOpenedComponentState,
    scopedModalInstanceId,
  );

  return (
    <ModalStatefulWrapper
      modalInstanceId={modalInstanceId}
      onClose={onClose}
      isClosable
      padding="small"
      renderInDocumentBody
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      {isModalOpened && (
        <OpenedCreateChooserModal
          modalInstanceId={modalInstanceId}
          category={category}
          onBlank={onBlank}
          onClose={onClose}
        />
      )}
    </ModalStatefulWrapper>
  );
};

type OpenedCreateChooserModalProps = CreateChooserModalProps;

const OpenedCreateChooserModal = ({
  modalInstanceId,
  category,
  onBlank,
  onClose,
}: OpenedCreateChooserModalProps) => {
  const { items } = useTemplateGalleryItems();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const { closeModal } = useModal();

  const suggestions = useMemo(
    () => selectSuggestedTemplates({ items, category }),
    [items, category],
  );

  const closeChooser = () => {
    closeModal(modalInstanceId);
    onClose?.();
  };

  const handleBlank = () => {
    closeChooser();
    onBlank();
  };

  const handleBrowseAll = () => {
    closeChooser();
    openTemplateGallery({ category });
  };

  const handleSelectSuggestion = (item: TemplateGalleryItem) => {
    closeChooser();
    openTemplateGallery({ category, templateKey: item.descriptor.key });
  };

  return (
    <CreateChooser
      suggestions={suggestions}
      onBlank={handleBlank}
      onSelectSuggestion={handleSelectSuggestion}
      onBrowseAll={handleBrowseAll}
    />
  );
};
