import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SEED_CATEGORIES,
  seedCategories,
  seedOrgProfile,
  seedStarterFiches,
  seedStarterSheets,
} from '../../logic-functions/handlers/seed-starter-content.ts';
import {
  STARTER_BOOK_SHEETS,
  STARTER_FICHES,
} from '../starter-books.ts';

// The Bilan post-install hook's write path. This is the code that failed to
// seed rows live (phase-01-report 2026-09-16): the runner logged a per-step
// failure but the rows never landed. These cases pin the contract the hook
// relies on — every starter row is written through the Core client on a fresh
// install, and a reinstall writes only what is missing.

type RecordRow = Record<string, unknown>;

type MutationCall = {
  name: string;
  data: RecordRow[];
};

type QueryResult = Record<string, { node: RecordRow }[]>;

const buildStubClient = (options: {
  queryResults: QueryResult;
  mutations: MutationCall[];
}) => ({
  query: async (selection: Record<string, unknown>) => {
    const plural =
      Object.keys(selection).find((key) => key !== '__args') ?? '';

    return { [plural]: { edges: options.queryResults[plural] ?? [] } };
  },
  mutation: async (selection: Record<string, unknown>) => {
    const name = Object.keys(selection).find((key) => key !== '__args') ?? '';
    const data = (
      selection[name] as { __args: { data: RecordRow[] } }
    ).__args.data;

    options.mutations.push({ name, data });

    return { [name]: data.map((_row, index) => ({ id: `row-${index}` })) };
  },
});

test('a fresh install writes every starter row through the Core client', async () => {
  const mutations: MutationCall[] = [];
  const client = buildStubClient({ queryResults: {}, mutations });

  const categoriesCreated = await seedCategories(client);
  const orgProfileCreated = await seedOrgProfile(client);
  const sheetsCreated = await seedStarterSheets(client);
  const fichesCreated = await seedStarterFiches(client);

  assert.equal(categoriesCreated, SEED_CATEGORIES.length);
  assert.equal(orgProfileCreated, true);
  assert.equal(sheetsCreated, STARTER_BOOK_SHEETS.length);
  assert.equal(fichesCreated, STARTER_FICHES.length);

  const dataByName = new Map(
    mutations.map((mutation) => [mutation.name, mutation.data]),
  );

  const categoryRows = dataByName.get('createFinanceCategories') ?? [];
  const orgProfileRows = dataByName.get('createOrgProfiles') ?? [];
  const sheetRows = dataByName.get('createBookSheets') ?? [];
  const ficheRows = dataByName.get('createFiches') ?? [];

  assert.equal(categoryRows.length, SEED_CATEGORIES.length);
  assert.equal(orgProfileRows.length, 1);
  assert.equal(sheetRows.length, STARTER_BOOK_SHEETS.length);
  assert.equal(ficheRows.length, STARTER_FICHES.length);

  // The rows carry the fields their objects need — a payload of empty rows
  // would pass a length check but seed nothing usable.
  assert.ok(
    categoryRows.every(
      (row) => typeof row.pcgAccount === 'string' && typeof row.name === 'string',
    ),
  );
  assert.ok(
    sheetRows.every(
      (row) => typeof row.systemKey === 'string' && Array.isArray(row.columns),
    ),
  );
  assert.ok(
    ficheRows.every(
      (row) => typeof row.title === 'string' && row.data !== undefined,
    ),
  );
});

test('a reinstall writes nothing when every starter row already exists', async () => {
  const mutations: MutationCall[] = [];
  const client = buildStubClient({
    queryResults: {
      financeCategories: SEED_CATEGORIES.map((category) => ({
        node: { pcgAccount: category.pcgAccount },
      })),
      orgProfiles: [{ node: { id: 'profile-1' } }],
      bookSheets: STARTER_BOOK_SHEETS.map((sheet) => ({
        node: { systemKey: sheet.systemKey },
      })),
      fiches: STARTER_FICHES.map((fiche) => ({
        node: { title: fiche.title, templateKey: fiche.templateKey },
      })),
    },
    mutations,
  });

  assert.equal(await seedCategories(client), 0);
  assert.equal(await seedOrgProfile(client), false);
  assert.equal(await seedStarterSheets(client), 0);
  assert.equal(await seedStarterFiches(client), 0);
  assert.equal(mutations.length, 0);
});

test('a partial reinstall writes only the missing starter rows', async () => {
  const mutations: MutationCall[] = [];
  const [existingSheet, ...missingSheets] = STARTER_BOOK_SHEETS;
  const [existingFiche] = STARTER_FICHES;

  const client = buildStubClient({
    queryResults: {
      bookSheets: [{ node: { systemKey: existingSheet.systemKey } }],
      fiches: [
        {
          node: {
            title: existingFiche.title,
            templateKey: existingFiche.templateKey,
          },
        },
      ],
    },
    mutations,
  });

  assert.equal(await seedStarterSheets(client), missingSheets.length);
  assert.equal(
    await seedStarterFiches(client),
    STARTER_FICHES.length - 1,
  );

  const sheetRows =
    mutations.find((mutation) => mutation.name === 'createBookSheets')?.data ??
    [];

  assert.equal(sheetRows.length, missingSheets.length);
  assert.ok(
    !sheetRows.some((row) => row.systemKey === existingSheet.systemKey),
  );
});

test('a rejected Core write surfaces instead of reporting a seed', async () => {
  const client = {
    query: async () => ({ financeCategories: { edges: [] } }),
    mutation: async () => {
      throw new Error('unauthorized');
    },
  };

  await assert.rejects(seedCategories(client), /unauthorized/);
});

// The live 0-rows failure: the hook runs to completion but the workspace ends
// up with no starter rows. A mutation the API accepts but returns no created
// ids for must report 0 — the install summary cannot claim a seed it did not
// observe.
const buildZeroRowWriteClient = () => ({
  query: async (selection: Record<string, unknown>) => {
    const plural =
      Object.keys(selection).find((key) => key !== '__args') ?? '';

    return { [plural]: { edges: [] } };
  },
  mutation: async () => ({}),
});

test('a Core write that creates 0 rows reports 0, never the requested count', async () => {
  const client = buildZeroRowWriteClient();

  assert.equal(await seedCategories(client), 0);
  assert.equal(await seedOrgProfile(client), false);
  assert.equal(await seedStarterSheets(client), 0);
  assert.equal(await seedStarterFiches(client), 0);
});

test('a partial Core write reports the rows actually created', async () => {
  const client = {
    query: async (selection: Record<string, unknown>) => {
      const plural =
        Object.keys(selection).find((key) => key !== '__args') ?? '';

      return { [plural]: { edges: [] } };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const name =
        Object.keys(selection).find((key) => key !== '__args') ?? '';
      const data = (
        selection[name] as { __args: { data: RecordRow[] } }
      ).__args.data;

      return {
        [name]: data.slice(0, 1).map((_row, index) => ({ id: `row-${index}` })),
      };
    },
  };

  assert.equal(await seedStarterSheets(client), 1);
  assert.equal(await seedStarterFiches(client), 1);
});
