import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';

import { buildAppendPosition } from '../lib/fractional-position.ts';

// CRÉER UN DOCUMENT (P3.3 task 3).
//
// Cmd+K action: creates a root document with the typed title and opens its
// record page. `Command` runs `execute` on mount then unmounts the
// front component, so no UI is rendered.

export const CREATE_DOCUMENT_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000003';

type CreateDocumentCommandParams = {
  title?: string;
};

const CreateDocumentCommand = ({
  title,
}: CreateDocumentCommandParams = {}) => {
  const execute = async (): Promise<void> => {
    const client = new CoreApiClient();

    const result = await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: title ?? 'Nouveau document',
              position: buildAppendPosition(undefined),
            },
          ],
        },
        id: true,
      },
    } as never);

    const created = (
      result as {
        createDocuments?: { id?: string }[];
      }
    ).createDocuments?.[0];

    if (created?.id === undefined) {
      return;
    }

    await navigate(AppPath.RecordShowPage, {
      objectNameSingular: 'documents',
      objectRecordId: created.id,
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier:
    CREATE_DOCUMENT_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'create-document-command',
  description: 'Crée un document et ouvre sa page.',
  component: CreateDocumentCommand,
});
