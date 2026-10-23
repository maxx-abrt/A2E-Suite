import { type LedgerRowInput } from './ledger.ts';

type SourceFile = { label?: string | null };
type SourceMoney = { amountMicros?: number; currencyCode?: string };

export type FinanceEntryLedgerSource = {
  id: string;
  label?: string | null;
  entryType?: 'EXPENSE' | 'INCOME' | null;
  entryDate?: string | null;
  amount?: SourceMoney | null;
  paymentMethod?: string | null;
  reference?: string | null;
  categoryId?: string | null;
  receipts?: SourceFile[] | null;
  deletedAt?: string | null;
};

export type InvoiceLedgerSource = {
  id: string;
  number?: string | null;
  status?: string | null;
  clientName?: string | null;
  paidDate?: string | null;
  issueDate?: string | null;
  amountPaid?: SourceMoney | null;
  documents?: SourceFile[] | null;
  deletedAt?: string | null;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte',
  CASH: 'Espèces',
  CHECK: 'Chèque',
  DIRECT_DEBIT: 'Prélèvement',
  OTHER: 'Autre',
};

const hasBookingDetails = (
  date: string | null | undefined,
  amount: SourceMoney | null | undefined,
): boolean =>
  typeof date === 'string' &&
  Number.isFinite(Date.parse(date)) &&
  typeof amount?.amountMicros === 'number' &&
  Number.isSafeInteger(amount.amountMicros) &&
  amount.amountMicros !== 0;

const proofLabels = (files: SourceFile[] | null | undefined): string[] =>
  (files ?? []).flatMap((file) =>
    typeof file.label === 'string' && file.label.trim() ? [file.label] : [],
  );

export const buildFinanceEntryLedgerInput = (
  record: FinanceEntryLedgerSource,
  recordId: string,
): LedgerRowInput | null => {
  if (!hasBookingDetails(record.entryDate, record.amount) || record.deletedAt)
    return null;
  return {
    sourceKind: 'FINANCE_ENTRY',
    sourceId: recordId,
    entryDate: record.entryDate as string,
    entryType: record.entryType ?? 'EXPENSE',
    label: record.label ?? 'Mouvement sans libellé',
    amountMicros: record.amount?.amountMicros as number,
    currencyCode: record.amount?.currencyCode ?? 'EUR',
    paymentMethodLabel: record.paymentMethod
      ? (PAYMENT_METHOD_LABELS[record.paymentMethod] ?? record.paymentMethod)
      : '',
    reference: record.reference ?? undefined,
    proofLabels: proofLabels(record.receipts),
  };
};

export const buildInvoiceLedgerInput = (
  record: InvoiceLedgerSource,
  recordId: string,
): LedgerRowInput | null => {
  const entryDate = record.paidDate ?? record.issueDate;
  if (
    record.deletedAt ||
    !['PAID', 'PARTIALLY_PAID'].includes(record.status ?? '') ||
    !hasBookingDetails(entryDate, record.amountPaid) ||
    (record.amountPaid?.amountMicros ?? 0) <= 0
  )
    return null;
  return {
    sourceKind: 'INVOICE',
    sourceId: recordId,
    entryDate: entryDate as string,
    entryType: 'INCOME',
    label:
      `Facture ${record.number ?? ''} — ${record.clientName ?? 'client'}`.trim(),
    amountMicros: record.amountPaid?.amountMicros as number,
    currencyCode: record.amountPaid?.currencyCode ?? 'EUR',
    categoryLabel: 'Ventes',
    paymentMethodLabel: '',
    reference: record.number ?? undefined,
    proofLabels: proofLabels(record.documents),
  };
};
