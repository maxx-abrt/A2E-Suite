import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type FieldFilesValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { getDriveFileCategory } from '@/drive/utils/driveFileFilter';
import { type DriveFile } from '@/drive/types/DriveRecord';

// Drive previews four media kinds through the shared DocumentViewer modal
// (images/PDF via @cyntler/react-doc-viewer, audio/video via native media
// elements). Everything else falls back to a category icon card, so the media
// stack is never duplicated.
export type DriveFilePreviewKind = 'image' | 'pdf' | 'audio' | 'video' | 'none';

const PREVIEWABLE_EXTENSIONS_BY_KIND: Record<
  Exclude<DriveFilePreviewKind, 'none'>,
  readonly string[]
> = {
  image: ['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'tiff', 'webp'],
  pdf: ['pdf'],
  audio: ['aac', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'wav'],
  video: ['m4v', 'mov', 'mp4', 'ogv', 'webm'],
};

// The stored FILES value carries the extension the uploader knew; the record
// name is the fallback for rows created before the label existed.
export const getDriveFileExtension = (file: DriveFile): string => {
  const storedExtension = file.file?.[0]?.extension;

  if (isNonEmptyString(storedExtension)) {
    return storedExtension.toLowerCase().replace('.', '');
  }

  const fileName = file.name ?? file.file?.[0]?.label ?? '';
  const lastDotIndex = fileName.lastIndexOf('.');

  return lastDotIndex >= 0
    ? fileName.slice(lastDotIndex + 1).toLowerCase()
    : '';
};

export const getDriveFilePreviewKind = (
  file: DriveFile,
): DriveFilePreviewKind => {
  const extension = getDriveFileExtension(file);

  for (const [kind, extensions] of Object.entries(
    PREVIEWABLE_EXTENSIONS_BY_KIND,
  ) as [Exclude<DriveFilePreviewKind, 'none'>, readonly string[]][]) {
    if (extensions.includes(extension)) {
      return kind;
    }
  }

  // An extensionless image/audio/video (rare, but a category is still known)
  // gets the native media fallback rather than no preview at all.
  const category = getDriveFileCategory(file);

  if (category === 'IMAGE') {
    return 'image';
  }
  if (category === 'AUDIO') {
    return 'audio';
  }
  if (category === 'VIDEO') {
    return 'video';
  }

  return 'none';
};

export const isDriveFilePreviewable = (file: DriveFile): boolean =>
  getDriveFilePreviewKind(file) !== 'none';

// The preview modal is driven by the canonical `FieldFilesValue` atom, so a
// file without a resolvable URL is not previewable even when its kind is.
export const getDriveFilePreviewValue = (
  file: DriveFile,
): FieldFilesValue | null => {
  const value = file.file?.[0];

  if (!isDefined(value) || !isNonEmptyString(value.url)) {
    return null;
  }

  return value;
};

export const canOpenDriveFilePreview = (file: DriveFile): boolean =>
  isDriveFilePreviewable(file) && isDefined(getDriveFilePreviewValue(file));
