import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';

import { MyTasksWidgetContent } from '@/home-dashboard/components/MyTasksWidgetContent';

const renderWidget = (
  entries: Parameters<typeof MyTasksWidgetContent>[0]['entries'],
) =>
  render(
    <I18nProvider i18n={i18n}>
      <MyTasksWidgetContent entries={entries} />
    </I18nProvider>,
  );

describe('MyTasksWidgetContent', () => {
  it('shows the empty state without entries', () => {
    renderWidget([]);

    expect(screen.getByTestId('home-my-tasks-empty')).toBeInTheDocument();
  });

  it('renders task entries and flags overdue ones', () => {
    renderWidget([
      { id: 'task-1', title: 'Ship the feed', trailingLabel: 'Overdue' },
    ]);

    expect(screen.getByTestId('home-my-tasks-entry-task-1')).toHaveTextContent(
      'Overdue',
    );
  });
});
