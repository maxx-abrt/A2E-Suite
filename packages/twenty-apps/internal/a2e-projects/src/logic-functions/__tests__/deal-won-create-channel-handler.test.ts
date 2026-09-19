import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createDealWonChannel,
  type DealWonCreateChannelInput,
} from '../handlers/deal-won-create-channel-handler.ts';
import { deriveDealWonChannelCorrelationKey } from '../../lib/deal-won-recipe.ts';

// The channel step runs against a stub Core API and an injectable install check,
// so chat-present and chat-absent both stay offline-testable. The relation
// `projectId` is the idempotency anchor: the project already carries the C5
// correlation key, so a channel already linked to it is not created again.

type ChannelRow = { id: string; projectId: string };

type CreatedChannel = {
  name: string;
  kind: string;
  visibility: string;
  topic: string;
  projectId: string;
};

const buildClient = (initialChannels: ChannelRow[]) => {
  const channels = [...initialChannels];
  const created: CreatedChannel[] = [];
  const queries: string[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.chatChannels as {
        __args: { filter: { projectId: { eq: string } } };
      };

      queries.push(entry.__args.filter.projectId.eq);

      const match = channels.find(
        (channel) => channel.projectId === entry.__args.filter.projectId.eq,
      );

      return {
        chatChannels: { edges: match ? [{ node: { id: match.id } }] : [] },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const entry = selection.createChatChannels as {
        __args: { data: CreatedChannel[] };
      };
      const data = entry.__args.data[0];

      created.push(data);
      channels.push({ ...data, id: `created-${created.length}` });

      return { createChatChannels: [{ id: `created-${created.length}` }] };
    },
  };

  return { client, channels, created, queries };
};

const chatInstalled = async () => true;
const chatAbsent = async () => false;

const input = (
  overrides: Partial<DealWonCreateChannelInput> = {},
): DealWonCreateChannelInput => ({
  projectId: 'project-1',
  projectName: 'Refonte du site',
  correlationKey: 'deal-won@v1:workspace-1:opportunity:opportunity-1',
  ...overrides,
});

const projectCorrelationKey =
  'deal-won@v1:workspace-1:opportunity:opportunity-1';

test('with chat installed the channel is created and linked to the project', async () => {
  const { client, created, queries } = buildClient([]);

  const result = await createDealWonChannel(input(), client, chatInstalled);

  assert.deepEqual(result, {
    status: 'CREATED',
    channelId: 'created-1',
    correlationKey: deriveDealWonChannelCorrelationKey(projectCorrelationKey),
  });
  assert.deepEqual(created, [
    {
      name: 'Canal – Refonte du site',
      kind: 'PROJECT',
      visibility: 'PUBLIC',
      topic: 'Suivi du projet Refonte du site',
      projectId: 'project-1',
    },
  ]);
  assert.deepEqual(queries, ['project-1']);
});

test('with chat absent the step is skipped with an explicit reason', async () => {
  const { client, created, queries } = buildClient([]);

  const result = await createDealWonChannel(input(), client, chatAbsent);

  assert.deepEqual(result, {
    status: 'SKIPPED',
    channelId: null,
    correlationKey: deriveDealWonChannelCorrelationKey(projectCorrelationKey),
    skipReason: 'CHAT_NOT_INSTALLED',
  });
  assert.deepEqual(queries, []);
  assert.deepEqual(created, []);
});

test('replaying the channel step does not duplicate the channel', async () => {
  const { client, channels, created } = buildClient([]);

  await createDealWonChannel(input(), client, chatInstalled);
  const replay = await createDealWonChannel(input(), client, chatInstalled);

  assert.equal(replay.status, 'ALREADY_EXISTS');
  assert.equal(replay.channelId, 'created-1');
  assert.equal(channels.length, 1);
  assert.equal(created.length, 1);
});

test('a blank project id is refused before any install check or write', async () => {
  const { client, created, queries } = buildClient([]);
  let installChecks = 0;
  const countingInstallCheck = async () => {
    installChecks += 1;

    return true;
  };

  const result = await createDealWonChannel(
    input({ projectId: '   ' }),
    client,
    countingInstallCheck,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(installChecks, 0);
  assert.deepEqual(queries, []);
  assert.deepEqual(created, []);
});

test('a missing correlation key still creates the channel, keyed by relation', async () => {
  const { client, created } = buildClient([]);

  const result = await createDealWonChannel(
    input({ correlationKey: null }),
    client,
    chatInstalled,
  );

  assert.equal(result.status, 'CREATED');
  assert.equal(result.correlationKey, null);
  assert.equal(created[0]?.projectId, 'project-1');
});
