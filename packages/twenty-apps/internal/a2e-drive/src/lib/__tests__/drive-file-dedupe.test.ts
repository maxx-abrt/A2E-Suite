import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  groupDriveDuplicates,
  normalizeDriveFileName,
  type DriveDedupeFile,
} from '../drive-file-dedupe.ts';

const buildFile = (
  overrides: Partial<DriveDedupeFile> & { id: string },
): DriveDedupeFile => ({
  name: null,
  folderId: null,
  ...overrides,
});

test('files sharing a normalized name + extension form one group', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'a', name: 'Invoice.pdf' }),
      buildFile({ id: 'b', name: 'invoice.PDF' }),
      buildFile({ id: 'c', name: 'other.pdf' }),
    ],
  });

  assert.deepEqual(result.groups, [
    {
      normalizedName: 'invoice',
      extension: 'pdf',
      folderId: null,
      recordIds: ['a', 'b'],
    },
  ]);
  assert.equal(result.duplicateFileCount, 2);
  assert.equal(result.scannedFileCount, 3);
});

test('internal whitespace is collapsed before grouping', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'a', name: 'invoice   final.pdf' }),
      buildFile({ id: 'b', name: 'Invoice final.PDF' }),
    ],
  });

  assert.deepEqual(result.groups.map((group) => group.recordIds), [['a', 'b']]);
});

test('different extensions are not duplicates', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'a', name: 'report.pdf' }),
      buildFile({ id: 'b', name: 'report.docx' }),
    ],
  });

  assert.deepEqual(result.groups, []);
  assert.equal(result.duplicateFileCount, 0);
});

test('the folder is part of the key: same name in two folders is two groups', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'a', name: 'invoice.pdf', folderId: 'folder-1' }),
      buildFile({ id: 'b', name: 'invoice.pdf', folderId: 'folder-1' }),
      buildFile({ id: 'c', name: 'invoice.pdf', folderId: 'folder-2' }),
    ],
  });

  assert.deepEqual(result.groups, [
    {
      normalizedName: 'invoice',
      extension: 'pdf',
      folderId: 'folder-1',
      recordIds: ['a', 'b'],
    },
  ]);
  assert.equal(result.duplicateFileCount, 2);
});

test('singletons are not hints and are dropped', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'a', name: 'unique.pdf' }),
      buildFile({ id: 'b', name: 'x.txt' }),
      buildFile({ id: 'c', name: 'x.txt' }),
    ],
  });

  assert.deepEqual(result.groups.map((group) => group.normalizedName), ['x']);
});

test('files without a usable name are ignored', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'a', name: null }),
      buildFile({ id: 'b', name: '   ' }),
    ],
  });

  assert.deepEqual(result.groups, []);
  assert.equal(result.scannedFileCount, 2);
});

test('an empty scan yields an empty hint set', () => {
  assert.deepEqual(groupDriveDuplicates({ files: [] }), {
    groups: [],
    duplicateFileCount: 0,
    scannedFileCount: 0,
  });
});

test('member ids are sorted so the group is input-order independent', () => {
  const result = groupDriveDuplicates({
    files: [
      buildFile({ id: 'z', name: 'dup.pdf' }),
      buildFile({ id: 'a', name: 'dup.pdf' }),
    ],
  });

  assert.deepEqual(result.groups[0].recordIds, ['a', 'z']);
});

test('name normalization splits the extension off the last dot', () => {
  assert.deepEqual(normalizeDriveFileName('Archive.TAR.GZ'), {
    base: 'archive.tar',
    extension: 'gz',
  });
  assert.deepEqual(normalizeDriveFileName('no-dot'), {
    base: 'no-dot',
    extension: '',
  });
  assert.equal(normalizeDriveFileName(null), null);
});
