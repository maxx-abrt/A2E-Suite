import { CoreApiClient } from 'twenty-client-sdk/core';

// Thin helpers over the generated Core API. Bilan's server functions all do the
// same four things — read a page, read one row, write rows, patch a row — so
// they share these instead of hand-rolling GraphQL shapes each time.

export type RecordShape = Record<string, unknown>;

export const coreClient = (): CoreApiClient => new CoreApiClient();

type QueryArgs = {
  filter?: RecordShape;
  orderBy?: RecordShape[];
  first?: number;
  after?: string;
};

export const findRecords = async <T extends RecordShape>(
  client: CoreApiClient,
  namePlural: string,
  selection: RecordShape,
  args: QueryArgs = {},
): Promise<T[]> => {
  const result = (await client.query({
    [namePlural]: {
      __args: args,
      edges: { node: selection },
    },
  } as never)) as Record<string, { edges?: { node: T }[] }>;

  return (result?.[namePlural]?.edges ?? []).map((edge) => edge.node);
};

// Walks the connection cursor to the end, capped so a runaway catalogue can
// never turn one cron tick into an unbounded read.
export const findAllRecords = async <T extends RecordShape>(
  client: CoreApiClient,
  namePlural: string,
  selection: RecordShape,
  args: QueryArgs = {},
  pageSize = 200,
  maxRecords = 20_000,
): Promise<T[]> => {
  const records: T[] = [];
  let after: string | undefined;

  while (records.length < maxRecords) {
    const result = (await client.query({
      [namePlural]: {
        __args: { ...args, first: pageSize, ...(after ? { after } : {}) },
        edges: { cursor: true, node: selection },
      },
    } as never)) as Record<
      string,
      { edges?: { cursor: string; node: T }[] }
    >;

    const edges = result?.[namePlural]?.edges ?? [];

    for (const edge of edges) {
      records.push(edge.node);
    }

    if (edges.length < pageSize) {
      break;
    }

    after = edges[edges.length - 1]?.cursor;

    if (after === undefined) {
      break;
    }
  }

  return records;
};

export const findOneRecord = async <T extends RecordShape>(
  client: CoreApiClient,
  namePlural: string,
  selection: RecordShape,
  filter: RecordShape,
): Promise<T | undefined> => {
  const [record] = await findRecords<T>(client, namePlural, selection, {
    filter,
    first: 1,
  });

  return record;
};

export const createRecords = async (
  client: CoreApiClient,
  createMutationName: string,
  data: RecordShape[],
): Promise<{ id: string }[]> => {
  if (data.length === 0) {
    return [];
  }

  const result = (await client.mutation({
    [createMutationName]: {
      __args: { data },
      id: true,
    },
  } as never)) as Record<string, { id: string }[]>;

  return result?.[createMutationName] ?? [];
};

export const updateRecord = async (
  client: CoreApiClient,
  updateMutationName: string,
  id: string,
  data: RecordShape,
): Promise<void> => {
  await client.mutation({
    [updateMutationName]: {
      __args: { id, data },
      id: true,
    },
  } as never);
};

export const updateRecordsWhere = async (
  client: CoreApiClient,
  updateManyMutationName: string,
  filter: RecordShape,
  data: RecordShape,
): Promise<void> => {
  await client.mutation({
    [updateManyMutationName]: {
      __args: { filter, data },
      id: true,
    },
  } as never);
};

// Mutations are batched because a catalogue refresh writes thousands of rows and
// one giant payload is the fastest way to hit a gateway limit.
export const chunk = <T>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
};

export const todayIso = (): string => new Date().toISOString();

export const dayIso = (value: Date = new Date()): string =>
  value.toISOString().slice(0, 10);
