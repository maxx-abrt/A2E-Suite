// Shared fake for the read-only Drive tool handlers. The generated Core client
// is never instantiated (it throws before generation); this reproduces the
// query frontier: each root key yields the configured value, and every call is
// recorded so tests can assert the read the handler performed.

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

export const buildAttachment = (overrides: Record<string, unknown> = {}) => ({
  id: 'attachment-1',
  name: 'invoice.pdf',
  description: null,
  sourceApp: null,
  folderId: null,
  type: null,
  fileCategory: null,
  createdAt: '2026-09-19T09:00:00.000Z',
  folder: null,
  file: null,
  targetTaskId: null,
  targetNoteId: null,
  targetPersonId: null,
  targetCompanyId: null,
  targetOpportunityId: null,
  targetDashboardId: null,
  targetWorkflowId: null,
  ...overrides,
});

export const buildAttachmentsResponse = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map((node) => ({ node })),
});

export const findQuery = (calls: RecordedQuery[], key: string) =>
  calls.find((call) => call.key === key);
