import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { TemplateGallery } from '@/template-gallery/components/TemplateGallery';
import { useApplyTemplate } from '@/template-gallery/hooks/useApplyTemplate';
import { useTemplateGalleryItems } from '@/template-gallery/hooks/useTemplateGalleryItems';
import { useUndoTemplateApply } from '@/template-gallery/hooks/useUndoTemplateApply';
import { templateGalleryCategoryPreselectState } from '@/template-gallery/states/templateGalleryCategoryPreselectState';
import { templateGalleryTemplateKeyPreselectState } from '@/template-gallery/states/templateGalleryTemplateKeyPreselectState';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { type TemplateApplyUndoReport } from '@/template-gallery/utils/undoTemplateApply';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import {
  isTemplateApplyApplied,
  isTemplateApplyRejected,
  type TemplateApplyCreatedRecord,
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
  const templateGalleryTemplateKeyPreselect = useAtomStateValue(
    templateGalleryTemplateKeyPreselectState,
  );
  const { goBackFromSidePanel } = useSidePanelHistory();
  const { enqueueSuccessSnackBar, enqueueInfoSnackBar } = useSnackBar();
  const { undoTemplateApplyResult } = useUndoTemplateApply();
  const { t } = useLingui();

  const [rejection, setRejection] = useState<TemplateApplyRejected | null>(
    null,
  );

  // The undo stays scoped to the apply result's own `created[]`, so it can only
  // reverse the objects this operation wrote (C1) and never touches a
  // pre-existing record. An already-absent id is reported, not treated as a
  // failure, so a second click on a stale snackbar degrades honestly.
  const describeUndoReport = (report: TemplateApplyUndoReport): string => {
    const parts = [
      t`Removed: ${report.deleted}`,
      report.skipped > 0 ? t`Already absent: ${report.skipped}` : null,
      report.failed > 0 ? t`Could not be removed: ${report.failed}` : null,
    ].filter(isDefined);

    return parts.join(' · ');
  };

  const handleUndo = async (created: TemplateApplyCreatedRecord[]) => {
    const report = await undoTemplateApplyResult(created);

    enqueueInfoSnackBar({ message: describeUndoReport(report) });
  };

  const handleUseTemplate = async (item: TemplateGalleryItem) => {
    setRejection(null);

    const result = await applyTemplate(item);

    if (!isDefined(result)) {
      return;
    }

    if (isTemplateApplyRejected(result)) {
      setRejection(result);
      return;
    }

    if (!isTemplateApplyApplied(result) || result.created.length === 0) {
      return;
    }

    const created = result.created;

    enqueueSuccessSnackBar({
      message: t`Template applied`,
      options: {
        buttonLabel: t`Undo`,
        buttonOnClick: () => {
          void handleUndo(created);
        },
      },
    });
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
        initialTemplateKey={templateGalleryTemplateKeyPreselect}
        onUseTemplate={handleUseTemplate}
        onBlank={handleBlank}
      />
    </StyledContainer>
  );
};
