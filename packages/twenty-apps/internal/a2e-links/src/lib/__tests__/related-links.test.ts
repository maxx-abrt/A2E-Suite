import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRelatedLinksGraphqlQuery,
  countRelatedLinks,
  createEmptyRelatedLinks,
  isRelatedLinkedObjectNameSingular,
  mapRelatedLinkNode,
  mapRelatedLinksRootRecord,
  readRelatedLinks,
  type RelatedLinksClient,
} from '../related-links.ts';
import {
  buildRelatedLinkRecordInput,
  buildRelatedTargetSearchQuery,
  mapRelatedTargetSearchResults,
  mergeRelatedTargetResults,
  searchRelatedLinkTargets,
} from '../related-links-targets.ts';

const linkNode = (overrides: Record<string, unknown>) => ({
  id: 'link-1',
  label: null,
  linkType: 'USER_LINK',
  sourceDocument: null,
  sourceTask: null,
  targetDocument: null,
  targetTask: null,
  ...overrides,
});

test('an outbound junction row resolves its target leg', () => {
  const link = mapRelatedLinkNode(
    linkNode({
      targetTask: { id: 'task-1', title: 'Préparer la réunion' },
    }),
    'outbound',
  );

  assert.deepEqual(link, {
    linkId: 'link-1',
    direction: 'outbound',
    linkType: 'USER_LINK',
    label: null,
    objectNameSingular: 'task',
    recordId: 'task-1',
    title: 'Préparer la réunion',
  });
});

test('an inbound junction row resolves its source leg (backlink)', () => {
  const link = mapRelatedLinkNode(
    linkNode({
      sourceDocument: { id: 'doc-1', title: 'Compte rendu' },
    }),
    'inbound',
  );

  assert.equal(link?.direction, 'inbound');
  assert.equal(link?.objectNameSingular, 'document');
  assert.equal(link?.recordId, 'doc-1');
});

test('a row whose other side is unreadable is dropped, never leaked', () => {
  // The server resolves an unauthorized relation to null: the row must vanish
  // rather than render a dangling or private link.
  const link = mapRelatedLinkNode(
    linkNode({ targetDocument: null, targetTask: null }),
    'outbound',
  );

  assert.equal(link, null);
});

test('a malformed row without an id is dropped', () => {
  const link = mapRelatedLinkNode(
    linkNode({ id: null, targetTask: { id: 'task-1', title: 'x' } }),
    'outbound',
  );

  assert.equal(link, null);
});

test('the root record maps both directions and drops permission-null rows', () => {
  const links = mapRelatedLinksRootRecord({
    outgoingLinks: {
      edges: [
        { node: linkNode({ id: 'o1', targetTask: { id: 't1', title: 'A' } }) },
        {
          node: linkNode({
            id: 'o2',
            targetDocument: null,
            targetTask: null,
          }),
        },
      ],
    },
    incomingLinks: {
      edges: [
        {
          node: linkNode({
            id: 'i1',
            sourceDocument: { id: 'd1', title: 'B' },
          }),
        },
      ],
    },
  });

  assert.equal(links.outbound.length, 1);
  assert.equal(links.outbound[0].recordId, 't1');
  assert.equal(links.inbound.length, 1);
  assert.equal(links.inbound[0].recordId, 'd1');
});

test('only the declared consumer targets have a Related surface', () => {
  assert.equal(isRelatedLinkedObjectNameSingular('document'), true);
  assert.equal(isRelatedLinkedObjectNameSingular('task'), true);
  assert.equal(isRelatedLinkedObjectNameSingular('company'), false);
});

test('the graphql query reads the inverse relations of the current object', () => {
  const query = buildRelatedLinksGraphqlQuery('task', 'task-9');

  assert.deepEqual(
    (query.task as { __args: unknown }).__args,
    { filter: { id: { eq: 'task-9' } } },
  );
  const selection = query.task as Record<string, unknown>;
  assert.ok('outgoingLinks' in selection);
  assert.ok('incomingLinks' in selection);
});

test('readRelatedLinks maps a junction result into outbound and inbound', async () => {
  const client: RelatedLinksClient = {
    query: (async () => ({
      document: {
        outgoingLinks: {
          edges: [{ node: linkNode({ id: 'o1', targetTask: { id: 't1', title: 'T' } }) }],
        },
        incomingLinks: {
          edges: [{ node: linkNode({ id: 'i1', sourceTask: { id: 't2', title: 'S' } }) }],
        },
      },
    })) as never,
  };

  const links = await readRelatedLinks(client, {
    objectNameSingular: 'document',
    recordId: 'doc-1',
  });

  assert.equal(countRelatedLinks(links), 2);
  assert.equal(links.outbound[0].recordId, 't1');
  assert.equal(links.inbound[0].recordId, 't2');
});

test('readRelatedLinks refuses an object that owns no inverse fields', async () => {
  let called = false;
  const client: RelatedLinksClient = {
    query: (async () => {
      called = true;
      return {};
    }) as never,
  };

  const links = await readRelatedLinks(client, {
    objectNameSingular: 'company',
    recordId: 'company-1',
  });

  assert.equal(called, false);
  assert.deepEqual(links, { outbound: [], inbound: [] });
});

test('readRelatedLinks degrades to empty when the junction query fails (uninstall)', async () => {
  const client: RelatedLinksClient = {
    query: (async () => {
      throw new Error('object not found');
    }) as never,
  };

  const links = await readRelatedLinks(client, {
    objectNameSingular: 'document',
    recordId: 'doc-1',
  });

  assert.deepEqual(links, createEmptyRelatedLinks());
});

test('buildRelatedLinkRecordInput writes the morph foreign keys and the dedup key', () => {
  const input = buildRelatedLinkRecordInput({
    sourceObjectNameSingular: 'document',
    sourceRecordId: 'd1',
    targetObjectNameSingular: 'task',
    targetRecordId: 't1',
  });

  assert.deepEqual(input, {
    linkKey: 'document:d1:task:t1',
    linkType: 'USER_LINK',
    sourceDocumentId: 'd1',
    targetTaskId: 't1',
  });
});

test('buildRelatedLinkRecordInput refuses an undeclared object and a self-link', () => {
  assert.equal(
    buildRelatedLinkRecordInput({
      sourceObjectNameSingular: 'document',
      sourceRecordId: 'd1',
      targetObjectNameSingular: 'company',
      targetRecordId: 'c1',
    }),
    null,
  );
  assert.equal(
    buildRelatedLinkRecordInput({
      sourceObjectNameSingular: 'task',
      sourceRecordId: 't1',
      targetObjectNameSingular: 'task',
      targetRecordId: 't1',
    }),
    null,
  );
});

test('the target search query filters on title and bounds the page', () => {
  const query = buildRelatedTargetSearchQuery('document', 'rapport');

  assert.deepEqual(
    (query.documents as { __args: unknown }).__args,
    { filter: { title: { ilike: '%rapport%' } }, first: 10 },
  );
});

test('search merges objects, dedupes and excludes the current record', async () => {
  const client = {
    query: (async (query: Record<string, unknown>) => {
      if ('documents' in query) {
        return {
          documents: {
            edges: [
              { node: { id: 'd1', title: 'Rapport' } },
              { node: { id: 'self', title: 'Moi' } },
            ],
          },
        };
      }

      return {
        tasks: { edges: [{ node: { id: 't1', title: 'Tâche' } }] },
      };
    }) as never,
  };

  const targets = await searchRelatedLinkTargets(client, {
    searchText: 'ra',
    exclude: { objectNameSingular: 'document', recordId: 'self' },
  });

  assert.deepEqual(
    targets.map((target) => target.recordId).sort(),
    ['d1', 't1'],
  );
});

test('search skips an object whose query fails instead of failing the whole search', async () => {
  const client = {
    query: (async (query: Record<string, unknown>) => {
      if ('documents' in query) {
        throw new Error('denied');
      }

      return { tasks: { edges: [{ node: { id: 't1', title: 'Tâche' } }] } };
    }) as never,
  };

  const targets = await searchRelatedLinkTargets(client, {
    searchText: 'a',
    exclude: { objectNameSingular: 'document', recordId: 'self' },
  });

  assert.deepEqual(targets, [
    { objectNameSingular: 'task', recordId: 't1', title: 'Tâche' },
  ]);
});

test('mapRelatedTargetSearchResults drops rows without an id', () => {
  const targets = mapRelatedTargetSearchResults('document', {
    edges: [{ node: { id: null, title: 'x' } }, { node: { id: 'd1', title: null } }],
  });

  assert.deepEqual(targets, [
    { objectNameSingular: 'document', recordId: 'd1', title: '' },
  ]);
});

test('mergeRelatedTargetResults dedupes across lists', () => {
  const merged = mergeRelatedTargetResults(
    [
      [{ objectNameSingular: 'task', recordId: 't1', title: 'A' }],
      [{ objectNameSingular: 'task', recordId: 't1', title: 'A' }],
    ],
    { objectNameSingular: 'document', recordId: 'self' },
  );

  assert.equal(merged.length, 1);
});
