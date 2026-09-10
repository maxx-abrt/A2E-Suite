import { isNonEmptyString } from '@sniptt/guards';

// Remote caret presence for documents rides the workspace presence channel:
// the typingContext field (≤200 chars, already broadcast by the P2 gateway)
// carries a compact pointer instead of a chat sentence.
const DOCUMENT_CURSOR_PREFIX = 'doc';
const DOCUMENT_CURSOR_SEGMENT_COUNT = 3;

export type DocumentCursorContext = {
  documentRecordId: string;
  blockId: string;
};

export const MAX_DOCUMENT_CURSOR_CONTEXT_LENGTH = 200;

// Format: doc:<documentRecordId>:<blockId>. Block ids are blocknote-generated
// uuids; both segments together stay far under the 200-char envelope limit,
// and the length guard keeps a hostile payload from slipping through.
export const buildDocumentCursorContext = ({
  documentRecordId,
  blockId,
}: DocumentCursorContext): string =>
  `${DOCUMENT_CURSOR_PREFIX}:${documentRecordId}:${blockId}`;

export const parseDocumentCursorContext = (
  typingContext: string,
): DocumentCursorContext | null => {
  if (!isNonEmptyString(typingContext)) {
    return null;
  }

  if (typingContext.length > MAX_DOCUMENT_CURSOR_CONTEXT_LENGTH) {
    return null;
  }

  const segments = typingContext.split(':');

  if (segments.length !== DOCUMENT_CURSOR_SEGMENT_COUNT) {
    return null;
  }

  const [prefix, documentRecordId, blockId] = segments;

  if (
    prefix !== DOCUMENT_CURSOR_PREFIX ||
    !isNonEmptyString(documentRecordId) ||
    !isNonEmptyString(blockId)
  ) {
    return null;
  }

  return { documentRecordId, blockId };
};
