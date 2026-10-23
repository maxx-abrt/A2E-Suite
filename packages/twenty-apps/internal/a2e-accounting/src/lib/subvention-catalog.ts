import { type CoreApiClient } from 'twenty-client-sdk/core';

export type CatalogSubvention = {
  id: string;
  title: string;
  description?: string | null;
  submissionDeadline?: string | null;
  audiences?: string[] | null;
  perimeterScale?: string | null;
  source?: string | null;
  isCallForProject?: boolean | null;
  rateMax?: number | null;
  amountHint?: string | null;
  officialLinks?: { primaryLinkUrl?: string | null } | null;
};

const CATALOG_PAGE_SIZE = 30;

export const loadSubventionCatalogPage = async (
  client: Pick<CoreApiClient, 'query'>,
  {
    query,
    audience,
    onlyCalls,
    cursor,
    now = new Date(),
  }: {
    query: string;
    audience: string;
    onlyCalls: boolean;
    cursor: string | null;
    now?: Date;
  },
) => {
  const filter: Record<string, unknown> = {
    isLive: { eq: true },
    or: [
      { submissionDeadline: { is: 'NULL' } },
      {
        submissionDeadline: {
          gte: `${now.toISOString().slice(0, 10)}T00:00:00.000Z`,
        },
      },
    ],
  };
  if (query.trim())
    filter.searchText = {
      ilike: `%${query
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')}%`,
    };
  if (audience) filter.audiences = { containsAny: [audience] };
  if (onlyCalls) filter.isCallForProject = { eq: true };
  const response = (await client.query({
    subventions: {
      __args: {
        filter,
        first: CATALOG_PAGE_SIZE,
        ...(cursor ? { after: cursor } : {}),
        orderBy: [{ submissionDeadline: 'AscNullsLast' }, { id: 'Asc' }],
      },
      edges: {
        cursor: true,
        node: {
          id: true,
          title: true,
          description: true,
          submissionDeadline: true,
          audiences: true,
          perimeterScale: true,
          source: true,
          isCallForProject: true,
          rateMax: true,
          amountHint: true,
          officialLinks: { primaryLinkUrl: true },
        },
      },
    },
  } as never)) as {
    subventions?: { edges?: { cursor: string; node: CatalogSubvention }[] };
  };
  if (!response.subventions)
    throw new Error('Le catalogue n’a pas répondu. Réessayez.');
  const edges = response.subventions.edges ?? [];
  const nextCursor = edges[edges.length - 1]?.cursor ?? null;
  return {
    records: edges.map((edge) => edge.node),
    nextCursor,
    hasMore: edges.length === CATALOG_PAGE_SIZE && nextCursor !== null,
  };
};
