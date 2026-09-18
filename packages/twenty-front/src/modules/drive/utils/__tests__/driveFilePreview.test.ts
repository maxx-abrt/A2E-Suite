import {
  canOpenDriveFilePreview,
  getDriveFileExtension,
  getDriveFilePreviewKind,
  getDriveFilePreviewValue,
  isDriveFilePreviewable,
} from '@/drive/utils/driveFilePreview';
import { type DriveFile } from '@/drive/types/DriveRecord';

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

describe('getDriveFileExtension', () => {
  it('prefers the stored FILES extension', () => {
    expect(
      getDriveFileExtension(
        buildFile({
          id: '1',
          name: 'renamed-without-extension',
          file: [{ fileId: 'x', label: 'photo', extension: '.PNG' }],
        }),
      ),
    ).toBe('png');
  });

  it('falls back to the record name', () => {
    expect(
      getDriveFileExtension(buildFile({ id: '1', name: 'plan.pdf' })),
    ).toBe('pdf');
    expect(
      getDriveFileExtension(buildFile({ id: '2', name: 'noextension' })),
    ).toBe('');
  });
});

describe('getDriveFilePreviewKind', () => {
  it('classifies the four media kinds by extension', () => {
    expect(
      getDriveFilePreviewKind(buildFile({ id: '1', name: 'photo.png' })),
    ).toBe('image');
    expect(
      getDriveFilePreviewKind(buildFile({ id: '2', name: 'invoice.pdf' })),
    ).toBe('pdf');
    expect(
      getDriveFilePreviewKind(buildFile({ id: '3', name: 'voice.mp3' })),
    ).toBe('audio');
    expect(
      getDriveFilePreviewKind(buildFile({ id: '4', name: 'clip.mp4' })),
    ).toBe('video');
  });

  it('falls back to a media kind when only the category is known', () => {
    expect(
      getDriveFilePreviewKind(buildFile({ id: '1', name: 'image.heif' })),
    ).toBe('image');
  });

  it('returns none for non-media files', () => {
    expect(
      getDriveFilePreviewKind(buildFile({ id: '1', name: 'archive.zip' })),
    ).toBe('none');
    expect(
      getDriveFilePreviewKind(buildFile({ id: '2', name: 'report.docx' })),
    ).toBe('none');
  });
});

describe('isDriveFilePreviewable', () => {
  it('is true only for previewable media kinds', () => {
    expect(
      isDriveFilePreviewable(buildFile({ id: '1', name: 'photo.png' })),
    ).toBe(true);
    expect(
      isDriveFilePreviewable(buildFile({ id: '2', name: 'archive.zip' })),
    ).toBe(false);
  });
});

describe('canOpenDriveFilePreview', () => {
  it('requires both a previewable kind and a resolvable url', () => {
    expect(
      canOpenDriveFilePreview(
        buildFile({
          id: '1',
          name: 'photo.png',
          file: [{ fileId: 'x', label: 'photo.png', url: 'https://cdn/x.png' }],
        }),
      ),
    ).toBe(true);

    expect(
      canOpenDriveFilePreview(buildFile({ id: '2', name: 'photo.png' })),
    ).toBe(false);

    expect(
      canOpenDriveFilePreview(buildFile({ id: '3', name: 'archive.zip' })),
    ).toBe(false);
  });
});

describe('getDriveFilePreviewValue', () => {
  it('returns the first FILES value only when it carries a url', () => {
    expect(
      getDriveFilePreviewValue(
        buildFile({
          id: '1',
          name: 'photo.png',
          file: [{ fileId: 'x', label: 'photo.png', url: 'https://cdn/x.png' }],
        }),
      ),
    ).toEqual({
      fileId: 'x',
      label: 'photo.png',
      url: 'https://cdn/x.png',
    });

    expect(
      getDriveFilePreviewValue(buildFile({ id: '2', name: 'photo.png' })),
    ).toBeNull();
  });
});
