import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';

import {
  COMMAND_MENU_ITEM_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// CRÉER UN PROJET (P4.2 Cmd+K task, minimal create command shipped with the
// object so the app meets the "Create <thing>" anatomy rule).
//
// Bean counters: `Command` runs `execute` on mount then unmounts, mirroring
// a2e-documents' create-document-command.
export const CREATE_PROJECT_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000004';

type CreateProjectCommandParams = {
  name?: string;
};

const CreateProjectCommand = ({
  name,
}: CreateProjectCommandParams = {}) => {
  const execute = async (): Promise<void> => {
    const client = new CoreApiClient();

    const result = (await client.mutation({
      createProjects: {
        __args: {
          data: [
            {
              name: name ?? 'Nouveau projet',
              status: 'PLANNING',
            },
          ],
        },
        id: true,
      },
    } as never)) as { createProjects?: { id?: string }[] };

    const created = result.createProjects?.[0];

    if (created?.id === undefined) {
      return;
    }

    await navigate(AppPath.RecordShowPage, {
      objectNameSingular: 'project',
      objectRecordId: created.id,
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier:
    CREATE_PROJECT_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'create-project-command',
  description: 'Crée un projet et ouvre sa page.',
  component: CreateProjectCommand,
});

export { COMMAND_MENU_ITEM_IDS, OBJECT_IDS };
