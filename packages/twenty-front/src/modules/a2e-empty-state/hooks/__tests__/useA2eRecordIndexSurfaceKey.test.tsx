import { useA2eRecordIndexSurfaceKey } from '@/a2e-empty-state/hooks/useA2eRecordIndexSurfaceKey';
import { useIsDriveApplicationInstalled } from '@/drive/hooks/useIsDriveApplicationInstalled';
import { useIsA2eAccountingApplicationInstalled } from '@/quick-create/hooks/useIsA2eAccountingApplicationInstalled';
import { useIsDocumentApplicationInstalled } from '@/quick-capture/hooks/useIsDocumentApplicationInstalled';
import { renderHook } from '@testing-library/react';

jest.mock('@/quick-capture/hooks/useIsDocumentApplicationInstalled', () => ({
  useIsDocumentApplicationInstalled: jest.fn(),
}));

jest.mock(
  '@/quick-create/hooks/useIsA2eAccountingApplicationInstalled',
  () => ({
    useIsA2eAccountingApplicationInstalled: jest.fn(),
  }),
);

jest.mock('@/drive/hooks/useIsDriveApplicationInstalled', () => ({
  useIsDriveApplicationInstalled: jest.fn(),
}));

const mockedUseIsDocumentApplicationInstalled = jest.mocked(
  useIsDocumentApplicationInstalled,
);
const mockedUseIsA2eAccountingApplicationInstalled = jest.mocked(
  useIsA2eAccountingApplicationInstalled,
);
const mockedUseIsDriveApplicationInstalled = jest.mocked(
  useIsDriveApplicationInstalled,
);

describe('useA2eRecordIndexSurfaceKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseIsDocumentApplicationInstalled.mockReturnValue(true);
    mockedUseIsA2eAccountingApplicationInstalled.mockReturnValue(true);
    mockedUseIsDriveApplicationInstalled.mockReturnValue(true);
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
    mockedUseIsA2eAccountingApplicationInstalled.mockReturnValue(false);
    mockedUseIsDriveApplicationInstalled.mockReturnValue(false);

    const { result } = renderHook(() => useA2eRecordIndexSurfaceKey('task'));

    expect(result.current).toBe('tasks');
  });

  it('resolves a Bilan index only when a2e-accounting is installed', () => {
    const { result } = renderHook(() => useA2eRecordIndexSurfaceKey('invoice'));

    expect(result.current).toBe('bilanInvoices');

    mockedUseIsA2eAccountingApplicationInstalled.mockReturnValue(false);

    const { result: hiddenResult } = renderHook(() =>
      useA2eRecordIndexSurfaceKey('invoice'),
    );

    expect(hiddenResult.current).toBeNull();
  });

  it('resolves the drive folder index only when a2e-drive is installed', () => {
    const { result } = renderHook(() =>
      useA2eRecordIndexSurfaceKey('driveFolder'),
    );

    expect(result.current).toBe('archiveFolders');

    mockedUseIsDriveApplicationInstalled.mockReturnValue(false);

    const { result: hiddenResult } = renderHook(() =>
      useA2eRecordIndexSurfaceKey('driveFolder'),
    );

    expect(hiddenResult.current).toBeNull();
  });

  it('returns null for an object outside the A2E surfaces', () => {
    const { result } = renderHook(() => useA2eRecordIndexSurfaceKey('company'));

    expect(result.current).toBeNull();
  });
});
