import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { TemplateGallery } from '@/template-gallery/components/TemplateGallery';
import { useApplyTemplate } from '@/template-gallery/hooks/useApplyTemplate';
import { useTemplateGalleryItems } from '@/template-gallery/hooks/useTemplateGalleryItems';
import { templateGalleryCategoryPreselectState } from '@/template-gallery/states/templateGalleryCategoryPreselectState';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useState } from 'react';
import {
  isTemplateApplyRejected,
  type TemplateApplyRejected,
} from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const StyledRejection = styled.div`
  background-color: ${themeCssVariables.background.transparent.danger};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[3]} 0;
  padding: ${themeCssVariables.spacing[2]};
`;

// The one host surface for content templates (M9a-4): install-gated items come
// from every installed app's descriptor function, "Use template" resolves that
// app's apply function, and a typed rejection is rendered instead of failing
// the surface. Every entry-point (Cmd+K, New chooser, landing pages) lands here.
export const TemplateGallerySidePanelPage = () => {
  const { items, isLoading } = useTemplateGalleryItems();
  const { applyTemplate, isApplying } = useApplyTemplate();
  const templateGalleryCategoryPreselect = useAtomStateValue(
    templateGalleryCategoryPreselectState,
  );
  const { goBackFromSidePanel } = useSidePanelHistory();

  const [rejection, setRejection] = useState<TemplateApplyRejected | null>(
    null,
  );

  const handleUseTemplate = async (item: TemplateGalleryItem) => {
    setRejection(null);

    const result = await applyTemplate(item);

    if (isDefined(result) && isTemplateApplyRejected(result)) {
      setRejection(result);
    }
  };

  // Blank creation is M13a's create chooser, which reuses this same seam; until
  // it lands the host simply closes so no partial write happens here.
  const handleBlank = () => {
    goBackFromSidePanel();
  };

  return (
    <StyledContainer>
      {isDefined(rejection) && (
        <StyledRejection data-testid="template-gallery-rejection">
          {rejection.message}
        </StyledRejection>
      )}
      <TemplateGallery
        items={items}
        isLoading={isLoading}
        isApplying={isApplying}
        initialCategory={templateGalleryCategoryPreselect}
        onUseTemplate={handleUseTemplate}
        onBlank={handleBlank}
      />
    </StyledContainer>
  );
};
