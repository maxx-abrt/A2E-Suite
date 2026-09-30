import {
  type HomeBilanGrantSummary,
  type HomeBilanInvoiceSummary,
  selectPendingBilanItems,
} from '@/home-dashboard/utils/selectPendingBilanItems';

const NOW = new Date('2026-09-18T12:00:00.000Z');

const buildInvoice = (
  overrides: Partial<HomeBilanInvoiceSummary> & { id: string },
): HomeBilanInvoiceSummary => ({
  number: 'F-001',
  status: 'SENT',
  dueDate: '2026-09-25T00:00:00.000Z',
  ...overrides,
});

const buildGrant = (
  overrides: Partial<HomeBilanGrantSummary> & { id: string },
): HomeBilanGrantSummary => ({
  name: 'Dossier',
  status: 'PREPARING',
  deadline: '2026-09-25T00:00:00.000Z',
  ...overrides,
});

describe('selectPendingBilanItems', () => {
  it('merges invoices and grants ordered by nearest deadline', () => {
    const items = selectPendingBilanItems(
      {
        invoices: [
          buildInvoice({
            id: 'invoice-late',
            dueDate: '2026-09-28T00:00:00.000Z',
          }),
        ],
        grants: [
          buildGrant({
            id: 'grant-soon',
            deadline: '2026-09-19T00:00:00.000Z',
          }),
        ],
      },
      { now: NOW, limit: 10 },
    );

    expect(items.map((item) => item.id)).toEqual([
      'grant-soon',
      'invoice-late',
    ]);
    expect(items.map((item) => item.source)).toEqual(['grant', 'invoice']);
  });

  it('drops paid and cancelled invoices', () => {
    const items = selectPendingBilanItems(
      {
        invoices: [
          buildInvoice({ id: 'paid', status: 'PAID' }),
          buildInvoice({ id: 'cancelled', status: 'CANCELLED' }),
          buildInvoice({ id: 'sent', status: 'SENT' }),
        ],
        grants: [],
      },
      { now: NOW, limit: 10 },
    );

    expect(items.map((item) => item.id)).toEqual(['sent']);
  });

  it('keeps only grants still awaiting submission', () => {
    const items = selectPendingBilanItems(
      {
        invoices: [],
        grants: [
          buildGrant({ id: 'shortlisted', status: 'SHORTLISTED' }),
          buildGrant({ id: 'preparing', status: 'PREPARING' }),
          buildGrant({ id: 'submitted', status: 'SUBMITTED' }),
          buildGrant({ id: 'granted', status: 'GRANTED' }),
        ],
      },
      { now: NOW, limit: 10 },
    );

    expect(items.map((item) => item.id)).toEqual(['shortlisted', 'preparing']);
  });

  it('flags items whose deadline has passed', () => {
    const items = selectPendingBilanItems(
      {
        invoices: [
          buildInvoice({ id: 'overdue', dueDate: '2026-09-10T00:00:00.000Z' }),
        ],
        grants: [],
      },
      { now: NOW, limit: 10 },
    );

    expect(items[0].isOverdue).toBe(true);
  });

  it('ignores undated rows and honours the limit', () => {
    const items = selectPendingBilanItems(
      {
        invoices: [
          buildInvoice({ id: 'a', dueDate: '2026-09-20T00:00:00.000Z' }),
          buildInvoice({ id: 'b', dueDate: '2026-09-21T00:00:00.000Z' }),
          buildInvoice({ id: 'undated', dueDate: null }),
        ],
        grants: [],
      },
      { now: NOW, limit: 1 },
    );

    expect(items.map((item) => item.id)).toEqual(['a']);
  });
});
