import { BureauWorkspaceShortcuts } from '@/bureau/components/BureauWorkspaceShortcuts';
import { lastVisitedViewPerObjectMetadataItemState } from '@/navigation/states/lastVisitedViewPerObjectMetadataItemState';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

type ShortcutItem = {
  id: string;
  type: string;
  position: number;
  name?: string;
  link?: string;
  viewId?: string;
  icon?: string;
  targetObjectMetadataId?: string;
};

const mockItems: ShortcutItem[] = [
  { id: 'home', type: 'LINK', name: 'Pages', link: '/bureau', position: 0 },
  {
    id: 'projects',
    type: 'VIEW',
    viewId: 'projects-view',
    icon: 'IconKanban',
    position: 1,
  },
  {
    id: 'tasks',
    type: 'OBJECT',
    targetObjectMetadataId: 'task-object',
    position: 2,
  },
  {
    id: 'events',
    type: 'LINK',
    name: 'Events',
    link: '/calendar',
    position: 3,
  },
];
let mockNavigationItems = mockItems;
let mockReadableObjects = [
  {
    id: 'project-object',
    namePlural: 'projects',
    nameSingular: 'project',
    labelPlural: 'Projects',
    isActive: true,
  },
  {
    id: 'task-object',
    namePlural: 'tasks',
    nameSingular: 'task',
    labelPlural: 'Tasks',
    isActive: true,
  },
];

jest.mock(
  '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder',
  () => ({
    useNavigationMenuItemsByFolder: () => ({
      navigationMenuItemsByFolder: [
        {
          folderName: 'Renamed Bureau',
          navigationMenuItems: mockNavigationItems,
        },
      ],
    }),
  }),
);
jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems', () => ({
  useReadableObjectMetadataItems: () => ({
    readableObjectMetadataItems: mockReadableObjects,
  }),
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: (state: unknown) =>
    state === lastVisitedViewPerObjectMetadataItemState
      ? { 'task-object': 'last-task-view' }
      : [
          {
            id: 'projects-view',
            name: 'Projects',
            objectMetadataId: 'project-object',
          },
        ],
}));

const Location = () => {
  const { pathname, search } = useLocation();
  return (
    <output>
      {pathname}
      {search}
    </output>
  );
};
const renderShortcuts = () =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/bureau']}>
        <BureauWorkspaceShortcuts />
        <Location />
      </MemoryRouter>
    </I18nProvider>,
  );

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
  mockNavigationItems = [...mockItems];
  mockReadableObjects = [
    {
      id: 'project-object',
      namePlural: 'projects',
      nameSingular: 'project',
      labelPlural: 'Projects',
      isActive: true,
    },
    {
      id: 'task-object',
      namePlural: 'tasks',
      nameSingular: 'task',
      labelPlural: 'Tasks',
      isActive: true,
    },
  ];
});

it('opens configured projects, the last task view, and the native calendar', async () => {
  const user = userEvent.setup();
  renderShortcuts();
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
    'href',
    '/objects/projects?viewId=projects-view',
  );
  expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute(
    'href',
    '/objects/tasks?viewId=last-task-view',
  );
  expect(screen.queryByRole('link', { name: 'Pages' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Events' }));
  expect(screen.getByText('/calendar')).toBeInTheDocument();
});

it('follows native shortcut names, ordering and removals', () => {
  mockNavigationItems = [
    mockItems[0],
    { ...mockItems[3], name: 'My agenda', position: 1 },
    mockItems[1],
  ];
  renderShortcuts();
  expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
    'My agenda',
    'Projects',
  ]);
  expect(screen.queryByRole('link', { name: 'Tasks' })).not.toBeInTheDocument();
});

it('hides objects the member cannot read while retaining usable links', () => {
  mockReadableObjects = [];
  renderShortcuts();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument();
});

it('omits the shortcut row if its native folder was removed', () => {
  mockNavigationItems = [];
  renderShortcuts();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});

it('supports keyboard navigation', async () => {
  const user = userEvent.setup();
  renderShortcuts();
  await user.tab();
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(
    screen.getByText('/objects/projects?viewId=projects-view'),
  ).toBeInTheDocument();
});
