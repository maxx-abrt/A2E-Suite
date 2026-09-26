import { MobileHomeAiChatSection } from '@/ai/components/MobileHomeAiChatSection';
import { ContributionGridWidget } from '@/home-dashboard/components/ContributionGridWidget';
import { HomeSuggestionsWidget } from '@/home-dashboard/components/HomeSuggestionsWidget';
import { MyTasksWidget } from '@/home-dashboard/components/MyTasksWidget';
import { PomodoroWidget } from '@/home-dashboard/components/PomodoroWidget';
import { RecentActivityWidget } from '@/home-dashboard/components/RecentActivityWidget';
import { UpcomingEventsWidget } from '@/home-dashboard/components/UpcomingEventsWidget';
import { MainNavigationDrawerNavigationContent } from '@/navigation/components/MainNavigationDrawerNavigationContent';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { MultiWorkspaceDropdownButton } from '@/ui/navigation/navigation-drawer/components/MultiWorkspaceDropdown/MultiWorkspaceDropdownButton';
import { NavigationDrawerFixedContent } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerFixedContent';
import { NavigationDrawerScrollableContent } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerScrollableContent';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { PermissionFlagType } from '~/generated-metadata/graphql';

// Mobile container — full-height drawer layout used on phones.
const StyledMobileContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  height: 100%;
  min-height: 0;
  padding: ${themeCssVariables.spacing[2]} 0 ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledMobileSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
`;

// Desktop container — responsive widget grid that fills the main content area.
const StyledDesktopContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  height: 100%;
  overflow: auto;
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[8]};
  width: 100%;
`;

const StyledDesktopHeading = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledDesktopGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
`;

const StyledWidgetCard = styled.section`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
`;

const StyledWidgetCardHeader = styled.header`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex: 0 0 auto;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledWidgetCardBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const DesktopHomeWidgetCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <StyledWidgetCard>
    <StyledWidgetCardHeader>{title}</StyledWidgetCardHeader>
    <StyledWidgetCardBody>{children}</StyledWidgetCardBody>
  </StyledWidgetCard>
);

// Desktop home page: responsive native widget grid. Each home-dashboard
// component already fetches its own data so no extra glue layer is needed.
// my-tasks / events / activity deep-link to native pages through their own
// item click handlers (see MyTasksWidget et al.).
const DesktopHomePage = () => {
  const { t } = useLingui();
  const hasAiPermission = useHasPermissionFlag(PermissionFlagType.AI);

  return (
    <StyledDesktopContainer>
      <StyledDesktopHeading>{t`Accueil`}</StyledDesktopHeading>
      <StyledDesktopGrid>
        <DesktopHomeWidgetCard title={t`Suggestions`}>
          <HomeSuggestionsWidget />
        </DesktopHomeWidgetCard>
        <DesktopHomeWidgetCard title={t`Mes tâches`}>
          <MyTasksWidget />
        </DesktopHomeWidgetCard>
        <DesktopHomeWidgetCard title={t`Évènements à venir`}>
          <UpcomingEventsWidget />
        </DesktopHomeWidgetCard>
        <DesktopHomeWidgetCard title={t`Activité récente`}>
          <RecentActivityWidget />
        </DesktopHomeWidgetCard>
        {hasAiPermission && (
          <DesktopHomeWidgetCard title={t`Focus`}>
            <PomodoroWidget />
          </DesktopHomeWidgetCard>
        )}
        <DesktopHomeWidgetCard title={t`Contributions`}>
          <ContributionGridWidget />
        </DesktopHomeWidgetCard>
      </StyledDesktopGrid>
    </StyledDesktopContainer>
  );
};

export const MobileHomePage = () => {
  const isMobile = useIsMobile();
  const hasAiPermission = useHasPermissionFlag(PermissionFlagType.AI);

  // Desktop renders the responsive widget grid; the navigation drawer is
  // always visible there so the mobile sections below are unnecessary.
  if (!isMobile) {
    return <DesktopHomePage />;
  }

  return (
    <StyledMobileContainer>
      <NavigationDrawerFixedContent>
        <MultiWorkspaceDropdownButton />
      </NavigationDrawerFixedContent>

      <NavigationDrawerScrollableContent>
        <StyledMobileSections>
          <MainNavigationDrawerNavigationContent />
          {hasAiPermission && <MobileHomeAiChatSection />}
        </StyledMobileSections>
      </NavigationDrawerScrollableContent>
    </StyledMobileContainer>
  );
};
