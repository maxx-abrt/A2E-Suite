import { useCreateA2eLink } from '@/a2e-links/hooks/useCreateA2eLink';
import { i18n } from '@lingui/core';
import { act, renderHook } from '@testing-library/react';

i18n.activate('en');

const mockCreateOneRecord = jest.fn();
const mockEnqueueErrorSnackBar = jest.fn();
const mockEnqueueSuccessSnackBar = jest.fn();

jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueErrorSnackBar: mockEnqueueErrorSnackBar,
    enqueueSuccessSnackBar: mockEnqueueSuccessSnackBar,
  }),
}));

describe('useCreateA2eLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateOneRecord.mockResolvedValue({ id: 'link-1' });
  });

  it('writes the junction row for a document→task link', async () => {
    const { result } = renderHook(() => useCreateA2eLink());

    let didCreate = false;

    await act(async () => {
      didCreate = await result.current.createA2eLink({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'task',
        targetRecordId: 'task-1',
      });
    });

    expect(didCreate).toBe(true);
    expect(mockCreateOneRecord).toHaveBeenCalledWith({
      linkKey: 'document:doc-1:task:task-1',
      linkType: 'USER_LINK',
      sourceDocumentId: 'doc-1',
      targetTaskId: 'task-1',
    });
    expect(mockEnqueueSuccessSnackBar).toHaveBeenCalledTimes(1);
    expect(mockEnqueueErrorSnackBar).not.toHaveBeenCalled();
  });

  it('surfaces a rejected write honestly instead of swallowing it', async () => {
    mockCreateOneRecord.mockRejectedValue(new Error('duplicate key'));

    const { result } = renderHook(() => useCreateA2eLink());

    let didCreate = true;

    await act(async () => {
      didCreate = await result.current.createA2eLink({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'task',
        targetRecordId: 'task-1',
      });
    });

    expect(didCreate).toBe(false);
    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
    expect(mockEnqueueSuccessSnackBar).not.toHaveBeenCalled();
  });

  it('does not write when an endpoint has no morph leg', async () => {
    const { result } = renderHook(() => useCreateA2eLink());

    let didCreate = true;

    await act(async () => {
      didCreate = await result.current.createA2eLink({
        sourceObjectNameSingular: 'document',
        sourceRecordId: 'doc-1',
        targetObjectNameSingular: 'company',
        targetRecordId: 'company-1',
      });
    });

    expect(didCreate).toBe(false);
    expect(mockCreateOneRecord).not.toHaveBeenCalled();
    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
  });
});
