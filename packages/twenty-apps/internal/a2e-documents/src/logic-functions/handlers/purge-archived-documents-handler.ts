import { CoreApiClient } from 'twenty-client-sdk/core';

import { isPastTrashRetention } from '../../lib/trash-retention.ts';

// LE BALAYAGE DE LA CORBEILLE.
//
// Archived documents live 7 days for restore, then the nightly cron soft-
// deletes them (the default function role cannot destroy; Twenty's native
// trash cleanup does the final hard delete). This reads EVERY archived
// document page, not a single `first: 500`: a deep tree can accumulate more
// archived descendants than one page, and a missed page is recoverable work
// that never gets purged. The client, clock and page size are injectable so
// node:test can exercise the paging without a live Core API (the generated
// client throws before generation).

export const PURGE_ARCHIVED_PAGE_SIZE = 500;

export const coreClient = (): CoreApiClient => new CoreApiClient();

export type CoreClientLike = Pick<CoreApiClient, 'query' | 'mutation'>;

type ArchivedDocument = {
  id: string;
  archivedAt?: string | null;
};

type ArchivedDocumentsPage = {
  documents: ArchivedDocument[];
  hasNextPage: boolean;
  endCursor: string | null;
};

export type PurgeArchivedDocumentsResult = {
  scanned: number;
  purged: number;
};

const readArchivedDocumentsPage = async (
  client: CoreClientLike,
  after: string | null,
  pageSize: number,
): Promise<ArchivedDocumentsPage> => {
  const result = (await client.query({
    documents: {
      __args: {
        filter: { archivedAt: { is: 'NOT_NULL' } },
        orderBy: [{ id: 'Asc' }],
        first: pageSize,
        ...(after === null ? {} : { after }),
      },
      edges: { node: { id: true, archivedAt: true } },
      pageInfo: { hasNextPage: true, endCursor: true },
    },
  } as never)) as {
    documents?: {
      edges?: { node: ArchivedDocument }[];
      pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
    };
  };

  return {
    documents: result?.documents?.edges?.map((edge) => edge.node) ?? [],
    hasNextPage: result?.documents?.pageInfo?.hasNextPage ?? false,
    endCursor: result?.documents?.pageInfo?.endCursor ?? null,
  };
};

// Deleting while paging shifts the cursor, so the scan first reads every page
// into memory and only then destroys the expired rows.
export const collectArchivedDocuments = async (
  client: CoreClientLike,
  pageSize: number = PURGE_ARCHIVED_PAGE_SIZE,
): Promise<ArchivedDocument[]> => {
  const documents: ArchivedDocument[] = [];
  let after: string | null = null;

  do {
    const page = await readArchivedDocumentsPage(client, after, pageSize);

    documents.push(...page.documents);
    after = page.hasNextPage ? page.endCursor : null;
  } while (after !== null);

  return documents;
};

// The generated plural delete takes a REQUIRED filter, not an id (live-
// verified in a2e-projects/a2e-drive).
const softDeleteDocument = async (
  client: CoreClientLike,
  documentId: string,
): Promise<void> => {
  await client.mutation({
    deleteDocuments: {
      __args: { filter: { id: { eq: documentId } } },
      id: true,
    },
  } as never);
};

export const purgeArchivedDocuments = async (
  client: CoreClientLike = coreClient(),
  now: number = Date.now(),
  pageSize: number = PURGE_ARCHIVED_PAGE_SIZE,
): Promise<PurgeArchivedDocumentsResult> => {
  const documents = await collectArchivedDocuments(client, pageSize);
  const expired = documents.filter((document) =>
    isPastTrashRetention(document.archivedAt, now),
  );

  for (const document of expired) {
    await softDeleteDocument(client, document.id);
  }

  return { scanned: documents.length, purged: expired.length };
};
