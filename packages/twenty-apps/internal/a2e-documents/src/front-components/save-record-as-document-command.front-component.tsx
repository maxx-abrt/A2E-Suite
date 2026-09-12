import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  navigate,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { buildAppendPosition } from '../lib/fractional-position.ts';

// ENREGISTRER COMME DOCUMENT (P3.3 task 4).
//
// Record-scoped Cmd+K action (RECORD_SELECTION availability): snapshots the
// selected record's label into a new root document and links the document
// back to the source record through the app's existing company/person
// relations, so the document shows up on the record's Documents section.
// `Command` runs `execute` on mount then unmounts, so no UI is rendered.

export const SAVE_RECORD_AS_DOCUMENT_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000004';

// Which relation field to set on the created document, per source object.
const RELATION_FIELD_BY_OBJECT_NAME = {
  company: 'companyId',
  person: 'personId',
} as const;

type SaveRecordAsDocumentCommandParams = {
  sourceObjectNameSingular: 'company' | 'person';
};

const SaveRecordAsDocumentCommand = ({
  sourceObjectNameSingular,
}: SaveRecordAsDocumentCommandParams) => {
  const selectedRecordIds = useSelectedRecordIds();

  const execute = async (): Promise<void> => {
    const recordId =
      selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

    if (recordId === null) {
      return;
    }

    const client = new CoreApiClient();

    // Read the label identifier field of the source record to title the doc.
    const sourceResult = await client.query({
      [sourceObjectNameSingular]: {
        __args: { id: recordId },
        id: true,
        name: true,
      },
    } as never);

    const sourceRecord = (
      sourceResult as Record<
        string,
        { id: string; name?: string | null } | undefined
      >
    )[sourceObjectNameSingular];

    const relationField = RELATION_FIELD_BY_OBJECT_NAME[
      sourceObjectNameSingular
    ] as string;

    const result = await client.mutation({
      createDocuments: {
        __args: {
          data: [
            {
              title: sourceRecord?.name ?? 'Document',
              position: buildAppendPosition(undefined),
              ...(relationField !== '' ? { [relationField]: recordId } : {}),
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
    SAVE_RECORD_AS_DOCUMENT_COMMAND_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'save-record-as-document-command',
  description:
    'Crée un document lié à la fiche courante (entreprise ou personne) et ouvre sa page.',
  component: SaveRecordAsDocumentCommand,
});
