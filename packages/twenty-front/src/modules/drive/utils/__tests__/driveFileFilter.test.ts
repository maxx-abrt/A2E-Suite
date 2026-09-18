import {
  filterDriveFiles,
  filterDriveFolders,
  getDriveFileCategory,
  resolveDriveFileSourceApp,
  resolveDriveFileTargetObject,
} from '@/drive/utils/driveFileFilter';
import { DRIVE_FILTER_ALL, DRIVE_SOURCE_APP_UNKNOWN } from '@/drive/constants';
import { type DriveFile, type DriveFolder } from '@/drive/types/DriveRecord';

const buildFile = (
  overrides: Partial<DriveFile> & Pick<DriveFile, 'id'>,
): DriveFile => ({
  name: 'file.txt',
  folderId: null,
  starred: false,
  sourceApp: null,
  description: null,
  archivedAt: null,
  file: null,
  targetTaskId: null,
  targetNoteId: null,
  targetPersonId: null,
  targetCompanyId: null,
  targetOpportunityId: null,
  targetDashboardId: null,
  targetWorkflowId: null,
  ...overrides,
});

const buildFolder = (
  id: string,
  name: string,
  parentId: string | null = null,
): DriveFolder => ({
  id,
  name,
  icon: null,
  color: null,
  parentId,
  archivedAt: null,
});

const defaultFilters = {
  fileCategory: DRIVE_FILTER_ALL,
  sourceApp: DRIVE_FILTER_ALL,
  targetObject: DRIVE_FILTER_ALL,
  search: '',
};

describe('getDriveFileCategory', () => {
  it('prefers the stored extension', () => {
    const file = buildFile({
      id: '1',
      name: 'renamed',
      file: [{ fileId: 'f', label: 'photo', extension: 'png' }],
    });

    expect(getDriveFileCategory(file)).toBe('IMAGE');
  });

  it('falls back to the record name', () => {
    expect(getDriveFileCategory(buildFile({ id: '1', name: 'plan.pdf' }))).toBe(
      'TEXT_DOCUMENT',
    );
    expect(
      getDriveFileCategory(buildFile({ id: '2', name: 'unknown.zzz' })),
    ).toBe('OTHER');
  });
});

describe('resolveDriveFileTargetObject', () => {
  it('returns the first populated morph target', () => {
    expect(
      resolveDriveFileTargetObject(
        buildFile({ id: '1', targetCompanyId: 'company-1' }),
      ),
    ).toBe('company');
    expect(resolveDriveFileTargetObject(buildFile({ id: '2' }))).toBeNull();
  });
});

describe('resolveDriveFileSourceApp', () => {
  it('prefers an explicit source app', () => {
    expect(
      resolveDriveFileSourceApp(
        buildFile({ id: '1', sourceApp: 'chat', targetTaskId: 'task-1' }),
      ),
    ).toBe('chat');
  });

  it('attributes to the CRM when the file targets a record', () => {
    expect(
      resolveDriveFileSourceApp(buildFile({ id: '1', targetTaskId: 'task-1' })),
    ).toBe('crm');
  });

  it('falls back to unknown for an unattributed file', () => {
    expect(resolveDriveFileSourceApp(buildFile({ id: '1' }))).toBe(
      DRIVE_SOURCE_APP_UNKNOWN,
    );
  });
});

describe('filterDriveFiles', () => {
  const folders = [
    buildFolder('a', 'Alpha'),
    buildFolder('a1', 'Alpha child', 'a'),
    buildFolder('b', 'Beta'),
  ];

  const files = [
    buildFile({ id: 'root', name: 'root.txt' }),
    buildFile({ id: 'in-a', name: 'invoice.pdf', folderId: 'a' }),
    buildFile({
      id: 'in-a1',
      name: 'nested.png',
      folderId: 'a1',
      sourceApp: 'chat',
    }),
    buildFile({ id: 'in-b', name: 'photo.jpg', folderId: 'b' }),
  ];

  it('scopes to the current folder only', () => {
    expect(
      filterDriveFiles({
        files,
        folders,
        filters: defaultFilters,
        folderId: 'a',
      }).map((file) => file.id),
    ).toEqual(['in-a']);
  });

  it('can include subfolders', () => {
    expect(
      filterDriveFiles({
        files,
        folders,
        filters: defaultFilters,
        folderId: 'a',
        includeSubfolders: true,
      })
        .map((file) => file.id)
        .sort(),
    ).toEqual(['in-a', 'in-a1']);
  });

  it('scopes to unfiled files at the root', () => {
    expect(
      filterDriveFiles({
        files,
        folders,
        filters: defaultFilters,
        folderId: null,
      }).map((file) => file.id),
    ).toEqual(['root']);
  });

  it('filters by file category', () => {
    expect(
      filterDriveFiles({
        files,
        folders,
        filters: { ...defaultFilters, fileCategory: 'IMAGE' },
        folderId: 'b',
      }).map((file) => file.id),
    ).toEqual(['in-b']);
  });

  it('filters by source app and target object', () => {
    const crmFile = buildFile({
      id: 'crm',
      folderId: 'b',
      targetPersonId: 'person-1',
    });

    expect(
      filterDriveFiles({
        files: [...files, crmFile],
        folders,
        filters: { ...defaultFilters, sourceApp: 'crm' },
        folderId: 'b',
      }).map((file) => file.id),
    ).toEqual(['crm']);

    expect(
      filterDriveFiles({
        files: [...files, crmFile],
        folders,
        filters: { ...defaultFilters, targetObject: 'person' },
        folderId: 'b',
      }).map((file) => file.id),
    ).toEqual(['crm']);
  });

  it('matches the search on name and description', () => {
    const described = buildFile({
      id: 'described',
      folderId: 'b',
      description: 'Facture fournisseur',
    });

    expect(
      filterDriveFiles({
        files: [...files, described],
        folders,
        filters: { ...defaultFilters, search: 'FACTURE' },
        folderId: 'b',
      }).map((file) => file.id),
    ).toEqual(['described']);
  });
});

describe('filterDriveFolders', () => {
  it('keeps only live children of the parent matching the search', () => {
    const folders = [
      buildFolder('a', 'Alpha'),
      buildFolder('b', 'Beta'),
      buildFolder('a1', 'Alpha child', 'a'),
    ];

    expect(
      filterDriveFolders({ folders, parentId: null, search: 'be' }).map(
        (folder) => folder.id,
      ),
    ).toEqual(['b']);
    expect(
      filterDriveFolders({ folders, parentId: 'a', search: '' }).map(
        (folder) => folder.id,
      ),
    ).toEqual(['a1']);
  });
});
