import { useUndoTemplateApply } from '@/template-gallery/hooks/useUndoTemplateApply';
import { act, renderHook } from '@testing-library/react';

const mutateMock = jest.fn();
const objectMetadataItems = [
  { nameSingular: 'project', namePlural: 'projects' },
  { nameSingular: 'task', namePlural: 'tasks' },
];

jest.mock('@/object-metadata/hooks/useApolloCoreClient', () => ({
  useApolloCoreClient: () => ({ mutate: mutateMock }),
}));

jest.mock('@/object-metadata/hooks/useObjectMetadataItems', () => ({
  useObjectMetadataItems: () => ({ objectMetadataItems }),
}));

const extractResponseField = (mutationBody: string): string =>
  mutationBody.match(/(delete\w+)\(filter/)?.[1] ?? '';

describe('useUndoTemplateApply', () => {
  beforeEach(() => {
    mutateMock.mockReset();
    mutateMock.mockImplementation(
      async (options: {
        mutation: { loc: { source: { body: string } } };
        variables: { filter: { id: { in: string[] } } };
      }) => {
        const responseField = extractResponseField(
          options.mutation.loc.source.body,
        );

        return {
          data: {
            [responseField]: options.variables.filter.id.in.map((id) => ({
              id,
            })),
          },
        };
      },
    );
  });

  it('soft-deletes exactly the created ids, grouped by object', async () => {
    const { result } = renderHook(() => useUndoTemplateApply());

    let report: Awaited<
      ReturnType<typeof result.current.undoTemplateApplyResult>
    >;

    await act(async () => {
      report = await result.current.undoTemplateApplyResult([
        { object: 'project', id: 'project-1' },
        { object: 'task', id: 'task-1' },
        { object: 'task', id: 'task-2' },
      ]);
    });

    expect(mutateMock).toHaveBeenCalledTimes(2);
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { filter: { id: { in: ['project-1'] } } },
      }),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { filter: { id: { in: ['task-1', 'task-2'] } } },
      }),
    );
    expect(report!).toMatchObject({
      deleted: 3,
      skipped: 0,
      failed: 0,
    });
  });

  it('reports an already-absent id as skipped', async () => {
    mutateMock.mockImplementation(
      async (options: {
        mutation: { loc: { source: { body: string } } };
        variables: { filter: { id: { in: string[] } } };
      }) => {
        const responseField = extractResponseField(
          options.mutation.loc.source.body,
        );

        const returnedIds =
          responseField === 'deleteTasks'
            ? ['task-1']
            : options.variables.filter.id.in;

        return {
          data: {
            [responseField]: returnedIds.map((id) => ({ id })),
          },
        };
      },
    );

    const { result } = renderHook(() => useUndoTemplateApply());

    let report: Awaited<
      ReturnType<typeof result.current.undoTemplateApplyResult>
    >;

    await act(async () => {
      report = await result.current.undoTemplateApplyResult([
        { object: 'project', id: 'project-1' },
        { object: 'task', id: 'task-1' },
        { object: 'task', id: 'task-2' },
      ]);
    });

    expect(report!).toMatchObject({ deleted: 2, skipped: 1, failed: 0 });
    expect(report!.outcomes).toContainEqual({
      object: 'task',
      deletedIds: ['task-1'],
      skippedIds: ['task-2'],
      failedIds: [],
    });
  });
});
