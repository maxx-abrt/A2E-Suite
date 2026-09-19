// Shared fake for the read-only Projects tool handlers. The generated Core
// client is never instantiated (it throws before generation); this reproduces
// the query frontier: each root key yields the configured value, and every call
// is recorded so tests can assert the read the handler performed.

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

export const buildProjectTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Tâche',
  dueAt: null,
  status: null,
  projectStatus: 'TODO',
  createdAt: '2026-09-19T08:00:00.000Z',
  updatedAt: '2026-09-19T08:00:00.000Z',
  parentTask: null,
  ...overrides,
});

export const buildMilestone = (overrides: Record<string, unknown> = {}) => ({
  id: 'milestone-1',
  name: 'Jalon',
  dueAt: '2026-09-20T00:00:00.000Z',
  doneAt: null,
  ...overrides,
});

export const buildTasksResponse = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map((node) => ({ node })),
});

export const buildMilestonesResponse = (nodes: Record<string, unknown>[]) => ({
  edges: nodes.map((node) => ({ node })),
});

export const findQuery = (calls: RecordedQuery[], key: string) =>
  calls.find((call) => call.key === key);
