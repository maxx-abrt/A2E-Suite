import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  readDocumentParentChange,
  readDocumentParentId,
  repairDocumentParentCycle,
  type DocumentParentEventProperties,
  type DocumentParentRecord,
} from '../lib/document-cycle.ts';

// The server-side cycle guard behind the browser's own refusal. Any API client
// can move a document, so the check also runs here. A database event fires
// after the committed write, so the handler cannot reject the row — it
// restores the previous parent, or detaches to the root when there is none.

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: DocumentParentEventProperties;
  }>,
) => {
  const recordId = payload.recordId;

  if (recordId === undefined) {
    return { skipped: 'no-record' };
  }

  const { parentDocumentId, previousParentDocumentId } =
    readDocumentParentChange(payload.properties);

  if (parentDocumentId === null) {
    return { skipped: 'root' };
  }

  const client = new CoreApiClient();

  return repairDocumentParentCycle({
    documentId: recordId,
    parentDocumentId,
    previousParentDocumentId,
    loadParentDocumentId: async (documentId) => {
      const result = (await client.query({
        documents: {
          __args: { filter: { id: { eq: documentId } }, first: 1 },
          edges: { node: { id: true, parent: { id: true } } },
        },
      } as never)) as {
        documents?: { edges?: { node: DocumentParentRecord }[] };
      };

      return readDocumentParentId(result?.documents?.edges?.[0]?.node);
    },
    updateParentDocumentId: async ({
      documentId,
      parentDocumentId: repairedParentDocumentId,
    }) => {
      await client.mutation({
        updateDocument: {
          __args: {
            id: documentId,
            data: { parentId: repairedParentDocumentId },
          },
          id: true,
        },
      } as never);
    },
  });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.guardDocumentParentCycle,
  name: 'guard-document-parent-cycle',
  description:
    'Restaure le parent précédent (ou la racine) lorsqu’un déplacement placerait un document sous l’un de ses descendants.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'document.updated',
    updatedFields: ['parent', 'parentId', 'parentDocumentId'],
  },
  handler,
});
