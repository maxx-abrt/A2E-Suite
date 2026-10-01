import { useCreateNewPage } from '@/quick-capture/hooks/useCreateNewPage';
import { i18n } from '@lingui/core';
import { act, renderHook } from '@testing-library/react';

i18n.activate('en');

const mockCreateOneRecord = jest.fn();
const mockOpenRecordInSidePanel = jest.fn();
const mockEnqueueErrorSnackBar = jest.fn();

jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateOneRecord }),
}));

jest.mock('@/side-panel/hooks/useOpenRecordInSidePanel', () => ({
  useOpenRecordInSidePanel: () => ({
    openRecordInSidePanel: mockOpenRecordInSidePanel,
  }),
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: mockEnqueueErrorSnackBar }),
}));

describe('useCreateNewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateOneRecord.mockResolvedValue({ id: 'page-1' });
  });

  it('creates an untitled document at the personal root then opens it', async () => {
    const { result } = renderHook(() => useCreateNewPage());

    await act(async () => {
      await result.current.createNewPage();
    });

    expect(mockCreateOneRecord).toHaveBeenCalledWith({ title: '' });
    expect(
      mockCreateOneRecord.mock.calls[0][0],
    ).not.toHaveProperty('parentId');
    expect(mockOpenRecordInSidePanel).toHaveBeenCalledWith({
      recordId: 'page-1',
      objectNameSingular: 'document',
      isNewRecord: true,
      resetNavigationStack: true,
    });
  });

  it('warns and opens nothing when the write fails', async () => {
    mockCreateOneRecord.mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(() => useCreateNewPage());

    await act(async () => {
      await result.current.createNewPage();
    });

    expect(mockOpenRecordInSidePanel).not.toHaveBeenCalled();
    expect(mockEnqueueErrorSnackBar).toHaveBeenCalledTimes(1);
  });
});
