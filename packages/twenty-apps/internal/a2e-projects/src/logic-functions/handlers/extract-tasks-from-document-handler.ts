import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  extractTaskProposals,
  type ExtractTasksFromDocumentProposedTask,
} from '../../lib/document-task-extraction.ts';

export type { ExtractTasksFromDocumentProposedTask };

// LECTURE SEULE, SOUS L'AUTORISATION DE L'APPELANT.
//
// The tool reads the document by id through the caller-context Core API client
// (no system-context bypass), exactly like the a2e-chat starter-channels
// handler. A document the caller cannot read comes back as `null` — missing
// and unauthorized are indistinguishable at this boundary, and both fail
// closed to the same typed status rather than leaking existence.
//
// Nothing is written here: the proposals are a draft for review, and creating
// tasks stays a separate confirmed action (C6).

export type ExtractTasksFromDocumentStatus =
  | 'EXTRACTED'
  | 'DOCUMENT_NOT_FOUND'
  | 'INVALID_INPUT';

export type ExtractTasksFromDocumentResult = {
  status: ExtractTasksFromDocumentStatus;
  documentId: string;
  projectId: string | null;
  tasks: ExtractTasksFromDocumentProposedTask[];
};

export type ExtractTasksFromDocumentInput = {
  documentId?: string;
  projectId?: string;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

// The client is injectable so node:test exercises the read without a live Core
// API (the generated client throws before generation).
export type CoreClientLike = Pick<CoreApiClient, 'query'>;

type DocumentRecord = {
  id: string;
  content?: { blocknote?: string | null } | null;
};

const readDocument = async (
  client: CoreClientLike,
  documentId: string,
): Promise<DocumentRecord | undefined> => {
  const result = (await client.query({
    document: {
      __args: { id: documentId },
      id: true,
      content: { blocknote: true },
    },
  } as never)) as { document?: DocumentRecord | null };

  return result?.document ?? undefined;
};

export const extractTasksFromDocument = async (
  input: ExtractTasksFromDocumentInput,
  client: CoreClientLike = coreClient(),
): Promise<ExtractTasksFromDocumentResult> => {
  const documentId =
    typeof input.documentId === 'string' ? input.documentId.trim() : '';
  const projectId = input.projectId ?? null;

  if (documentId === '') {
    return { status: 'INVALID_INPUT', documentId, projectId, tasks: [] };
  }

  const document = await readDocument(client, documentId);

  if (document === undefined) {
    return {
      status: 'DOCUMENT_NOT_FOUND',
      documentId,
      projectId,
      tasks: [],
    };
  }

  return {
    status: 'EXTRACTED',
    documentId,
    projectId,
    tasks: extractTaskProposals(document.content?.blocknote),
  };
};
