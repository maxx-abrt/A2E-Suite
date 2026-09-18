import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_STARTER_CHANNELS } from '../../lib/starter-channels.ts';
import { syncStarterChannels } from '../handlers/starter-channels-handler.ts';

// Contrat avec le Core API : la requête chatChannels rend les noms existants,
// la mutation générée createChatChannels crée une ligne. Le stub n'instancie
// jamais le client généré (il lève avant génération).

const buildClient = (existingNames: string[]) => {
  const queries: unknown[] = [];
  const created: Record<string, unknown>[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const queryKey = Object.keys(selection)[0];
      const entry = selection[queryKey] as { __args: unknown };

      queries.push({ queryKey, args: entry.__args });

      return {
        [queryKey]: {
          edges: existingNames.map((name) => ({ node: { name } })),
        },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const mutationKey = Object.keys(selection)[0];
      const entry = selection[mutationKey] as {
        __args: { data: Record<string, unknown>[] };
      };

      created.push(...entry.__args.data);

      return { [mutationKey]: { id: `created-${created.length}` } };
    },
  };

  return { client, queries, created };
};

test('an empty workspace receives every starter channel', async () => {
  const { client, created } = buildClient([]);

  const result = await syncStarterChannels(client);

  assert.deepEqual(result, { starterChannelsCreated: 2 });
  assert.deepEqual(
    created.map((channel) => channel.name),
    ['Général', 'Annonces'],
  );
  assert.deepEqual(created[0], {
    name: 'Général',
    kind: 'WORKSPACE',
    visibility: 'PUBLIC',
    topic: 'Discussion générale de l’espace de travail',
    postingRoles: ['MEMBER', 'ADMIN'],
  });
});

test('a reinstalled app does not duplicate an existing channel', async () => {
  const { client, created } = buildClient(['Général']);

  const result = await syncStarterChannels(client);

  assert.deepEqual(result, { starterChannelsCreated: 1 });
  assert.deepEqual(
    created.map((channel) => channel.name),
    ['Annonces'],
  );
});

test('name matching is case- and whitespace-insensitive', async () => {
  const { client, created } = buildClient(['  général ', 'ANNONCES']);

  const result = await syncStarterChannels(client);

  assert.deepEqual(result, { starterChannelsCreated: 0 });
  assert.deepEqual(created, []);
});

test('the query asks for existing channel names', async () => {
  const { client, queries } = buildClient([]);

  await syncStarterChannels(client);

  assert.deepEqual(queries, [
    { queryKey: 'chatChannels', args: { first: 100 } },
  ]);
});

test('the starter set is non-empty and uniquely named', () => {
  const names = DEFAULT_STARTER_CHANNELS.map((channel) =>
    channel.name.toLowerCase(),
  );

  assert.ok(DEFAULT_STARTER_CHANNELS.length >= 1);
  assert.equal(new Set(names).size, names.length);
});
