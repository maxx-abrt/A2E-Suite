import { useCompleteTask } from '@/activities/tasks/hooks/useCompleteTask';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { act, renderHook } from '@testing-library/react';

const mockUpdate = jest.fn();
let mockPipelineInstalled = true;
let mockReadOnlyField = '';
let mockNativeStatus: string | undefined = 'TODO';
let mockPipelineStatus: string | null = 'IN_PROGRESS';
jest.mock('@/object-record/hooks/useUpdateOneRecord', () => ({
  useUpdateOneRecord: () => ({ updateOneRecord: mockUpdate }),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: jest.fn(),
}));
jest.mock('@/object-record/read-only/hooks/useIsRecordFieldReadOnly', () => ({
  useIsRecordFieldReadOnly: ({
    fieldMetadataId,
  }: {
    fieldMetadataId: string;
  }) => fieldMetadataId === mockReadOnlyField,
}));
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({
    useAtomFamilySelectorValue: (
      _selector: unknown,
      { fieldName }: { fieldName: string },
    ) => (fieldName === 'status' ? mockNativeStatus : mockPipelineStatus),
  }),
);

beforeEach(() => {
  mockUpdate.mockReset();
  mockUpdate.mockResolvedValue({ id: 'task' });
  mockPipelineInstalled = true;
  mockReadOnlyField = '';
  mockNativeStatus = 'TODO';
  mockPipelineStatus = 'IN_PROGRESS';
  jest.mocked(useObjectMetadataItem).mockImplementation(
    () =>
      ({
        objectMetadataItem: {
          id: 'task-object',
          readableFields: [
            { id: 'status', name: 'status' },
            ...(mockPipelineInstalled
              ? [{ id: 'pipeline', name: 'projectStatus' }]
              : []),
          ],
        },
      }) as unknown as ReturnType<typeof useObjectMetadataItem>,
  );
});

it('updates both statuses with one small native mutation', async () => {
  const { result } = renderHook(() => useCompleteTask({ id: 'task' }));
  await act(async () => result.current.completeTask(true));
  expect(mockUpdate).toHaveBeenCalledWith({
    objectNameSingular: 'task',
    idToUpdate: 'task',
    updateOneRecordInput: { status: 'DONE', projectStatus: 'DONE' },
    recordGqlFields: { id: true, status: true, projectStatus: true },
  });
});

it('uses the native status when Projects is not installed', async () => {
  mockPipelineInstalled = false;
  const { result } = renderHook(() => useCompleteTask({ id: 'task' }));
  await act(async () => result.current.completeTask(false));
  expect(mockUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      updateOneRecordInput: { status: 'TODO' },
      recordGqlFields: { id: true, status: true },
    }),
  );
});

it.each(['status', 'pipeline'])(
  'does not bypass a read-only %s field',
  async (field) => {
    mockReadOnlyField = field;
    const { result } = renderHook(() => useCompleteTask({ id: 'task' }));
    expect(result.current.canCompleteTask).toBe(false);
    await act(async () => result.current.completeTask(true));
    expect(mockUpdate).not.toHaveBeenCalled();
  },
);

it('reads pipeline completion first, with native status as the fallback', () => {
  mockNativeStatus = 'DONE';
  mockPipelineStatus = 'TODO';
  const { result, rerender } = renderHook(() =>
    useCompleteTask({ id: 'task' }),
  );
  expect(result.current.isCompleted).toBe(false);
  mockPipelineStatus = null;
  rerender();
  expect(result.current.isCompleted).toBe(true);
});

it('keeps completion disabled while the record status is unavailable', () => {
  mockNativeStatus = undefined;
  mockPipelineStatus = null;
  const { result } = renderHook(() => useCompleteTask({ id: 'task' }));
  expect(result.current.canCompleteTask).toBe(false);
});
