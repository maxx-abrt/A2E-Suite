// Server-side compare-and-set for document saves (P3.2). The browser already
// refuses a save whose expected revision is no longer current, but any API
// client can write `document.content`, so the committed row is re-checked where
// it lands. The app SDK exposes only post-commit database events (no pre-write
// hook), so the handler cannot reject the row it already stored: it restores the
// winning body instead. This is a repair guarantee, not a save/merge protocol —
// there is no OT/CRDT and no new event bus.
//
// The expected revision travels on the write itself:
//   `contentRevision`     — the token identifying the body currently stored
//   `contentBaseRevision` — the token the writer believed was current
// A write is accepted only when its expected token equals the committed token.
// The winning body is the one that was already committed when the stale write
// landed, so two concurrent writers converge on one deterministic winner rather
// than interleaving blocks. The repair writes its own sentinel base so it is
// never itself re-classified as stale (loop termination).

export const FIRST_DOCUMENT_REVISION = 'docrev-first';

export const DOCUMENT_REVISION_REPAIR_PREFIX = 'repair-';

export type DocumentRevisionContent =
  | { blocknote?: string | null; markdown?: string | null }
  | null
  | undefined;

export type DocumentRevisionCasRecord = {
  content?: DocumentRevisionContent;
  contentRevision?: string | null;
  contentBaseRevision?: string | null;
};

export type DocumentRevisionCasEventProperties = {
  before?: DocumentRevisionCasRecord | null;
  after?: DocumentRevisionCasRecord | null;
  updatedFields?: string[];
};

export type DocumentSaveCasResolution =
  | { action: 'none'; reason: 'untracked' | 'accepted' | 'content-unchanged' }
  | {
      action: 'repair';
      winnerBody: string | null;
      winnerRevision: string;
      repairBaseRevision: string;
    };

// A body that no longer reads as text (legacy value, malformed row) is treated
// as null rather than widening into an untyped value the handler would write
// back.
export const readDocumentRevisionBody = (
  content: DocumentRevisionContent,
): string | null => {
  if (content == null) {
    return null;
  }

  return typeof content.blocknote === 'string' ? content.blocknote : null;
};

// Resolves the compare-and-set outcome for one committed document update. The
// `updatedFields` gate keeps a non-content update from triggering a repair; an
// absent base token means a non-editor writer, which stays last-write-wins
// (single-writer guidance) instead of being reverted.
export const resolveDocumentSaveCas = (
  properties: DocumentRevisionCasEventProperties | null | undefined,
): DocumentSaveCasResolution => {
  const updatedFields = properties?.updatedFields;

  if (updatedFields !== undefined && !updatedFields.includes('content')) {
    return { action: 'none', reason: 'content-unchanged' };
  }

  const before = properties?.before ?? null;
  const after = properties?.after ?? null;

  const expectedRevision = after?.contentBaseRevision;

  if (
    typeof expectedRevision !== 'string' ||
    expectedRevision.length === 0 ||
    expectedRevision.startsWith(DOCUMENT_REVISION_REPAIR_PREFIX)
  ) {
    return { action: 'none', reason: 'untracked' };
  }

  const committedRevision = before?.contentRevision ?? FIRST_DOCUMENT_REVISION;

  if (expectedRevision === committedRevision) {
    return { action: 'none', reason: 'accepted' };
  }

  const winnerBody = readDocumentRevisionBody(before?.content);
  const staleBody = readDocumentRevisionBody(after?.content);

  if (winnerBody === staleBody) {
    return { action: 'none', reason: 'content-unchanged' };
  }

  return {
    action: 'repair',
    winnerBody,
    winnerRevision: committedRevision,
    repairBaseRevision: `${DOCUMENT_REVISION_REPAIR_PREFIX}${
      after?.contentRevision ?? committedRevision
    }`,
  };
};
