import {
  type BilanBookEntryRecord,
  type BilanBudgetRecord,
  type BilanBudgetsSummary,
  type BilanCashFlowSummary,
  type BilanFinanceEntryRecord,
  type BilanFundingSummary,
  type BilanInvoiceRecord,
  type BilanMoneyValue,
  type BilanOpenInvoice,
  type BilanPulseMonth,
  type BilanReceivablesSummary,
  type BilanSavedSubventionRecord,
  type BilanSpendingSummary,
} from '@/bilan/types/BilanPulse';

export const BILAN_FALLBACK_CURRENCY_CODE = 'EUR';

export const BILAN_OPEN_INVOICE_STATUSES = [
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const;

export const BILAN_ACTIVE_FUNDING_STATUSES = [
  'SHORTLISTED',
  'PREPARING',
  'SUBMITTED',
  'GRANTED',
] as const;

export const BILAN_FUNDING_PIPELINE_STATUSES = [
  'SHORTLISTED',
  'PREPARING',
  'SUBMITTED',
  'GRANTED',
] as const;

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

const normalizeCurrencyCode = (value?: string | null): string | null => {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';

  return CURRENCY_CODE_PATTERN.test(code) ? code : null;
};

const readAmountMicros = (value?: BilanMoneyValue): number | null => {
  const amountMicros = value?.amountMicros;
  const parsedAmountMicros =
    typeof amountMicros === 'number'
      ? amountMicros
      : typeof amountMicros === 'string'
        ? Number(amountMicros)
        : Number.NaN;

  return Number.isFinite(parsedAmountMicros)
    ? Math.round(parsedAmountMicros)
    : null;
};

export const selectBilanCurrency = (
  values: (BilanMoneyValue | undefined)[],
  fallback = BILAN_FALLBACK_CURRENCY_CODE,
): string => {
  const totals = new Map<string, number>();

  for (const value of values) {
    const currencyCode = normalizeCurrencyCode(value?.currencyCode);
    const amountMicros = readAmountMicros(value);

    if (currencyCode === null || amountMicros === null) {
      continue;
    }

    totals.set(
      currencyCode,
      (totals.get(currencyCode) ?? 0) + Math.abs(amountMicros),
    );
  }

  let selectedCurrency = normalizeCurrencyCode(fallback) ?? 'EUR';
  let selectedWeight = -1;

  for (const [currencyCode, weight] of totals) {
    if (weight > selectedWeight) {
      selectedCurrency = currencyCode;
      selectedWeight = weight;
    }
  }

  return selectedCurrency;
};

export const readBilanMicros = (
  value: BilanMoneyValue | undefined,
  currencyCode: string,
): number | null => {
  if (normalizeCurrencyCode(value?.currencyCode) !== currencyCode) {
    return null;
  }

  return readAmountMicros(value);
};

const startOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const startOfUtcDay = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const addUtcMonths = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

const getUtcMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const parseDate = (value?: string | null): Date | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) ? date : null;
};

const isSameUtcMonth = (date: Date, reference: Date): boolean =>
  date.getUTCFullYear() === reference.getUTCFullYear() &&
  date.getUTCMonth() === reference.getUTCMonth();

const emptyMonth = (): BilanPulseMonth => ({
  key: '',
  monthStart: '',
  incomeMicros: 0,
  expenseMicros: 0,
  netMicros: 0,
});

export const buildBilanCashFlow = (
  entries: BilanBookEntryRecord[],
  now: Date,
  monthCount = 6,
): BilanCashFlowSummary => {
  const safeMonthCount = Math.max(1, Math.trunc(monthCount));
  const currentMonthStart = startOfUtcMonth(now);
  const firstMonthStart = addUtcMonths(
    currentMonthStart,
    -(safeMonthCount - 1),
  );
  const windowEntries = entries.filter((entry) => {
    const entryDate = parseDate(entry.entryDate);

    return (
      entryDate !== null &&
      entryDate.getTime() >= firstMonthStart.getTime() &&
      entryDate.getTime() <= now.getTime()
    );
  });
  const currencyCode = selectBilanCurrency(
    windowEntries.map((entry) => entry.amount),
  );
  const monthBuckets = new Map<
    string,
    { incomeMicros: number; expenseMicros: number }
  >();
  const months: BilanPulseMonth[] = Array.from(
    { length: safeMonthCount },
    (_, index) => {
      const monthStart = addUtcMonths(firstMonthStart, index);
      const key = getUtcMonthKey(monthStart);

      monthBuckets.set(key, { incomeMicros: 0, expenseMicros: 0 });

      return {
        key,
        monthStart: monthStart.toISOString(),
        incomeMicros: 0,
        expenseMicros: 0,
        netMicros: 0,
      };
    },
  );

  let entryCount = 0;

  for (const entry of windowEntries) {
    const entryDate = parseDate(entry.entryDate);

    if (entryDate === null) {
      continue;
    }

    const bucket = monthBuckets.get(getUtcMonthKey(entryDate));
    const amountMicros = readBilanMicros(entry.amount, currencyCode);

    if (bucket === undefined || amountMicros === null || amountMicros === 0) {
      continue;
    }

    entryCount += 1;

    // Bilan stores the direction in entryType; amount is a magnitude.
    if (entry.entryType === 'INCOME') {
      bucket.incomeMicros += Math.abs(amountMicros);
    } else {
      bucket.expenseMicros += Math.abs(amountMicros);
    }
  }

  const populatedMonths = months.map((month) => {
    const bucket = monthBuckets.get(month.key) ?? {
      incomeMicros: 0,
      expenseMicros: 0,
    };

    return {
      ...month,
      incomeMicros: bucket.incomeMicros,
      expenseMicros: bucket.expenseMicros,
      netMicros: bucket.incomeMicros - bucket.expenseMicros,
    };
  });
  const currentMonth = populatedMonths.at(-1) ?? emptyMonth();
  const previousMonth = populatedMonths.at(-2) ?? emptyMonth();

  return {
    currencyCode,
    months: populatedMonths,
    currentMonthIncomeMicros: currentMonth.incomeMicros,
    currentMonthExpenseMicros: currentMonth.expenseMicros,
    currentMonthNetMicros: currentMonth.netMicros,
    previousMonthNetMicros: previousMonth.netMicros,
    entryCount,
  };
};

export const buildBilanReceivables = (
  invoices: BilanInvoiceRecord[],
  now: Date,
): BilanReceivablesSummary => {
  const today = startOfUtcDay(now).getTime();
  const openStatuses = new Set<string>(BILAN_OPEN_INVOICE_STATUSES);
  const openCandidates = invoices.filter((invoice) =>
    openStatuses.has(invoice.status ?? ''),
  );
  const currencyCode = selectBilanCurrency(
    (openCandidates.length > 0 ? openCandidates : invoices).flatMap(
      (invoice) => [invoice.amountTotal, invoice.amountPaid],
    ),
  );
  const openInvoices: BilanOpenInvoice[] = [];
  let openTotalMicros = 0;
  let openPaidMicros = 0;
  let openOutstandingMicros = 0;
  let overdueCount = 0;
  let overdueOutstandingMicros = 0;
  let paidThisMonthMicros = 0;
  let billedThisMonthMicros = 0;

  for (const invoice of invoices) {
    const totalMicros = readBilanMicros(invoice.amountTotal, currencyCode) ?? 0;
    const paidMicros = readBilanMicros(invoice.amountPaid, currencyCode) ?? 0;
    const safePaidMicros = Math.max(0, Math.min(paidMicros, totalMicros));
    const outstandingMicros = Math.max(0, totalMicros - safePaidMicros);
    const issueDate = parseDate(invoice.issueDate);
    const paidDate = parseDate(invoice.paidDate);
    const dueDate = parseDate(invoice.dueDate);
    const isOverdue =
      invoice.status === 'OVERDUE' ||
      (dueDate !== null && dueDate.getTime() < today);

    if (
      issueDate !== null &&
      isSameUtcMonth(issueDate, now) &&
      invoice.status !== 'DRAFT' &&
      invoice.status !== 'CANCELLED'
    ) {
      billedThisMonthMicros += totalMicros;
    }

    if (paidDate !== null && isSameUtcMonth(paidDate, now)) {
      paidThisMonthMicros += safePaidMicros;
    }

    if (!openStatuses.has(invoice.status ?? '') || outstandingMicros <= 0) {
      continue;
    }

    openTotalMicros += totalMicros;
    openPaidMicros += safePaidMicros;
    openOutstandingMicros += outstandingMicros;

    if (isOverdue) {
      overdueCount += 1;
      overdueOutstandingMicros += outstandingMicros;
    }

    openInvoices.push({
      id: invoice.id,
      number: invoice.number ?? null,
      clientName: invoice.clientName ?? null,
      status: invoice.status ?? null,
      dueDate: invoice.dueDate ?? null,
      outstandingMicros,
      isOverdue,
    });
  }

  openInvoices.sort((firstInvoice, secondInvoice) => {
    if (firstInvoice.isOverdue !== secondInvoice.isOverdue) {
      return firstInvoice.isOverdue ? -1 : 1;
    }

    const firstDueDate = parseDate(firstInvoice.dueDate)?.getTime();
    const secondDueDate = parseDate(secondInvoice.dueDate)?.getTime();

    if (firstDueDate === undefined && secondDueDate === undefined) {
      return 0;
    }

    if (firstDueDate === undefined) {
      return 1;
    }

    if (secondDueDate === undefined) {
      return -1;
    }

    return firstDueDate - secondDueDate;
  });

  return {
    currencyCode,
    openCount: openInvoices.length,
    openTotalMicros,
    openPaidMicros,
    openOutstandingMicros,
    overdueCount,
    overdueOutstandingMicros,
    dueLaterOutstandingMicros: Math.max(
      0,
      openOutstandingMicros - overdueOutstandingMicros,
    ),
    paidThisMonthMicros,
    billedThisMonthMicros,
    openInvoices,
  };
};

export const buildBilanSpending = (
  entries: BilanFinanceEntryRecord[],
  now: Date,
): BilanSpendingSummary => {
  const currentMonthStart = startOfUtcMonth(now);
  const nextMonthStart = addUtcMonths(currentMonthStart, 1);
  const previousMonthStart = addUtcMonths(currentMonthStart, -1);
  const windowEntries = entries.filter((entry) => {
    if (entry.entryType !== 'EXPENSE') {
      return false;
    }

    const entryDate = parseDate(entry.entryDate);

    return (
      entryDate !== null &&
      entryDate.getTime() >= previousMonthStart.getTime() &&
      entryDate.getTime() < nextMonthStart.getTime() &&
      entryDate.getTime() <= now.getTime()
    );
  });
  const currencyCode = selectBilanCurrency(
    windowEntries.map((entry) => entry.amount),
  );
  const categoryBuckets = new Map<
    string,
    { name: string | null; amountMicros: number; entryCount: number }
  >();
  let currentMonthExpenseMicros = 0;
  let previousMonthExpenseMicros = 0;
  let uncategorizedMicros = 0;
  let uncategorizedCount = 0;
  let expenseCount = 0;

  for (const entry of windowEntries) {
    const entryDate = parseDate(entry.entryDate);
    const amountMicros = readBilanMicros(entry.amount, currencyCode);

    if (entryDate === null || amountMicros === null || amountMicros === 0) {
      continue;
    }

    const isCurrentMonth =
      entryDate.getTime() >= currentMonthStart.getTime() &&
      entryDate.getTime() < nextMonthStart.getTime();
    const isPreviousMonth =
      entryDate.getTime() >= previousMonthStart.getTime() &&
      entryDate.getTime() < currentMonthStart.getTime();

    if (!isCurrentMonth && !isPreviousMonth) {
      continue;
    }

    const magnitudeMicros = Math.abs(amountMicros);

    if (isPreviousMonth) {
      previousMonthExpenseMicros += magnitudeMicros;
      continue;
    }

    currentMonthExpenseMicros += magnitudeMicros;
    expenseCount += 1;

    const categoryId = entry.category?.id ?? 'uncategorized';
    const categoryName = entry.category?.name?.trim() || null;
    const bucket = categoryBuckets.get(categoryId) ?? {
      name: categoryName,
      amountMicros: 0,
      entryCount: 0,
    };

    bucket.name = bucket.name ?? categoryName;
    bucket.amountMicros += magnitudeMicros;
    bucket.entryCount += 1;
    categoryBuckets.set(categoryId, bucket);

    if (categoryName === null) {
      uncategorizedMicros += magnitudeMicros;
      uncategorizedCount += 1;
    }
  }

  const categories = [...categoryBuckets.entries()]
    .map(([id, category]) => ({
      id,
      name: category.name,
      amountMicros: category.amountMicros,
      entryCount: category.entryCount,
    }))
    .sort(
      (firstCategory, secondCategory) =>
        secondCategory.amountMicros - firstCategory.amountMicros,
    );

  return {
    currencyCode,
    currentMonthExpenseMicros,
    previousMonthExpenseMicros,
    uncategorizedMicros,
    uncategorizedCount,
    expenseCount,
    categories,
  };
};

export const buildBilanBudgets = (
  budgets: BilanBudgetRecord[],
  now: Date,
): BilanBudgetsSummary => {
  const today = startOfUtcDay(now).getTime();
  const activeBudgets = budgets.filter((budget) => {
    const startDate = parseDate(budget.startDate);
    const endDate = parseDate(budget.endDate);

    return (
      (startDate === null || startDate.getTime() <= now.getTime()) &&
      (endDate === null || endDate.getTime() >= today)
    );
  });
  const currencyCode = selectBilanCurrency(
    activeBudgets.flatMap((budget) => [budget.amount, budget.spentAmount]),
  );
  const rows = [] as BilanBudgetsSummary['rows'];
  let totalBudgetMicros = 0;
  let totalSpentMicros = 0;
  let overBudgetCount = 0;
  let warningCount = 0;
  let onTrackCount = 0;
  let lastRollupAt: string | null = null;
  let lastRollupTime = Number.NEGATIVE_INFINITY;

  for (const budget of activeBudgets) {
    const budgetMicros = readBilanMicros(budget.amount, currencyCode) ?? 0;

    if (budgetMicros <= 0) {
      continue;
    }

    const spentMicros = Math.max(
      0,
      readBilanMicros(budget.spentAmount, currencyCode) ?? 0,
    );
    const consumedPercent = (spentMicros / budgetMicros) * 100;

    totalBudgetMicros += budgetMicros;
    totalSpentMicros += spentMicros;
    rows.push({
      id: budget.id,
      name: budget.name ?? null,
      budgetMicros,
      spentMicros,
      consumedPercent,
      alertLevel: budget.alertLevel ?? null,
    });

    if (consumedPercent >= 100) {
      overBudgetCount += 1;
    } else if (consumedPercent >= 80) {
      warningCount += 1;
    } else {
      onTrackCount += 1;
    }

    const rollupDate = parseDate(budget.lastRollupAt);

    if (rollupDate !== null && rollupDate.getTime() > lastRollupTime) {
      lastRollupTime = rollupDate.getTime();
      lastRollupAt = rollupDate.toISOString();
    }
  }

  rows.sort(
    (firstBudget, secondBudget) =>
      secondBudget.consumedPercent - firstBudget.consumedPercent,
  );

  return {
    currencyCode,
    totalBudgetMicros,
    totalSpentMicros,
    consumedPercent:
      totalBudgetMicros > 0 ? (totalSpentMicros / totalBudgetMicros) * 100 : 0,
    overBudgetCount,
    warningCount,
    onTrackCount,
    lastRollupAt,
    rows,
  };
};

export const buildBilanFunding = (
  grants: BilanSavedSubventionRecord[],
  now: Date,
): BilanFundingSummary => {
  const activeStatuses = new Set<string>(BILAN_ACTIVE_FUNDING_STATUSES);
  const today = startOfUtcDay(now).getTime();
  const activeGrants = grants.filter((grant) =>
    activeStatuses.has(grant.status ?? ''),
  );
  const currencyCode = selectBilanCurrency(
    activeGrants.flatMap((grant) => [
      grant.amountRequested,
      grant.amountGranted,
    ]),
  );
  const stageBuckets = new Map<
    string,
    { count: number; requestedMicros: number }
  >();
  const deadlines = [] as BilanFundingSummary['deadlines'];
  let activeCount = 0;
  let activeRequestedMicros = 0;
  let activeGrantedMicros = 0;

  for (const grant of activeGrants) {
    const requestedMicros =
      readBilanMicros(grant.amountRequested, currencyCode) ??
      readBilanMicros(grant.amountGranted, currencyCode) ??
      0;
    const grantedMicros =
      readBilanMicros(grant.amountGranted, currencyCode) ?? 0;
    const requestedMagnitudeMicros = Math.abs(requestedMicros);
    const grantedMagnitudeMicros = Math.abs(grantedMicros);
    const stage = stageBuckets.get(grant.status ?? '') ?? {
      count: 0,
      requestedMicros: 0,
    };

    stage.count += 1;
    stage.requestedMicros += requestedMagnitudeMicros;
    stageBuckets.set(grant.status ?? '', stage);
    activeCount += 1;
    activeRequestedMicros += requestedMagnitudeMicros;
    activeGrantedMicros += grantedMagnitudeMicros;

    const deadline = parseDate(grant.deadline);

    if (deadline !== null) {
      deadlines.push({
        id: grant.id,
        name: grant.name ?? null,
        status: grant.status ?? null,
        deadline: grant.deadline ?? null,
        requestedMicros: requestedMagnitudeMicros,
        isOverdue: deadline.getTime() < today,
      });
    }
  }

  deadlines.sort((firstDeadline, secondDeadline) => {
    const firstTime = parseDate(firstDeadline.deadline)?.getTime() ?? 0;
    const secondTime = parseDate(secondDeadline.deadline)?.getTime() ?? 0;

    return firstTime - secondTime;
  });

  return {
    currencyCode,
    activeCount,
    activeRequestedMicros,
    activeGrantedMicros,
    nextDeadline: deadlines[0]?.deadline ?? null,
    stages: BILAN_FUNDING_PIPELINE_STATUSES.map((status) => ({
      status,
      count: stageBuckets.get(status)?.count ?? 0,
      requestedMicros: stageBuckets.get(status)?.requestedMicros ?? 0,
    })),
    deadlines,
  };
};
