import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';

const renderList = (
  entries: Parameters<typeof HomeWidgetList>[0]['entries'],
  emptyLabel: string,
  testId: string,
  onSelectEntry?: (entryId: string) => void,
) =>
  render(
    <I18nProvider i18n={i18n}>
      <HomeWidgetList
        entries={entries}
        emptyLabel={emptyLabel}
        testId={testId}
        onSelectEntry={onSelectEntry}
      />
    </I18nProvider>,
  );

describe('HomeWidgetList', () => {
  it('renders an empty state when there are no entries', () => {
    renderList([], 'Nothing here', 'widget');

    expect(screen.getByTestId('widget-empty')).toHaveTextContent(
      'Nothing here',
    );
    expect(screen.queryByTestId('widget')).toBeNull();
  });

  it('renders entries with a subtitle and trailing label', () => {
    renderList(
      [
        {
          id: 'entry-1',
          title: 'Ship the feed',
          subtitle: 'Ada Lovelace',
          trailingLabel: '18 Sep',
        },
      ],
      'Nothing here',
      'widget',
    );

    const entry = screen.getByTestId('widget-entry-entry-1');

    expect(entry).toHaveTextContent('Ship the feed');
    expect(entry).toHaveTextContent('Ada Lovelace');
    expect(entry).toHaveTextContent('18 Sep');
  });

  it('keeps rows read-only when no selection handler is given', () => {
    renderList(
      [{ id: 'entry-1', title: 'Ship the feed' }],
      'Nothing here',
      'widget',
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('reports the selected entry on click and with the keyboard', async () => {
    const onSelectEntry = jest.fn();

    renderList(
      [
        { id: 'entry-1', title: 'Ship the feed' },
        { id: 'entry-2', title: 'Plan the launch' },
      ],
      'Nothing here',
      'widget',
      onSelectEntry,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Ship the feed/ }),
    );
    expect(onSelectEntry).toHaveBeenLastCalledWith('entry-1');

    screen.getByRole('button', { name: /Plan the launch/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelectEntry).toHaveBeenLastCalledWith('entry-2');
  });
});
