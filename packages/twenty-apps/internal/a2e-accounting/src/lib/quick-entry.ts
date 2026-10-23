import { toMicros } from './money.ts';
import { computeLineTotals } from './vat.ts';

type QuickEntryInput = {
  label: string;
  entryType: 'EXPENSE' | 'INCOME';
  amount: string;
  vatRate: string;
  entryDate: string;
  paymentMethod: string;
  categoryId?: string;
};

export const buildQuickEntryRecordInput = (input: QuickEntryInput) => {
  const decimalAmount = input.amount.replace(/\s/g, '').replace(',', '.');
  const decimalVatRate = input.vatRate.trim().replace(',', '.');
  const amountMicros = toMicros(Number(decimalAmount));
  const vatRate = Number(decimalVatRate);
  const date = new Date(`${input.entryDate}T00:00:00.000Z`);
  if (
    !input.label.trim() ||
    !/^\d+(\.\d{1,6})?$/.test(decimalAmount) ||
    !Number.isSafeInteger(amountMicros) ||
    amountMicros <= 0 ||
    !/^\d+(\.\d+)?$/.test(decimalVatRate) ||
    !Number.isFinite(vatRate) ||
    vatRate < 0 ||
    vatRate > 100 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.entryDate) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input.entryDate
  ) {
    throw new Error(
      'Vérifiez le libellé, le montant, la date et le taux de TVA.',
    );
  }
  const { vatMicros } = computeLineTotals(
    { quantity: 1, unitPriceMicros: amountMicros, vatRate },
    'INCLUSIVE',
  );
  return {
    label: input.label.trim(),
    entryType: input.entryType,
    amount: { amountMicros, currencyCode: 'EUR' },
    entryDate: date.toISOString(),
    paymentMethod: input.paymentMethod,
    vatRate,
    vatAmount: { amountMicros: vatMicros, currencyCode: 'EUR' },
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
  };
};
