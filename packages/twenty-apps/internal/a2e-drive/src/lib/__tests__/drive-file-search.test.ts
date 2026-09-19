import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DRIVE_APP_PATH,
  displayDriveFileName,
  readDriveFileExtension,
  resolveDriveSourceApp,
  searchDriveFiles,
  type DriveSearchFile,
} from '../drive-file-search.ts';

const buildFile = (
  overrides: Partial<DriveSearchFile> & { id: string },
): DriveSearchFile => ({
  name: null,
  description: null,
  sourceApp: null,
  folderId: null,
  folderName: null,
  mimeType: null,
  fileCategory: null,
  extension: null,
  createdAt: null,
  ...overrides,
});

const invoicePrefix = buildFile({
  id: 'file-prefix',
  name: 'invoice-2026.pdf',
  createdAt: '2026-01-01T00:00:00.000Z',
});
const invoiceContainsRecent = buildFile({
  id: 'file-contains-recent',
  description: 'The invoice attached to the deal',
  createdAt: '2026-09-10T00:00:00.000Z',
});
const invoiceContainsOlder = buildFile({
  id: 'file-contains-older',
  name: 'my-invoice.pdf',
  createdAt: '2026-09-01T00:00:00.000Z',
});
const unrelated = buildFile({ id: 'file-other', name: 'report.pdf' });

const FIXTURE_FILES = [
  invoiceContainsOlder,
  unrelated,
  invoiceContainsRecent,
  invoicePrefix,
];

test('exact-prefix outranks contains, then most-recent wins inside a tier', () => {
  const result = searchDriveFiles({ query: 'invoice', files: FIXTURE_FILES });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordId),
    ['file-prefix', 'file-contains-recent', 'file-contains-older'],
  );
  assert.equal(result.candidates[0].matchKind, 'PREFIX');
  assert.equal(result.candidates[0].matchedField, 'name');
  assert.equal(result.candidates[1].matchKind, 'CONTAINS');
  assert.equal(result.totalMatches, 3);
  assert.equal(result.truncated, false);
});

test('an exact file name is a prefix match and still ranks first', () => {
  const result = searchDriveFiles({
    query: 'invoice-2026.pdf',
    files: FIXTURE_FILES,
  });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordId),
    ['file-prefix'],
  );
});

test('matching is case- and whitespace-insensitive', () => {
  const result = searchDriveFiles({ query: '  INVOICE ', files: FIXTURE_FILES });

  assert.equal(result.totalMatches, 3);
  assert.equal(result.query, 'INVOICE');
});

test('the search also covers attribution and folder name', () => {
  const files = [
    buildFile({ id: 'by-source', sourceApp: 'bilan' }),
    buildFile({ id: 'by-folder', folderName: 'Factures 2026' }),
  ];

  const bySource = searchDriveFiles({ query: 'bilan', files });
  const byFolder = searchDriveFiles({ query: 'factures', files });

  assert.deepEqual(
    bySource.candidates.map((candidate) => candidate.recordId),
    ['by-source'],
  );
  assert.equal(bySource.candidates[0].matchedField, 'sourceApp');
  assert.deepEqual(
    byFolder.candidates.map((candidate) => candidate.recordId),
    ['by-folder'],
  );
  assert.equal(byFolder.candidates[0].matchedField, 'folderName');
});

test('every candidate carries the Drive deep-link path and its record id', () => {
  const result = searchDriveFiles({ query: 'invoice', files: FIXTURE_FILES });

  for (const candidate of result.candidates) {
    assert.equal(candidate.path, DRIVE_APP_PATH);
    assert.equal(candidate.path, '/drive');
  }
});

test('an empty result set is reported without candidates', () => {
  const result = searchDriveFiles({ query: 'zzz-none', files: FIXTURE_FILES });

  assert.deepEqual(result.candidates, []);
  assert.equal(result.totalMatches, 0);
  assert.equal(result.truncated, false);
});

test('a blank query returns nothing', () => {
  assert.deepEqual(searchDriveFiles({ query: '   ', files: FIXTURE_FILES }), {
    query: '',
    candidates: [],
    totalMatches: 0,
    truncated: false,
  });
});

test('the results are capped and truncation is reported', () => {
  const result = searchDriveFiles({
    query: 'invoice',
    files: FIXTURE_FILES,
    maxResults: 2,
  });

  assert.equal(result.candidates.length, 2);
  assert.equal(result.totalMatches, 3);
  assert.equal(result.truncated, true);
});

test('the source-app filter uses the resolved attribution', () => {
  const files = [
    buildFile({ id: 'drive-file', name: 'doc', sourceApp: 'drive' }),
    buildFile({ id: 'crm-file', name: 'doc', sourceApp: 'crm' }),
    buildFile({ id: 'implicit-crm', name: 'doc', sourceApp: 'crm' }),
  ];

  const result = searchDriveFiles({
    query: 'doc',
    files,
    filters: { sourceApp: 'CRM' },
  });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordId).sort(),
    ['crm-file', 'implicit-crm'],
  );
});

test('the folder filter keeps only that folder', () => {
  const files = [
    buildFile({ id: 'in-folder', name: 'invoice', folderId: 'folder-1' }),
    buildFile({ id: 'elsewhere', name: 'invoice', folderId: 'folder-2' }),
  ];

  const result = searchDriveFiles({
    query: 'invoice',
    files,
    filters: { folderId: 'folder-1' },
  });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordId),
    ['in-folder'],
  );
});

test('the type filter matches mime, category, stored or name extension', () => {
  const files = [
    buildFile({ id: 'by-mime', name: 'file', mimeType: 'application/pdf' }),
    buildFile({ id: 'by-category', name: 'file', fileCategory: 'IMAGE' }),
    buildFile({ id: 'by-stored-extension', name: 'file', extension: 'pdf' }),
    buildFile({ id: 'by-name-extension', name: 'file.pdf' }),
    buildFile({ id: 'no-match', name: 'file.txt' }),
  ];

  const pdfResult = searchDriveFiles({
    query: 'file',
    files,
    filters: { type: 'pdf' },
  });
  const imageResult = searchDriveFiles({
    query: 'file',
    files,
    filters: { type: 'image' },
  });

  assert.deepEqual(
    pdfResult.candidates.map((candidate) => candidate.recordId).sort(),
    ['by-mime', 'by-name-extension', 'by-stored-extension'],
  );
  assert.deepEqual(
    imageResult.candidates.map((candidate) => candidate.recordId),
    ['by-category'],
  );
});

test('filters combine (source app + folder + type)', () => {
  const files = [
    buildFile({
      id: 'match',
      name: 'invoice.pdf',
      sourceApp: 'drive',
      folderId: 'folder-1',
      extension: 'pdf',
    }),
    buildFile({
      id: 'wrong-folder',
      name: 'invoice.pdf',
      sourceApp: 'drive',
      folderId: 'folder-2',
      extension: 'pdf',
    }),
    buildFile({
      id: 'wrong-source',
      name: 'invoice.pdf',
      sourceApp: 'chat',
      folderId: 'folder-1',
      extension: 'pdf',
    }),
  ];

  const result = searchDriveFiles({
    query: 'invoice',
    files,
    filters: { sourceApp: 'drive', folderId: 'folder-1', type: 'pdf' },
  });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordId),
    ['match'],
  );
});

test('attribution resolution prefers the explicit value then CRM then unknown', () => {
  assert.equal(
    resolveDriveSourceApp({ sourceApp: 'documents', hasTarget: true }),
    'documents',
  );
  assert.equal(resolveDriveSourceApp({ sourceApp: null, hasTarget: true }), 'crm');
  assert.equal(
    resolveDriveSourceApp({ sourceApp: null, hasTarget: false }),
    'unknown',
  );
});

test('file name display falls back to a stable id stub', () => {
  assert.equal(
    displayDriveFileName({ id: 'abcdefgh-1234', name: 'a.pdf' }),
    'a.pdf',
  );
  assert.equal(
    displayDriveFileName({ id: 'abcdefgh-1234', name: '  ' }),
    '#abcdefgh',
  );
});

test('extension parsing ignores dotfiles and trailing dots', () => {
  assert.equal(readDriveFileExtension('a.PDF'), 'pdf');
  assert.equal(readDriveFileExtension('.gitignore'), null);
  assert.equal(readDriveFileExtension('archive.'), null);
  assert.equal(readDriveFileExtension('no-extension'), null);
  assert.equal(readDriveFileExtension(null), null);
});
