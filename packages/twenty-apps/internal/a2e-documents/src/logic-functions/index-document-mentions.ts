import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  readDocumentRevisionBody,
  type DocumentRevisionCasRecord,
} from '../lib/document-revision-cas.ts';
import { syncDocumentMentions } from '../lib/document-mentions.ts';

// M8d mention index writer (US-139).
//
// The app SDK exposes only post-commit database events, so the index is
// reconciled here rather than in a pre-write hook: any write that changes
// `document.content` fires this, the stored body's mention nodes are extracted
// once, and the document's index rows are diffed against them. The three logic
// functions bound to `document.updated` (this one, guard-document-parent-cycle,
// guard-document-revision-save) are independent subscriptions; this one never
// reads or writes the body beyond indexing its mentions.

type MentionIndexEventPayload = DatabaseEventPayload<{
  recordId: string;
  properties: {
    before?: DocumentRevisionCasRecord | null;
    after?: DocumentRevisionCasRecord | null;
    updatedFields?: string[];
  };
}>;

const handler = async (payload: MentionIndexEventPayload) => {
  const recordId = payload.recordId;
  const properties = payload.properties;
  const updatedFields = properties?.updatedFields;

  if (recordId === undefined) {
    return { skipped: 'no-record' };
  }

  // Defensive: a non-content update must never wipe the index. The trigger
  // already filters, but an event without content would otherwise diff the
  // document against an empty body and delete every row.
  if (updatedFields !== undefined && !updatedFields.includes('content')) {
    return { skipped: 'content-unchanged' };
  }

  const after = properties?.after;

  if (after === undefined || after === null) {
    return { skipped: 'no-after' };
  }

  const client = new CoreApiClient();
  const result = await syncDocumentMentions(
    client,
    recordId,
    readDocumentRevisionBody(after.content),
  );

  return { indexed: result };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.indexDocumentMentions,
  name: 'index-document-mentions',
  description:
    'Indexe les mentions enregistrées dans le corps d’un document à chaque enregistrement, pour que la section « Mentionné dans » lise l’index sans parcourir le contenu.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'document.updated',
    updatedFields: ['content'],
  },
  handler,
});
