import { CoreApiClient } from 'twenty-client-sdk/core';

import { DOCUMENT_KIND } from '../../constants/field-vocabulary.ts';

// LECTURE SEULE, SOUS L'AUTORISATION DE L'APPELANT.
//
// The enabler for the assistant's summarize / translate / improve-writing
// actions: one caller-scoped read of a document's blocknote body plus its
// title, kind and last-update time. The LLM transformation happens in the
// assistant; this handler is only the permission-checked data path.
//
// The read runs through the caller-context Core API client (no system-context
// bypass), exactly like the a2e-projects extract-tasks and a2e-chat
// starter-channels handlers. A document the caller cannot read comes back as
// `null` — missing and unauthorized are indistinguishable at this boundary,
// and both fail closed to the same typed status rather than leaking existence
// (C5 stable-record-links: never another tenant's content).
//
// Nothing is written here: applying an improved text is a separate confirmed
// mutation and is deliberately not part of this tool (C6: draft + confirm).

export type DocumentContentStatus =
  | 'READ'
  | 'DOCUMENT_NOT_FOUND'
  | 'INVALID_INPUT';

export type DocumentKind = 'DOCUMENT' | 'TEMPLATE';

export type DocumentContentMetadata = {
  id: string;
  title: string;
  kind: DocumentKind;
  updatedAt: string | null;
};

export type DocumentContentResult = {
  status: DocumentContentStatus;
  documentId: string;
  includeMetadata: boolean;
  blocknote: string | null;
  metadata: DocumentContentMetadata | null;
};

export type DocumentContentInput = {
  documentId?: string;
  includeMetadata?: boolean;
};

export const coreClient = (): CoreApiClient => new CoreApiClient();

// The client is injectable so node:test exercises the read without a live Core
// API (the generated client throws before generation).
export type CoreClientLike = Pick<CoreApiClient, 'query'>;

type DocumentRecord = {
  id: string;
  title?: string | null;
  kind?: string | null;
  updatedAt?: string | null;
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
      title: true,
      kind: true,
      updatedAt: true,
      content: { blocknote: true },
    },
  } as never)) as { document?: DocumentRecord | null };

  return result?.document ?? undefined;
};

// An absent or unknown kind is treated as a regular DOCUMENT: the tool must
// never widen exposure of a template body just because the value is unexpected.
const normalizeKind = (kind: string | null | undefined): DocumentKind =>
  kind === DOCUMENT_KIND.TEMPLATE ? 'TEMPLATE' : 'DOCUMENT';

export const readDocumentContent = async (
  input: DocumentContentInput,
  client: CoreClientLike = coreClient(),
): Promise<DocumentContentResult> => {
  const documentId =
    typeof input.documentId === 'string' ? input.documentId.trim() : '';

  const invalid = (): DocumentContentResult => ({
    status: 'INVALID_INPUT',
    documentId,
    includeMetadata: true,
    blocknote: null,
    metadata: null,
  });

  if (documentId === '') {
    return invalid();
  }

  // A provided-but-non-boolean flag is a caller mistake, not "default true":
  // refuse it rather than silently reading the metadata it asked to omit.
  const rawIncludeMetadata = input.includeMetadata;

  if (
    rawIncludeMetadata !== undefined &&
    rawIncludeMetadata !== null &&
    typeof rawIncludeMetadata !== 'boolean'
  ) {
    return invalid();
  }

  const includeMetadata = rawIncludeMetadata !== false;

  const document = await readDocument(client, documentId);

  if (document === undefined) {
    return {
      status: 'DOCUMENT_NOT_FOUND',
      documentId,
      includeMetadata,
      blocknote: null,
      metadata: null,
    };
  }

  return {
    status: 'READ',
    documentId,
    includeMetadata,
    blocknote: document.content?.blocknote ?? null,
    metadata: includeMetadata
      ? {
          id: document.id,
          title: document.title ?? '',
          kind: normalizeKind(document.kind),
          updatedAt: document.updatedAt ?? null,
        }
      : null,
  };
};
