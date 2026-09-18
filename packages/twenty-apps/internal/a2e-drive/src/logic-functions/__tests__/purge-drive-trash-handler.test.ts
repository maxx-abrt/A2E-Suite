import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TRASH_OBJECT_TARGETS,
  purgeDriveExpiredTrash,
  type CoreClientLike,
} from '../handlers/purge-drive-trash-handler.ts';

const NOW = Date.parse('2026-09-17T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const expired = new Date(NOW - 8 * DAY_MS).toISOString();
const insideWindow = new Date(NOW - DAY_MS).toISOString();

type RecordedMutation = { mutation: string; id: string };

const buildClient = (
  recordsByObject: Record<string, { id: string; archivedAt: string }[]>,
): { client: CoreClientLike; mutations: RecordedMutation[] } => {
  const mutations: RecordedMutation[] = [];

  const client: CoreClientLike = {
    query: (async (document: Record<string, unknown>) => {
      const queryKey = Object.keys(document)[0];

      return {
        [queryKey]: {
          edges: (recordsByObject[queryKey] ?? []).map((node) => ({ node })),
        },
      };
    }) as CoreClientLike['query'],
    mutation: (async (document: Record<string, Record<string, unknown>>) => {
      const mutation = Object.keys(document)[0];
      const args = document[mutation]?.__args as
        | { filter?: { id?: { eq?: string } } }
        | undefined;

      mutations.push({ mutation, id: args?.filter?.id?.eq ?? '' });

      return {};
    }) as CoreClientLike['mutation'],
  };

  return { client, mutations };
};

test('only records past the 7-day window are purged', async () => {
  const { client, mutations } = buildClient({
    driveFolders: [
      { id: 'folder-expired', archivedAt: expired },
      { id: 'folder-live', archivedAt: insideWindow },
    ],
    attachments: [
      { id: 'file-expired', archivedAt: expired },
      { id: 'file-live', archivedAt: insideWindow },
    ],
  });

  const result = await purgeDriveExpiredTrash(client, NOW);

  assert.deepEqual(result, {
    purged: 2,
    purgedByObject: { driveFolders: 1, attachments: 1 },
  });
  assert.deepEqual(mutations.map((entry) => entry.id).sort(), [
    'file-expired',
    'folder-expired',
  ]);
});

test('each target uses its own generated plural delete mutation', async () => {
  const { client, mutations } = buildClient({
    driveFolders: [{ id: 'folder-expired', archivedAt: expired }],
    attachments: [{ id: 'file-expired', archivedAt: expired }],
  });

  await purgeDriveExpiredTrash(client, NOW);

  const mutationNames = mutations.map((entry) => entry.mutation).sort();

  assert.deepEqual(mutationNames, ['deleteAttachments', 'deleteDriveFolders']);
});

test('an empty corbeille purges nothing', async () => {
  const { client, mutations } = buildClient({});

  const result = await purgeDriveExpiredTrash(client, NOW);

  assert.deepEqual(result, {
    purged: 0,
    purgedByObject: { driveFolders: 0, attachments: 0 },
  });
  assert.equal(mutations.length, 0);
});

test('the purge covers both the folder and the file target', () => {
  assert.deepEqual(
    TRASH_OBJECT_TARGETS.map((target) => target.queryKey),
    ['driveFolders', 'attachments'],
  );
});
