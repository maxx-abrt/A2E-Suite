import type { CoreApiClient } from 'twenty-client-sdk/core';

// M8d save-time mention index (US-139).
//
// `MentionInlineContent` persists the mention nodes inside the blocknote body.
// This module owns the two halves of the index that the save pipeline and the
// "Mentioned in" surface share:
//
//   extract + diff + sync  — the WRITER, run once per document save.
//   listMentionedInDocuments — the READER, run per record-page view.
//
// The reader query selects `documentMentions` plus the source document's
// metadata only (id, title, archivedAt). It never selects `content`, so a read
// can never degrade into a content scan — the body was already distilled at
// save time. Kept client-injected so the node unit runner can exercise both
// paths without a live workspace.

export const MENTION_INLINE_CONTENT_TYPE = 'mention';

// A single document's outgoing mentions: an upper bound, not a paging loop.
export const MENTION_INDEX_PAGE_SIZE = 500;

// A record's incoming backlinks: the index is small by nature (one row per
// source document), so one page is enough to render the panel.
export const MENTIONED_IN_PAGE_SIZE = 200;

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const readStringProp = (
  props: Record<string, unknown>,
  key: string,
): string | null => (hasText(props[key]) ? (props[key] as string) : null);

export type DocumentMentionTarget = {
  objectNameSingular: string;
  recordId: string;
  label: string | null;
};

export type DocumentMentionIndexRow = {
  mentionKey: string;
  documentId: string;
  targetObjectNameSingular: string;
  targetRecordId: string;
  targetLabel: string | null;
};

export type ExistingDocumentMentionRow = {
  id: string;
  mentionKey: string;
  targetLabel: string | null;
};

export type MentionIndexDiff = {
  toCreate: DocumentMentionIndexRow[];
  toDelete: ExistingDocumentMentionRow[];
  toUpdate: { id: string; targetLabel: string | null }[];
};

export type MentionIndexSyncResult = {
  created: number;
  deleted: number;
  updated: number;
};

export type MentionedInTarget = {
  objectNameSingular: string;
  recordId: string;
};

export type MentionedInDocument = {
  documentId: string;
  title: string;
  isArchived: boolean;
};

// The stable identity of one indexed mention: one row per source document and
// mentioned record, so re-saving a body that still mentions the same record is a
// no-op and un-mentioning it is a single delete.
export const buildMentionKey = (
  documentId: string,
  target: Pick<DocumentMentionTarget, 'objectNameSingular' | 'recordId'>,
): string =>
  `${documentId}:${target.objectNameSingular}:${target.recordId}`;

// Walk the serialized blocknote tree for mention inline content. Block shapes
// vary (paragraphs, lists with `children`, tables with `tableContent`), so the
// walk is structural rather than shape-specific: any object whose `type` is
// `mention` is a hit. New mentions carry `objectNameSingular`; the legacy
// metadata-id-only shape cannot be deep-linked without a metadata lookup, so it
// is skipped rather than indexed half-resolved. Malformed JSON yields no rows
// instead of throwing inside the save event.
export const extractDocumentMentionTargets = (
  blocknote: string | null | undefined,
): DocumentMentionTarget[] => {
  if (!hasText(blocknote)) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(blocknote);
  } catch {
    return [];
  }

  const targets: DocumentMentionTarget[] = [];
  const seenKeys = new Set<string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }

      return;
    }

    if (node === null || typeof node !== 'object') {
      return;
    }

    const record = node as Record<string, unknown>;

    if (record.type === MENTION_INLINE_CONTENT_TYPE) {
      const props =
        record.props !== null && typeof record.props === 'object'
          ? (record.props as Record<string, unknown>)
          : {};
      const objectNameSingular = readStringProp(props, 'objectNameSingular');
      const recordId = readStringProp(props, 'recordId');

      if (objectNameSingular !== null && recordId !== null) {
        const key = `${objectNameSingular}:${recordId}`;

        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          targets.push({
            objectNameSingular,
            recordId,
            label: readStringProp(props, 'label'),
          });
        }
      }
    }

    for (const value of Object.values(record)) {
      visit(value);
    }
  };

  visit(parsed);

  return targets;
};

export const buildMentionIndexRows = (
  documentId: string,
  targets: DocumentMentionTarget[],
): DocumentMentionIndexRow[] =>
  targets.map((target) => ({
    mentionKey: buildMentionKey(documentId, target),
    documentId,
    targetObjectNameSingular: target.objectNameSingular,
    targetRecordId: target.recordId,
    targetLabel: target.label,
  }));

// Only the delta is written: existing keys are left untouched, removed targets
// are deleted, and a changed label is updated in place. This is what keeps a
// save from leaving stale rows for the previous body version.
export const diffMentionIndex = (
  existing: ExistingDocumentMentionRow[],
  desired: DocumentMentionIndexRow[],
): MentionIndexDiff => {
  const desiredByKey = new Map(
    desired.map((row) => [row.mentionKey, row] as const),
  );
  const existingByKey = new Map(
    existing.map((row) => [row.mentionKey, row] as const),
  );

  const toCreate = desired.filter((row) => !existingByKey.has(row.mentionKey));
  const toDelete = existing.filter((row) => !desiredByKey.has(row.mentionKey));
  const toUpdate: { id: string; targetLabel: string | null }[] = [];

  for (const row of desired) {
    const current = existingByKey.get(row.mentionKey);

    if (current !== undefined && (current.targetLabel ?? null) !== row.targetLabel) {
      toUpdate.push({ id: current.id, targetLabel: row.targetLabel });
    }
  }

  return { toCreate, toDelete, toUpdate };
};

export type DocumentMentionsClient = Pick<
  CoreApiClient,
  'query' | 'mutation'
>;

type ExistingMentionQueryResult = {
  documentMentions?: {
    edges?: { node: ExistingDocumentMentionRow }[];
  };
};

const readExistingMentionRows = async (
  client: DocumentMentionsClient,
  documentId: string,
): Promise<ExistingDocumentMentionRow[]> => {
  const result = (await client.query({
    documentMentions: {
      __args: {
        filter: { document: { id: { eq: documentId } } },
        first: MENTION_INDEX_PAGE_SIZE,
      },
      edges: { node: { id: true, mentionKey: true, targetLabel: true } },
    },
  } as never)) as ExistingMentionQueryResult;

  return (
    result?.documentMentions?.edges?.map((edge) => edge.node) ?? []
  );
};

// The save-pipeline writer. Called once per committed document update with the
// stored body; it reconciles the index with the mentions that body contains.
export const syncDocumentMentions = async (
  client: DocumentMentionsClient,
  documentId: string,
  blocknote: string | null | undefined,
): Promise<MentionIndexSyncResult> => {
  const desired = buildMentionIndexRows(
    documentId,
    extractDocumentMentionTargets(blocknote),
  );
  const existing = await readExistingMentionRows(client, documentId);
  const diff = diffMentionIndex(existing, desired);

  if (diff.toCreate.length > 0) {
    await client.mutation({
      createDocumentMentions: {
        __args: { data: diff.toCreate },
        id: true,
      },
    } as never);
  }

  for (const row of diff.toDelete) {
    await client.mutation({
      deleteDocumentMention: { __args: { id: row.id }, id: true },
    } as never);
  }

  for (const row of diff.toUpdate) {
    await client.mutation({
      updateDocumentMention: {
        __args: { id: row.id, data: { targetLabel: row.targetLabel } },
        id: true,
      },
    } as never);
  }

  return {
    created: diff.toCreate.length,
    deleted: diff.toDelete.length,
    updated: diff.toUpdate.length,
  };
};

type MentionedInQueryNode = {
  id: string;
  document?: {
    id?: string | null;
    title?: string | null;
    archivedAt?: string | null;
  } | null;
};

type MentionedInQueryResult = {
  documentMentions?: {
    edges?: { node: MentionedInQueryNode }[];
  };
};

export type MentionedInClient = Pick<CoreApiClient, 'query'>;

// The read model. It queries the index by target and resolves the source
// documents through the relation; a document the viewer cannot read comes back
// as a null relation, so it is dropped here rather than leaked. Bodies are
// never selected, so this path cannot scan content.
export const listMentionedInDocuments = async (
  client: MentionedInClient,
  target: MentionedInTarget,
): Promise<MentionedInDocument[]> => {
  if (!hasText(target.objectNameSingular) || !hasText(target.recordId)) {
    return [];
  }

  const result = (await client.query({
    documentMentions: {
      __args: {
        filter: {
          targetObjectNameSingular: { eq: target.objectNameSingular },
          targetRecordId: { eq: target.recordId },
        },
        first: MENTIONED_IN_PAGE_SIZE,
      },
      edges: {
        node: {
          id: true,
          document: { id: true, title: true, archivedAt: true },
        },
      },
    },
  } as never)) as MentionedInQueryResult;

  const documentsById = new Map<string, MentionedInDocument>();

  for (const edge of result?.documentMentions?.edges ?? []) {
    const document = edge.node.document;

    if (document === null || document === undefined || !hasText(document.id)) {
      continue;
    }

    if (documentsById.has(document.id)) {
      continue;
    }

    documentsById.set(document.id, {
      documentId: document.id,
      title: hasText(document.title) ? document.title : '',
      isArchived: hasText(document.archivedAt),
    });
  }

  return [...documentsById.values()].sort((left, right) =>
    left.title.localeCompare(right.title),
  );
};
