// THE AUTO-JOURNAL ("Livre").
//
// Every workspace gets exactly one system sheet, keyed `bilan.default.ledger`.
// Each cash movement written anywhere in Bilan (a dépense, a recette, an invoice
// payment, a granted subvention) upserts ITS OWN row in that sheet, keyed by
// `sourceKind:sourceId`. Consequences by design:
//
//  - the user never has to touch the book: at year end they export it and every
//    line is already there, linked to its source record and its proofs;
//  - the sheet is locked + default → undeletable, managed columns read-only;
//  - only `comment` is user-writable on a machine row;
//  - the upsert is idempotent, so replaying an event never duplicates a line.

export const LEDGER_SYSTEM_KEY = 'bilan.default.ledger';
export const LEDGER_SHEET_NAME = 'Journal automatique';
export const LEDGER_SHEET_DESCRIPTION =
  "Journal alimenté automatiquement par chaque recette et dépense de Bilan, justificatifs inclus. Exportable tel quel en fin d'exercice.";

export type LedgerColumn = {
  id: string;
  name: string;
  type: 'date' | 'select' | 'text' | 'currency' | 'number';
  width: number;
  isManaged: boolean;
  options?: string[];
};

export const LEDGER_COLUMNS: LedgerColumn[] = [
  { id: 'date', name: 'Date', type: 'date', width: 120, isManaged: true },
  {
    id: 'type',
    name: 'Type',
    type: 'select',
    width: 110,
    isManaged: true,
    options: ['Recette', 'Dépense'],
  },
  { id: 'label', name: 'Libellé', type: 'text', width: 260, isManaged: true },
  { id: 'category', name: 'Catégorie', type: 'text', width: 150, isManaged: true },
  { id: 'amount', name: 'Montant', type: 'currency', width: 130, isManaged: true },
  { id: 'method', name: 'Moyen de paiement', type: 'text', width: 160, isManaged: true },
  { id: 'reference', name: 'Référence', type: 'text', width: 150, isManaged: true },
  { id: 'proofs', name: 'Justificatifs', type: 'text', width: 200, isManaged: true },
  { id: 'source', name: 'Origine', type: 'text', width: 130, isManaged: true },
  { id: 'comment', name: 'Commentaire', type: 'text', width: 200, isManaged: false },
];

export const MANAGED_LEDGER_COLUMN_IDS = LEDGER_COLUMNS.filter(
  (column) => column.isManaged,
).map((column) => column.id);

export type LedgerSourceKind =
  | 'FINANCE_ENTRY'
  | 'INVOICE'
  | 'SUBVENTION'
  | 'MANUAL';

export const buildLedgerSourceKey = (
  sourceKind: LedgerSourceKind,
  sourceId: string,
): string => `${sourceKind}:${sourceId}`;

export type LedgerRowInput = {
  sourceKind: LedgerSourceKind;
  sourceId: string;
  entryDate: string;
  entryType: 'INCOME' | 'EXPENSE';
  label: string;
  amountMicros: number;
  currencyCode: string;
  categoryLabel?: string;
  paymentMethodLabel?: string;
  reference?: string;
  proofLabels?: string[];
};

export type LedgerRow = {
  label: string;
  sourceKey: string;
  sourceKind: LedgerSourceKind;
  sourceId: string;
  entryDate: string;
  entryType: 'INCOME' | 'EXPENSE';
  isAuto: true;
  amount: { amountMicros: number; currencyCode: string };
  categoryLabel: string;
  paymentMethodLabel: string;
  reference: string;
  cells: Record<string, string | number>;
};

const isoDay = (value: string): string => value.slice(0, 10);

export const buildLedgerRow = (input: LedgerRowInput): LedgerRow => {
  const proofs = (input.proofLabels ?? []).filter(Boolean).join(', ');
  const typeLabel = input.entryType === 'INCOME' ? 'Recette' : 'Dépense';

  return {
    label: input.label,
    sourceKey: buildLedgerSourceKey(input.sourceKind, input.sourceId),
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    entryDate: input.entryDate,
    entryType: input.entryType,
    isAuto: true,
    amount: {
      amountMicros: input.amountMicros,
      currencyCode: input.currencyCode,
    },
    categoryLabel: input.categoryLabel ?? '',
    paymentMethodLabel: input.paymentMethodLabel ?? '',
    reference: input.reference ?? '',
    cells: {
      date: isoDay(input.entryDate),
      type: typeLabel,
      label: input.label,
      category: input.categoryLabel ?? '',
      amount: input.amountMicros,
      method: input.paymentMethodLabel ?? '',
      reference: input.reference ?? '',
      proofs,
      source: input.sourceKind,
    },
  };
};

// A machine row keeps its human comment across every replay; nothing else on it
// is user-owned, so the managed cells are always overwritten from the source.
export const mergeLedgerCells = (
  existingCells: Record<string, unknown> | undefined,
  nextCells: Record<string, string | number>,
): Record<string, unknown> => ({
  ...(existingCells ?? {}),
  ...nextCells,
  comment: (existingCells ?? {}).comment ?? '',
});

export const isLedgerPeriodLocked = (
  periodLockedUntil: string | null | undefined,
  entryDate: string,
): boolean => {
  if (!periodLockedUntil) {
    return false;
  }

  return isoDay(entryDate) <= isoDay(periodLockedUntil);
};

export const toCsv = (
  columns: LedgerColumn[],
  rows: Record<string, unknown>[],
): string => {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value);

    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const header = columns.map((column) => escape(column.name)).join(';');
  const body = rows.map((row) =>
    columns.map((column) => escape(row[column.id])).join(';'),
  );

  return [header, ...body].join('\n');
};
