import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { PendingBilanWidgetContent } from '@/home-dashboard/components/PendingBilanWidgetContent';

const renderWidget = (
  entries: Parameters<typeof PendingBilanWidgetContent>[0]['entries'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <PendingBilanWidgetContent entries={entries} />
    </I18nProvider>,
  );

describe('PendingBilanWidgetContent', () => {
  it('shows the empty state when Bilan is absent or nothing is pending', () => {
    renderWidget([]);

    expect(screen.getByTestId('home-pending-bilan-empty')).toBeInTheDocument();
  });

  it('renders overdue Bilan entries', () => {
    renderWidget([
      {
        id: 'invoice-1',
        title: 'F-001',
        subtitle: '10 Sep',
        trailingLabel: 'Overdue',
        isOverdue: true,
      },
    ]);

    expect(
      screen.getByTestId('home-pending-bilan-entry-invoice-1'),
    ).toHaveTextContent('F-001');
  });
});
