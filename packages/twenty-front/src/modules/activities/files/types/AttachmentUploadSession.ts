import { type FileWithSignedUrl } from '~/generated-metadata/graphql';

export type AttachmentUploadSession = {
  attachmentId: string;
  uploadedFile?: FileWithSignedUrl;
  isAttached?: boolean;
};
