import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';

import { FRONT_COMPONENT_IDS } from '../constants/universal-identifiers.ts';

// CRÉER UNE TÂCHE (P4.2 Cmd+K: create task, minimal create command so the app
// meets the "Create <thing>" anatomy rule for tasks).
//
// `Command` runs `execute` on mount then unmounts, mirroring
// a2e-documents' create-document-command. The standard task object owns
// status/position defaults, so only the title is written.
const CreateTaskCommand = ({ title }: { title?: string } = {}) => {
  const execute = async (): Promise<void> => {
    const client = new CoreApiClient();

    const result = (await client.mutation({
      createTasks: {
        __args: {
          data: [{ title: title ?? 'Nouvelle tâche' }],
        },
        id: true,
      },
    } as never)) as { createTasks?: { id?: string }[] };

    const created = result.createTasks?.[0];

    if (created?.id === undefined) {
      return;
    }

    await navigate(AppPath.RecordShowPage, {
      objectNameSingular: 'task',
      objectRecordId: created.id,
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: FRONT_COMPONENT_IDS.createTaskCommand,
  name: 'create-task-command',
  description: 'Crée une tâche et ouvre sa page.',
  component: CreateTaskCommand,
});
