import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  resolveDocumentSaveCas,
  type DocumentRevisionCasRecord,
} from '../lib/document-revision-cas.ts';

// The server-side expected-revision guard behind the browser's own save-time
// check. Any API client can write `document.content`, so the committed row is
// re-checked here. A database event fires after the committed write, so the
// handler cannot reject the row — it restores the winning body when the write
// carried an expected revision that was no longer current. This is post-commit
// repair: no save/merge protocol, no OT/CRDT and no new event bus. A writer
// without the token stays last-write-wins (see single-writer guidance).

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: {
      before?: DocumentRevisionCasRecord | null;
      after?: DocumentRevisionCasRecord | null;
      updatedFields?: string[];
    };
  }>,
) => {
  const recordId = payload.recordId;

  if (recordId === undefined) {
    return { skipped: 'no-record' };
  }

  const resolution = resolveDocumentSaveCas(payload.properties);

  if (resolution.action !== 'repair') {
    return { skipped: resolution.reason };
  }

  const client = new CoreApiClient();

  await client.mutation({
    updateDocument: {
      __args: {
        id: recordId,
        data: {
          content:
            resolution.winnerBody === null
              ? null
              : { blocknote: resolution.winnerBody, markdown: null },
          contentRevision: resolution.winnerRevision,
          contentBaseRevision: resolution.repairBaseRevision,
        },
      },
      id: true,
    },
  } as never);

  return {
    repaired: true,
    winnerRevision: resolution.winnerRevision,
  };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.guardDocumentRevisionSave,
  name: 'guard-document-revision-save',
  description:
    'Restaure le contenu gagnant lorsqu’un enregistrement arrive avec une révision attendue obsolète, pour qu’un enregistrement périmé n’écrase jamais silencieusement la version courante.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'document.updated',
    updatedFields: ['content'],
  },
  handler,
});
