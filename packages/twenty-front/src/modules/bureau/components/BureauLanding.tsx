import { BUREAU_LANDING_TEMPLATE_CATEGORY } from '@/bureau/constants/BureauLandingTemplateCategory';
import { BUREAU_LANDING_TEMPLATE_LINKS } from '@/bureau/constants/BureauLandingTemplates';
import { RecentPagesWidget } from '@/home-dashboard/components/RecentPagesWidget';
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

// The Bureau home (M7f): one primary action, three starter templates from the
// M9 gallery and the recent pages, so the app opens on a home instead of a bare
// table view. It is install-gated on a2e-documents — without the app the object
// does not exist and the landing renders nothing rather than a broken widget.
export const BureauLanding = () => {
  const { t } = useLingui();
  const isDocumentApplicationInstalled = useIsDocumentApplicationInstalled();
  const { createNewPage } = useCreateNewPage();
  const { openTemplateGallery } = useOpenTemplateGallery();

  if (!isDocumentApplicationInstalled) {
    return null;
  }

  return (
    <StyledContainer data-testid="bureau-landing">
      <StyledHeader>
        <StyledTitleGroup>
          <StyledTitle>{t`Bureau`}</StyledTitle>
          <StyledSubtitle>
            {t`Your pages, templates and recent work in one place.`}
          </StyledSubtitle>
        </StyledTitleGroup>
        <Button
          Icon={IconPlus}
          title={t`New page`}
          onClick={() => {
            void createNewPage();
          }}
          dataTestId="bureau-new-page"
        />
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
        <RecentPagesWidget />
      </StyledSection>
    </StyledContainer>
  );
};
