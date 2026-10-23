import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSubventionCatalogPage } from '../subvention-catalog.ts';

const filters = {
  query: '',
  audience: '',
  onlyCalls: false,
  cursor: null,
  now: new Date('2026-10-23T14:00:00Z'),
};

test('reads real native records with cursor pagination instead of silently stopping at thirty', async () => {
  const calls: Record<string, unknown>[] = [];
  const client = {
    query: async (selection: Record<string, unknown>) => {
      calls.push(selection);
      return {
        subventions: {
          edges: Array.from(
            { length: calls.length === 1 ? 30 : 2 },
            (_, index) => ({
              cursor: `cursor-${index}`,
              node: { id: `aid-${calls.length}-${index}`, title: 'Funding' },
            }),
          ),
        },
      };
    },
  };
  const first = await loadSubventionCatalogPage(client, filters);
  assert.equal(first.records.length, 30);
  assert.equal(first.nextCursor, 'cursor-29');
  assert.equal(first.hasMore, true);
  const second = await loadSubventionCatalogPage(client, {
    ...filters,
    cursor: first.nextCursor,
  });
  assert.equal(second.records.length, 2);
  assert.equal(second.hasMore, false);
  const selection = calls[1].subventions as { __args: { after: string } };
  assert.equal(selection.__args.after, 'cursor-29');
});

test('combines live funding, inclusive last-day deadlines, audience and accent-insensitive search', async () => {
  let selectedFilter: Record<string, unknown> = {};
  const client = {
    query: async (selection: Record<string, unknown>) => {
      selectedFilter = (
        selection.subventions as { __args: { filter: Record<string, unknown> } }
      ).__args.filter;
      return { subventions: { edges: [] } };
    },
  };
  await loadSubventionCatalogPage(client, {
    ...filters,
    query: ' Éducation ',
    audience: 'ASSOCIATION',
    onlyCalls: true,
  });
  assert.deepEqual(selectedFilter, {
    isLive: { eq: true },
    or: [
      { submissionDeadline: { is: 'NULL' } },
      { submissionDeadline: { gte: '2026-10-23T00:00:00.000Z' } },
    ],
    searchText: { ilike: '%education%' },
    audiences: { containsAny: ['ASSOCIATION'] },
    isCallForProject: { eq: true },
  });
});

test('an unavailable catalogue is an error, not an empty catalogue', async () => {
  await assert.rejects(
    loadSubventionCatalogPage({ query: async () => ({}) }, filters),
    /catalogue n’a pas répondu/,
  );
});
