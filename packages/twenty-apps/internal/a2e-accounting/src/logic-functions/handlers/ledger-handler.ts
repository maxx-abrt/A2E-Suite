import {
  buildLedgerRow,
  LEDGER_COLUMNS,
  LEDGER_SHEET_DESCRIPTION,
  LEDGER_SHEET_NAME,
  LEDGER_SYSTEM_KEY,
  type LedgerRowInput,
  type LedgerSourceKind,
  isLedgerUniqueViolation,
  isLedgerWriteLocked,
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
  entryDate?: string | null;
  deletedAt?: string | null;
  sheetId?: string | null;
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
  client: ReturnType<typeof coreClient> = coreClient(),
): Promise<'CREATED' | 'UPDATED' | 'RESTORED' | 'SKIPPED_LOCKED'> => {
  const sheet = await ensureLedgerSheet(client);

  // Both incoming and existing dates matter: moving a closed-period row into
  // an open period must not bypass the lock.
  const isLocked = (existingEntryDate?: string | null): boolean =>
    isLedgerWriteLocked(sheet.periodLockedUntil, [
      input.entryDate,
      existingEntryDate,
    ]);

  if (isLocked()) {
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
    { id: true, cells: true, entryDate: true, deletedAt: true },
    {
      sourceKey: { eq: row.sourceKey },
      or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }],
    },
  );

  if (
    await isCurrentLedgerWriteLocked(client, sheet.id, [
      input.entryDate,
      existing?.entryDate,
    ])
  ) {
    console.log(
      `[bilan] Écriture ignorée : ligne ${existing?.id ?? row.sourceKey} dans une période clôturée`,
    );

    return 'SKIPPED_LOCKED';
  }

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
    return createLedgerEntryWithRaceRecovery(client, sheet.id, row, data);
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

const isCurrentLedgerWriteLocked = async (
  client: ReturnType<typeof coreClient>,
  sheetId: string,
  entryDates: (string | null | undefined)[],
): Promise<boolean> => {
  const currentSheet = await findOneRecord<LedgerSheet>(
    client,
    'bookSheets',
    { id: true, periodLockedUntil: true },
    { id: { eq: sheetId } },
  );
  if (currentSheet === undefined) {
    throw new Error('Ledger sheet unavailable; refusing to change its entries');
  }
  return isLedgerWriteLocked(currentSheet.periodLockedUntil, entryDates);
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
  sheetId: string,
  row: ReturnType<typeof buildLedgerRow>,
  data: RecordShape,
): Promise<'CREATED' | 'UPDATED' | 'RESTORED' | 'SKIPPED_LOCKED'> => {
  let conflict: unknown;
  try {
    await createRecords(client, 'createBookEntries', [
      { ...data, cells: row.cells },
    ]);

    return 'CREATED';
  } catch (error) {
    if (!isLedgerUniqueViolation(error)) {
      throw error;
    }
    conflict = error;
  }

  // Two concurrent events for the same source both passed the empty find; the
  // loser of the create race adopts the winner's row and replays the merge.
  // A rival can retire the winner before it is read; include tombstones so
  // the unique source key never causes an unbounded insert retry.
  const winner = await findOneRecord<LedgerEntry>(
    client,
    'bookEntries',
    { id: true, cells: true, entryDate: true, deletedAt: true },
    {
      sourceKey: { eq: row.sourceKey },
      or: [{ deletedAt: { is: 'NULL' } }, { deletedAt: { is: 'NOT_NULL' } }],
    },
  );

  if (winner === undefined) {
    throw conflict;
  }

  if (
    await isCurrentLedgerWriteLocked(client, sheetId, [
      row.entryDate,
      winner.entryDate,
    ])
  ) {
    return 'SKIPPED_LOCKED';
  }

  if (resolveLedgerUpsertAction(winner) === 'RESTORE') {
    await restoreRetiredLedgerEntry(client, winner, row, data);
    return 'RESTORED';
  }

  await updateRecord(client, 'updateBookEntry', winner.id, {
    ...data,
    cells: mergeLedgerCells(winner.cells ?? undefined, row.cells),
  });

  return 'UPDATED';
};

// Closed-period entries must survive source deletion. Open-period entries can
// be retired while retaining their source key for a later restore.
export const retireLedgerRow = async (
  sourceKind: LedgerSourceKind,
  sourceId: string,
  client: ReturnType<typeof coreClient> = coreClient(),
): Promise<boolean> => {
  const sourceKey = `${sourceKind}:${sourceId}`;

  const existing = await findOneRecord<LedgerEntry>(
    client,
    'bookEntries',
    { id: true, entryDate: true, sheetId: true },
    { sourceKey: { eq: sourceKey } },
  );

  if (existing === undefined) {
    return false;
  }

  if (!existing.sheetId) {
    throw new Error('Ledger entry has no sheet; refusing to retire it');
  }
  if (
    await isCurrentLedgerWriteLocked(client, existing.sheetId, [
      existing.entryDate,
    ])
  ) {
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
