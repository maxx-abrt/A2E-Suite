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
import { useContext, useState } from 'react';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { AppPath } from 'twenty-shared/types';
import { Button } from 'twenty-ui/input';
import {
  isTemplateApplyApplied,
  isTemplateApplyRejected,
  type TemplateApplyCreatedRecord,
  type TemplateApplyRejected,
} from 'twenty-shared/application';
import { getAppPath, isDefined } from 'twenty-shared/utils';
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
  const { items, isLoading, hasError, retry } = useTemplateGalleryItems();
  const bureauWorkspace = useContext(BureauWorkspaceContext);
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

  const [applyFailed, setApplyFailed] = useState(false);
  const [createdRecord, setCreatedRecord] =
    useState<TemplateApplyCreatedRecord | null>(null);
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

    setCreatedRecord((current) =>
      created.some(
        (record) =>
          record.id === current?.id && record.object === current?.object,
      )
        ? null
        : current,
    );
    enqueueInfoSnackBar({ message: describeUndoReport(report) });
  };

  const handleUseTemplate = async (item: TemplateGalleryItem) => {
    setRejection(null);
    setApplyFailed(false);
    setCreatedRecord(null);

    const result = await applyTemplate(item);

    if (!isDefined(result)) {
      setApplyFailed(true);
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
    setCreatedRecord(
      created.find((record) =>
        ['document', 'project'].includes(record.object),
      ) ?? created[0],
    );
    if (created.some((record) => record.object === 'document'))
      bureauWorkspace?.resyncDocuments();

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
      {hasError && (
        <StyledRejection role="status">
          {t`Some templates could not load. You can retry.`}
          <Button
            title={t`Retry loading templates`}
            ariaLabel={t`Retry loading templates`}
            size="small"
            variant="secondary"
            disabled={isLoading}
            onClick={retry}
          />
        </StyledRejection>
      )}
      {applyFailed && (
        <StyledRejection role="alert">{t`The template could not be applied. Your choice is kept; try again.`}</StyledRejection>
      )}
      {isDefined(createdRecord) && (
        <Button
          title={
            createdRecord.object === 'document'
              ? t`Open page`
              : createdRecord.object === 'project'
                ? t`Open project`
                : t`Open created record`
          }
          ariaLabel={
            createdRecord.object === 'document'
              ? t`Open page`
              : createdRecord.object === 'project'
                ? t`Open project`
                : t`Open created record`
          }
          variant="secondary"
          to={
            createdRecord.object === 'document'
              ? getBureauPagePath(createdRecord.id)
              : getAppPath(AppPath.RecordShowPage, {
                  objectNameSingular: createdRecord.object,
                  objectRecordId: createdRecord.id,
                })
          }
        />
      )}
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
