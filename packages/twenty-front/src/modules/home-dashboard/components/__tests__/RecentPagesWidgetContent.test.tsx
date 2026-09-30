import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { RecentPagesWidgetContent } from '@/home-dashboard/components/RecentPagesWidgetContent';

const renderWidget = (
  entries: Parameters<typeof RecentPagesWidgetContent>[0]['entries'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <RecentPagesWidgetContent entries={entries} />
    </I18nProvider>,
  );

describe('RecentPagesWidgetContent', () => {
  it('shows the empty state without entries', () => {
    renderWidget([]);

    expect(screen.getByTestId('home-recent-pages-empty')).toBeInTheDocument();
  });

  it('renders page entries', () => {
    renderWidget([
      {
        id: 'page-1',
        title: 'Compte rendu',
        subtitle: '25 Sep',
      },
    ]);

    expect(
      screen.getByTestId('home-recent-pages-entry-page-1'),
    ).toHaveTextContent('Compte rendu');
  });
});
