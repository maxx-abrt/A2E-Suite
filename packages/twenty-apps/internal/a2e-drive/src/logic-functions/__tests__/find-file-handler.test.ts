import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findDriveFile } from '../handlers/find-file-handler.ts';
import {
  buildAttachment,
  buildAttachmentsResponse,
  buildFakeCoreClient,
  findQuery,
} from './drive-tool-test-fixtures.ts';

// Contract with the Core API: the caller-context `attachments` read returns a
// most-recent-first page filtered to non-archived rows, and the handler ranks
// it locally. Nothing in the handler writes.

const ARCHIVED_FILTER = { archivedAt: { is: 'NULL' } };

test('a keyword hit returns a ranked candidate with the Drive deep link', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({ id: 'file-1', name: 'Facture 2026.pdf' }),
      buildAttachment({ id: 'file-2', name: 'notes.txt' }),
    ]),
  });

  const result = await findDriveFile({ query: 'facture' }, client);

  assert.equal(result.status, 'FOUND');
  assert.equal(result.totalMatches, 1);
  assert.equal(result.candidates[0].recordId, 'file-1');
  assert.equal(result.candidates[0].name, 'Facture 2026.pdf');
  assert.equal(result.candidates[0].path, '/drive');
  assert.equal(result.candidates[0].matchKind, 'PREFIX');
});

test('the read excludes trashed files and is bounded, newest first', async () => {
  const { client, calls } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({ id: 'file-1', name: 'invoice.pdf' }),
    ]),
  });

  await findDriveFile({ query: 'invoice' }, client);

  const args = findQuery(calls, 'attachments')?.args as {
    filter?: unknown;
    orderBy?: unknown;
    first?: number;
  };

  assert.deepEqual(args.filter, ARCHIVED_FILTER);
  assert.deepEqual(args.orderBy, [{ createdAt: 'DescNullsLast' }]);
  assert.equal(typeof args.first, 'number');
  assert.ok((args.first ?? 0) > 0);
});

test('a file with no explicit source app but a CRM target is attributed to crm', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({
        id: 'file-1',
        name: 'invoice.pdf',
        sourceApp: null,
        targetPersonId: 'person-1',
      }),
    ]),
  });

  const result = await findDriveFile(
    { query: 'invoice', sourceApp: 'crm' },
    client,
  );

  assert.equal(result.status, 'FOUND');
  assert.equal(result.candidates[0].sourceApp, 'crm');
});

test('the optional filters combine over the resolved record', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({
        id: 'file-1',
        name: 'invoice.pdf',
        sourceApp: 'drive',
        folderId: 'folder-1',
        file: [{ label: 'invoice.pdf', extension: 'pdf' }],
      }),
      buildAttachment({
        id: 'file-2',
        name: 'invoice.pdf',
        sourceApp: 'chat',
        folderId: 'folder-1',
        file: [{ label: 'invoice.pdf', extension: 'pdf' }],
      }),
      buildAttachment({
        id: 'file-3',
        name: 'invoice.pdf',
        sourceApp: 'drive',
        folderId: 'folder-2',
        file: [{ label: 'invoice.pdf', extension: 'pdf' }],
      }),
    ]),
  });

  const result = await findDriveFile(
    { query: 'invoice', sourceApp: 'drive', folderId: 'folder-1', type: 'pdf' },
    client,
  );

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordId),
    ['file-1'],
  );
});

test('an unmatched query is an empty result, not an error', async () => {
  const { client } = buildFakeCoreClient({
    attachments: buildAttachmentsResponse([
      buildAttachment({ id: 'file-1', name: 'notes.txt' }),
    ]),
  });

  const result = await findDriveFile({ query: 'invoice' }, client);

  assert.equal(result.status, 'EMPTY');
  assert.deepEqual(result.candidates, []);
  assert.equal(result.totalMatches, 0);
});

test('a blank query is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({ attachments: {} });

  const result = await findDriveFile({ query: '   ' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(result.candidates, []);
  assert.equal(calls.length, 0);
});

test('a provided-but-blank optional filter is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({ attachments: {} });

  const byFolder = await findDriveFile(
    { query: 'invoice', folderId: '  ' },
    client,
  );
  const byType = await findDriveFile({ query: 'invoice', type: '' }, client);
  const bySource = await findDriveFile(
    { query: 'invoice', sourceApp: '  ' },
    client,
  );

  assert.equal(byFolder.status, 'INVALID_INPUT');
  assert.equal(byType.status, 'INVALID_INPUT');
  assert.equal(bySource.status, 'INVALID_INPUT');
  assert.equal(calls.length, 0);
});
