import { type Money, money, roundHalfUp } from './money.ts';

// "Budget à l'équilibre": a financer rejects a budget whose charges and produits
// do not match to the euro. So the editor always shows the gap, and the balance
// helper says exactly which side to adjust.

export type BudgetLine = { label: string; amount: number };

export type BudgetEquilibreTotals = {
  chargesTotal: number;
  produitsTotal: number;
  gap: number;
  isBalanced: boolean;
  side: 'BALANCED' | 'CHARGES_HEAVY' | 'PRODUITS_HEAVY';
};

const sumLines = (lines: BudgetLine[] | undefined): number =>
  (lines ?? []).reduce(
    (total, line) =>
      total + (Number.isFinite(line.amount) ? Number(line.amount) : 0),
    0,
  );

export const computeBudgetEquilibre = (
  charges: BudgetLine[] | undefined,
  produits: BudgetLine[] | undefined,
): BudgetEquilibreTotals => {
  const chargesTotal = roundHalfUp(sumLines(charges) * 100) / 100;
  const produitsTotal = roundHalfUp(sumLines(produits) * 100) / 100;
  const gap = roundHalfUp((produitsTotal - chargesTotal) * 100) / 100;

  return {
    chargesTotal,
    produitsTotal,
    gap,
    isBalanced: gap === 0,
    side:
      gap === 0 ? 'BALANCED' : gap < 0 ? 'CHARGES_HEAVY' : 'PRODUITS_HEAVY',
  };
};

export const balanceMessage = (
  totals: BudgetEquilibreTotals,
  locale = 'fr-FR',
): string => {
  if (totals.isBalanced) {
    return 'Budget à l’équilibre.';
  }

  const amount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Math.abs(totals.gap));

  return totals.side === 'CHARGES_HEAVY'
    ? `Déficit de ${amount} : il manque ${amount} de produits.`
    : `Excédent de ${amount} : ajoutez ${amount} de charges ou réduisez les produits.`;
};

export type RealisedTotals = {
  expenseByCategory: { label: string; amountMicros: number }[];
  incomeByCategory: { label: string; amountMicros: number }[];
};

// Prefill from the workspace's real movements. Categories carrying a PCG account
// land on their official line; everything else is appended verbatim, never
// silently merged into "Autres".
export const prefillFromRealised = (
  templateCharges: BudgetLine[],
  templateProduits: BudgetLine[],
  realised: RealisedTotals,
  pcgByCategory: Record<string, string> = {},
): { charges: BudgetLine[]; produits: BudgetLine[] } => {
  const fill = (
    templateLines: BudgetLine[],
    realisedLines: { label: string; amountMicros: number }[],
  ): BudgetLine[] => {
    const lines = templateLines.map((line) => ({ ...line, amount: 0 }));
    const extras: BudgetLine[] = [];

    for (const realisedLine of realisedLines) {
      const amount = realisedLine.amountMicros / 1_000_000;
      const pcgAccount = pcgByCategory[realisedLine.label];
      const target =
        pcgAccount === undefined
          ? undefined
          : lines.find((line) => line.label.startsWith(pcgAccount.slice(0, 2)));

      if (target === undefined) {
        extras.push({ label: realisedLine.label, amount });
      } else {
        target.amount = roundHalfUp((target.amount + amount) * 100) / 100;
      }
    }

    return [...lines, ...extras];
  };

  return {
    charges: fill(templateCharges, realised.expenseByCategory),
    produits: fill(templateProduits, realised.incomeByCategory),
  };
};

export const budgetEquilibreAsMoney = (
  totals: BudgetEquilibreTotals,
  currencyCode = 'EUR',
): { charges: Money; produits: Money; gap: Money } => ({
  charges: money(roundHalfUp(totals.chargesTotal * 1_000_000), currencyCode),
  produits: money(roundHalfUp(totals.produitsTotal * 1_000_000), currencyCode),
  gap: money(roundHalfUp(totals.gap * 1_000_000), currencyCode),
});
