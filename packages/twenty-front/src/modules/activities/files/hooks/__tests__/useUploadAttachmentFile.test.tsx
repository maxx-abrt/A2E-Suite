import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { type AttachmentUploadSession } from '@/activities/files/types/AttachmentUploadSession';
import { renderHook } from '@testing-library/react';

const mockUploadFile = jest.fn();
const mockCreateAttachment = jest.fn();
const mockFindAttachment = jest.fn();

jest.mock('@/object-metadata/hooks/useApolloCoreClient', () => ({
  useApolloCoreClient: () => ({ query: mockFindAttachment }),
}));
jest.mock('@/object-record/hooks/useFindOneRecordQuery', () => ({
  useFindOneRecordQuery: () => ({ findOneRecordQuery: {} }),
}));
jest.mock('@/file/hooks/useDirectFileUpload', () => ({
  useDirectFileUpload: () => ({ uploadFile: mockUploadFile }),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem', () => ({
  useObjectMetadataItem: () => ({
    objectMetadataItem: {
      fields: [{ id: 'attachment-file-field', type: 'FILES', name: 'file' }],
    },
  }),
}));
jest.mock('@/object-record/hooks/useCreateOneRecord', () => ({
  useCreateOneRecord: () => ({ createOneRecord: mockCreateAttachment }),
}));

describe('useUploadAttachmentFile import context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAttachment.mockResolvedValue({ data: { attachment: null } });
    mockUploadFile.mockResolvedValue({
      id: 'file-one',
      url: 'https://workspace.example/files/one',
    });
    mockCreateAttachment.mockResolvedValue(undefined);
  });

  it('attaches media to the imported document using native file identity', async () => {
    const { result } = renderHook(useUploadAttachmentFile);
    const assertCanContinue = jest.fn();
    const file = new File(['bytes'], 'photo.png');
    await result.current.uploadAttachmentFile(
      file,
      { id: 'document-one', targetObjectNameSingular: 'document' },
      { assertCanContinue },
    );

    expect(mockUploadFile).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ assertCanContinue }),
    );
    expect(mockCreateAttachment).toHaveBeenCalledWith({
      name: 'photo.png',
      targetDocumentId: 'document-one',
      file: [{ fileId: 'file-one', label: 'photo.png' }],
    });
  });

  it('does not create an attachment in a newly selected workspace', async () => {
    let isCurrent = true;
    mockUploadFile.mockImplementationOnce(async () => {
      isCurrent = false;
      return { id: 'file-one', url: 'https://workspace.example/files/one' };
    });
    const { result } = renderHook(useUploadAttachmentFile);
    await expect(
      result.current.uploadAttachmentFile(
        new File(['bytes'], 'photo.png'),
        {
          id: 'document-one',
          targetObjectNameSingular: 'document',
        },
        {
          assertCanContinue: () => {
            if (!isCurrent) throw new Error('Workspace changed');
          },
        },
      ),
    ).rejects.toThrow('Workspace changed');

    expect(mockCreateAttachment).not.toHaveBeenCalled();
  });

  it('reuses the completed file and attachment identity when attaching must be retried', async () => {
    mockCreateAttachment.mockRejectedValueOnce(new Error('Offline'));
    const session: AttachmentUploadSession = {
      attachmentId: 'allocated-attachment',
    };
    const { result } = renderHook(useUploadAttachmentFile);
    const file = new File(['bytes'], 'photo.png');
    const target = { id: 'document-one', targetObjectNameSingular: 'document' };
    await expect(
      result.current.uploadAttachmentFile(file, target, { session }),
    ).rejects.toThrow('Offline');
    await result.current.uploadAttachmentFile(file, target, { session });
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockCreateAttachment).toHaveBeenCalledTimes(2);
    expect(
      mockCreateAttachment.mock.calls.map(([record]) => record.id),
    ).toEqual(['allocated-attachment', 'allocated-attachment']);
    expect(session.isAttached).toBe(true);
  });

  it('recovers a committed attachment with a lost response using its exact file identity', async () => {
    mockCreateAttachment.mockRejectedValueOnce(new Error('Response lost'));
    mockFindAttachment.mockResolvedValueOnce({
      data: {
        attachment: {
          id: 'allocated-attachment',
          name: 'photo.png',
          file: [{ fileId: 'file-one' }],
        },
      },
    });
    const session: AttachmentUploadSession = {
      attachmentId: 'allocated-attachment',
    };
    const { result } = renderHook(useUploadAttachmentFile);
    const file = new File(['bytes'], 'photo.png');
    await expect(
      result.current.uploadAttachmentFile(
        file,
        { id: 'document-one', targetObjectNameSingular: 'document' },
        { session },
      ),
    ).resolves.toEqual({
      attachmentAbsoluteURL: 'https://workspace.example/files/one',
      attachmentFileId: 'file-one',
    });
    expect(session.isAttached).toBe(true);
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
    expect(mockCreateAttachment).toHaveBeenCalledTimes(1);
  });
});
