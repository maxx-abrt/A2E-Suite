import { usePreloadWorkspaceRoute } from '@/app/routing/hooks/usePreloadWorkspaceRoute';
import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

jest.mock('@/app/routing/hooks/usePreloadWorkspaceRoute');
jest.mock('@/navigation/hooks/useIsNavigationDrawerContentExpanded', () => ({
  useIsNavigationDrawerContentExpanded: () => true,
}));
jest.mock('@/ui/utilities/responsive/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

const preloadPage = jest.fn();

const Location = () => <div>Location: {useLocation().pathname}</div>;

const renderItem = (to: string) =>
  render(
    <MemoryRouter initialEntries={['/home']}>
      <NavigationDrawerItem label="Bureau" to={to} />
      <Location />
    </MemoryRouter>,
  );

describe('NavigationDrawerItem preloading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(usePreloadWorkspaceRoute).mockReturnValue(preloadPage);
  });

  it('starts downloading on hover without navigating', async () => {
    const user = userEvent.setup();
    renderItem('/bureau');

    expect(preloadPage).not.toHaveBeenCalled();

    await user.hover(screen.getByRole('link', { name: 'Bureau' }));

    expect(preloadPage).toHaveBeenCalledWith('/bureau');
    expect(screen.getByText('Location: /home')).toBeInTheDocument();
  });

  it('starts downloading on keyboard focus and keeps normal navigation', async () => {
    const user = userEvent.setup();
    renderItem('/bureau');

    await user.tab();

    expect(screen.getByRole('link', { name: 'Bureau' })).toHaveFocus();
    expect(preloadPage).toHaveBeenCalledWith('/bureau');
    expect(screen.getByText('Location: /home')).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(screen.getByText('Location: /bureau')).toBeInTheDocument();
  });

  it('keeps mouse navigation after preloading', async () => {
    const user = userEvent.setup();
    renderItem('/bureau');

    await user.click(screen.getByRole('link', { name: 'Bureau' }));

    expect(screen.getByText('Location: /bureau')).toBeInTheDocument();
  });

  it('does not preload external links', async () => {
    const user = userEvent.setup();
    renderItem('https://example.com');

    await user.hover(screen.getByRole('link', { name: 'Bureau' }));
    await user.tab();

    expect(preloadPage).not.toHaveBeenCalled();
  });
});
