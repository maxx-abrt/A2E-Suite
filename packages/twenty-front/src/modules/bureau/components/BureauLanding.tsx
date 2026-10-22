import { A2eCustomizeAction } from '@/a2e-customize/components/A2eCustomizeAction';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { useContext } from 'react';
import { A2eContextualEmptyState } from '@/a2e-empty-state/components/A2eContextualEmptyState';
import { BUREAU_LANDING_TEMPLATE_CATEGORY } from '@/bureau/constants/BureauLandingTemplateCategory';
import { BUREAU_LANDING_TEMPLATE_LINKS } from '@/bureau/constants/BureauLandingTemplates';
import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import { RecentPagesWidget } from '@/home-dashboard/components/RecentPagesWidget';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useCreateNewPage } from '@/quick-capture/hooks/useCreateNewPage';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { IconFileText, IconPlus } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  background: ${themeCssVariables.background.primary};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledHeader = styled.header`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  justify-content: space-between;
`;

const StyledHeaderActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  margin: 0;
`;

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledSectionTitle = styled.h2`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.08em;
  margin: 0;
  text-transform: uppercase;
`;

const StyledTemplateRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const BUREAU_DOCUMENT_OBJECT_NAME_SINGULAR = 'document';

// The Bureau home (M7f): one primary action, three starter templates from the
// M9 gallery and the recent pages, so the app opens on a home instead of a bare
// table view. It is install-gated on a2e-documents — without the app the object
// does not exist and the landing renders nothing rather than a broken widget.
type BureauLandingProps = {
  onCreatePage?: () => void;
  onSelectPage?: (pageId: string) => void;
};

export const BureauLanding = ({
  onCreatePage,
  onSelectPage,
}: BureauLandingProps) => {
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();

  if (!isDocumentApplicationInstalled) {
    return null;
  }

  return (
    <BureauLandingContent
      onCreatePage={onCreatePage}
      onSelectPage={onSelectPage}
    />
  );
};

// When the workspace has no pages yet the landing becomes the M13c contextual
// empty state — one sentence, one "New page", one "Use a template" link and one
// "Learn more" — instead of a header over an empty "Recent pages" list.
type BureauLandingContentProps = BureauLandingProps;

const BureauLandingContent = ({
  onCreatePage,
  onSelectPage,
}: BureauLandingContentProps) => {
  const { t } = useLingui();
  const { createNewPage } = useCreateNewPage();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const workspace = useContext(BureauWorkspaceContext);
  const { totalCount: queriedTotalCount } = useFindManyRecords({
    objectNameSingular: BUREAU_DOCUMENT_OBJECT_NAME_SINGULAR,
    limit: 1,
    skip: workspace !== null,
  });
  const totalCount = workspace?.documents.length ?? queriedTotalCount;

  if (workspace?.isLoading)
    return <StyledContainer role="status">{t`Loading pages…`}</StyledContainer>;

  if (totalCount === 0) {
    return (
      <A2eContextualEmptyState
        surfaceKey="bureau"
        onPrimaryAction={() => {
          if (onCreatePage) onCreatePage();
          else void createNewPage();
        }}
      />
    );
  }

  return (
    <StyledContainer data-testid="bureau-landing">
      <StyledHeader>
        <StyledTitleGroup>
          <StyledTitle>{t`Bureau`}</StyledTitle>
          <StyledSubtitle>
            {t`Your pages, templates and recent work in one place.`}
          </StyledSubtitle>
          <A2eLearnMoreLink appKey="bureau" />
        </StyledTitleGroup>
        <StyledHeaderActions>
          <A2eCustomizeAction objectNamePlural="documents" />
          <Button
            Icon={IconPlus}
            title={t`New page`}
            onClick={() => {
              if (onCreatePage) onCreatePage();
              else void createNewPage();
            }}
            dataTestId="bureau-new-page"
          />
        </StyledHeaderActions>
      </StyledHeader>
      <StyledSection>
        <StyledSectionTitle>{t`Starter templates`}</StyledSectionTitle>
        <StyledTemplateRow>
          {BUREAU_LANDING_TEMPLATE_LINKS.map((templateLink) => (
            <Button
              key={templateLink.descriptorKey}
              Icon={IconFileText}
              title={t(templateLink.label)}
              ariaLabel={t(templateLink.label)}
              variant="secondary"
              onClick={() =>
                openTemplateGallery({
                  category: BUREAU_LANDING_TEMPLATE_CATEGORY,
                  templateKey: templateLink.descriptorKey,
                })
              }
              dataTestId={`bureau-template-${templateLink.descriptorKey}`}
            />
          ))}
        </StyledTemplateRow>
      </StyledSection>
      <StyledSection>
        <StyledSectionHeader>
          <StyledSectionTitle>{t`Recent pages`}</StyledSectionTitle>
          <Button
            title={t`All pages`}
            variant="secondary"
            size="small"
            to={getAppPath(AppPath.RecordIndexPage, {
              objectNamePlural: 'documents',
            })}
            dataTestId="bureau-all-pages"
          />
        </StyledSectionHeader>
        <RecentPagesWidget onSelectPage={onSelectPage} />
      </StyledSection>
    </StyledContainer>
  );
};
