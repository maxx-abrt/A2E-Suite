import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  retireLedgerRow,
  upsertLedgerRow,
} from '../handlers/ledger-handler.ts';
import { type coreClient } from '../utils/records.ts';

const input = {
  sourceKind: 'FINANCE_ENTRY' as const,
  sourceId: 'movement-1',
  entryDate: '2026-10-20T00:00:00Z',
  entryType: 'EXPENSE' as const,
  label: 'Supplies',
  amountMicros: 50_000_000,
  currencyCode: 'EUR',
  categoryLabel: 'Office',
  paymentMethodLabel: 'Card',
  reference: 'EXP-001',
  proofLabels: [],
};
const openSheet = { id: 'ledger-1', periodLockedUntil: null };
const closedSheet = { id: 'ledger-1', periodLockedUntil: '2026-12-31' };
const liveEntry = {
  id: 'row-1',
  sheetId: 'ledger-1',
  entryDate: input.entryDate,
  cells: { comment: 'Keep this note' },
  deletedAt: null,
};

type Selection = Record<string, { __args?: Record<string, unknown> }>;
const buildClient = ({
  sheets = [openSheet] as (Record<string, unknown> | undefined)[],
  entries = [] as (Record<string, unknown> | undefined)[],
  createError = undefined as Error | undefined,
} = {}) => {
  const mutations: Selection[] = [];
  const queries: Selection[] = [];
  let sheetReads = 0;
  let entryReads = 0;
  const client = {
    query: async (selection: Selection) => {
      queries.push(selection);
      if (selection.bookSheets) {
        const sheet = sheets[Math.min(sheetReads++, sheets.length - 1)];
        return { bookSheets: { edges: sheet ? [{ node: sheet }] : [] } };
      }
      const entry = entries[entryReads++];
      return { bookEntries: { edges: entry ? [{ node: entry }] : [] } };
    },
    mutation: async (selection: Selection) => {
      mutations.push(selection);
      if (selection.createBookEntries && createError) throw createError;
      const name = Object.keys(selection)[0];
      return {
        [name]: name.startsWith('create')
          ? [{ id: 'new-row' }]
          : { id: 'row-1' },
      };
    },
  };
  return {
    client: client as ReturnType<typeof coreClient>,
    mutations,
    queries,
  };
};

test('a period closed during the initial read prevents the pending ledger write', async () => {
  const { client, mutations } = buildClient({
    sheets: [openSheet, closedSheet],
    entries: [liveEntry],
  });
  assert.equal(await upsertLedgerRow(input, client), 'SKIPPED_LOCKED');
  assert.equal(mutations.length, 0);
});

test('moving a closed-period row to a later date does not rewrite it', async () => {
  const { client, mutations } = buildClient({
    sheets: [closedSheet],
    entries: [liveEntry],
  });
  assert.equal(
    await upsertLedgerRow({ ...input, entryDate: '2027-02-01' }, client),
    'SKIPPED_LOCKED',
  );
  assert.equal(mutations.length, 0);
});

test('an open-period update preserves the user comment', async () => {
  const { client, mutations } = buildClient({ entries: [liveEntry] });
  assert.equal(await upsertLedgerRow(input, client), 'UPDATED');
  const data = mutations[0].updateBookEntry.__args?.data as Record<
    string,
    unknown
  >;
  assert.equal(
    (data.cells as Record<string, unknown>).comment,
    'Keep this note',
  );
});

test('an unresolved unique conflict terminates after one insert instead of recursing forever', async () => {
  const conflict = new Error('23505 sourceKey');
  const { client, mutations } = buildClient({
    entries: [undefined, undefined],
    createError: conflict,
  });
  await assert.rejects(
    upsertLedgerRow(input, client),
    (error) => error === conflict,
  );
  assert.equal(
    mutations.filter((selection) => selection.createBookEntries).length,
    1,
  );
});

test('recovery rechecks the winning row against a newly closed period', async () => {
  const { client, mutations } = buildClient({
    sheets: [openSheet, openSheet, closedSheet],
    entries: [undefined, liveEntry],
    createError: new Error('23505 sourceKey'),
  });
  assert.equal(await upsertLedgerRow(input, client), 'SKIPPED_LOCKED');
  assert.equal(
    mutations.filter((selection) => selection.updateBookEntry).length,
    0,
  );
});

test('recovery revives a concurrently retired winner in place, retaining its comment', async () => {
  const { client, mutations, queries } = buildClient({
    entries: [undefined, { ...liveEntry, deletedAt: '2026-10-21' }],
    createError: new Error('23505 sourceKey'),
  });
  assert.equal(await upsertLedgerRow(input, client), 'RESTORED');
  const update = mutations.find((selection) => selection.updateBookEntry)
    ?.updateBookEntry.__args;
  assert.equal(update?.id, 'row-1');
  const data = update?.data as Record<string, unknown>;
  assert.equal(data.deletedAt, null);
  assert.equal(
    (data.cells as Record<string, unknown>).comment,
    'Keep this note',
  );
  const reads = queries.filter((selection) => selection.bookEntries);
  assert.ok(
    (reads[1].bookEntries.__args?.filter as Record<string, unknown>).or,
  );
});

test('source deletion leaves closed-period ledger rows intact', async () => {
  const { client, mutations } = buildClient({
    sheets: [closedSheet],
    entries: [liveEntry],
  });
  assert.equal(
    await retireLedgerRow('FINANCE_ENTRY', 'movement-1', client),
    false,
  );
  assert.equal(mutations.length, 0);
});

test('source deletion retires an open-period row', async () => {
  const { client, mutations } = buildClient({ entries: [liveEntry] });
  assert.equal(
    await retireLedgerRow('FINANCE_ENTRY', 'movement-1', client),
    true,
  );
  const data = mutations[0].updateBookEntry.__args?.data as Record<
    string,
    unknown
  >;
  assert.equal(typeof data.deletedAt, 'string');
});

test('a missing ledger sheet fails closed instead of allowing a write', async () => {
  const { client, mutations } = buildClient({
    sheets: [],
    entries: [liveEntry],
  });
  await assert.rejects(
    retireLedgerRow('FINANCE_ENTRY', 'movement-1', client),
    /Ledger sheet unavailable/,
  );
  assert.equal(mutations.length, 0);
});
