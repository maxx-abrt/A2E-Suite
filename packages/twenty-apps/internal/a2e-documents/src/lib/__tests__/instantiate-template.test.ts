import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_TEMPLATE_COPY_POSITION,
  buildTemplateCopyPayload,
  buildTemplateCopyTitle,
  readAuthorizedTemplateCopySource,
  remapTemplateBlockIds,
} from '../instantiate-template.ts';

const counterBlockIdFactory = (): (() => string) => {
  let counter = 0;

  return () => {
    const blockId = `copy-${counter}`;

    counter += 1;

    return blockId;
  };
};

test('the copy strips the template title prefix', () => {
  assert.equal(
    buildTemplateCopyTitle('Modèle — Notes de réunion'),
    'Notes de réunion',
  );
});

test('a plain title is used as-is', () => {
  assert.equal(buildTemplateCopyTitle('SOP Support'), 'SOP Support');
});

test('an empty title falls back to the default document title', () => {
  assert.equal(buildTemplateCopyTitle('Modèle — '), 'Nouveau document');
  assert.equal(buildTemplateCopyTitle(''), 'Nouveau document');
});

test('the payload demotes to DOCUMENT and copies the markdown body', () => {
  const payload = buildTemplateCopyPayload({
    title: 'Modèle — Notes de réunion',
    content: {
      blocknote: '[]',
      markdown: '# Notes de réunion',
    },
  });

  assert.deepEqual(payload, {
    title: 'Notes de réunion',
    kind: 'DOCUMENT',
    position: DEFAULT_TEMPLATE_COPY_POSITION,
    content: {
      blocknote: '[]',
      markdown: '# Notes de réunion',
    },
  });
});

test('the payload tolerates a template without content', () => {
  const payload = buildTemplateCopyPayload({
    title: 'Modèle — Vierge',
  });

  assert.deepEqual(payload.content, {
    blocknote: null,
    markdown: null,
  });
});

test('the caller can override the insertion position', () => {
  const payload = buildTemplateCopyPayload(
    { title: 'Modèle — X' },
    { position: 'a0' },
  );

  assert.equal(payload.position, 'a0');
});

test('the copy re-keys every block anchor', () => {
  const templateBody = JSON.stringify([
    { id: 'block-a', type: 'paragraph', content: [] },
  ]);

  const payload = buildTemplateCopyPayload(
    {
      title: 'Modèle — X',
      content: { blocknote: templateBody },
    },
    { createBlockId: counterBlockIdFactory() },
  );

  const copiedBlocks = JSON.parse(payload.content.blocknote ?? '[]') as {
    id: string;
  }[];

  assert.equal(copiedBlocks[0].id, 'copy-0');
  assert.equal(
    JSON.parse(templateBody)[0].id,
    'block-a',
    'the template body must stay untouched',
  );
});

test('nested children are re-keyed too', () => {
  const payload = buildTemplateCopyPayload(
    {
      title: 'Modèle — X',
      content: {
        blocknote: JSON.stringify([
          {
            id: 'parent-1',
            type: 'paragraph',
            children: [{ id: 'child-1', type: 'paragraph', content: [] }],
          },
        ]),
      },
    },
    { createBlockId: counterBlockIdFactory() },
  );

  const copiedBlocks = JSON.parse(payload.content.blocknote ?? '[]') as {
    id: string;
    children: { id: string }[];
  }[];

  assert.notEqual(copiedBlocks[0].id, 'parent-1');
  assert.notEqual(copiedBlocks[0].children[0].id, 'child-1');
});

test('internal block references are remapped with their target', () => {
  const payload = buildTemplateCopyPayload(
    {
      title: 'Modèle — X',
      content: {
        blocknote: JSON.stringify([
          {
            id: 'block-a',
            type: 'paragraph',
            props: { reference: 'block-b' },
            content: [],
          },
          { id: 'block-b', type: 'paragraph', content: [] },
        ]),
      },
    },
    { createBlockId: counterBlockIdFactory() },
  );

  const copiedBlocks = JSON.parse(payload.content.blocknote ?? '[]') as {
    id: string;
    props?: { reference?: string };
  }[];

  assert.equal(copiedBlocks[0].props?.reference, 'copy-1');
});

test('comment thread identifiers are never remapped', () => {
  const payload = buildTemplateCopyPayload(
    {
      title: 'Modèle — X',
      content: {
        blocknote: JSON.stringify([
          {
            id: 'block-a',
            type: 'paragraph',
            props: { threadId: 'block-a' },
            content: [],
          },
        ]),
      },
    },
    { createBlockId: counterBlockIdFactory() },
  );

  const copiedBlocks = JSON.parse(payload.content.blocknote ?? '[]') as {
    id: string;
    props?: { threadId?: string };
  }[];

  assert.notEqual(copiedBlocks[0].id, 'block-a');
  assert.equal(copiedBlocks[0].props?.threadId, 'block-a');
});

test('malformed or non-array blocknote is refused, not copied', () => {
  assert.equal(remapTemplateBlockIds('not json'), null);
  assert.equal(remapTemplateBlockIds('{"blocks":[]}'), null);
  assert.equal(remapTemplateBlockIds('   '), null);
  assert.equal(remapTemplateBlockIds(null), null);
});

test('a template with corrupt blocknote keeps its markdown', () => {
  const payload = buildTemplateCopyPayload({
    title: 'Modèle — X',
    content: { blocknote: 'not json', markdown: '# X' },
  });

  assert.equal(payload.content.blocknote, null);
  assert.equal(payload.content.markdown, '# X');
});

test('relations and system fields never travel into the copy', () => {
  const sourceWithRelations = {
    id: 'template-1',
    title: 'Modèle — X',
    kind: 'TEMPLATE',
    isFavorite: true,
    archivedAt: '2026-01-01T00:00:00.000Z',
    parentId: 'parent-1',
    companyId: 'company-1',
    personId: 'person-1',
    content: { blocknote: null, markdown: null },
  };

  const payload = buildTemplateCopyPayload(sourceWithRelations);

  assert.deepEqual(Object.keys(payload).sort(), [
    'content',
    'kind',
    'position',
    'title',
  ]);
});

test('a null authorized fetch means the template body is unreadable', () => {
  assert.equal(readAuthorizedTemplateCopySource(null), null);
  assert.equal(readAuthorizedTemplateCopySource(undefined), null);
});

test('the authorized source keeps the fetched body and tolerates no content', () => {
  assert.deepEqual(
    readAuthorizedTemplateCopySource({
      id: 'template-1',
      title: 'Modèle — X',
      content: { blocknote: '[]', markdown: '# X' },
    }),
    { title: 'Modèle — X', content: { blocknote: '[]', markdown: '# X' } },
  );

  assert.deepEqual(
    readAuthorizedTemplateCopySource({ id: 'template-2', title: 'Modèle — Y' }),
    { title: 'Modèle — Y', content: null },
  );
});

test('editing a copy never mutates its template', () => {
  const templateBody = JSON.stringify([
    { id: 'block-a', type: 'paragraph', content: [] },
  ]);
  const template = {
    title: 'Modèle — X',
    content: { blocknote: templateBody, markdown: '# X' },
  };

  const firstCopy = buildTemplateCopyPayload(template, {
    createBlockId: counterBlockIdFactory(),
  });
  const secondCopy = buildTemplateCopyPayload(template, {
    createBlockId: counterBlockIdFactory(),
  });

  const firstBlocks = JSON.parse(firstCopy.content.blocknote ?? '[]') as {
    content: unknown[];
  }[];
  firstBlocks[0].content.push({ type: 'text', text: 'edit', styles: {} });

  assert.equal(template.content.blocknote, templateBody);

  const secondBlocks = JSON.parse(secondCopy.content.blocknote ?? '[]') as {
    content: unknown[];
  }[];

  assert.equal(secondBlocks[0].content.length, 0);
});
