import { useApolloClient, useMutation } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';
import {
  CompleteFileUploadDocument,
  CreateFileUploadDocument,
  type FileFolder,
  type FileWithSignedUrl,
} from '~/generated-metadata/graphql';

type DirectFileUploadOptions = {
  fileFolder: FileFolder;
  fieldMetadataId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

// Progress only exists on the XHR path: fetch cannot observe upload progress.
// Callers that do not pass `onProgress` keep the fetch transport untouched.
const putFileWithProgress = ({
  uploadUrl,
  contentType,
  file,
  signal,
  onProgress,
}: {
  uploadUrl: string;
  contentType: string;
  file: File;
  signal?: AbortSignal;
  onProgress: (progress: number) => void;
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', contentType);
    request.withCredentials = false;

    const handleAbort = () => request.abort();

    if (isDefined(signal)) {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', handleAbort);
    }

    const cleanup = () => signal?.removeEventListener('abort', handleAbort);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`File upload failed with status ${request.status}`));
      }
    };

    request.onerror = () => {
      cleanup();
      reject(new Error('File upload failed'));
    };

    request.onabort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    request.send(file);
  });

export const useDirectFileUpload = () => {
  const apolloClient = useApolloClient();
  const [createFileUpload] = useMutation(CreateFileUploadDocument, {
    client: apolloClient,
  });
  const [completeFileUpload] = useMutation(CompleteFileUploadDocument, {
    client: apolloClient,
  });

  const uploadFile = async (
    file: File,
    {
      fileFolder,
      fieldMetadataId,
      signal,
      onProgress,
    }: DirectFileUploadOptions,
  ): Promise<FileWithSignedUrl> => {
    const createResult = await createFileUpload({
      variables: {
        filename: file.name,
        size: file.size,
        fileFolder,
        fieldMetadataId,
      },
    });

    const uploadTarget = createResult?.data?.createFileUpload;

    if (!isDefined(uploadTarget)) {
      throw new Error('Failed to initiate file upload');
    }

    if (isDefined(onProgress)) {
      await putFileWithProgress({
        uploadUrl: uploadTarget.uploadUrl,
        contentType: uploadTarget.contentType,
        file,
        signal,
        onProgress,
      });
    } else {
      const putResponse = await fetch(uploadTarget.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadTarget.contentType },
        body: file,
        credentials: 'omit',
        signal,
      });

      if (!putResponse.ok) {
        throw new Error(`File upload failed with status ${putResponse.status}`);
      }
    }

    const completeResult = await completeFileUpload({
      variables: { fileId: uploadTarget.fileId },
    });

    const uploadedFile = completeResult?.data?.completeFileUpload;

    if (!isDefined(uploadedFile)) {
      throw new Error('Failed to finalize file upload');
    }

    return uploadedFile;
  };

  return { uploadFile };
};
