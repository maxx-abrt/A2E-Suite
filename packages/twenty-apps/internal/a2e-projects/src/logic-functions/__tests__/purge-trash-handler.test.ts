import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TRASH_OBJECT_TARGETS,
  purgeExpiredTrash,
} from '../handlers/purge-trash-handler.ts';

// Le contrat avec le Core API : la requête d'un objet rend ses lignes encore
// archivées (`archivedAt: NOT_NULL`), et la mutation générée de l'objet
// supprime une ligne par id. Le stub n'instancie jamais le client généré
// (il lève avant génération) et reproduit exactement cette frontière.

const NOW = Date.parse('2026-09-17T12:00:00.000Z');

type Row = { id: string; archivedAt?: string | null };

const buildClient = (rowsByObject: Record<string, Row[]>) => {
  const queries: { queryKey: string; args: unknown }[] = [];
  const deleted: Record<string, string[]> = {};

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const queryKey = Object.keys(selection)[0];
      const entry = selection[queryKey] as { __args: unknown };

      queries.push({ queryKey, args: entry.__args });

      return {
        [queryKey]: {
          edges: (rowsByObject[queryKey] ?? []).map((row) => ({ node: row })),
        },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const deleteMutation = Object.keys(selection)[0];
      const entry = selection[deleteMutation] as { __args: { id: string } };

      deleted[deleteMutation] = [
        ...(deleted[deleteMutation] ?? []),
        entry.__args.id,
      ];

      return { [deleteMutation]: { id: entry.__args.id } };
    },
  };

  return { client, queries, deleted };
};

test('only rows past the 7-day window are purged, per object', async () => {
  const { client, deleted } = buildClient({
    projects: [
      { id: 'p-expired', archivedAt: '2026-09-01T00:00:00.000Z' },
      { id: 'p-recent', archivedAt: '2026-09-17T00:00:00.000Z' },
      { id: 'p-live', archivedAt: null },
    ],
    milestones: [{ id: 'm-expired', archivedAt: '2026-09-05T00:00:00.000Z' }],
    timeEntries: [],
    labels: [{ id: 'l-recent', archivedAt: '2026-09-16T00:00:00.000Z' }],
  });

  const result = await purgeExpiredTrash(client, NOW);

  assert.equal(result.purged, 2);
  assert.deepEqual(result.purgedByObject, {
    projects: 1,
    milestones: 1,
    timeEntries: 0,
    labels: 0,
  });
  assert.deepEqual(deleted.deleteProjects, ['p-expired']);
  assert.deepEqual(deleted.deleteMilestones, ['m-expired']);
  assert.deepEqual(deleted.deleteTimeEntries, undefined);
  assert.deepEqual(deleted.deleteLabels, undefined);
});

test('a missing or unparsable timestamp is never purged', async () => {
  const { client, deleted } = buildClient({
    projects: [{ id: 'p-broken', archivedAt: 'not-a-date' }],
    milestones: [{ id: 'm-missing' }],
    timeEntries: [],
    labels: [],
  });

  const result = await purgeExpiredTrash(client, NOW);

  assert.equal(result.purged, 0);
  assert.deepEqual(deleted, {});
});

test('an empty corbeille issues no delete mutation', async () => {
  const { client, deleted } = buildClient({});

  const result = await purgeExpiredTrash(client, NOW);

  assert.deepEqual(result, {
    purged: 0,
    purgedByObject: {
      projects: 0,
      milestones: 0,
      timeEntries: 0,
      labels: 0,
    },
  });
  assert.deepEqual(deleted, {});
});

test('each owned object is queried with the NOT_NULL archive filter', async () => {
  const { client, queries } = buildClient({});

  await purgeExpiredTrash(client, NOW);

  assert.deepEqual(
    queries.map((query) => query.queryKey),
    TRASH_OBJECT_TARGETS.map((target) => target.queryKey),
  );

  for (const query of queries) {
    assert.deepEqual(query.args, {
      filter: { archivedAt: { is: 'NOT_NULL' } },
      first: 500,
    });
  }
});
