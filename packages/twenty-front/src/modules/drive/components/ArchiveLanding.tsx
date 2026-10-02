import { A2eCustomizeAction } from '@/a2e-customize/components/A2eCustomizeAction';
import { A2eContextualEmptyState } from '@/a2e-empty-state/components/A2eContextualEmptyState';
import { ARCHIVE_LANDING_TEMPLATE_CATEGORY } from '@/drive/constants/ArchiveLandingTemplateCategory';
import { ARCHIVE_LANDING_TEMPLATE_LINKS } from '@/drive/constants/ArchiveLandingTemplates';
import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import { useIsDriveApplicationInstalled } from '@/drive/hooks/useIsDriveApplicationInstalled';
import { type DriveUsageSummary } from '@/drive/utils/driveUsage';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { IconFileText, IconFolderPlus, IconUpload } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ArchiveLandingProps = {
  // Reuses the host /drive page's own upload picker and folder creation, so the
  // landing owns no file state and adds no second write path.
  onUpload: () => void;
  onCreateFolder: () => void;
  // The page's already-read drive data, projected through
  // `buildDriveUsageSummary` — the landing adds no query of its own.
  usageSummary: DriveUsageSummary;
};

const StyledLanding = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledUsage = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

// The Archive home (M7f): the host `/drive` explorer enriched with one primary
// action (upload), a secondary new folder, three M9c folder-structure starters
// and the usage indicator, never a second navigation shell. The explorer stays
// the page's own content below this strip, so the landing adds no drive state
// and no parallel write path. Install-gated: without a2e-drive the `driveFolder`
// object does not exist and the strip renders nothing rather than a broken
// gallery entry.
export const ArchiveLanding = ({
  onUpload,
  onCreateFolder,
  usageSummary,
}: ArchiveLandingProps) => {
  const { t } = useLingui();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const isDriveApplicationInstalled = useIsDriveApplicationInstalled();

  if (!isDriveApplicationInstalled) {
    return null;
  }

  const isEmpty = usageSummary.totalFiles === 0;

  if (isEmpty) {
    // No file yet: the M13c four-element state (one sentence, one Upload, one
    // "Use a template" link, one "Learn more") replaces the M7f strip so Archive
    // matches Bureau/Agenda. The M7f "New folder" action stays reachable in the
    // toolbar; the empty state keeps a single primary as M13c requires.
    return (
      <A2eContextualEmptyState
        surfaceKey="archive"
        onPrimaryAction={onUpload}
        dataTestId="archive-landing"
      />
    );
  }

  return (
    <StyledLanding data-testid="archive-landing">
      <StyledTitleGroup>
        <StyledTitle>{t`Archive`}</StyledTitle>
        <StyledUsage data-testid="archive-landing-usage">
          {t`${usageSummary.totalFiles} files`}
        </StyledUsage>
        <A2eLearnMoreLink appKey="archive" />
      </StyledTitleGroup>
      <StyledActions>
        <A2eCustomizeAction objectNamePlural="driveFolders" />
        {ARCHIVE_LANDING_TEMPLATE_LINKS.map((templateLink) => (
          <Button
            key={templateLink.descriptorKey}
            Icon={IconFileText}
            title={t(templateLink.label)}
            ariaLabel={t(templateLink.label)}
            variant="secondary"
            size="small"
            onClick={() =>
              openTemplateGallery({
                category: ARCHIVE_LANDING_TEMPLATE_CATEGORY,
                templateKey: templateLink.descriptorKey,
              })
            }
            dataTestId={`archive-template-${templateLink.descriptorKey}`}
          />
        ))}
        <Button
          Icon={IconFolderPlus}
          title={t`New folder`}
          variant="secondary"
          onClick={onCreateFolder}
          dataTestId="archive-new-folder"
        />
        <Button
          Icon={IconUpload}
          title={t`Upload`}
          onClick={onUpload}
          dataTestId="archive-upload"
        />
      </StyledActions>
    </StyledLanding>
  );
};
