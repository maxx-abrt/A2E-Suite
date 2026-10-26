import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDocumentDuplicateTitle,
  buildDocumentSubtreeDuplicatePlan,
  type DuplicateSourceNode,
} from '../document-duplicate.ts';

const readBlockIds = (blocknote: string | null): string[] => {
  if (blocknote === null) {
    return [];
  }

  const collect = (blocks: unknown): string[] => {
    if (!Array.isArray(blocks)) {
      return [];
    }

    return blocks.flatMap((block) => {
      const record = block as { id?: string; children?: unknown };

      return [record.id ?? '', ...collect(record.children)];
    });
  };

  return collect(JSON.parse(blocknote));
};

const sourceContent = JSON.stringify([
  { id: 'root-block', type: 'paragraph', content: [] },
  {
    id: 'child-block',
    type: 'paragraph',
    content: [],
    children: [{ id: 'grandchild-block' }],
  },
]);

const root: DuplicateSourceNode = {
  id: 'root',
  title: 'Notes de réunion',
  content: { blocknote: sourceContent, markdown: '# Notes' },
};

const childrenByParentId = new Map<string | null, DuplicateSourceNode[]>([
  [
    'root',
    [
      {
        id: 'child-1',
        title: 'Ordre du jour',
        content: { blocknote: sourceContent, markdown: null },
      },
      {
        id: 'child-2',
        title: 'Décisions',
        content: { blocknote: null, markdown: 'texte' },
      },
    ],
  ],
]);

test('buildDocumentDuplicateTitle appends the copy suffix once', () => {
  assert.equal(buildDocumentDuplicateTitle('Notes'), 'Notes (copie)');
  assert.equal(
    buildDocumentDuplicateTitle('Modèle — Notes'),
    'Notes (copie)',
  );
});

test('the duplicate plan copies the page and every child in parent-first order', () => {
  const plan = buildDocumentSubtreeDuplicatePlan({
    root,
    childrenByParentId,
  });

  assert.equal(plan.nodes.length, 3);
  assert.equal(plan.nodes[0].title, 'Notes de réunion (copie)');
  assert.equal(plan.nodes[0].parentIndex, null);
  assert.deepEqual(
    plan.nodes.slice(1).map((node) => [node.title, node.parentIndex]),
    [
      ['Ordre du jour', 0],
      ['Décisions', 0],
    ],
  );
  assert.equal(plan.nodes[0].position, 'last');
  assert.ok(plan.nodes[1].position < plan.nodes[2].position);
});

test('duplicated content gets fresh block ids, never the source anchors', () => {
  const plan = buildDocumentSubtreeDuplicatePlan({
    root,
    childrenByParentId,
  });

  const sourceIds = readBlockIds(sourceContent).filter((id) => id !== '');
  const copiedIds = readBlockIds(plan.nodes[0].content.blocknote).filter(
    (id) => id !== '',
  );

  assert.equal(copiedIds.length, sourceIds.length);
  assert.equal(
    copiedIds.every((id) => !sourceIds.includes(id)),
    true,
  );
  assert.equal(new Set(copiedIds).size, copiedIds.length);
});

test('an injected block id generator keeps duplicates deterministic', () => {
  let counter = 0;
  const createBlockId = (): string => `fresh-${(counter += 1)}`;

  const first = buildDocumentSubtreeDuplicatePlan({
    root,
    childrenByParentId: new Map(),
    createBlockId,
  });

  assert.deepEqual(readBlockIds(first.nodes[0].content.blocknote), [
    'fresh-1',
    'fresh-2',
    'fresh-3',
  ]);
});

test('a page with no children duplicates as a single node', () => {
  const plan = buildDocumentSubtreeDuplicatePlan({
    root,
    childrenByParentId: new Map(),
  });

  assert.equal(plan.nodes.length, 1);
  assert.equal(plan.nodes[0].parentIndex, null);
  assert.equal(plan.nodes[0].content.markdown, '# Notes');
});
