import { fromMicros, type Money } from './money.ts';

export type BudgetPeriod = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';

export type BudgetWindow = { startDate: string; endDate: string };

const iso = (date: Date): string => date.toISOString().slice(0, 10);

export const resolveBudgetWindow = (
  period: BudgetPeriod,
  reference: Date = new Date(),
  custom?: Partial<BudgetWindow>,
): BudgetWindow => {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();

  switch (period) {
    case 'MONTHLY':
      return {
        startDate: iso(new Date(Date.UTC(year, month, 1))),
        endDate: iso(new Date(Date.UTC(year, month + 1, 0))),
      };
    case 'QUARTERLY': {
      const quarterStartMonth = Math.floor(month / 3) * 3;

      return {
        startDate: iso(new Date(Date.UTC(year, quarterStartMonth, 1))),
        endDate: iso(new Date(Date.UTC(year, quarterStartMonth + 3, 0))),
      };
    }
    case 'YEARLY':
      return {
        startDate: iso(new Date(Date.UTC(year, 0, 1))),
        endDate: iso(new Date(Date.UTC(year, 12, 0))),
      };
    case 'CUSTOM':
    default:
      return {
        startDate: custom?.startDate ?? iso(new Date(Date.UTC(year, 0, 1))),
        endDate: custom?.endDate ?? iso(new Date(Date.UTC(year, 12, 0))),
      };
  }
};

export const isWithinWindow = (
  window: BudgetWindow,
  entryDate: string,
): boolean => {
  const day = entryDate.slice(0, 10);

  return day >= window.startDate && day <= window.endDate;
};

export type BudgetProgress = {
  spentMicros: number;
  budgetMicros: number;
  percent: number;
  remainingMicros: number;
  level: 'OK' | 'WARNING' | 'REACHED' | 'EXCEEDED';
};

export const computeBudgetProgress = (
  budget: Money,
  spentMicros: number,
  alertThresholdPercent = 80,
): BudgetProgress => {
  const budgetMicros = budget.amountMicros;
  const percent =
    budgetMicros === 0 ? 0 : (spentMicros / budgetMicros) * 100;

  const level: BudgetProgress['level'] =
    percent > 100
      ? 'EXCEEDED'
      : percent >= 100
        ? 'REACHED'
        : percent >= alertThresholdPercent
          ? 'WARNING'
          : 'OK';

  return {
    spentMicros,
    budgetMicros,
    percent: Number(percent.toFixed(2)),
    remainingMicros: budgetMicros - spentMicros,
    level,
  };
};

export const budgetAlertMessage = (
  budgetName: string,
  progress: BudgetProgress,
  locale = 'fr-FR',
): string | undefined => {
  if (progress.level === 'OK') {
    return undefined;
  }

  const spent = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(fromMicros(progress.spentMicros));
  const budget = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(fromMicros(progress.budgetMicros));

  if (progress.level === 'EXCEEDED') {
    return `Budget « ${budgetName} » dépassé : ${spent} sur ${budget} (${progress.percent} %).`;
  }

  if (progress.level === 'REACHED') {
    return `Budget « ${budgetName} » atteint : ${spent} sur ${budget}.`;
  }

  return `Budget « ${budgetName} » à ${progress.percent} % : ${spent} sur ${budget}.`;
};
