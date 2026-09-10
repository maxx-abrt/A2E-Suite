import {
  buildLedgerRow,
  LEDGER_COLUMNS,
  LEDGER_SHEET_DESCRIPTION,
  LEDGER_SHEET_NAME,
  LEDGER_SYSTEM_KEY,
  type LedgerRowInput,
  type LedgerSourceKind,
  isLedgerPeriodLocked,
  mergeLedgerCells,
} from '../../lib/ledger.ts';
import {
  coreClient,
  createRecords,
  findOneRecord,
  type RecordShape,
  todayIso,
  updateRecord,
} from '../utils/records.ts';

// The auto-journal writer. Every cash movement in Bilan lands here, and only
// here, so a treasurer never maintains the ledger by hand.

type LedgerSheet = {
  id: string;
  periodLockedUntil?: string | null;
};

type LedgerEntry = {
  id: string;
  cells?: Record<string, unknown> | null;
};

export const ensureLedgerSheet = async (
  client: ReturnType<typeof coreClient>,
): Promise<LedgerSheet> => {
  const existing = await findOneRecord<LedgerSheet>(
    client,
    'bookSheets',
    { id: true, periodLockedUntil: true },
    { systemKey: { eq: LEDGER_SYSTEM_KEY } },
  );

  if (existing !== undefined) {
    return existing;
  }

  const [created] = await createRecords(client, 'createBookSheets', [
    {
      name: LEDGER_SHEET_NAME,
      description: LEDGER_SHEET_DESCRIPTION,
      sheetKind: 'LEDGER',
      systemKey: LEDGER_SYSTEM_KEY,
      isDefault: true,
      isLocked: true,
      isTemplate: false,
      columns: LEDGER_COLUMNS,
      fiscalYear: String(new Date().getUTCFullYear()),
    },
  ]);

  return { id: created.id, periodLockedUntil: null };
};

export const upsertLedgerRow = async (
  input: LedgerRowInput & { financeEntryId?: string; invoiceId?: string },
): Promise<'CREATED' | 'UPDATED' | 'SKIPPED_LOCKED'> => {
  const client = coreClient();
  const sheet = await ensureLedgerSheet(client);

  if (isLedgerPeriodLocked(sheet.periodLockedUntil, input.entryDate)) {
    console.log(
      `[bilan] Écriture ignorée : exercice clôturé jusqu'au ${sheet.periodLockedUntil}`,
    );

    return 'SKIPPED_LOCKED';
  }

  const row = buildLedgerRow(input);

  const existing = await findOneRecord<LedgerEntry>(
    client,
    'bookEntries',
    { id: true, cells: true },
    { sourceKey: { eq: row.sourceKey } },
  );

  const data: RecordShape = {
    label: row.label,
    entryDate: row.entryDate,
    entryType: row.entryType,
    amount: row.amount,
    categoryLabel: row.categoryLabel,
    paymentMethodLabel: row.paymentMethodLabel,
    reference: row.reference,
    isAuto: true,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    sourceKey: row.sourceKey,
    sheetId: sheet.id,
    ...(input.financeEntryId ? { financeEntryId: input.financeEntryId } : {}),
    ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
  };

  if (existing === undefined) {
    await createRecords(client, 'createBookEntries', [
      { ...data, cells: row.cells },
    ]);

    return 'CREATED';
  }

  await updateRecord(client, 'updateBookEntry', existing.id, {
    ...data,
    cells: mergeLedgerCells(existing.cells ?? undefined, row.cells),
  });

  return 'UPDATED';
};

// A deleted source is not erased from the book: the row is soft-deleted so the
// export of a closed year keeps its trail.
export const retireLedgerRow = async (
  sourceKind: LedgerSourceKind,
  sourceId: string,
): Promise<boolean> => {
  const client = coreClient();
  const sourceKey = `${sourceKind}:${sourceId}`;

  const existing = await findOneRecord<{ id: string }>(
    client,
    'bookEntries',
    { id: true },
    { sourceKey: { eq: sourceKey } },
  );

  if (existing === undefined) {
    return false;
  }

  await updateRecord(client, 'updateBookEntry', existing.id, {
    deletedAt: todayIso(),
  });

  return true;
};

export const resolveCategoryLabel = async (
  client: ReturnType<typeof coreClient>,
  categoryId: string | null | undefined,
): Promise<string> => {
  if (categoryId === null || categoryId === undefined) {
    return '';
  }

  const category = await findOneRecord<{ name?: string }>(
    client,
    'financeCategories',
    { name: true },
    { id: { eq: categoryId } },
  );

  return category?.name ?? '';
};
