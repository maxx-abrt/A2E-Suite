import { BilanPageOverview } from '@/bilan/components/BilanPageOverview';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

const mockOpenTemplates = jest.fn();
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue', () => ({
  useAtomStateValue: jest.fn(),
}));
jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems', () => ({
  useReadableObjectMetadataItems: jest.fn(),
}));
jest.mock('@/template-gallery/hooks/useOpenTemplateGallery', () => ({
  useOpenTemplateGallery: () => ({ openTemplateGallery: mockOpenTemplates }),
}));
jest.mock('@/home-dashboard/components/PendingBilanWidget', () => ({
  PendingBilanWidget: () => <div>Pending finance items</div>,
}));
jest.mock('@/home-dashboard/components/HomeDashboardCard', () => ({
  HomeDashboardCard: ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => <section aria-label={title}>{children}</section>,
}));

const invoiceMetadata = {
  id: 'workspace-invoice-id',
  universalIdentifier: 'b11a0100-0000-4000-8000-000000000000',
  namePlural: 'myInvoices',
  icon: 'IconFileInvoice',
};
const organizationMetadata = {
  id: 'workspace-org-id',
  universalIdentifier: 'b11a0a00-0000-4000-8000-000000000000',
  namePlural: 'myOrganizations',
  icon: 'IconBuilding',
};
const mockReadableObjects = (objects: object[]) =>
  jest
    .mocked(useReadableObjectMetadataItems)
    .mockReturnValue({ readableObjectMetadataItems: objects } as ReturnType<
      typeof useReadableObjectMetadataItems
    >);
const renderOverview = (pageLayoutId = 'workspace-dashboard') =>
  render(
    <Provider>
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <BilanPageOverview pageLayoutId={pageLayoutId} />
        </MemoryRouter>
      </I18nProvider>
    </Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  i18n.load('en', {});
  i18n.activate('en');
  jest.mocked(useAtomStateValue).mockReturnValue([
    {
      id: 'workspace-dashboard',
      universalIdentifier: 'b11a0000-0014-4000-8000-000000000001',
    },
  ]);
  mockReadableObjects([invoiceMetadata, organizationMetadata]);
});

it('opens the native index using workspace metadata, including customized object names', () => {
  renderOverview();
  expect(screen.getByRole('heading', { name: 'Bilan' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Invoices/ })).toHaveAttribute(
    'href',
    '/objects/myInvoices',
  );
  expect(
    screen.getByRole('link', { name: /Organization profile/ }),
  ).toHaveAttribute('href', '/objects/myOrganizations');
  expect(screen.getByText('Pending finance items')).toBeInTheDocument();
});

it('offers the existing finance template gallery', async () => {
  renderOverview();
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: 'Templates' }));
  expect(mockOpenTemplates).toHaveBeenCalledWith({ category: 'Bilan' });
});

it('does not expose links for unreadable or uninstalled objects', () => {
  mockReadableObjects([]);
  renderOverview();
  expect(
    screen.queryByRole('link', { name: /Invoices/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /Organization profile/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('region', { name: 'Daily work' }),
  ).not.toBeInTheDocument();
});

it('leaves unrelated native dashboards alone', () => {
  renderOverview('other-dashboard');
  expect(
    screen.queryByRole('region', { name: 'Bilan overview' }),
  ).not.toBeInTheDocument();
});
