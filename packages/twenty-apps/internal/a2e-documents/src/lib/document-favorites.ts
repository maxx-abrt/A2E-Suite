// Personal document favorites (P3.3 audit).
//
// The legacy `document.isFavorite` boolean is a field on the shared record, so
// it is workspace-shared. These helpers model the additive per-user semantics:
// a favorite belongs to exactly one member (the acting user id the front
// component reads from `useUserId()`), and every read is filtered on it so no
// member can observe another's stars. Kept pure so the browser only wires
// state and Core API calls.

export type DocumentFavoriteRecord = {
  id: string;
  userId: string;
  documentId: string;
};

// The query returns the document relation nested (`document: { id }`) rather
// than the join column, matching the tree query convention.
export type DocumentFavoriteQueryNode = {
  id: string;
  userId?: string | null;
  document?: { id?: string | null } | null;
};

export type DocumentFavoriteCreateData = {
  favoriteKey: string;
  userId: string;
  documentId: string;
};

export type DocumentFavoriteToggle =
  | { action: 'create'; data: DocumentFavoriteCreateData }
  | { action: 'delete'; favoriteId: string }
  | { action: 'none' };

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value !== '';

// Deterministic and unique: one living favorite per member and per document,
// which makes a duplicate create impossible to commit.
export const buildDocumentFavoriteKey = (
  userId: string,
  documentId: string,
): string => `${userId}:${documentId}`;

export const buildDocumentFavoriteFilter = (
  userId: string,
): { userId: { eq: string } } => ({ userId: { eq: userId } });

export const mapDocumentFavoriteRecords = (
  nodes: DocumentFavoriteQueryNode[],
): DocumentFavoriteRecord[] => {
  const records: DocumentFavoriteRecord[] = [];

  for (const node of nodes) {
    const documentId = node.document?.id;

    if (!hasText(node.userId) || !hasText(documentId)) {
      continue;
    }

    records.push({ id: node.id, userId: node.userId, documentId });
  }

  return records;
};

export const collectFavoriteDocumentIds = (
  favorites: DocumentFavoriteRecord[],
  userId: string | null | undefined,
): Set<string> => {
  if (!hasText(userId)) {
    return new Set();
  }

  return new Set(
    favorites
      .filter((favorite) => favorite.userId === userId)
      .map((favorite) => favorite.documentId),
  );
};

export const findDocumentFavorite = (
  favorites: DocumentFavoriteRecord[],
  userId: string | null | undefined,
  documentId: string,
): DocumentFavoriteRecord | undefined => {
  if (!hasText(userId)) {
    return undefined;
  }

  return favorites.find(
    (favorite) =>
      favorite.userId === userId && favorite.documentId === documentId,
  );
};

// An existing row for this member is removed; a missing one is created. An
// anonymous session (no user id) never writes.
export const buildDocumentFavoriteToggle = (options: {
  favorites: DocumentFavoriteRecord[];
  userId: string | null | undefined;
  documentId: string;
}): DocumentFavoriteToggle => {
  if (!hasText(options.userId)) {
    return { action: 'none' };
  }

  const existing = findDocumentFavorite(
    options.favorites,
    options.userId,
    options.documentId,
  );

  if (existing !== undefined) {
    return { action: 'delete', favoriteId: existing.id };
  }

  return {
    action: 'create',
    data: {
      favoriteKey: buildDocumentFavoriteKey(options.userId, options.documentId),
      userId: options.userId,
      documentId: options.documentId,
    },
  };
};
