import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDedupeHints } from '../handlers/dedupe-hints-handler.ts';
import {
  buildAttachment,
  buildAttachmentsResponse,
  buildFakeCoreClient,
} from './drive-tool-test-fixtures.ts';

test('an attachment page is grouped into duplicate hints', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({ id: 'file-1', name: 'Facture 2026.pdf' }),
      buildAttachment({ id: 'file-2', name: 'facture 2026.PDF' }),
      buildAttachment({ id: 'file-3', name: 'notes.txt' }),
    ]),
  });

  const result = await buildDedupeHints({}, client);

  assert.equal(result.status, 'OK');
  assert.deepEqual(result.groups, [
    {
      normalizedName: 'facture 2026',
      extension: 'pdf',
      folderId: null,
      recordIds: ['file-1', 'file-2'],
    },
  ]);
  assert.equal(result.duplicateFileCount, 2);
  assert.equal(result.scannedFileCount, 3);
});

test('a no-op singleton never becomes a hint', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({ id: 'file-1', name: 'unique.pdf' }),
    ]),
  });

  const result = await buildDedupeHints({}, client);

  assert.deepEqual(result.groups, []);
  assert.equal(result.duplicateFileCount, 0);
});

test('a folder scope limits the scan and is echoed back', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({
        id: 'file-1',
        name: 'invoice.pdf',
        folderId: 'folder-1',
      }),
      buildAttachment({
        id: 'file-2',
        name: 'invoice.pdf',
        folderId: 'folder-1',
      }),
      buildAttachment({
        id: 'file-3',
        name: 'invoice.pdf',
        folderId: 'folder-2',
      }),
      buildAttachment({
        id: 'file-4',
        name: 'invoice.pdf',
        folderId: 'folder-2',
      }),
    ]),
  });

  const result = await buildDedupeHints({ folderId: 'folder-1' }, client);

  assert.equal(result.folderId, 'folder-1');
  assert.deepEqual(result.groups, [
    {
      normalizedName: 'invoice',
      extension: 'pdf',
      folderId: 'folder-1',
      recordIds: ['file-1', 'file-2'],
    },
  ]);
  assert.equal(result.scannedFileCount, 2);
});

test('a blank folder scope is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({ attachments: {} });

  const result = await buildDedupeHints({ folderId: '   ' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(result.groups, []);
  assert.equal(calls.length, 0);
});
