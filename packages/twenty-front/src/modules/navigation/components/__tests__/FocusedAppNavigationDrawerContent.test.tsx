import { FocusedAppNavigationDrawerContent } from '@/navigation/components/FocusedAppNavigationDrawerContent';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockFolders = [
  {
    id: 'bureau',
    folderName: 'My writing',
    navigationMenuItems: [{ link: '/bureau' }, { link: '/objects/projects' }],
  },
  {
    id: 'bilan',
    folderName: 'Bilan',
    navigationMenuItems: [
      {
        type: 'OBJECT',
        targetObjectMetadataId: 'invoice-metadata',
        link: '/objects/invoices',
      },
    ],
  },
  {
    id: 'invoice-review',
    folderName: 'Review',
    navigationMenuItems: [
      {
        type: 'VIEW',
        viewId: 'review-view',
        link: '/objects/invoices?viewId=review-view',
      },
    ],
  },
];

jest.mock(
  '@/navigation-menu-item/display/folder/hooks/useNavigationMenuItemsByFolder',
  () => ({
    useNavigationMenuItemsByFolder: () => ({
      navigationMenuItemsByFolder: mockFolders,
    }),
  }),
);
jest.mock(
  '@/navigation-menu-item/common/hooks/useNavigationObjectMetadataItems',
  () => ({
    useNavigationObjectMetadataItems: () => [
      {
        id: 'invoice-metadata',
        nameSingular: 'invoice',
        namePlural: 'invoices',
      },
    ],
  }),
);
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: () => [
    { id: 'review-view', objectMetadataId: 'invoice-metadata' },
  ],
}));
jest.mock(
  '@/navigation-menu-item/display/utils/getNavigationMenuItemComputedLink',
  () => ({
    getNavigationMenuItemComputedLink: ({ item }: { item: { link: string } }) =>
      item.link,
  }),
);
jest.mock(
  '@/navigation-menu-item/display/folder/components/NavigationMenuItemFolderContent',
  () => ({
    NavigationMenuItemFolderContent: ({
      folderName,
      navigationMenuItems,
      hideBackButton,
    }: {
      folderName: string;
      navigationMenuItems: { link: string }[];
      hideBackButton?: boolean;
    }) => (
      <nav>
        {!hideBackButton && <span>{folderName}</span>}
        {navigationMenuItems.map((item) => (
          <a key={item.link} href={item.link}>
            {item.link}
          </a>
        ))}
      </nav>
    ),
  }),
);
jest.mock(
  '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem',
  () => ({
    NavigationDrawerItem: ({
      label,
      onClick,
    }: {
      label: string;
      onClick: () => void;
    }) => <button onClick={onClick}>{label}</button>,
  }),
);
jest.mock('@/bureau/components/BureauNavigation', () => ({
  BureauNavigation: () => <div>Page tree</div>,
}));

const renderDrawer = (path: string) =>
  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <FocusedAppNavigationDrawerContent>
          <nav>All workspace apps</nav>
        </FocusedAppNavigationDrawerContent>
      </MemoryRouter>
    </I18nProvider>,
  );

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
});

describe('native focused app navigation', () => {
  it('focuses a deep-linked app using native links even when its folder was renamed', () => {
    renderDrawer('/bureau/page-id');
    expect(screen.getByText('Page tree')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '/objects/projects' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('All workspace apps')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '/objects/invoices' }),
    ).not.toBeInTheDocument();
  });

  it('lets a user browse all apps and return to the focused app without leaving their page', async () => {
    const user = userEvent.setup();
    renderDrawer('/bureau/page-id');
    await user.click(screen.getByRole('button', { name: 'All apps' }));
    expect(screen.getByText('All workspace apps')).toBeInTheDocument();
    expect(screen.queryByText('Page tree')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Back to My writing' }),
    );
    expect(screen.getByText('Page tree')).toBeInTheDocument();
    expect(screen.queryByText('All workspace apps')).not.toBeInTheDocument();
  });

  it('uses the same focus behavior for another installed app', () => {
    renderDrawer('/objects/invoices');
    expect(
      screen.getByRole('link', { name: '/objects/invoices' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '/bureau' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the workspace view on unrelated CRM routes', () => {
    renderDrawer('/objects/companies');
    expect(screen.getByText('All workspace apps')).toBeInTheDocument();
  });

  it('keeps Bilan focused when an invoice is opened as a full page', () => {
    renderDrawer('/object/invoice/invoice-id');
    expect(
      screen.getByRole('link', { name: '/objects/invoices' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('All workspace apps')).not.toBeInTheDocument();
  });

  it('prefers an explicitly selected native view over another folder for the same object', () => {
    renderDrawer('/objects/invoices?viewId=review-view');
    expect(
      screen.getByRole('link', {
        name: '/objects/invoices?viewId=review-view',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '/objects/invoices' }),
    ).not.toBeInTheDocument();
  });

  it('does not match similarly named objects or records outside the permitted metadata', () => {
    renderDrawer('/object/invoiceLine/line-id');
    expect(screen.getByText('All workspace apps')).toBeInTheDocument();
  });
});
