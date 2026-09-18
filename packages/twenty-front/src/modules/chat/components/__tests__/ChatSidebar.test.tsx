import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { ChatSidebar } from '@/chat/components/ChatSidebar';
import { type ChatChannel } from '@/chat/types/ChatChannel';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildChannel = (
  overrides: Partial<ChatChannel> & Pick<ChatChannel, 'id' | 'name' | 'kind'>,
): ChatChannel => ({
  visibility: 'PUBLIC',
  topic: null,
  ...overrides,
});

const sections = [
  {
    kind: 'WORKSPACE' as const,
    channels: [
      buildChannel({ id: 'general', name: 'General', kind: 'WORKSPACE' }),
    ],
  },
  {
    kind: 'CUSTOM' as const,
    channels: [buildChannel({ id: 'random', name: 'Random', kind: 'CUSTOM' })],
  },
];

describe('ChatSidebar', () => {
  it('should render one section per channel kind in order', () => {
    render(
      <ChatSidebar
        sections={sections}
        selectedChannelId={null}
        unreadCountByChannelId={{}}
        onSelectChannel={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('chat-section-WORKSPACE')).toBeInTheDocument();
    expect(screen.getByTestId('chat-section-CUSTOM')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('should show an unread badge and bold the channel name', () => {
    render(
      <ChatSidebar
        sections={sections}
        selectedChannelId={null}
        unreadCountByChannelId={{ general: 4 }}
        onSelectChannel={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByTestId('chat-channel-unread-general')).toHaveTextContent(
      '4',
    );
    expect(screen.queryByTestId('chat-channel-unread-random')).toBeNull();
  });

  it('should select a channel when clicked', async () => {
    const onSelectChannel = jest.fn();

    render(
      <ChatSidebar
        sections={sections}
        selectedChannelId={null}
        unreadCountByChannelId={{}}
        onSelectChannel={onSelectChannel}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByTestId('chat-channel-item-random'));

    expect(onSelectChannel).toHaveBeenCalledWith('random');
  });

  it('should show an empty state when there is no channel', () => {
    render(
      <ChatSidebar
        sections={[]}
        selectedChannelId={null}
        unreadCountByChannelId={{}}
        onSelectChannel={jest.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('No channels yet')).toBeInTheDocument();
  });
});
