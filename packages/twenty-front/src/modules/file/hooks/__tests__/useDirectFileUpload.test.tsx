import { useDirectFileUpload } from '@/file/hooks/useDirectFileUpload';
import { act, renderHook } from '@testing-library/react';
import {
  CompleteFileUploadDocument,
  CreateFileUploadDocument,
  FileFolder,
} from '~/generated-metadata/graphql';

const mockCreateUpload = jest.fn();
const mockCompleteUpload = jest.fn();
const mockFetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

jest.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({}),
  useMutation: (document: unknown) => [
    document === CreateFileUploadDocument
      ? mockCreateUpload
      : document === CompleteFileUploadDocument
        ? mockCompleteUpload
        : undefined,
  ],
}));

const originalFetch = globalThis.fetch;

describe('useDirectFileUpload import workspace guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockFetch;
    mockCreateUpload.mockResolvedValue({
      data: {
        createFileUpload: {
          uploadUrl: 'https://storage.example/upload',
          fileId: 'file-one',
          contentType: 'image/png',
        },
      },
    });
    mockCompleteUpload.mockResolvedValue({
      data: {
        completeFileUpload: {
          id: 'file-one',
          url: 'https://workspace.example/files/one',
        },
      },
    });
    mockFetch.mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uses the native upload content type and completes when the workspace stays current', async () => {
    const { result } = renderHook(useDirectFileUpload);
    const assertCanContinue = jest.fn();
    await act(async () => {
      await result.current.uploadFile(new File(['image bytes'], 'photo.png'), {
        fileFolder: FileFolder.FilesField,
        assertCanContinue,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://storage.example/upload',
      expect.objectContaining({
        headers: { 'Content-Type': 'image/png' },
        credentials: 'omit',
      }),
    );
    expect(mockCompleteUpload).toHaveBeenCalledWith({
      variables: { fileId: 'file-one' },
    });
  });

  it('stops before uploading bytes when the workspace changes during upload initiation', async () => {
    let isCurrent = true;
    mockCreateUpload.mockImplementationOnce(async () => {
      isCurrent = false;
      return {
        data: {
          createFileUpload: {
            uploadUrl: 'https://storage.example/upload',
            fileId: 'file-one',
            contentType: 'image/png',
          },
        },
      };
    });
    const { result } = renderHook(useDirectFileUpload);
    await expect(
      result.current.uploadFile(new File(['image bytes'], 'photo.png'), {
        fileFolder: FileFolder.FilesField,
        assertCanContinue: () => {
          if (!isCurrent) throw new Error('Workspace changed');
        },
      }),
    ).rejects.toThrow('Workspace changed');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockCompleteUpload).not.toHaveBeenCalled();
  });

  it('does not finalize a file after a workspace change during the byte upload', async () => {
    let isCurrent = true;
    mockFetch.mockImplementationOnce(async () => {
      isCurrent = false;
      return { ok: true } as Response;
    });
    const { result } = renderHook(useDirectFileUpload);
    await expect(
      result.current.uploadFile(new File(['image bytes'], 'photo.png'), {
        fileFolder: FileFolder.FilesField,
        assertCanContinue: () => {
          if (!isCurrent) throw new Error('Workspace changed');
        },
      }),
    ).rejects.toThrow('Workspace changed');

    expect(mockCompleteUpload).not.toHaveBeenCalled();
  });
});
