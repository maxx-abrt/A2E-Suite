import {
  IconCalendarEvent,
  IconChartBar,
  IconCheckbox,
  IconClockPlay,
  IconTimelineEvent,
} from 'twenty-ui/icon';

import { ContributionGridWidget } from '@/home-dashboard/components/ContributionGridWidget';
import { MyTasksWidget } from '@/home-dashboard/components/MyTasksWidget';
import { PomodoroWidget } from '@/home-dashboard/components/PomodoroWidget';
import { RecentActivityWidget } from '@/home-dashboard/components/RecentActivityWidget';
import { UpcomingEventsWidget } from '@/home-dashboard/components/UpcomingEventsWidget';
import {
  registerWorkbenchWidget,
  type WorkbenchWidgetDefinition,
} from '~/modules/workbench-dock/registry/workbenchWidgetRegistry';

// The Home dashboard reuses the P2.4 dock extension points ("tasks" and
// "activity") instead of adding parallel widgets, and adds two more.
const HOME_DASHBOARD_WIDGET_DEFINITIONS: WorkbenchWidgetDefinition[] = [
  { id: 'tasks', Icon: IconCheckbox, Component: MyTasksWidget, order: 40 },
  {
    id: 'events',
    Icon: IconCalendarEvent,
    Component: UpcomingEventsWidget,
    order: 45,
  },
  {
    id: 'activity',
    Icon: IconTimelineEvent,
    Component: RecentActivityWidget,
    order: 50,
  },
  {
    id: 'focus',
    Icon: IconClockPlay,
    Component: PomodoroWidget,
    order: 52,
  },
  {
    id: 'contributions',
    Icon: IconChartBar,
    Component: ContributionGridWidget,
    order: 55,
  },
];

let unregisterHomeDashboardWidgets: (() => void) | null = null;

export const registerHomeDashboardWidgets = (): (() => void) => {
  if (unregisterHomeDashboardWidgets !== null) {
    return unregisterHomeDashboardWidgets;
  }

  const unregistrations = HOME_DASHBOARD_WIDGET_DEFINITIONS.map(
    registerWorkbenchWidget,
  );

  unregisterHomeDashboardWidgets = () => {
    unregistrations.forEach((unregister) => unregister());
    unregisterHomeDashboardWidgets = null;
  };

  return unregisterHomeDashboardWidgets;
};

registerHomeDashboardWidgets();
