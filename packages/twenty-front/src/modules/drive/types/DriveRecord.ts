import { type FieldFilesValue } from '@/object-record/record-field/ui/types/FieldMetadata';

// Drive reads two metadata surfaces: the app-owned `driveFolder` object and
// the standard `attachment` object extended by a2e-drive. Relation scalars use
// the workspace `${fieldName}Id` form (folder field → `folderId`, parent field
// → `parentId`), which is what the metadata engine derives from the field name.

export type DriveFolder = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  archivedAt: string | null;
};

export type DriveFile = {
  id: string;
  name: string | null;
  folderId: string | null;
  starred: boolean;
  sourceApp: string | null;
  description: string | null;
  archivedAt: string | null;
  file?: FieldFilesValue[] | null;
  targetTaskId: string | null;
  targetNoteId: string | null;
  targetPersonId: string | null;
  targetCompanyId: string | null;
  targetOpportunityId: string | null;
  targetDashboardId: string | null;
  targetWorkflowId: string | null;
};

export type DriveFolderNode = DriveFolder & {
  children: DriveFolderNode[];
};

export type DriveViewMode = 'list' | 'gallery';

// The filter axes named by the P6.2 bullet. `ALL` is the neutral value so the
// persisted filter shape stays total (no undefined branches in the UI).
export type DriveFileFilters = {
  fileCategory: string;
  sourceApp: string;
  targetObject: string;
  search: string;
};

export type DriveTargetObject =
  | 'task'
  | 'note'
  | 'person'
  | 'company'
  | 'opportunity'
  | 'dashboard'
  | 'workflow';
