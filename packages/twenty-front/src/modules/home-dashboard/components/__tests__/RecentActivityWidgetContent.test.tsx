import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { RecentActivityWidgetContent } from '@/home-dashboard/components/RecentActivityWidgetContent';

const renderWidget = (
  entries: Parameters<typeof RecentActivityWidgetContent>[0]['entries'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <RecentActivityWidgetContent entries={entries} />
    </I18nProvider>,
  );

describe('RecentActivityWidgetContent', () => {
  it('shows the empty state without entries', () => {
    renderWidget([]);

    expect(
      screen.getByTestId('home-recent-activity-empty'),
    ).toBeInTheDocument();
  });

  it('renders activity entries', () => {
    renderWidget([{ id: 'activity-1', title: 'Created company' }]);

    expect(
      screen.getByTestId('home-recent-activity-entry-activity-1'),
    ).toHaveTextContent('Created company');
  });
});
