import type { CoreApiClient } from 'twenty-client-sdk/core';

import { buildSaveAsTemplatePayload } from './save-document-as-template.ts';

// M9b record-action mount (US-137): promote the document the user is looking at
// to a workspace template, one click from the record surface.
//
// The write path every record action shares: read the selected source, run the
// US-119 payload builder, persist a FRESH template row. The template is a copy,
// never the source row, so editing the source (or a later instance) can never
// write back to it (C1). Client-injected so the node unit runner can exercise
// the path without a live workspace; the front component supplies CoreApiClient.

export type SaveDocumentTemplateClient = Pick<CoreApiClient, 'query' | 'mutation'>;

export type SourceDocumentRecord = {
  title: string;
  content?: {
    blocknote?: string | null;
    markdown?: string | null;
  } | null;
};

type SourceDocumentQueryResult = {
  document?: SourceDocumentRecord | null;
};

export const saveDocumentAsTemplate = async (
  client: SaveDocumentTemplateClient,
  documentId: string,
  options: { position?: string } = {},
): Promise<string | null> => {
  const result = (await client.query({
    document: {
      __args: { filter: { id: { eq: documentId } } },
      title: true,
      content: { blocknote: true, markdown: true },
    },
  } as never)) as SourceDocumentQueryResult;

  const sourceDocument = result?.document ?? null;

  // Fail closed: an unreadable source creates no template (the availability
  // gate already hides the action, but the query is the real check).
  if (sourceDocument === null) {
    return null;
  }

  const payload = buildSaveAsTemplatePayload(sourceDocument, options);

  const created = (await client.mutation({
    createDocuments: {
      __args: {
        data: [
          {
            title: payload.title,
            kind: payload.kind,
            position: payload.position,
            content: payload.content,
          },
        ],
      },
      id: true,
    },
  } as never)) as { createDocuments?: { id?: string }[] };

  return created?.createDocuments?.[0]?.id ?? null;
};
