import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  purgeArchivedDocuments,
  type CoreClientLike,
} from '../handlers/purge-archived-documents-handler.ts';

const NOW = Date.parse('2026-09-17T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const expired = (daysAgo: number): string =>
  new Date(NOW - daysAgo * DAY_MS).toISOString();

type Row = { id: string; archivedAt: string };

// Le contrat avec le Core API : la requête rend une page de lignes encore
// archivées (`archivedAt: NOT_NULL`, filtre serveur), avec `pageInfo` pour le
// curseur, et la mutation plurielle supprime par filtre (`filter: { id: { eq } }`
// — vérifié live dans a2e-projects/a2e-drive). Le stub pagine réellement pour
// prouver le balayage au-delà d'une seule page.
const buildPagingClient = (
  rows: Row[],
  pageSize: number,
): {
  client: CoreClientLike;
  queryArgs: { after?: string }[];
  deleted: string[];
} => {
  const queryArgs: { after?: string }[] = [];
  const deleted: string[] = [];

  const client: CoreClientLike = {
    query: (async (selection: Record<string, unknown>) => {
      const entry = selection.documents as { __args: { after?: string } };
      const after = entry.__args.after ?? null;
      const startIndex =
        after === null ? 0 : rows.findIndex((row) => row.id === after) + 1;
      const page = rows.slice(startIndex, startIndex + pageSize);
      const endCursor = page[page.length - 1]?.id ?? null;

      queryArgs.push(entry.__args);

      return {
        documents: {
          edges: page.map((node) => ({ node })),
          pageInfo: {
            hasNextPage: startIndex + pageSize < rows.length,
            endCursor,
          },
        },
      };
    }) as CoreClientLike['query'],
    mutation: (async (selection: Record<string, unknown>) => {
      const entry = selection.deleteDocuments as {
        __args: { filter: { id: { eq: string } } };
      };

      deleted.push(entry.__args.filter.id.eq);

      return {};
    }) as CoreClientLike['mutation'],
  };

  return { client, queryArgs, deleted };
};

test('a deep archived tree spanning more than one API page is fully scanned', async () => {
  // An archived chain root → child → grandchild → great-grandchild plus a
  // second archived branch: 5 rows, one page at a time.
  const rows: Row[] = [
    { id: 'root', archivedAt: expired(9) },
    { id: 'child', archivedAt: expired(8) },
    { id: 'grandchild', archivedAt: expired(30) },
    { id: 'great-grandchild', archivedAt: expired(7.5) },
    { id: 'other-branch', archivedAt: expired(10) },
  ];

  const { client, queryArgs, deleted } = buildPagingClient(rows, 2);
  const result = await purgeArchivedDocuments(client, NOW, 2);

  assert.equal(queryArgs.length, 3);
  assert.equal(queryArgs[0].after, undefined);
  assert.equal(queryArgs[1].after, 'child');
  assert.equal(queryArgs[2].after, 'great-grandchild');
  assert.equal(result.scanned, 5);
  assert.equal(result.purged, 5);
  assert.deepEqual(
    deleted,
    rows.map((row) => row.id),
  );
});

test('only documents past the 7-day window are purged', async () => {
  const rows: Row[] = [
    { id: 'expired-deep', archivedAt: expired(8) },
    { id: 'at-boundary', archivedAt: new Date(NOW - 7 * DAY_MS).toISOString() },
    { id: 'recent', archivedAt: expired(1) },
  ];

  const { client, deleted } = buildPagingClient(rows, 500);
  const result = await purgeArchivedDocuments(client, NOW);

  assert.equal(result.scanned, 3);
  assert.equal(result.purged, 1);
  assert.deepEqual(deleted, ['expired-deep']);
});

test('a restored document never appears in the archived read', async () => {
  // The server filter is `archivedAt: NOT_NULL`; a restored row is therefore
  // absent from every page, so the sweep can never destroy it inside the
  // window. Here the workspace has no archived documents left at all.
  const { client, deleted } = buildPagingClient([], 500);
  const result = await purgeArchivedDocuments(client, NOW);

  assert.deepEqual(result, { scanned: 0, purged: 0 });
  assert.deepEqual(deleted, []);
});

test('a missing or unparsable timestamp is never purged', async () => {
  const rows: Row[] = [
    { id: 'broken', archivedAt: 'not-a-date' },
    { id: 'expired', archivedAt: expired(20) },
  ];

  const { client, deleted } = buildPagingClient(rows, 500);
  const result = await purgeArchivedDocuments(client, NOW);

  assert.equal(result.scanned, 2);
  assert.equal(result.purged, 1);
  assert.deepEqual(deleted, ['expired']);
});
