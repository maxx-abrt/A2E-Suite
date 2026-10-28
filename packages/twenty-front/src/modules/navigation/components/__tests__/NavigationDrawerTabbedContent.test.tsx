import { NavigationDrawerTabbedContent } from '@/navigation/components/NavigationDrawerTabbedContent';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockMountChat = jest.fn();

jest.mock('@/ai/components/NavigationDrawerAiChatContent', () => ({
  NavigationDrawerAiChatContent: () => {
    mockMountChat();
    return <input aria-label="Search chats" />;
  },
}));

jest.mock('@/ai/components/internal/AiChatSkeletonLoader', () => ({
  AiChatSkeletonLoader: () => <div>Loading chats</div>,
}));

const renderContent = (showAiChatContent: boolean, hasPermission = true) => (
  <NavigationDrawerTabbedContent
    showAiChatContent={showAiChatContent}
    shouldMountAiChatContent={hasPermission}
    navigationContent={<a href="/bureau">Bureau</a>}
  />
);

describe('NavigationDrawerTabbedContent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows navigation without mounting unused chat content', () => {
    render(renderContent(false));

    expect(screen.getByRole('link', { name: 'Bureau' })).toBeVisible();
    expect(mockMountChat).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Search chats')).not.toBeInTheDocument();
  });

  it('loads chat on first opening and preserves its state across tab switches', async () => {
    const user = userEvent.setup();
    const { rerender } = render(renderContent(false));

    rerender(renderContent(true));

    const search = await screen.findByRole('textbox', { name: 'Search chats' });
    await user.type(search, 'Meeting');

    rerender(renderContent(false));

    expect(
      screen.queryByRole('textbox', { name: 'Search chats' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bureau' })).toBeVisible();

    rerender(renderContent(true));

    expect(screen.getByRole('textbox', { name: 'Search chats' })).toBe(search);
    expect(search).toHaveValue('Meeting');
  });

  it('does not mount chat when permission is missing', () => {
    render(renderContent(true, false));

    expect(mockMountChat).not.toHaveBeenCalled();
  });
});
