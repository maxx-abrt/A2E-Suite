import { BilanPulse } from '@/bilan/components/BilanPulse';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems', () => ({
  useReadableObjectMetadataItems: jest.fn(),
}));
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
  useFindManyRecords: jest.fn(),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({
    openRecordInSidePanel: jest.fn(),
  }),
}));

const OBJECT_IDENTIFIERS = {
  bookEntry: 'b11a0800-0000-4000-8000-000000000000',
  invoice: 'b11a0100-0000-4000-8000-000000000000',
  financeEntry: 'b11a0400-0000-4000-8000-000000000000',
  budget: 'b11a0600-0000-4000-8000-000000000000',
  savedSubvention: 'b11a0c00-0000-4000-8000-000000000000',
};

const objectMetadataItem = (nameSingular: string) => ({
  id: `metadata-${nameSingular}`,
  nameSingular,
  namePlural: `${nameSingular}s`,
});

const money = (amount: number) => ({
  amountMicros: amount * 1_000_000,
  currencyCode: 'EUR',
});

const buildDateInCurrentMonth = () => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 8, 12),
  ).toISOString();
};

const buildPastDate = () => {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 2, 12),
  ).toISOString();
};

const recordsByObjectName: Record<string, Record<string, unknown>[]> = {};

const mockRecords = (records: Record<string, Record<string, unknown>[]>) => {
  Object.keys(recordsByObjectName).forEach((key) => {
    delete recordsByObjectName[key];
  });
  Object.assign(recordsByObjectName, records);
};

beforeEach(() => {
  jest.clearAllMocks();
  i18n.load('en', {});
  i18n.activate('en');
  jest.mocked(useReadableObjectMetadataItems).mockReturnValue({
    readableObjectMetadataItems: Object.entries(OBJECT_IDENTIFIERS).map(
      ([nameSingular, universalIdentifier]) => ({
        universalIdentifier,
        nameSingular,
        namePlural: `${nameSingular}s`,
      }),
    ),
  } as ReturnType<typeof useReadableObjectMetadataItems>);
  jest
    .mocked(useFindManyRecords)
    .mockImplementation(({ objectNameSingular }) => {
      return {
        objectMetadataItem: objectMetadataItem(objectNameSingular),
        records: recordsByObjectName[objectNameSingular] ?? [],
        totalCount: 0,
        loading: false,
        error: undefined,
        fetchMoreRecords: jest.fn(),
        queryIdentifier: objectNameSingular,
        hasNextPage: false,
        pageInfo: undefined,
        refetch: jest.fn(),
      } as never;
    });
});

it('renders the five live finance cards from current records', () => {
  const currentDate = buildDateInCurrentMonth();
  const pastDate = buildPastDate();

  mockRecords({
    bookEntry: [
      {
        id: 'entry-income',
        entryDate: currentDate,
        entryType: 'INCOME',
        amount: money(2400),
      },
      {
        id: 'entry-expense',
        entryDate: currentDate,
        entryType: 'EXPENSE',
        amount: money(900),
      },
    ],
    invoice: [
      {
        id: 'invoice-open',
        number: 'F-104',
        clientName: 'Northwind',
        status: 'SENT',
        issueDate: currentDate,
        dueDate: pastDate,
        amountTotal: money(1200),
        amountPaid: money(200),
      },
    ],
    financeEntry: [
      {
        id: 'expense-travel',
        entryType: 'EXPENSE',
        entryDate: currentDate,
        amount: money(900),
        category: { id: 'travel', name: 'Travel' },
      },
    ],
    budget: [
      {
        id: 'budget-travel',
        name: 'Travel',
        amount: money(5000),
        spentAmount: money(4200),
        startDate: new Date(
          Date.UTC(new Date().getUTCFullYear(), 0, 1),
        ).toISOString(),
        endDate: new Date(
          Date.UTC(new Date().getUTCFullYear(), 11, 31),
        ).toISOString(),
      },
    ],
    savedSubvention: [
      {
        id: 'grant-preparing',
        name: 'Digital grant',
        status: 'PREPARING',
        deadline: currentDate,
        amountRequested: money(12000),
      },
    ],
  });

  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BilanPulse catalogPath="/page/funding" />
      </MemoryRouter>
    </I18nProvider>,
  );

  expect(
    screen.getByRole('heading', { name: 'Financial pulse' }),
  ).toBeVisible();
  expect(screen.getByRole('region', { name: 'Cash flow' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Invoices' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Spending' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Budgets' })).toBeVisible();
  expect(screen.getByRole('region', { name: 'Funding' })).toBeVisible();
  expect(screen.getByText('Net this month')).toBeVisible();
  expect(screen.getByText('Northwind')).toBeVisible();
  expect(screen.getAllByText('Travel').length).toBeGreaterThan(0);
  expect(screen.getByText('Digital grant')).toBeVisible();
});

it('keeps guided empty states instead of blank cards', () => {
  mockRecords({});

  render(
    <I18nProvider i18n={i18n}>
      <MemoryRouter>
        <BilanPulse catalogPath="/page/funding" />
      </MemoryRouter>
    </I18nProvider>,
  );

  expect(screen.getByText('No cash movements yet')).toBeVisible();
  expect(screen.getByText('No invoices yet')).toBeVisible();
  expect(screen.getByText('No expenses this month')).toBeVisible();
  expect(screen.getByText('No active budget')).toBeVisible();
  expect(
    screen.queryByRole('region', { name: 'Funding' }),
  ).not.toBeInTheDocument();
});
