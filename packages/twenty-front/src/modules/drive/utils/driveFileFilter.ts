import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { getFileType } from '@/activities/files/utils/getFileType';
import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { DRIVE_FILTER_ALL, DRIVE_SOURCE_APP_UNKNOWN } from '@/drive/constants';
import {
  type DriveFile,
  type DriveFileFilters,
  type DriveFolder,
  type DriveTargetObject,
} from '@/drive/types/DriveRecord';
import { getDriveFolderDescendantIds } from '@/drive/utils/driveFolderTree';

// The morph target a file is attached to, as a filterable object name. The
// standard attachment exposes one `targetXId` per object; read them in the
// same order the filter lists them.
const TARGET_OBJECT_FIELD_NAMES: {
  object: DriveTargetObject;
  fieldName: keyof DriveFile;
}[] = [
  { object: 'task', fieldName: 'targetTaskId' },
  { object: 'note', fieldName: 'targetNoteId' },
  { object: 'person', fieldName: 'targetPersonId' },
  { object: 'company', fieldName: 'targetCompanyId' },
  { object: 'opportunity', fieldName: 'targetOpportunityId' },
  { object: 'dashboard', fieldName: 'targetDashboardId' },
  { object: 'workflow', fieldName: 'targetWorkflowId' },
];

const readDriveFileName = (file: DriveFile): string =>
  isNonEmptyString(file.name) ? file.name : (file.file?.[0]?.label ?? '');

// The dashboard/table label for a file. `name` is the native upload's label;
// fall back to the stored FILES label when a record predates it.
export const getDriveFileName = (file: DriveFile): string =>
  readDriveFileName(file) === ''
    ? `#${file.id.slice(0, 8)}`
    : readDriveFileName(file);

// Classify by extension when the FILES value exposes it, else by the record
// name. Reuses the native file-category mapping so Drive and the activity
// Files tab never disagree about what "an image" is.
export const getDriveFileCategory = (
  file: DriveFile,
): AttachmentFileCategory => {
  const extension = file.file?.[0]?.extension;

  if (isNonEmptyString(extension)) {
    return getFileType(`file.${extension}`);
  }

  return getFileType(readDriveFileName(file));
};

export const resolveDriveFileTargetObject = (
  file: DriveFile,
): DriveTargetObject | null => {
  for (const { object, fieldName } of TARGET_OBJECT_FIELD_NAMES) {
    if (isNonEmptyString(file[fieldName] as string | null)) {
      return object;
    }
  }

  return null;
};

// Source-app attribution. An explicit `sourceApp` always wins; when it is
// absent, a file attached to a CRM record is attributed to the CRM surface, so
// the filter distinguishes CRM/document/chat uploads even before every upload
// surface writes the field.
export const resolveDriveFileSourceApp = (file: DriveFile): string => {
  if (isNonEmptyString(file.sourceApp)) {
    return file.sourceApp;
  }

  return isDefined(resolveDriveFileTargetObject(file))
    ? 'crm'
    : DRIVE_SOURCE_APP_UNKNOWN;
};

export const isDriveFileMatchingFilters = ({
  file,
  filters,
}: {
  file: DriveFile;
  filters: DriveFileFilters;
}): boolean => {
  if (
    filters.fileCategory !== DRIVE_FILTER_ALL &&
    getDriveFileCategory(file) !== filters.fileCategory
  ) {
    return false;
  }

  if (
    filters.sourceApp !== DRIVE_FILTER_ALL &&
    resolveDriveFileSourceApp(file) !== filters.sourceApp
  ) {
    return false;
  }

  if (
    filters.targetObject !== DRIVE_FILTER_ALL &&
    resolveDriveFileTargetObject(file) !== filters.targetObject
  ) {
    return false;
  }

  const search = filters.search.trim().toLowerCase();

  if (search === '') {
    return true;
  }

  return (
    readDriveFileName(file).toLowerCase().includes(search) ||
    (file.description ?? '').toLowerCase().includes(search)
  );
};

export const filterDriveFiles = ({
  files,
  filters,
  folders,
  folderId,
  includeSubfolders = false,
}: {
  files: DriveFile[];
  filters: DriveFileFilters;
  folders: DriveFolder[];
  folderId: string | null;
  includeSubfolders?: boolean;
}): DriveFile[] => {
  const scopeFolderIds = isDefined(folderId)
    ? new Set<string>([
        folderId,
        ...(includeSubfolders
          ? getDriveFolderDescendantIds(folders, folderId)
          : []),
      ])
    : null;

  return files.filter((file) => {
    if (scopeFolderIds !== null) {
      if (!isDefined(file.folderId) || !scopeFolderIds.has(file.folderId)) {
        return false;
      }
    } else if (isDefined(file.folderId)) {
      return false;
    }

    return isDriveFileMatchingFilters({ file, filters });
  });
};

export const filterDriveFolders = ({
  folders,
  parentId,
  search,
}: {
  folders: DriveFolder[];
  parentId: string | null;
  search: string;
}): DriveFolder[] => {
  const normalizedSearch = search.trim().toLowerCase();

  return folders.filter((folder) => {
    if (folder.parentId !== parentId) {
      return false;
    }

    return (
      normalizedSearch === '' ||
      folder.name.toLowerCase().includes(normalizedSearch)
    );
  });
};
