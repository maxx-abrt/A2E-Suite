import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { ContributionGridWidgetContent } from '@/home-dashboard/components/ContributionGridWidgetContent';
import { type ContributionGridWeek } from '@/home-dashboard/utils/buildContributionGrid';

const weeks: ContributionGridWeek[] = [
  {
    days: [
      { date: '2026-09-07', count: 2, level: 4 },
      { date: '2026-09-08', count: 0, level: 0 },
      { date: '2026-09-09', count: 0, level: 0 },
      { date: '2026-09-10', count: 1, level: 2 },
      { date: '2026-09-11', count: 0, level: 0 },
      { date: '2026-09-12', count: 0, level: 0 },
      { date: '2026-09-13', count: 0, level: 0 },
    ],
  },
];

const renderWidget = (gridWeeks: ContributionGridWeek[]) =>
  render(
    <I18nProvider i18n={i18n}>
      <ContributionGridWidgetContent weeks={gridWeeks} />
    </I18nProvider>,
  );

describe('ContributionGridWidgetContent', () => {
  it('renders a cell per day with its level and a total caption', () => {
    renderWidget(weeks);

    expect(screen.getByTestId('home-contribution-grid')).toBeInTheDocument();
    expect(screen.getByTestId('contribution-cell-2026-09-07')).toHaveAttribute(
      'data-level',
      '4',
    );
    expect(screen.getByTestId('contribution-cell-2026-09-10')).toHaveAttribute(
      'data-level',
      '2',
    );
    expect(screen.getByText('3 activities in this period')).toBeInTheDocument();
  });

  it('skips padding cells outside the current day', () => {
    renderWidget([
      {
        days: [
          { date: '2026-09-14', count: 0, level: 0 },
          null,
          null,
          null,
          null,
          null,
          null,
        ],
      },
    ]);

    expect(
      screen.getByTestId('contribution-cell-2026-09-14'),
    ).toBeInTheDocument();
  });
});
