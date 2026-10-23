import { PendingBilanWidget } from '@/home-dashboard/components/PendingBilanWidget';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockOpenRecord = jest.fn();
const mockRefetch = jest.fn();
jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems', () => ({
  useReadableObjectMetadataItems: jest.fn(),
}));
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({ openRecordInSidePanel: mockOpenRecord }),
}));
jest.mock('@/a2e-help/components/A2eLearnMoreLink', () => ({
  A2eLearnMoreLink: () => null,
}));

const mockReadableSources = (names: string[]) =>
  jest.mocked(useReadableObjectMetadataItems).mockReturnValue({
    readableObjectMetadataItems: names.map((nameSingular) => ({
      nameSingular,
    })),
  } as ReturnType<typeof useReadableObjectMetadataItems>);
const renderWidget = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PendingBilanWidget />
    </I18nProvider>,
  );
const mockRecords = (objectNameSingular: string, overrides = {}) =>
  ({
    records:
      objectNameSingular === 'invoice'
        ? [
            {
              id: 'invoice-id',
              number: 'INV-001',
              status: 'SENT',
              dueDate: '2026-09-15T00:00:00Z',
            },
          ]
        : [
            {
              id: 'grant-id',
              name: 'Research fund',
              status: 'PREPARING',
              deadline: '2026-09-10T00:00:00Z',
            },
          ],
    loading: false,
    error: undefined,
    refetch: mockRefetch,
    ...overrides,
  }) as unknown as ReturnType<typeof useFindManyRecords>;

beforeEach(() => {
  jest.clearAllMocks();
  i18n.load('en', {});
  i18n.activate('en');
  mockReadableSources(['invoice', 'savedSubvention']);
  jest
    .mocked(useFindManyRecords)
    .mockImplementation(({ objectNameSingular }) =>
      mockRecords(objectNameSingular),
    );
});

it.each([
  { names: [] },
  { names: ['invoice'] },
  { names: ['savedSubvention'] },
])('queries only readable installed sources: $names', ({ names }) => {
  mockReadableSources(names);
  renderWidget();
  expect(
    jest
      .mocked(useFindManyRecords)
      .mock.calls.map(([args]) => args.objectNameSingular),
  ).toEqual(names);
});

it('combines deadlines and opens the correct native record in the shared side panel', async () => {
  renderWidget();
  const rows = screen.getAllByRole('button');
  expect(rows[0]).toHaveTextContent('Research fund');
  expect(rows[1]).toHaveTextContent('INV-001');
  await userEvent.setup().click(rows[1]);
  expect(mockOpenRecord).toHaveBeenCalledWith({
    recordId: 'invoice-id',
    objectNameSingular: 'invoice',
  });
});

it('does not claim there is nothing pending while records are loading', () => {
  mockReadableSources(['invoice']);
  jest
    .mocked(useFindManyRecords)
    .mockReturnValue(mockRecords('invoice', { records: [], loading: true }));
  renderWidget();
  expect(screen.getByRole('status')).toHaveTextContent('Loading pending items');
  expect(
    screen.queryByText('Nothing pending in Bilan'),
  ).not.toBeInTheDocument();
});

it('shows a retry action instead of a misleading empty state after a query failure', async () => {
  mockReadableSources(['invoice']);
  jest
    .mocked(useFindManyRecords)
    .mockReturnValue(
      mockRecords('invoice', { records: [], error: new Error('offline') }),
    );
  renderWidget();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByText('Nothing pending in Bilan'),
  ).not.toBeInTheDocument();
});
