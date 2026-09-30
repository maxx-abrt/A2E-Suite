import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';

import {
  type CurrentWorkspaceMember,
  currentWorkspaceMemberState,
} from '@/auth/states/currentWorkspaceMemberState';
import { HomeDashboard } from '@/home-dashboard/components/HomeDashboard';

// The widgets fetch their own data; Home only owns which cards exist, their
// titles and their deep links, so each widget is stubbed to a marker.
jest.mock('@/home-dashboard/components/HomeSuggestionsWidget', () => ({
  HomeSuggestionsWidget: () => <div>suggestions-widget</div>,
}));
jest.mock('@/home-dashboard/components/MyTasksWidget', () => ({
  MyTasksWidget: () => <div>my-tasks-widget</div>,
}));
jest.mock('@/home-dashboard/components/UpcomingEventsWidget', () => ({
  UpcomingEventsWidget: () => <div>upcoming-events-widget</div>,
}));
jest.mock('@/home-dashboard/components/RecentActivityWidget', () => ({
  RecentActivityWidget: () => <div>recent-activity-widget</div>,
}));
jest.mock('@/home-dashboard/components/RecentPagesWidget', () => ({
  RecentPagesWidget: () => <div>recent-pages-widget</div>,
}));
jest.mock('@/home-dashboard/components/PendingBilanWidget', () => ({
  PendingBilanWidget: () => <div>pending-bilan-widget</div>,
}));
jest.mock('@/home-dashboard/components/PomodoroWidget', () => ({
  PomodoroWidget: () => <div>focus-widget</div>,
}));
jest.mock('@/home-dashboard/components/ContributionGridWidget', () => ({
  ContributionGridWidget: () => <div>contributions-widget</div>,
}));
jest.mock('@/first-open-help/components/FirstOpenHelpWidget', () => ({
  FirstOpenHelpWidget: () => <div>help-widget</div>,
}));

const renderHomeDashboard = (firstName: string | null) => {
  const jotaiStore = createStore();

  // Set explicitly in both cases: the member state outlives a single store.
  jotaiStore.set(
    currentWorkspaceMemberState.atom,
    firstName === null
      ? null
      : ({
          id: 'workspace-member-id',
          name: { firstName, lastName: 'Lovelace' },
        } as CurrentWorkspaceMember),
  );

  return render(
    <JotaiProvider store={jotaiStore}>
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <HomeDashboard />
        </MemoryRouter>
      </I18nProvider>
    </JotaiProvider>,
  );
};

describe('HomeDashboard', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 26, 9, 30) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('greets the current member by first name', () => {
    renderHomeDashboard('Ada');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Good morning, Ada' }),
    ).toBeInTheDocument();
  });

  it('falls back to a nameless greeting before the member is loaded', () => {
    renderHomeDashboard(null);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Good morning' }),
    ).toBeInTheDocument();
  });

  it('hosts every widget the removed dock carried, including help', () => {
    renderHomeDashboard('Ada');

    for (const [cardTestId, widgetMarker] of [
      ['home-card-suggestions', 'suggestions-widget'],
      ['home-card-my-tasks', 'my-tasks-widget'],
      ['home-card-upcoming-events', 'upcoming-events-widget'],
      ['home-card-recent-activity', 'recent-activity-widget'],
      ['home-card-recent-pages', 'recent-pages-widget'],
      ['home-card-pending-bilan', 'pending-bilan-widget'],
      ['home-card-focus', 'focus-widget'],
      ['home-card-contributions', 'contributions-widget'],
      ['home-card-help', 'help-widget'],
    ]) {
      expect(screen.getByTestId(cardTestId)).toHaveTextContent(widgetMarker);
    }
  });

  it('deep-links cards to their native pages', () => {
    renderHomeDashboard('Ada');

    expect(screen.getByRole('link', { name: 'See all tasks' })).toHaveAttribute(
      'href',
      '/objects/tasks',
    );
    expect(screen.getByRole('link', { name: 'Open Agenda' })).toHaveAttribute(
      'href',
      '/calendar',
    );
    expect(screen.getByRole('link', { name: 'See all pages' })).toHaveAttribute(
      'href',
      '/objects/documents',
    );
    expect(screen.getByRole('link', { name: 'Open Bilan' })).toHaveAttribute(
      'href',
      '/objects/invoices',
    );
  });
});
