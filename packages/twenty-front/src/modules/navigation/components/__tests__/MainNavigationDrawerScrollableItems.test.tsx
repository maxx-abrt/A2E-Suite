import { MainNavigationDrawerScrollableItems } from '@/navigation/components/MainNavigationDrawerScrollableItems';
import { act, render, screen } from '@testing-library/react';

let mockFavoritesReady = false;
let mockResolveFavorites: () => void;
const mockFavoritesPending = new Promise<void>((resolve) => {
  mockResolveFavorites = resolve;
});

jest.mock(
  '@/navigation-menu-item/display/sections/favorites/components/FavoritesSectionDispatcher',
  () => ({
    FavoritesSectionDispatcher: () => {
      if (!mockFavoritesReady) {
        throw mockFavoritesPending;
      }
      return <div>Favorites</div>;
    },
  }),
);

jest.mock(
  '@/navigation-menu-item/display/sections/workspace/components/WorkspaceSectionDispatcher',
  () => ({ WorkspaceSectionDispatcher: () => <div>Workspace apps</div> }),
);

jest.mock(
  '@/navigation-menu-item/display/sections/components/NavigationDrawerOpenedSection',
  () => ({ NavigationDrawerOpenedSection: () => <div>Opened pages</div> }),
);

jest.mock(
  '@/object-metadata/components/NavigationDrawerWorkspaceSectionSkeletonLoader',
  () => ({
    NavigationDrawerWorkspaceSectionSkeletonLoader: () => (
      <div>Loading section</div>
    ),
  }),
);

it('shows workspace apps while favorites are still loading', async () => {
  render(<MainNavigationDrawerScrollableItems />);

  expect(screen.getByText('Opened pages')).toBeInTheDocument();
  expect(await screen.findByText('Workspace apps')).toBeInTheDocument();
  expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
  expect(screen.getByText('Loading section')).toBeInTheDocument();

  await act(async () => {
    mockFavoritesReady = true;
    mockResolveFavorites();
  });

  expect(screen.getByText('Favorites')).toBeInTheDocument();
  expect(screen.queryByText('Loading section')).not.toBeInTheDocument();
});
