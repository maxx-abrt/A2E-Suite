import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildNoteSourceHref,
  buildRecordNoteCopyContent,
  buildRecordNoteCopyPayload,
  buildRecordSourceHref,
  buildRecordSourceLinkBlock,
  DEFAULT_DOCUMENT_TITLE,
  readRecordNoteCopyInput,
  resolveRecordLabel,
  type SourceRecordShape,
} from '../record-note-copy.ts';

const blocknoteBody = (blocks: unknown): string => JSON.stringify(blocks);

test('a company name resolves to its text label', () => {
  assert.equal(resolveRecordLabel({ name: '  Acme  ' }), 'Acme');
});

test('a person full name resolves to a joined label', () => {
  assert.equal(
    resolveRecordLabel({ name: { firstName: 'Ada', lastName: 'Lovelace' } }),
    'Ada Lovelace',
  );
  assert.equal(resolveRecordLabel({ name: { firstName: 'Ada' } }), 'Ada');
  assert.equal(
    resolveRecordLabel({ name: { firstName: '', lastName: 'Lovelace' } }),
    'Lovelace',
  );
});

test('a missing or empty name resolves to an empty label', () => {
  assert.equal(resolveRecordLabel(null), '');
  assert.equal(resolveRecordLabel(undefined), '');
  assert.equal(resolveRecordLabel({}), '');
  assert.equal(resolveRecordLabel({ name: { firstName: null } }), '');
});

test('source hrefs point at the singular record routes', () => {
  assert.equal(
    buildRecordSourceHref('company', 'company-1'),
    '/object/company/company-1',
  );
  assert.equal(
    buildRecordSourceHref('person', 'person-1'),
    '/object/person/person-1',
  );
  assert.equal(buildNoteSourceHref('note-1'), '/object/note/note-1');
});

test('a missing noteTargets connection means notes are not readable', () => {
  const input = readRecordNoteCopyInput({ name: 'Acme' });

  assert.equal(input.canReadSourceNotes, false);
  assert.deepEqual(input.notes, []);
  assert.equal(input.recordName, 'Acme');
});

test('an empty noteTargets connection means readable but without notes', () => {
  const input = readRecordNoteCopyInput({
    name: 'Acme',
    noteTargets: { edges: [] },
  });

  assert.equal(input.canReadSourceNotes, true);
  assert.deepEqual(input.notes, []);
});

test('noteTargets edges map to their note nodes and drop empty nodes', () => {
  const sourceRecord: SourceRecordShape = {
    name: 'Acme',
    noteTargets: {
      edges: [
        { node: { note: { id: 'note-1', title: 'Kickoff' } } },
        { node: null },
        {},
        { node: { note: { id: '', title: 'Broken' } } },
        { node: { note: { id: 'note-2', title: 'Follow-up' } } },
      ],
    },
  };

  const input = readRecordNoteCopyInput(sourceRecord);

  assert.equal(input.canReadSourceNotes, true);
  assert.deepEqual(
    input.notes.map((note) => note.id),
    ['note-1', 'note-2'],
  );
});

test('content copies one note body behind a linked heading', () => {
  const content = buildRecordNoteCopyContent(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: 'Acme',
      notes: [
        {
          id: 'note-1',
          title: 'Kickoff',
          bodyV2: {
            blocknote: blocknoteBody([{ id: 'b1', type: 'paragraph' }]),
            markdown: '# Kickoff\n\nHello',
          },
        },
      ],
    },
    { canReadSourceNotes: true },
  );

  const blocks = JSON.parse(content.blocknote ?? '[]');

  assert.deepEqual(
    blocks.map((block: { type: string }) => block.type),
    ['paragraph', 'heading', 'paragraph'],
  );
  assert.equal(blocks[0].id, 'a2e-record-source-link');
  assert.equal(blocks[0].content[0].text, 'Source : ');
  assert.deepEqual(blocks[0].content[1], {
    type: 'link',
    href: '/object/company/company-1',
    content: [{ type: 'text', text: 'Acme', styles: {} }],
  });
  assert.equal(blocks[1].id, 'a2e-note-heading-note-1');
  assert.equal(blocks[1].props.level, 3);
  assert.equal(blocks[1].content[0].href, '/object/note/note-1');
  assert.equal(blocks[1].content[0].content[0].text, 'Kickoff');
  assert.equal(blocks[2].id, 'b1');
  assert.equal(
    content.markdown,
    'Source : [Acme](/object/company/company-1)\n\n# Kickoff\n\nHello',
  );
});

test('content tolerates a note without a title or body', () => {
  const content = buildRecordNoteCopyContent(
    {
      objectNameSingular: 'person',
      recordId: 'person-1',
      recordName: 'Ada Lovelace',
      notes: [{ id: 'note-1' }],
    },
    { canReadSourceNotes: true },
  );

  const blocks = JSON.parse(content.blocknote ?? '[]');

  assert.deepEqual(
    blocks.map((block: { type: string }) => block.type),
    ['paragraph', 'heading'],
  );
  assert.equal(blocks[1].content[0].content[0].text, 'Note');
  assert.equal(
    content.markdown,
    'Source : [Ada Lovelace](/object/person/person-1)',
  );
});

test('content ignores a malformed note blocknote body', () => {
  const content = buildRecordNoteCopyContent(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: 'Acme',
      notes: [
        {
          id: 'note-1',
          title: 'Broken',
          bodyV2: { blocknote: '{not json', markdown: null },
        },
      ],
    },
    { canReadSourceNotes: true },
  );

  const blocks = JSON.parse(content.blocknote ?? '[]');

  assert.deepEqual(
    blocks.map((block: { type: string }) => block.type),
    ['paragraph', 'heading'],
  );
});

test('content falls back to the default title without a record name', () => {
  const content = buildRecordNoteCopyContent(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: '   ',
      notes: [],
    },
    { canReadSourceNotes: true },
  );

  const blocks = JSON.parse(content.blocknote ?? '[]');

  assert.equal(blocks[0].content[1].content[0].text, DEFAULT_DOCUMENT_TITLE);
  assert.equal(
    content.markdown,
    `Source : [${DEFAULT_DOCUMENT_TITLE}](/object/company/company-1)`,
  );
});

test('content copies no note body when notes are not readable', () => {
  const content = buildRecordNoteCopyContent(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: 'Acme',
      notes: [
        {
          id: 'note-1',
          title: 'Kickoff',
          bodyV2: {
            blocknote: blocknoteBody([{ id: 'b1', type: 'paragraph' }]),
            markdown: 'secret',
          },
        },
      ],
    },
    { canReadSourceNotes: false },
  );

  const blocks = JSON.parse(content.blocknote ?? '[]');

  assert.deepEqual(
    blocks.map((block: { type: string }) => block.type),
    ['paragraph'],
  );
  assert.equal(
    content.markdown,
    'Source : [Acme](/object/company/company-1)',
  );
});

test('the source link block carries the record href', () => {
  const block = buildRecordSourceLinkBlock({
    objectNameSingular: 'person',
    recordId: 'person-1',
    recordName: 'Ada',
  });

  const content = block.content as { href: string }[];

  assert.equal(content[1].href, '/object/person/person-1');
});

test('the company payload links the document through companyId', () => {
  const payload = buildRecordNoteCopyPayload(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: 'Acme',
      notes: [],
    },
    { canReadSourceRecord: true, canReadSourceNotes: true },
  );

  assert.notEqual(payload, null);
  assert.equal(payload?.title, 'Acme');
  assert.equal(payload?.companyId, 'company-1');
  assert.equal(payload?.personId, undefined);
  assert.equal(typeof payload?.position, 'string');
});

test('the person payload links the document through personId', () => {
  const payload = buildRecordNoteCopyPayload(
    {
      objectNameSingular: 'person',
      recordId: 'person-1',
      recordName: 'Ada Lovelace',
      notes: [],
    },
    { canReadSourceRecord: true, canReadSourceNotes: true },
  );

  assert.equal(payload?.personId, 'person-1');
  assert.equal(payload?.companyId, undefined);
});

test('the payload fails closed when the source record is not readable', () => {
  const payload = buildRecordNoteCopyPayload(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: 'Acme',
      notes: [],
    },
    { canReadSourceRecord: false, canReadSourceNotes: true },
  );

  assert.equal(payload, null);
});

test('the caller can override the insertion position', () => {
  const payload = buildRecordNoteCopyPayload(
    {
      objectNameSingular: 'company',
      recordId: 'company-1',
      recordName: 'Acme',
      notes: [],
    },
    { canReadSourceRecord: true, canReadSourceNotes: true },
    { position: 'a0' },
  );

  assert.equal(payload?.position, 'a0');
});
