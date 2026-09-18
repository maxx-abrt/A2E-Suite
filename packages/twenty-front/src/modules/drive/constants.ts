import {
  type DriveFileFilters,
  type DriveTargetObject,
} from '@/drive/types/DriveRecord';

// Neutral value shared by every Drive filter select. Keeping it a named
// constant means the pure filter util and the select components cannot drift.
export const DRIVE_FILTER_ALL = 'ALL';

// Source-app attribution written by the upload surfaces. Budget is text (the
// field is TEXT on purpose), so an unknown value is displayed verbatim rather
// than hidden; these are the ones the filter offers as a quick choice.
export const DRIVE_SOURCE_APPS = ['crm', 'documents', 'chat', 'drive'] as const;

export const DRIVE_SOURCE_APP_UNKNOWN = 'unknown';

// Morph targets of the standard `attachment` object, in the order the filter
// lists them. A file has at most one target in practice but the schema allows
// several, so `resolveDriveFileTargetObject` reads the first non-null.
export const DRIVE_TARGET_OBJECTS: readonly DriveTargetObject[] = [
  'task',
  'note',
  'person',
  'company',
  'opportunity',
  'dashboard',
  'workflow',
];

export const DRIVE_FOLDER_ROOT_LABEL = 'Drive';

export const DEFAULT_DRIVE_FILE_FILTERS: DriveFileFilters = {
  fileCategory: DRIVE_FILTER_ALL,
  sourceApp: DRIVE_FILTER_ALL,
  targetObject: DRIVE_FILTER_ALL,
  search: '',
};
