import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  findMissingStarterChannels,
  type StarterChannelTemplate,
} from '../../lib/starter-channels.ts';

// Le client est injectable pour que node:test exerce le seeding sans Core API
// live (le client généré lève avant génération).
export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

export const coreClient = (): CoreApiClient => new CoreApiClient();

export const findExistingChannelNames = async (
  client: CoreClientLike,
): Promise<string[]> => {
  const result = (await client.query({
    chatChannels: {
      __args: { first: 100 },
      edges: { node: { name: true } },
    },
  } as never)) as {
    chatChannels?: { edges: { node: { name?: string | null } }[] };
  };

  return (result?.chatChannels?.edges ?? [])
    .map((edge) => edge.node.name)
    .filter((name): name is string => typeof name === 'string');
};

export const createStarterChannel = async (
  client: CoreClientLike,
  channel: StarterChannelTemplate,
): Promise<string | undefined> => {
  const result = (await client.mutation({
    createChatChannels: {
      __args: {
        data: [
          {
            name: channel.name,
            kind: channel.kind,
            visibility: channel.visibility,
            topic: channel.topic,
            postingRoles: channel.postingRoles,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createChatChannels?: { id: string }[] };

  return result?.createChatChannels?.[0]?.id;
};

// Idempotent by name: an existing channel (renamed or not) is left untouched,
// so a reinstall never duplicates or resets a member's channels.
export const syncStarterChannels = async (
  client: CoreClientLike = coreClient(),
): Promise<{ starterChannelsCreated: number }> => {
  const existingNames = await findExistingChannelNames(client);
  const missingChannels = findMissingStarterChannels(existingNames);

  for (const channel of missingChannels) {
    await createStarterChannel(client, channel);
  }

  return { starterChannelsCreated: missingChannels.length };
};
