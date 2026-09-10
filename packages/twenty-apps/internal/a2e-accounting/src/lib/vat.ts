import {
  applyPercent,
  DEFAULT_CURRENCY_CODE,
  money,
  type Money,
  roundHalfUp,
} from './money.ts';

// Per-line VAT, computed the way a French accountant reads an invoice:
// each line carries its own rate, the header only carries the mode.
//
//  - EXCLUSIVE      unitPrice is HT, VAT is added on top (the common case)
//  - INCLUSIVE      unitPrice is TTC, VAT is extracted from it
//  - EXEMPT         no VAT at all (art. 261-7 for most associations)
//  - REVERSE_CHARGE no VAT invoiced, the buyer self-liquidates (art. 283-2)

export type TaxMode = 'EXCLUSIVE' | 'INCLUSIVE' | 'EXEMPT' | 'REVERSE_CHARGE';

export type DocumentLine = {
  quantity: number;
  unitPriceMicros: number;
  vatRate?: number;
  discountPercent?: number;
};

export type LineTotals = {
  netMicros: number;
  vatMicros: number;
  grossMicros: number;
  vatRate: number;
};

export type DocumentTotals = {
  subtotal: Money;
  tax: Money;
  total: Money;
  vatByRate: { vatRate: number; netMicros: number; vatMicros: number }[];
};

const isTaxed = (taxMode: TaxMode): boolean =>
  taxMode === 'EXCLUSIVE' || taxMode === 'INCLUSIVE';

export const computeLineTotals = (
  line: DocumentLine,
  taxMode: TaxMode,
): LineTotals => {
  const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
  const gross = quantity * line.unitPriceMicros;
  const discountPercent = line.discountPercent ?? 0;
  const discounted = roundHalfUp(gross * (1 - discountPercent / 100));
  const vatRate = isTaxed(taxMode) ? (line.vatRate ?? 0) : 0;

  if (taxMode === 'INCLUSIVE') {
    const netMicros = roundHalfUp(discounted / (1 + vatRate / 100));

    return {
      netMicros,
      vatMicros: discounted - netMicros,
      grossMicros: discounted,
      vatRate,
    };
  }

  const vatMicros = roundHalfUp((discounted * vatRate) / 100);

  return {
    netMicros: discounted,
    vatMicros,
    grossMicros: discounted + vatMicros,
    vatRate,
  };
};

export const computeDocumentTotals = (
  lines: DocumentLine[],
  taxMode: TaxMode = 'EXCLUSIVE',
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): DocumentTotals => {
  const byRate = new Map<number, { netMicros: number; vatMicros: number }>();

  let subtotalMicros = 0;
  let taxMicros = 0;

  for (const line of lines) {
    const totals = computeLineTotals(line, taxMode);

    subtotalMicros += totals.netMicros;
    taxMicros += totals.vatMicros;

    const bucket = byRate.get(totals.vatRate) ?? {
      netMicros: 0,
      vatMicros: 0,
    };

    byRate.set(totals.vatRate, {
      netMicros: bucket.netMicros + totals.netMicros,
      vatMicros: bucket.vatMicros + totals.vatMicros,
    });
  }

  return {
    subtotal: money(subtotalMicros, currencyCode),
    tax: money(taxMicros, currencyCode),
    total: money(subtotalMicros + taxMicros, currencyCode),
    vatByRate: [...byRate.entries()]
      .map(([vatRate, bucket]) => ({ vatRate, ...bucket }))
      .sort((left, right) => left.vatRate - right.vatRate),
  };
};

export const FRENCH_VAT_RATES = [0, 2.1, 5.5, 10, 20] as const;

export const TAX_MODE_MENTIONS: Record<TaxMode, string> = {
  EXCLUSIVE: '',
  INCLUSIVE: 'Prix TTC — TVA incluse',
  EXEMPT: 'TVA non applicable, art. 261-7 du CGI',
  REVERSE_CHARGE: 'Autoliquidation par le preneur, art. 283-2 du CGI',
};

export const remainingToPay = (
  total: Money,
  paidMicros: number,
): Money => money(Math.max(0, total.amountMicros - paidMicros), total.currencyCode);

export const applyGlobalDiscount = (total: Money, percent: number): Money =>
  applyPercent(total, 100 - percent);
