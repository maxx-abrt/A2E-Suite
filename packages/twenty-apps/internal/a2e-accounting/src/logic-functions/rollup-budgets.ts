import { defineLogicFunction } from 'twenty-sdk/define';

import {
  type BudgetPeriod,
  computeBudgetProgress,
  isWithinWindow,
  resolveBudgetWindow,
} from '../lib/budget.ts';
import { money } from '../lib/money.ts';
import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  findAllRecords,
  todayIso,
  updateRecord,
} from './utils/records.ts';

// Budget rollup. Spend is recomputed rather than incremented: an edited or
// deleted expense would otherwise leave the counter permanently wrong.

type BudgetRecord = {
  id: string;
  name?: string | null;
  amount?: { amountMicros?: number; currencyCode?: string } | null;
  period?: BudgetPeriod | null;
  startDate?: string | null;
  endDate?: string | null;
  alertThresholdPercent?: number | null;
  categoryId?: string | null;
};

type EntryRecord = {
  id: string;
  entryType?: string | null;
  entryDate?: string | null;
  amount?: { amountMicros?: number; currencyCode?: string } | null;
  categoryId?: string | null;
};

const handler = async () => {
  const client = coreClient();

  const budgets = await findAllRecords<BudgetRecord>(
    client,
    'budgets',
    {
      id: true,
      name: true,
      amount: { amountMicros: true, currencyCode: true },
      period: true,
      startDate: true,
      endDate: true,
      alertThresholdPercent: true,
      categoryId: true,
    },
    {},
  );

  if (budgets.length === 0) {
    return { budgets: 0, alerts: [] as string[] };
  }

  const entries = await findAllRecords<EntryRecord>(
    client,
    'financeEntries',
    {
      id: true,
      entryType: true,
      entryDate: true,
      amount: { amountMicros: true, currencyCode: true },
      categoryId: true,
    },
    { filter: { entryType: { eq: 'EXPENSE' } } },
  );

  const alerts: string[] = [];

  for (const budget of budgets) {
    const window = resolveBudgetWindow(
      budget.period ?? 'YEARLY',
      new Date(),
      {
        startDate: budget.startDate?.slice(0, 10),
        endDate: budget.endDate?.slice(0, 10),
      },
    );

    const spentMicros = entries
      .filter(
        (entry) =>
          (budget.categoryId === null ||
            budget.categoryId === undefined ||
            entry.categoryId === budget.categoryId) &&
          typeof entry.entryDate === 'string' &&
          isWithinWindow(window, entry.entryDate),
      )
      .reduce((total, entry) => total + (entry.amount?.amountMicros ?? 0), 0);

    const progress = computeBudgetProgress(
      money(
        budget.amount?.amountMicros ?? 0,
        budget.amount?.currencyCode ?? 'EUR',
      ),
      spentMicros,
      budget.alertThresholdPercent ?? 80,
    );

    await updateRecord(client, 'updateBudget', budget.id, {
      spentAmount: money(
        progress.spentMicros,
        budget.amount?.currencyCode ?? 'EUR',
      ),
      spentPercent: progress.percent,
      alertLevel: progress.level,
      lastRollupAt: todayIso(),
    });

    if (progress.level !== 'OK') {
      alerts.push(`${budget.name ?? budget.id}: ${progress.level}`);
    }
  }

  console.log('[bilan] Budgets recalculés', {
    budgets: budgets.length,
    alerts,
  });

  return { budgets: budgets.length, alerts };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.rollupBudgets,
  name: 'rollup-budgets',
  description:
    'Recalcule chaque heure le consommé de chaque budget sur sa période, et son niveau d’alerte (80 %, atteint, dépassé).',
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '15 * * * *',
  },
  handler,
});
