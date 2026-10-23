import { A2eCustomizeAction } from '@/a2e-customize/components/A2eCustomizeAction';
import { BureauWorkspaceContext } from '@/bureau/contexts/BureauWorkspaceContext';
import { BureauTaskSheet } from '@/bureau/components/BureauTaskSheet';
import { BureauTodayProgress } from '@/bureau/components/BureauTodayProgress';
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
  background: ${themeCssVariables.background.secondary};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[8]};
  width: 100%;

  > * {
    flex-shrink: 0;
  }

  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[4]};
  }
`;

const StyledOverview = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(240px, 0.8fr) minmax(0, 2fr);

  > header:only-child {
    grid-column: 1 / -1;
  }

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const StyledHeader = styled.header`
  align-items: center;
  background:
    radial-gradient(
      ellipse at top right,
      ${themeCssVariables.background.transparent.medium},
      transparent 65%
    ),
    ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[4]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledHeaderActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledTitle = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.xxl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  margin: 0;
`;

const StyledSection = styled.section`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[5]};
`;

const StyledResources = styled.div`
  align-items: start;
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
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
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const BUREAU_DOCUMENT_OBJECT_NAME_SINGULAR = 'document';

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

type BureauLandingContentProps = BureauLandingProps;

const BureauLandingContent = ({
  onCreatePage,
  onSelectPage,
}: BureauLandingContentProps) => {
  const { t } = useLingui();
  const { createNewPage } = useCreateNewPage();
  const { openTemplateGallery } = useOpenTemplateGallery();
  const workspace = useContext(BureauWorkspaceContext);
  const {
    totalCount: queriedTotalCount,
    loading: isQueryLoading,
    error: queryError,
    refetch,
  } = useFindManyRecords({
    objectNameSingular: BUREAU_DOCUMENT_OBJECT_NAME_SINGULAR,
    limit: 1,
    skip: workspace !== null,
  });
  const totalCount = workspace?.documents.length ?? queriedTotalCount;
  const isLoading = workspace ? workspace.isLoading : isQueryLoading;
  const error = workspace ? workspace.error : queryError;
  const canCreatePage = workspace?.permissions.canUpdateObjectRecords ?? true;
  const handleCreatePage = () => {
    if (onCreatePage) onCreatePage();
    else void createNewPage();
  };

  return (
    <StyledContainer data-testid="bureau-landing">
      <StyledOverview>
        <BureauTodayProgress />
        <StyledHeader>
          <StyledTitleGroup>
            <StyledTitle>{t`Bureau`}</StyledTitle>
            <StyledSubtitle>
              {t`A clear view of your day. A place for your ideas.`}
            </StyledSubtitle>
            <A2eLearnMoreLink appKey="bureau" />
          </StyledTitleGroup>
          <StyledHeaderActions>
            <A2eCustomizeAction objectNamePlural="documents" />
            {canCreatePage && totalCount !== 0 && (
              <Button
                Icon={IconPlus}
                title={t`New page`}
                onClick={handleCreatePage}
                dataTestId="bureau-new-page"
              />
            )}
          </StyledHeaderActions>
        </StyledHeader>
      </StyledOverview>
      <BureauTaskSheet />
      <StyledResources>
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
          {isLoading ? (
            <StyledSubtitle role="status">{t`Loading pages…`}</StyledSubtitle>
          ) : error ? (
            <>
              <StyledSubtitle role="status">{t`Could not load pages.`}</StyledSubtitle>
              <Button
                title={t`Retry`}
                ariaLabel={t`Retry`}
                variant="secondary"
                onClick={() => {
                  if (workspace) workspace.resyncDocuments();
                  else void refetch();
                }}
              />
            </>
          ) : totalCount === 0 && canCreatePage ? (
            <A2eContextualEmptyState
              surfaceKey="bureau"
              onPrimaryAction={handleCreatePage}
            />
          ) : (
            <RecentPagesWidget onSelectPage={onSelectPage} />
          )}
        </StyledSection>
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
      </StyledResources>
    </StyledContainer>
  );
};
