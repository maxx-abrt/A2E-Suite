import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';

export type FileEmbedKind = 'image' | 'video' | 'audio' | 'link';

// Maps the attachment category to how a FileBlock renders. Only media the
// browser can play inline is embedded; everything else (documents, PDF,
// archives) stays a download link so a page never inlines arbitrary HTML.
export const getFileEmbedKind = (
  fileCategory: AttachmentFileCategory,
): FileEmbedKind => {
  switch (fileCategory) {
    case 'IMAGE':
      return 'image';
    case 'VIDEO':
      return 'video';
    case 'AUDIO':
      return 'audio';
    default:
      return 'link';
  }
};
