import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  HomeSuggestionsWidgetContent,
  type HomeSuggestionsWidgetContentProps,
} from '@/home-dashboard/components/HomeSuggestionsWidgetContent';
import {
  buildHomeSuggestions,
  type HomeSuggestion,
} from '@/home-dashboard/utils/buildHomeSuggestions';
import { type InboxNotification } from '@/inbox/types/InboxNotification';

const NOW = new Date('2026-09-19T12:00:00.000Z');

const renderContent = ({
  suggestions,
  onOpenSuggestion = jest.fn(),
  onDismissSuggestion = jest.fn(),
}: Partial<HomeSuggestionsWidgetContentProps> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <HomeSuggestionsWidgetContent
        suggestions={suggestions ?? []}
        onOpenSuggestion={onOpenSuggestion}
        onDismissSuggestion={onDismissSuggestion}
      />
    </I18nProvider>,
  );

const buildOverdueSuggestion = (): HomeSuggestion =>
  buildHomeSuggestions({
    tasks: [
      {
        id: 'task-1',
        title: 'Send the contract',
        status: 'TODO',
        dueAt: '2026-09-15T00:00:00.000Z',
        updatedAt: '2026-09-15T00:00:00.000Z',
      },
    ],
    notifications: [],
    now: NOW,
  })[0];

describe('HomeSuggestionsWidgetContent', () => {
  it('renders a recoverable empty state when nothing needs attention', () => {
    renderContent();

    expect(screen.getByTestId('home-suggestions-empty')).toHaveTextContent(
      'Nothing needs attention',
    );
    expect(screen.queryByTestId('home-suggestions')).toBeNull();
  });

  it('renders cards from the rules util output with links', () => {
    renderContent({ suggestions: [buildOverdueSuggestion()] });

    const card = screen.getByTestId('home-suggestion-OVERDUE_TASK:task-1');

    expect(card).toHaveTextContent('Send the contract');
    expect(card).toHaveTextContent('Overdue task');
    expect(
      screen.getByTestId('home-suggestion-link-OVERDUE_TASK:task-1'),
    ).toHaveAttribute('href', '/object/task/task-1');
  });

  it('opens the target through the navigation callback', async () => {
    const onOpenSuggestion = jest.fn();

    renderContent({
      suggestions: [buildOverdueSuggestion()],
      onOpenSuggestion,
    });

    await userEvent.click(
      screen.getByTestId('home-suggestion-link-OVERDUE_TASK:task-1'),
    );

    expect(onOpenSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ deepLink: '/object/task/task-1' }),
    );
  });

  it('dismisses a card through its dismiss control', async () => {
    const onDismissSuggestion = jest.fn();

    renderContent({
      suggestions: [buildOverdueSuggestion()],
      onDismissSuggestion,
    });

    await userEvent.click(
      screen.getByTestId('home-suggestion-dismiss-OVERDUE_TASK:task-1'),
    );

    expect(onDismissSuggestion).toHaveBeenCalledWith('OVERDUE_TASK:task-1');
  });

  it('renders a mention without a destination as a non-navigable card', () => {
    const notifications: InboxNotification[] = [
      {
        id: 'mention-1',
        type: 'MENTION',
        payload: null,
        createdAt: NOW.toISOString(),
        readAt: null,
        archivedAt: null,
      },
    ];

    renderContent({
      suggestions: buildHomeSuggestions({
        tasks: [],
        notifications,
        now: NOW,
      }),
    });

    expect(
      screen.getByTestId('home-suggestion-UNREAD_MENTION:mention-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('home-suggestion-link-UNREAD_MENTION:mention-1'),
    ).toBeNull();
  });
});
