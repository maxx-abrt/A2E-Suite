import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { MantineProvider, Menu } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentType, type ReactNode } from 'react';

import { CustomSideMenu } from '@/blocknote-editor/components/CustomSideMenu';

const mockEditor = {};

jest.mock('@blocknote/react', () => ({
  SideMenuController: ({
    sideMenu: Component,
  }: {
    sideMenu: ComponentType;
  }) => <Component />,
  SideMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DragHandleButton: ({
    dragHandleMenu: Component,
  }: {
    dragHandleMenu: ComponentType;
  }) => (
    <Menu>
      <Menu.Target>
        <button>Open block menu</button>
      </Menu.Target>
      <Component />
    </Menu>
  ),
  DragHandleMenu: ({ children }: { children: ReactNode }) => (
    <Menu.Dropdown>{children}</Menu.Dropdown>
  ),
  BlockColorsItem: ({ children }: { children: ReactNode }) => (
    <Menu.Item>{children}</Menu.Item>
  ),
  RemoveBlockItem: ({ children }: { children: ReactNode }) => (
    <Menu.Item>{children}</Menu.Item>
  ),
  useBlockNoteEditor: () => mockEditor,
}));

jest.mock('@/blocknote-editor/components/CustomAddBlockItem', () => ({
  CustomAddBlockItem: ({ children }: { children: ReactNode }) => (
    <Menu.Item>{children}</Menu.Item>
  ),
}));

jest.mock('@/blocknote-editor/components/CustomSideMenuOptions', () => ({
  CustomSideMenuOptions: ({ text }: { text: string }) => <span>{text}</span>,
}));

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <MantineProvider env="test">{children}</MantineProvider>
  </I18nProvider>
);

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});

it('keeps the block menu open through editor rerenders', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<CustomSideMenu />, { wrapper: Wrapper });

  await user.click(screen.getByRole('button', { name: 'Open block menu' }));
  expect(screen.getByRole('menuitem', { name: 'Add Block' })).toBeVisible();
  expect(screen.getByRole('menuitem', { name: 'Change Color' })).toBeVisible();
  expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeVisible();

  rerender(<CustomSideMenu />);

  expect(screen.getByRole('menuitem', { name: 'Add Block' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Open block menu' }),
  ).toHaveAttribute('aria-expanded', 'true');
});
