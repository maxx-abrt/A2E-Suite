import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { UpcomingEventsWidgetContent } from '@/home-dashboard/components/UpcomingEventsWidgetContent';

const renderWidget = (
  entries: Parameters<typeof UpcomingEventsWidgetContent>[0]['entries'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <UpcomingEventsWidgetContent entries={entries} />
    </I18nProvider>,
  );

describe('UpcomingEventsWidgetContent', () => {
  it('shows the empty state without entries', () => {
    renderWidget([]);

    expect(
      screen.getByTestId('home-upcoming-events-empty'),
    ).toBeInTheDocument();
  });

  it('renders event entries', () => {
    renderWidget([
      {
        id: 'event-1',
        title: 'Team sync',
        subtitle: '10:00 – 10:30',
        trailingLabel: '18 Sep',
      },
    ]);

    expect(
      screen.getByTestId('home-upcoming-events-entry-event-1'),
    ).toHaveTextContent('Team sync');
  });
});
