import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import {
  AppPath,
  navigate,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import {
  buildRecordNoteCopyPayload,
  readRecordNoteCopyInput,
  type RecordNoteSourceKind,
  type SourceRecordShape,
} from '../lib/record-note-copy.ts';

// ENREGISTRER COMME DOCUMENT (P3.3 task 4).
//
// Record-scoped Cmd+K action: copies the selected record's real note bodies
// into a new root document and links the document back through the app's
// existing company/person relations, so it shows up on the record's Documents
// section. One entry component per object: the front-component sandbox renders
// the component with empty props (see unwrapDefineFrontComponentToDirectExport),
// so the source object has to be closed over at build time, not passed as a
// prop. `Command` runs `execute` on mount then unmounts, so no UI is rendered.

export const createSaveRecordAsDocumentCommand = (
  sourceObjectNameSingular: RecordNoteSourceKind,
) => {
  const SaveRecordAsDocumentCommand = () => {
    const selectedRecordIds = useSelectedRecordIds();

    const execute = async (): Promise<void> => {
      const recordId =
        selectedRecordIds.length === 1 ? selectedRecordIds[0] : null;

      if (recordId === null) {
        return;
      }

      const client = new CoreApiClient();

      // findOne accepts only a `filter` argument (getResolverArgs); a bare `id`
      // argument is rejected before the resolver runs. Person's label is a
      // composite full name, company's is a plain text field.
      const nameSelection =
        sourceObjectNameSingular === 'company'
          ? { name: true }
          : { name: { firstName: true, lastName: true } };

      const result = await client.query({
        [sourceObjectNameSingular]: {
          __args: { filter: { id: { eq: recordId } } },
          id: true,
          ...nameSelection,
          noteTargets: {
            edges: {
              node: {
                note: {
                  id: true,
                  title: true,
                  bodyV2: { blocknote: true, markdown: true },
                },
              },
            },
          },
        },
      } as never);

      const sourceRecord =
        (result as Record<string, SourceRecordShape | null | undefined>)[
          sourceObjectNameSingular
        ] ?? null;

      const { recordName, notes, canReadSourceNotes } =
        readRecordNoteCopyInput(sourceRecord);

      // Fail closed: a null source record means the caller cannot read it, so
      // no document is created. The availability expression already gates the
      // command on record/note/document read rights.
      const payload = buildRecordNoteCopyPayload(
        {
          objectNameSingular: sourceObjectNameSingular,
          recordId,
          recordName,
          notes,
        },
        { canReadSourceRecord: sourceRecord !== null, canReadSourceNotes },
      );

      if (payload === null) {
        return;
      }

      const createdResult = await client.mutation({
        createDocuments: {
          __args: {
            data: [
              {
                title: payload.title,
                position: payload.position,
                content: payload.content,
                ...(payload.companyId !== undefined
                  ? { companyId: payload.companyId }
                  : {}),
                ...(payload.personId !== undefined
                  ? { personId: payload.personId }
                  : {}),
              },
            ],
          },
          id: true,
        },
      } as never);

      const created = (createdResult as { createDocuments?: { id?: string }[] })
        .createDocuments?.[0];

      if (created?.id === undefined) {
        return;
      }

      await navigate(AppPath.RecordShowPage, {
        objectNameSingular: 'document',
        objectRecordId: created.id,
      });
    };

    return <Command execute={execute} />;
  };

  return SaveRecordAsDocumentCommand;
};
