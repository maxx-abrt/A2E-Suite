import { NavigationMenuItemFolderContent } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderContent';
import { NavigationMenuItemFolderSubItem } from '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderSubItem';
import { NavigationMenuItemLinkDisplay } from '@/navigation-menu-item/display/link/components/NavigationMenuItemLinkDisplay';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavigationMenuItemType } from 'twenty-shared/types';
import { type NavigationMenuItem } from '~/generated-metadata/graphql';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: ({ key }: { key: string }) =>
    key === 'isLayoutCustomizationModeEnabledState' ? false : [],
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomState', () => ({
  useAtomState: () => [[], jest.fn()],
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useSetAtomState', () => ({
  useSetAtomState: () => jest.fn(),
}));
jest.mock('@/navigation/hooks/useIsNavigationDrawerContentExpanded', () => ({
  useIsNavigationDrawerContentExpanded: () => true,
}));
jest.mock('@/navigation/hooks/useIsSettingsPage', () => ({
  useIsSettingsPage: () => false,
}));
jest.mock('@/ui/utilities/responsive/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));
jest.mock('@/workspace/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: () => false,
}));
jest.mock(
  '@/navigation-menu-item/display/hooks/useIdentifyActiveNavigationMenuItems',
  () => ({
    useIdentifyActiveNavigationMenuItems: () => ({
      activeNavigationMenuItemIds: [],
    }),
  }),
);
jest.mock(
  '@/navigation-menu-item/display/hooks/useIsNavigationMenuItemEditHighlighted',
  () => ({ useIsNavigationMenuItemEditHighlighted: () => false }),
);
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
  () => ({
    NavigationMenuItemIcon: ({
      navigationMenuItem,
    }: {
      navigationMenuItem: NavigationMenuItem;
    }) => (
      <input
        aria-label={`Icon for ${navigationMenuItem.name}`}
        defaultValue="Initial icon state"
      />
    ),
  }),
);

const item = {
  id: 'discussions',
  type: NavigationMenuItemType.LINK,
  name: 'Discussions',
  link: '/discussions',
  position: 0,
} as NavigationMenuItem;

describe('navigation icon reconciliation', () => {
  it.each(['link', 'folder', 'sub-item'] as const)(
    'preserves icon state and focus when a %s row receives fresh item data',
    async (rowType) => {
      const user = userEvent.setup();
      const renderRow = (navigationMenuItem: NavigationMenuItem) => (
        <I18nProvider i18n={i18n}>
          <MemoryRouter>
            {rowType === 'link' ? (
              <NavigationMenuItemLinkDisplay
                item={navigationMenuItem}
                isDragging={false}
                folderChildrenById={new Map()}
                folderCount={0}
              />
            ) : rowType === 'folder' ? (
              <NavigationMenuItemFolderContent
                folderId="bureau"
                folderName="Bureau"
                navigationMenuItems={[navigationMenuItem]}
                hideBackButton
              />
            ) : (
              <NavigationMenuItemFolderSubItem
                navigationMenuItem={navigationMenuItem}
                index={0}
                arrayLength={1}
                selectedIndex={-1}
                isDragging={false}
              />
            )}
          </MemoryRouter>
        </I18nProvider>
      );
      const { rerender } = render(renderRow(item));
      const icon = screen.getByRole('textbox', {
        name: 'Icon for Discussions',
      });

      await user.clear(icon);
      await user.type(icon, 'Retained icon state');

      rerender(renderRow({ ...item, name: 'Updated discussions' }));

      const updatedIcon = screen.getByRole('textbox', {
        name: 'Icon for Updated discussions',
      });
      expect(updatedIcon).toHaveValue('Retained icon state');
      expect(updatedIcon).toHaveFocus();
    },
  );
});
