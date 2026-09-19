// Shared fake for the read-only chat tool handlers. The generated Core client
// is never instantiated (it throws before generation); this reproduces the
// query frontier: each root key yields the configured value, and every call is
// recorded so tests can assert the filters the handler sent.

export type RecordedQuery = { key: string; args: unknown };

export type FakeCoreClient = {
  query: (selection: Record<string, unknown>) => Promise<unknown>;
};

export const buildFakeClient = (responses: Record<string, unknown>) => {
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

export const buildChannel = (overrides: Record<string, unknown> = {}) => ({
  id: 'channel-1',
  name: 'Général',
  kind: 'WORKSPACE',
  visibility: 'PUBLIC',
  topic: null,
  members: { edges: [] },
  ...overrides,
});

export const buildChannelMemberEdge = (workspaceMemberId: string) => ({
  node: { workspaceMember: { id: workspaceMemberId } },
});

export const buildMessage = (overrides: Record<string, unknown> = {}) => ({
  id: 'message-1',
  body: 'Bonjour',
  createdAt: '2026-09-19T09:00:00.000Z',
  threadParentId: null,
  author: { id: 'wm1', name: { firstName: 'Ada', lastName: 'Lovelace' } },
  reactions: { edges: [] },
  ...overrides,
});

export const buildMessagesResponse = (
  nodes: Record<string, unknown>[],
  hasNextPage = false,
) => ({ edges: nodes.map((node) => ({ node })), pageInfo: { hasNextPage } });

export const findQuery = (calls: RecordedQuery[], key: string) =>
  calls.find((call) => call.key === key);
