import { NavigationMenuItemFolder } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolder';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { ThemeProvider } from 'twenty-ui/theme-constants';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock(
  '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemFolderOpenState',
  () => ({
    useNavigationMenuItemFolderOpenState: () => ({
      isOpen: false,
      handleToggle: jest.fn(),
      hasActiveChild: false,
      activeChildIndex: -1,
    }),
  }),
);
jest.mock(
  '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderSubItem',
  () => ({ NavigationMenuItemFolderSubItem: () => null }),
);
jest.mock(
  '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderLayout',
  () => ({
    NavigationMenuItemFolderLayout: ({ header }: { header: ReactNode }) =>
      header,
  }),
);
jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => ({
    NavigationDrawerItem: ({
      label,
      Icon,
    }: {
      label: string;
      Icon: IconComponent;
    }) => (
      <button>
        <Icon size={20} />
        {label}
      </button>
    ),
  }),
);

const item = {
  id: 'archive-folder',
  applicationId: 'local-drive-app',
  type: 'FOLDER',
  name: 'Archive',
  position: 0,
} as NavigationMenuItem;

const renderFolder = (folder: NavigationMenuItem) => (
  <ThemeProvider colorScheme="light">
    <NavigationMenuItemFolder
      item={folder}
      isDragging={false}
      folderChildrenById={new Map()}
      folderCount={1}
      readOnly
    />
  </ThemeProvider>
);

it('keeps the Archive image mounted when sidebar and installed-app data refresh', () => {
  const workspace = {
    installedApplications: [
      {
        id: 'local-drive-app',
        universalIdentifier: 'b11cd01f-75de-4acd-8e67-0e9c484fde02',
        name: 'Archive',
      },
    ],
  };
  jest.mocked(useAtomStateValue).mockReturnValue(workspace);
  const { rerender } = render(renderFolder(item));
  const image = within(
    screen.getByRole('button', { name: 'Archive' }),
  ).getByRole('presentation', { hidden: true });
  expect(image).toHaveAttribute('src', '/branding/archive.png');

  jest.mocked(useAtomStateValue).mockReturnValue({
    installedApplications: workspace.installedApplications.map(
      (application) => ({
        ...application,
        name: 'Renamed file library',
      }),
    ),
  });
  rerender(renderFolder({ ...item, name: 'My files' }));

  expect(
    within(screen.getByRole('button', { name: 'My files' })).getByRole(
      'presentation',
      {
        hidden: true,
      },
    ),
  ).toBe(image);
});
