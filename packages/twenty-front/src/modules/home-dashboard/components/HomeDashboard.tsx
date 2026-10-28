import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';
import {
  IconAlertCircle,
  IconCalendarEvent,
  IconChartBar,
  IconCheckbox,
  IconClockPlay,
  IconCoins,
  IconHelpCircle,
  IconNotes,
  IconTimelineEvent,
} from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useBilanNavigationPath } from '@/bilan/hooks/useBilanNavigationPath';
import { FirstOpenHelpWidget } from '@/first-open-help/components/FirstOpenHelpWidget';
import { ContributionGridWidget } from '@/home-dashboard/components/ContributionGridWidget';
import { HomeDashboardCard } from '@/home-dashboard/components/HomeDashboardCard';
import { HomeSuggestionsWidget } from '@/home-dashboard/components/HomeSuggestionsWidget';
import { MyTasksWidget } from '@/home-dashboard/components/MyTasksWidget';
import { PendingBilanWidget } from '@/home-dashboard/components/PendingBilanWidget';
import { PomodoroWidget } from '@/home-dashboard/components/PomodoroWidget';
import { RecentActivityWidget } from '@/home-dashboard/components/RecentActivityWidget';
import { RecentPagesWidget } from '@/home-dashboard/components/RecentPagesWidget';
import { UpcomingEventsWidget } from '@/home-dashboard/components/UpcomingEventsWidget';
import { getHomeGreetingPeriod } from '@/home-dashboard/utils/getHomeGreetingPeriod';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const StyledContainer = styled.div`
  background: ${themeCssVariables.background.primary};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[8]}
    ${themeCssVariables.spacing[10]};
  width: 100%;

  @media (max-width: 600px) {
    padding: ${themeCssVariables.spacing[5]};
  }
`;

const StyledHeader = styled.header`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding-bottom: ${themeCssVariables.spacing[6]};
  position: relative;

  &::after {
    background: linear-gradient(
      90deg,
      ${themeCssVariables.color.red} 0% 16.66%,
      ${themeCssVariables.color.yellow} 16.66% 33.33%,
      ${themeCssVariables.color.orange} 33.33% 50%,
      ${themeCssVariables.color.green} 50% 66.66%,
      ${themeCssVariables.color.blue} 66.66% 83.33%,
      ${themeCssVariables.color.pink} 83.33% 100%
    );
    border-radius: ${themeCssVariables.border.radius.pill};
    bottom: -2px;
    content: '';
    height: 3px;
    left: 0;
    width: 96px;
  }
`;

const StyledToday = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StyledGreeting = styled.h1`
  color: ${themeCssVariables.font.color.primary};
  font-size: clamp(24px, 3vw, 32px);
  font-weight: ${themeCssVariables.font.weight.semiBold};
  letter-spacing: -0.04em;
  line-height: 1.3;
  margin: 0;
`;

const StyledDate = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  margin: 0;
`;

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
`;

// Desktop Home: the widgets the removed right dock used to host (D-Shell),
// laid out as native dashboard cards. Each widget fetches its own data.
export const HomeDashboard = () => {
  const { t, i18n } = useLingui();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const bilanNavigationPath = useBilanNavigationPath();
  const now = new Date();

  const firstName = currentWorkspaceMember?.name?.firstName?.trim() ?? '';
  const greetingPeriod = getHomeGreetingPeriod(now);

  const getGreeting = () => {
    if (firstName === '') {
      switch (greetingPeriod) {
        case 'MORNING':
          return t`Good morning`;
        case 'AFTERNOON':
          return t`Good afternoon`;
        case 'EVENING':
          return t`Good evening`;
      }
    }

    switch (greetingPeriod) {
      case 'MORNING':
        return t`Good morning, ${firstName}`;
      case 'AFTERNOON':
        return t`Good afternoon, ${firstName}`;
      case 'EVENING':
        return t`Good evening, ${firstName}`;
    }
  };

  const dateLabel = now.toLocaleDateString(
    i18n.locale === 'pseudo-en' ? 'en' : i18n.locale || 'en',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
  );

  return (
    <StyledContainer data-testid="home-dashboard">
      <StyledHeader>
        <StyledToday>{t`Today`}</StyledToday>
        <StyledGreeting>{getGreeting()}</StyledGreeting>
        <StyledDate>{dateLabel}</StyledDate>
      </StyledHeader>
      <StyledGrid>
        <HomeDashboardCard
          title={t`Needs attention`}
          Icon={IconAlertCircle}
          testId="home-card-suggestions"
        >
          <HomeSuggestionsWidget />
        </HomeDashboardCard>
        <HomeDashboardCard
          title={t`My tasks`}
          Icon={IconCheckbox}
          testId="home-card-my-tasks"
          seeAllLink={{ label: t`See all tasks`, to: AppPath.TasksPage }}
        >
          <MyTasksWidget />
        </HomeDashboardCard>
        <HomeDashboardCard
          title={t`Upcoming events`}
          Icon={IconCalendarEvent}
          testId="home-card-upcoming-events"
          seeAllLink={{ label: t`Open Agenda`, to: AppPath.Calendar }}
        >
          <UpcomingEventsWidget />
        </HomeDashboardCard>
        <HomeDashboardCard
          title={t`Recent activity`}
          Icon={IconTimelineEvent}
          testId="home-card-recent-activity"
        >
          <RecentActivityWidget />
        </HomeDashboardCard>
        <HomeDashboardCard
          title={t`Recent pages`}
          Icon={IconNotes}
          testId="home-card-recent-pages"
          seeAllLink={{
            label: t`See all pages`,
            to: getAppPath(AppPath.RecordIndexPage, {
              objectNamePlural: 'documents',
            }),
          }}
        >
          <RecentPagesWidget />
        </HomeDashboardCard>
        {bilanNavigationPath && (
          <HomeDashboardCard
            title={t`Pending in Bilan`}
            Icon={IconCoins}
            testId="home-card-pending-bilan"
            seeAllLink={{
              label: t`Open Bilan`,
              to: bilanNavigationPath,
            }}
          >
            <PendingBilanWidget />
          </HomeDashboardCard>
        )}
        <HomeDashboardCard
          title={t`Focus`}
          Icon={IconClockPlay}
          testId="home-card-focus"
        >
          <PomodoroWidget />
        </HomeDashboardCard>
        <HomeDashboardCard
          title={t`Contributions`}
          Icon={IconChartBar}
          testId="home-card-contributions"
        >
          <ContributionGridWidget />
        </HomeDashboardCard>
        <HomeDashboardCard
          title={t`Help and getting started`}
          Icon={IconHelpCircle}
          testId="home-card-help"
        >
          <FirstOpenHelpWidget />
        </HomeDashboardCard>
      </StyledGrid>
    </StyledContainer>
  );
};
