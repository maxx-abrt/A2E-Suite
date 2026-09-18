import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { ChatThreadView } from '@/chat/components/ChatThreadView';
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

describe('ChatThreadView', () => {
  it('should render the parent message and its replies', () => {
    render(
      <ChatThreadView
        parentMessage={buildMessage({
          id: 'parent',
          createdAt: '2026-01-01T01:00:00.000Z',
          body: 'the parent',
        })}
        replies={[
          buildMessage({
            id: 'reply',
            createdAt: '2026-01-01T02:00:00.000Z',
            body: 'the reply',
          }),
        ]}
        resolveAuthorLabel={resolveAuthorLabel}
        onClose={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('the parent')).toBeInTheDocument();
    expect(screen.getByTestId('chat-thread-reply-reply')).toBeInTheDocument();
    expect(screen.getByText('the reply')).toBeInTheDocument();
  });

  it('should show an empty state without replies', () => {
    render(
      <ChatThreadView
        parentMessage={buildMessage({
          id: 'parent',
          createdAt: '2026-01-01T01:00:00.000Z',
        })}
        replies={[]}
        resolveAuthorLabel={resolveAuthorLabel}
        onClose={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('No replies yet')).toBeInTheDocument();
  });

  it('should close the thread', async () => {
    const onClose = jest.fn();

    render(
      <ChatThreadView
        parentMessage={buildMessage({
          id: 'parent',
          createdAt: '2026-01-01T01:00:00.000Z',
        })}
        replies={[]}
        resolveAuthorLabel={resolveAuthorLabel}
        onClose={onClose}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('chat-thread-close'));

    expect(onClose).toHaveBeenCalled();
  });
});
