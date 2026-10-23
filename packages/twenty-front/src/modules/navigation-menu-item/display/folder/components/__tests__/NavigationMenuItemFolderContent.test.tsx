import { NavigationMenuItemFolderContent } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderContent';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, useLocation } from 'react-router-dom';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => [
    {
      id: 'document-object',
      namePlural: 'documents',
      nameSingular: 'document',
      labelPlural: 'Pages',
    },
  ],
}));
jest.mock(
  '@/navigation-menu-item/common/hooks/useDeleteManyNavigationMenuItems',
  () => ({
    useDeleteManyNavigationMenuItems: () => ({
      deleteManyNavigationMenuItems: jest.fn(),
    }),
  }),
);
jest.mock(
  '@/navigation-menu-item/display/components/NavigationMenuItemIcon',
  () => ({ NavigationMenuItemIcon: () => null }),
);
jest.mock(
  '@/navigation-menu-item/display/dnd/components/NavigationMenuItemSortableItem',
  () => ({
    NavigationMenuItemSortableItem: () => {
      throw new Error('Read-only app links must not activate drag handling');
    },
  }),
);
jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => ({
    NavigationDrawerItem: ({ label, to }: { label: string; to: string }) => (
      <Link to={to}>{label}</Link>
    ),
  }),
);
const Location = () => <output>{useLocation().pathname}</output>;
const item = {
  id: 'documents',
  type: 'OBJECT',
  name: 'Pages',
  targetObjectMetadataId: 'document-object',
  position: 0,
} as NavigationMenuItem;
it('opens Pages from a different table without enabling edit or drag controls', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/objects/projects']}>
      <NavigationMenuItemFolderContent
        folderId="bureau"
        folderName="Bureau"
        navigationMenuItems={[item]}
        hideBackButton
      />
      <Location />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('link', { name: /Pages/ }));
  expect(screen.getByText('/objects/documents')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
