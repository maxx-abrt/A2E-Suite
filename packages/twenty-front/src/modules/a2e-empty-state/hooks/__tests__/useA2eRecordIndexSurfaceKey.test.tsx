import { useA2eRecordIndexSurfaceKey } from '@/a2e-empty-state/hooks/useA2eRecordIndexSurfaceKey';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { renderHook } from '@testing-library/react';

jest.mock('@/quick-capture/hooks/useIsDocumentApplicationInstalled', () => ({
  useIsDocumentApplicationInstalled: jest.fn(),
}));

const mockedUseIsDocumentApplicationInstalled = jest.mocked(
  useIsDocumentApplicationInstalled,
);

describe('useA2eRecordIndexSurfaceKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsDocumentApplicationInstalled.mockReturnValue(true);
  });

  it('resolves the document index to the documents surface when installed', () => {
    const { result } = renderHook(() =>
      useA2eRecordIndexSurfaceKey('document'),
    );

    expect(result.current).toBe('documents');
  });

  it('hides the document surface without a2e-documents', () => {
    mockedUseIsDocumentApplicationInstalled.mockReturnValue(false);

    const { result } = renderHook(() =>
      useA2eRecordIndexSurfaceKey('document'),
    );

    expect(result.current).toBeNull();
  });

  it('resolves the native task index without an install gate', () => {
    mockedUseIsDocumentApplicationInstalled.mockReturnValue(false);

    const { result } = renderHook(() => useA2eRecordIndexSurfaceKey('task'));

    expect(result.current).toBe('tasks');
  });

  it('returns null for an object outside the A2E surfaces', () => {
    const { result } = renderHook(() => useA2eRecordIndexSurfaceKey('company'));

    expect(result.current).toBeNull();
  });
});
