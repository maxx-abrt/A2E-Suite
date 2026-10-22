import { useUploadAttachmentFile } from '@/activities/files/hooks/useUploadAttachmentFile';
import { renderHook } from '@testing-library/react';

const mockUploadFile = jest.fn();
const mockCreateAttachment = jest.fn();

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
});
