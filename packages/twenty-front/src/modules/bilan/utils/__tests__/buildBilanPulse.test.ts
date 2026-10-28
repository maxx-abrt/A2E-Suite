import {
  buildBilanBudgets,
  buildBilanCashFlow,
  buildBilanFunding,
  buildBilanReceivables,
  buildBilanSpending,
  readBilanMicros,
  selectBilanCurrency,
} from '@/bilan/utils/buildBilanPulse';

const money = (amount: number, currencyCode = 'EUR') => ({
  amountMicros: amount * 1_000_000,
  currencyCode,
});

const NOW = new Date('2026-09-15T12:00:00.000Z');

describe('selectBilanCurrency', () => {
  it('keeps the currency carrying the largest recorded volume', () => {
    expect(
      selectBilanCurrency([
        money(100, 'EUR'),
        money(900, 'USD'),
        money(50, 'EUR'),
      ]),
    ).toBe('USD');
    expect(selectBilanCurrency([money(100, 'EUR'), money(50, 'USD')])).toBe(
      'EUR',
    );
  });

  it('falls back to EUR when no valid amount is available', () => {
    expect(selectBilanCurrency([null, undefined])).toBe('EUR');
  });

  it('compares currency codes case-insensitively', () => {
    expect(readBilanMicros(money(12, 'eur'), 'EUR')).toBe(12_000_000);
    expect(readBilanMicros(money(12, 'USD'), 'EUR')).toBeNull();
  });
});

describe('buildBilanCashFlow', () => {
  it('builds a six-month window and keeps the current month net accurate', () => {
    const summary = buildBilanCashFlow(
      [
        {
          id: '1',
          entryDate: '2026-09-02',
          entryType: 'INCOME',
          amount: money(1000),
        },
        {
          id: '2',
          entryDate: '2026-09-10',
          entryType: 'EXPENSE',
          amount: money(400),
        },
        {
          id: '3',
          entryDate: '2026-08-05',
          entryType: 'INCOME',
          amount: money(700),
        },
        {
          id: '4',
          entryDate: '2026-08-20',
          entryType: 'EXPENSE',
          amount: money(200),
        },
        {
          id: '5',
          entryDate: '2026-07-01',
          entryType: 'INCOME',
          amount: money(100),
        },
        {
          id: '6',
          entryDate: '2026-10-01',
          entryType: 'INCOME',
          amount: money(999),
        },
        {
          id: '7',
          entryDate: '2026-09-12',
          entryType: 'INCOME',
          amount: money(500, 'USD'),
        },
      ],
      NOW,
    );

    expect(summary.currencyCode).toBe('EUR');
    expect(summary.months).toHaveLength(6);
    expect(summary.currentMonthIncomeMicros).toBe(1_000_000_000);
    expect(summary.currentMonthExpenseMicros).toBe(400_000_000);
    expect(summary.currentMonthNetMicros).toBe(600_000_000);
    expect(summary.previousMonthNetMicros).toBe(500_000_000);
    expect(summary.entryCount).toBe(5);
  });

  it('crosses the year boundary without dropping months', () => {
    const summary = buildBilanCashFlow(
      [],
      new Date('2026-01-15T12:00:00.000Z'),
    );

    expect(summary.months.map((month) => month.key)).toEqual([
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
    ]);
  });
});

describe('buildBilanReceivables', () => {
  it('separates collected, due later and overdue open invoices', () => {
    const summary = buildBilanReceivables(
      [
        {
          id: 'sent',
          number: 'F-001',
          status: 'SENT',
          clientName: 'Northwind',
          issueDate: '2026-09-01',
          dueDate: '2026-09-20',
          paidDate: '2026-09-03',
          amountTotal: money(1200),
          amountPaid: money(200),
        },
        {
          id: 'overdue',
          number: 'F-002',
          status: 'OVERDUE',
          issueDate: '2026-08-01',
          dueDate: '2026-09-01',
          amountTotal: money(800),
        },
        {
          id: 'settled',
          number: 'F-003',
          status: 'PARTIALLY_PAID',
          issueDate: '2026-07-01',
          dueDate: '2026-08-01',
          amountTotal: money(500),
          amountPaid: money(500),
        },
        {
          id: 'paid',
          number: 'F-004',
          status: 'PAID',
          issueDate: '2026-09-01',
          dueDate: '2026-09-10',
          paidDate: '2026-09-04',
          amountTotal: money(300),
          amountPaid: money(300),
        },
        {
          id: 'undated',
          number: 'F-005',
          status: 'SENT',
          issueDate: '2026-09-05',
          amountTotal: money(200),
        },
      ],
      NOW,
    );

    expect(summary.openCount).toBe(3);
    expect(summary.openTotalMicros).toBe(2_200_000_000);
    expect(summary.openPaidMicros).toBe(200_000_000);
    expect(summary.openOutstandingMicros).toBe(2_000_000_000);
    expect(summary.overdueCount).toBe(1);
    expect(summary.overdueOutstandingMicros).toBe(800_000_000);
    expect(summary.dueLaterOutstandingMicros).toBe(1_200_000_000);
    expect(summary.paidThisMonthMicros).toBe(500_000_000);
    expect(summary.openInvoices.map((invoice) => invoice.id)).toEqual([
      'overdue',
      'sent',
      'undated',
    ]);
  });
});

describe('buildBilanSpending', () => {
  it('groups current-month expenses by category and tracks the previous month', () => {
    const summary = buildBilanSpending(
      [
        {
          id: '1',
          entryType: 'EXPENSE',
          entryDate: '2026-09-02',
          amount: money(300),
          category: { id: 'travel', name: 'Travel' },
        },
        {
          id: '2',
          entryType: 'EXPENSE',
          entryDate: '2026-09-03',
          amount: money(200),
          category: { id: 'software', name: 'Software' },
        },
        {
          id: '3',
          entryType: 'EXPENSE',
          entryDate: '2026-09-04',
          amount: money(100),
        },
        {
          id: '4',
          entryType: 'INCOME',
          entryDate: '2026-09-05',
          amount: money(500),
        },
        {
          id: '5',
          entryType: 'EXPENSE',
          entryDate: '2026-08-03',
          amount: money(400),
          category: { id: 'travel', name: 'Travel' },
        },
        {
          id: '6',
          entryType: 'EXPENSE',
          entryDate: '2026-10-03',
          amount: money(700),
        },
      ],
      NOW,
    );

    expect(summary.currentMonthExpenseMicros).toBe(600_000_000);
    expect(summary.previousMonthExpenseMicros).toBe(400_000_000);
    expect(summary.uncategorizedMicros).toBe(100_000_000);
    expect(summary.uncategorizedCount).toBe(1);
    expect(summary.categories.map((category) => category.id)).toEqual([
      'travel',
      'software',
      'uncategorized',
    ]);
  });
});

describe('buildBilanBudgets', () => {
  it('ignores expired envelopes and flags consumed and over-consumed budgets', () => {
    const summary = buildBilanBudgets(
      [
        {
          id: 'travel',
          name: 'Travel',
          amount: money(1000),
          spentAmount: money(850),
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          lastRollupAt: '2026-09-14T02:00:00.000Z',
        },
        {
          id: 'expired',
          name: 'Old',
          amount: money(1000),
          spentAmount: money(900),
          startDate: '2026-08-01',
          endDate: '2026-08-31',
        },
        {
          id: 'software',
          name: 'Software',
          amount: money(500),
          spentAmount: money(600),
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          lastRollupAt: '2026-09-15T02:00:00.000Z',
        },
        {
          id: 'no-envelope',
          name: 'Missing amount',
          spentAmount: money(20),
        },
      ],
      NOW,
    );

    expect(summary.rows.map((budget) => budget.id)).toEqual([
      'software',
      'travel',
    ]);
    expect(summary.totalBudgetMicros).toBe(1_500_000_000);
    expect(summary.totalSpentMicros).toBe(1_450_000_000);
    expect(summary.overBudgetCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.lastRollupAt).toBe('2026-09-15T02:00:00.000Z');
  });
});

describe('buildBilanFunding', () => {
  it('keeps active applications, stages and the nearest deadline', () => {
    const summary = buildBilanFunding(
      [
        {
          id: 'shortlisted',
          name: 'Culture grant',
          status: 'SHORTLISTED',
          deadline: '2026-09-10',
          amountRequested: money(1000),
        },
        {
          id: 'preparing',
          name: 'Digital grant',
          status: 'PREPARING',
          deadline: '2026-09-20',
          amountRequested: money(2000),
        },
        {
          id: 'granted',
          name: 'Youth grant',
          status: 'GRANTED',
          amountRequested: money(500),
          amountGranted: money(500),
        },
        {
          id: 'rejected',
          name: 'Rejected grant',
          status: 'REJECTED',
          deadline: '2026-09-01',
          amountRequested: money(900),
        },
      ],
      NOW,
    );

    expect(summary.activeCount).toBe(3);
    expect(summary.activeRequestedMicros).toBe(3_500_000_000);
    expect(summary.activeGrantedMicros).toBe(500_000_000);
    expect(summary.nextDeadline).toBe('2026-09-10');
    expect(summary.stages.map((stage) => stage.count)).toEqual([1, 1, 0, 1]);
    expect(summary.deadlines.map((deadline) => deadline.id)).toEqual([
      'shortlisted',
      'preparing',
    ]);
    expect(summary.deadlines[0]?.isOverdue).toBe(true);
  });
});
