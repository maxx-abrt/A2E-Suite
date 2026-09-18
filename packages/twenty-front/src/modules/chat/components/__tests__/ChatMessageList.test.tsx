import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { ChatMessageList } from '@/chat/components/ChatMessageList';
import { type ChatMessage } from '@/chat/types/ChatMessage';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const resolveAuthorLabel = (authorId: string | null) =>
  authorId === null ? 'Unknown' : `Member ${authorId}`;

const buildMessage = (
  overrides: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'createdAt'>,
): ChatMessage => ({
  body: 'body',
  channelId: 'channel-1',
  authorId: '1',
  threadParentId: null,
  editedAt: null,
  ...overrides,
});

const channelMessages: ChatMessage[] = [
  buildMessage({ id: 'parent', createdAt: '2026-01-01T01:00:00.000Z' }),
  buildMessage({
    id: 'reply',
    createdAt: '2026-01-01T02:00:00.000Z',
    threadParentId: 'parent',
    body: 'a reply',
  }),
  buildMessage({ id: 'second', createdAt: '2026-01-01T03:00:00.000Z' }),
];

type RenderListOverrides = {
  messages?: ChatMessage[];
  firstUnreadMessageId?: string | null;
  expandedThreadParentId?: string | null;
  onToggleThread?: (parentMessageId: string) => void;
  onOpenThread?: (parentMessageId: string) => void;
};

const renderList = (overrides: RenderListOverrides = {}) =>
  render(
    <ChatMessageList
      messages={overrides.messages ?? channelMessages}
      firstUnreadMessageId={overrides.firstUnreadMessageId ?? null}
      expandedThreadParentId={overrides.expandedThreadParentId ?? null}
      resolveAuthorLabel={resolveAuthorLabel}
      onToggleThread={overrides.onToggleThread ?? jest.fn()}
      onOpenThread={overrides.onOpenThread ?? jest.fn()}
    />,
    { wrapper: Wrapper },
  );

describe('ChatMessageList', () => {
  it('should render top-level messages and hide inline replies by default', () => {
    renderList();

    expect(screen.getByTestId('chat-message-parent')).toBeInTheDocument();
    expect(screen.getByTestId('chat-message-second')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-message-reply')).toBeNull();
    expect(screen.queryByText('a reply')).toBeNull();
  });

  it('should show the reply count and toggle the inline thread', async () => {
    const onToggleThread = jest.fn();

    renderList({ onToggleThread });

    await userEvent.click(screen.getByTestId('chat-thread-toggle-parent'));

    expect(onToggleThread).toHaveBeenCalledWith('parent');
  });

  it('should render inline replies when the thread is expanded', () => {
    renderList({ expandedThreadParentId: 'parent' });

    expect(
      screen.getByTestId('chat-thread-replies-parent'),
    ).toBeInTheDocument();
    expect(screen.getByText('a reply')).toBeInTheDocument();
  });

  it('should place the unread divider before the first unread message', () => {
    renderList({ firstUnreadMessageId: 'second' });

    const divider = screen.getByTestId('chat-unread-divider');

    expect(divider).toBeInTheDocument();
    expect(divider.nextElementSibling).toBe(
      screen.getByTestId('chat-message-second'),
    );
  });

  it('should open a dedicated thread view', async () => {
    const onOpenThread = jest.fn();

    renderList({ onOpenThread });

    await userEvent.click(screen.getByTestId('chat-thread-open-second'));

    expect(onOpenThread).toHaveBeenCalledWith('second');
  });

  it('should show an empty state when there is no message', () => {
    renderList({ messages: [] });

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
});
