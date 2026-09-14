import {
  buildLedgerRow,
  LEDGER_COLUMNS,
  LEDGER_SHEET_DESCRIPTION,
  LEDGER_SHEET_NAME,
  LEDGER_SYSTEM_KEY,
  type LedgerRowInput,
  type LedgerSourceKind,
  isLedgerPeriodLocked,
  isLedgerUniqueViolation,
  mergeLedgerCells,
  resolveLedgerUpsertAction,
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
  deletedAt?: string | null;
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
): Promise<'CREATED' | 'UPDATED' | 'RESTORED' | 'SKIPPED_LOCKED'> => {
  const client = coreClient();
  const sheet = await ensureLedgerSheet(client);

  if (isLedgerPeriodLocked(sheet.periodLockedUntil, input.entryDate)) {
    console.log(
      `[bilan] Écriture ignorée : exercice clôturé jusqu'au ${sheet.periodLockedUntil}`,
    );

    return 'SKIPPED_LOCKED';
  }

  const row = buildLedgerRow(input);

  // A deletedAt key anywhere in the filter makes the server widen the query to
  // soft-deleted rows; the or-of-nullability is a tautology whose only job is
  // to trigger that widening so retired rows holding the unique key are seen.
  const existing = await findOneRecord<LedgerEntry>(
    client,
    'bookEntries',
    { id: true, cells: true, deletedAt: true },
    {
      sourceKey: { eq: row.sourceKey },
      or: [
        { deletedAt: { is: 'NULL' } },
        { deletedAt: { is: 'NOT_NULL' } },
      ],
    },
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

  const action = resolveLedgerUpsertAction(existing);

  if (existing === undefined) {
    return createLedgerEntryWithRaceRecovery(client, row, data);
  }

  if (action === 'RESTORE') {
    await restoreRetiredLedgerEntry(client, existing, row, data);

    return 'RESTORED';
  }

  await updateRecord(client, 'updateBookEntry', existing.id, {
    ...data,
    cells: mergeLedgerCells(existing.cells ?? undefined, row.cells),
  });

  return 'UPDATED';
};

// `sourceKey` is unique over soft-deleted rows too (the manifest unique index
// carries no WHERE clause), so a row retired by `retireLedgerRow` still holds
// the key: revive it in place instead of inserting a duplicate. The mutation
// path renders user filters without a soft-delete predicate, so updating by id
// reaches the retired row and `deletedAt: null` clears the tombstone.
const restoreRetiredLedgerEntry = async (
  client: ReturnType<typeof coreClient>,
  retired: LedgerEntry,
  row: ReturnType<typeof buildLedgerRow>,
  data: RecordShape,
): Promise<void> => {
  await updateRecord(client, 'updateBookEntry', retired.id, {
    ...data,
    deletedAt: null,
    cells: mergeLedgerCells(retired.cells ?? undefined, row.cells),
  });
};

const createLedgerEntryWithRaceRecovery = async (
  client: ReturnType<typeof coreClient>,
  row: ReturnType<typeof buildLedgerRow>,
  data: RecordShape,
): Promise<'CREATED' | 'UPDATED' | 'RESTORED'> => {
  try {
    await createRecords(client, 'createBookEntries', [
      { ...data, cells: row.cells },
    ]);

    return 'CREATED';
  } catch (error) {
    if (!isLedgerUniqueViolation(error)) {
      throw error;
    }
  }

  // Two concurrent events for the same source both passed the empty find; the
  // loser of the create race adopts the winner's row and replays the merge.
  // The winner of an insert race is live by definition, so no widening needed.
  const winner = await findOneRecord<LedgerEntry>(
    client,
    'bookEntries',
    { id: true, cells: true },
    { sourceKey: { eq: row.sourceKey } },
  );

  if (winner === undefined) {
    return createLedgerEntryWithRaceRecovery(client, row, data);
  }

  await updateRecord(client, 'updateBookEntry', winner.id, {
    ...data,
    cells: mergeLedgerCells(winner.cells ?? undefined, row.cells),
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
