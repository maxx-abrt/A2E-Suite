import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';

// CRÉER UN CANAL.
//
// Cmd+K action: creates a workspace-visible channel with the typed name and
// opens its record page. `Command` runs `execute` on mount then unmounts the
// front component, so no UI is rendered.
export const CREATE_CHANNEL_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31c0000-0013-4000-8000-000000000001';

type CreateChannelCommandParams = {
  name?: string;
};

const CreateChannelCommand = ({ name }: CreateChannelCommandParams = {}) => {
  const execute = async (): Promise<void> => {
    const client = new CoreApiClient();

    const result = await client.mutation({
      createChatChannels: {
        __args: {
          data: [
            {
              name: name ?? 'Nouveau canal',
              kind: 'WORKSPACE',
              visibility: 'PUBLIC',
            },
          ],
        },
        id: true,
      },
    } as never);

    const created = (
      result as {
        createChatChannels?: { id?: string }[];
      }
    ).createChatChannels?.[0];

    if (created?.id === undefined) {
      return;
    }

    await navigate(AppPath.RecordShowPage, {
      objectNameSingular: 'chatChannel',
      objectRecordId: created.id,
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier:
    CREATE_CHANNEL_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'create-channel-command',
  description: 'Crée un canal de discussion et ouvre sa page.',
  component: CreateChannelCommand,
});
