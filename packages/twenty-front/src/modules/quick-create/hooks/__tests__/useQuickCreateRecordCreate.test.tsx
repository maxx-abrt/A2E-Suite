import { useQuickCreateRecordCreate } from '@/quick-create/hooks/useQuickCreateRecordCreate';
import { QUICK_CREATE_COMMAND_IDS } from '@/quick-create/constants/QuickCreateCommandIds';
import { act, renderHook } from '@testing-library/react';

const mockCreateOneRecord = jest.fn();
const mockOpenRecord = jest.fn();
const mockError = jest.fn();
jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));
jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({ openRecordInSidePanel: mockOpenRecord }),
}));
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: mockError }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateOneRecord.mockResolvedValue({ id: 'created-record' });
});

it.each([
  [QUICK_CREATE_COMMAND_IDS.task, 'task', { title: 'Prepare the review' }],
  [QUICK_CREATE_COMMAND_IDS.project, 'project', { name: 'Prepare the review' }],
])(
  'creates a named %s without opening details',
  async (commandId, objectNameSingular, expectedInput) => {
    const { result } = renderHook(() =>
      useQuickCreateRecordCreate({ commandId, objectNameSingular }),
    );
    await act(async () => {
      await expect(
        result.current.createQuickCreateRecord('  Prepare the review  '),
      ).resolves.toEqual({ id: 'created-record' });
    });
    expect(mockCreateOneRecord).toHaveBeenCalledWith(expectedInput);
    expect(mockOpenRecord).not.toHaveBeenCalled();
  },
);

it('retains the existing detail flow for other record kinds', async () => {
  const { result } = renderHook(() =>
    useQuickCreateRecordCreate({
      commandId: QUICK_CREATE_COMMAND_IDS.page,
      objectNameSingular: 'document',
    }),
  );
  await act(async () => {
    await result.current.createQuickCreateRecord();
  });
  expect(mockCreateOneRecord).toHaveBeenCalledWith({ title: '' });
  expect(mockOpenRecord).toHaveBeenCalledWith(
    expect.objectContaining({
      recordId: 'created-record',
      objectNameSingular: 'document',
    }),
  );
});

it('propagates capture failures to the form without opening details', async () => {
  mockCreateOneRecord.mockRejectedValue(new Error('Offline'));
  const { result } = renderHook(() =>
    useQuickCreateRecordCreate({
      commandId: QUICK_CREATE_COMMAND_IDS.task,
      objectNameSingular: 'task',
    }),
  );
  await act(async () => {
    await expect(
      result.current.createQuickCreateRecord('Keep this draft'),
    ).rejects.toThrow('Offline');
  });
  expect(mockOpenRecord).not.toHaveBeenCalled();
  expect(mockError).not.toHaveBeenCalled();
});
