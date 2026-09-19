// Shared fake for the read-only document-content tool handler. The generated
// Core client is never instantiated (it throws before generation); this
// reproduces the query frontier: each root key yields the configured value, and
// every call is recorded so tests can assert the read the handler performed.

export type RecordedQuery = { key: string; args: unknown };

export type FakeCoreClient = {
  query: (selection: Record<string, unknown>) => Promise<unknown>;
};

export const buildFakeCoreClient = (responses: Record<string, unknown>) => {
  const calls: RecordedQuery[] = [];

  const client: FakeCoreClient = {
    query: async (selection) => {
      const key = Object.keys(selection)[0];
      const entry = selection[key] as { __args?: unknown } | undefined;

      calls.push({ key, args: entry?.__args });

      return { [key]: responses[key] };
    },
  };

  return { client, calls };
};

export const buildDocument = (overrides: Record<string, unknown> = {}) => ({
  id: 'document-1',
  title: 'Note de réunion',
  kind: 'DOCUMENT',
  updatedAt: '2026-09-19T09:00:00.000Z',
  content: { blocknote: '[]' },
  ...overrides,
});

export const findQuery = (calls: RecordedQuery[], key: string) =>
  calls.find((call) => call.key === key);
