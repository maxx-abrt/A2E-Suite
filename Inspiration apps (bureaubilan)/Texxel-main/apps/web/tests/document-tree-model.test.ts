import { describe, it, expect } from 'vitest';
import {
  isDescendant,
  selectedTreeRoots,
  planTreeMove,
  flattenTree,
  type TreeNode,
  type TreeMove,
} from '@/lib/document-tree-model';

describe('document-tree-model', () => {
  const createNode = (id: string, parentId?: string, sortKey?: string): TreeNode => ({
    _id: id,
    parentId,
    sortKey,
    createdAt: Date.now(),
  });

  describe('isDescendant', () => {
    it('should detect direct parent-child relationship', () => {
      const nodes = new Map([
        ['parent', createNode('parent')],
        ['child', createNode('child', 'parent')],
      ]);
      expect(isDescendant(nodes, 'parent', 'child')).toBe(true);
      expect(isDescendant(nodes, 'child', 'parent')).toBe(false);
    });

    it('should detect multi-level descendant', () => {
      const nodes = new Map([
        ['root', createNode('root')],
        ['child', createNode('child', 'root')],
        ['grandchild', createNode('grandchild', 'child')],
      ]);
      expect(isDescendant(nodes, 'root', 'grandchild')).toBe(true);
      expect(isDescendant(nodes, 'child', 'grandchild')).toBe(true);
      expect(isDescendant(nodes, 'grandchild', 'root')).toBe(false);
    });

    it('should detect cycles', () => {
      const nodes = new Map([
        ['a', createNode('a', 'b')],
        ['b', createNode('b', 'c')],
        ['c', createNode('c', 'a')],
      ]);
      // When checking if 'x' is ancestor of 'a', it will traverse a->b->c->a and detect cycle
      expect(() => isDescendant(nodes, 'x', 'a')).toThrow('cycle');
    });

    it('should return false for unrelated nodes', () => {
      const nodes = new Map([
        ['a', createNode('a')],
        ['b', createNode('b')],
      ]);
      expect(isDescendant(nodes, 'a', 'b')).toBe(false);
    });

    it('should return false when target node is missing', () => {
      const nodes = new Map([
        ['a', createNode('a')],
        ['b', createNode('b', 'a')],
      ]);
      // Target 'd' doesn't exist in the map
      expect(isDescendant(nodes, 'a', 'd')).toBe(false);
    });
  });

  describe('selectedTreeRoots', () => {
    it('should return root nodes when parent is not selected', () => {
      const docs = [
        createNode('parent', undefined, 'a'),
        createNode('child', 'parent', 'b'),
      ];
      const roots = selectedTreeRoots(docs, ['parent', 'child']);
      expect(roots).toEqual(['parent']);
    });

    it('should exclude archived nodes', () => {
      const docs = [
        { ...createNode('a', undefined, 'a'), isArchived: true },
        createNode('b', undefined, 'b'),
      ];
      const roots = selectedTreeRoots(docs, ['a', 'b']);
      expect(roots).toEqual(['b']);
    });

    it('should sort roots by sortKey', () => {
      const docs = [
        createNode('c', undefined, 'c'),
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
      ];
      const roots = selectedTreeRoots(docs, ['c', 'a', 'b']);
      expect(roots).toEqual(['a', 'b', 'c']);
    });
  });

  describe('planTreeMove', () => {
    it('should move document to root', () => {
      const docs = [
        createNode('a', undefined, 'a'),
        createNode('b', 'a', 'b'),
      ];
      const move: TreeMove = {
        documentIds: ['b'],
        targetId: undefined,
        zone: 'into',
      };
      const plan = planTreeMove(docs, move);
      expect(plan.parentId).toBeUndefined();
      expect(plan.movedIds).toEqual(['b']);
      expect(plan.patches).toHaveLength(1);
      expect(plan.patches[0]._id).toBe('b');
    });

    it('should move document before target', () => {
      const docs = [
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
        createNode('c', undefined, 'c'),
      ];
      const move: TreeMove = {
        documentIds: ['c'],
        targetId: 'b',
        zone: 'before',
      };
      const plan = planTreeMove(docs, move);
      expect(plan.movedIds).toEqual(['c']);
      const movedKey = plan.patches[0].sortKey;
      expect(movedKey > 'a').toBe(true);
      expect(movedKey < 'b').toBe(true);
    });

    it('should move document after target', () => {
      const docs = [
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
        createNode('c', undefined, 'c'),
      ];
      const move: TreeMove = {
        documentIds: ['a'],
        targetId: 'b',
        zone: 'after',
      };
      const plan = planTreeMove(docs, move);
      expect(plan.movedIds).toEqual(['a']);
      const movedKey = plan.patches[0].sortKey;
      expect(movedKey > 'b').toBe(true);
      expect(movedKey < 'c').toBe(true);
    });

    it('should move document into target', () => {
      const docs = [
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
      ];
      const move: TreeMove = {
        documentIds: ['b'],
        targetId: 'a',
        zone: 'into',
      };
      const plan = planTreeMove(docs, move);
      expect(plan.parentId).toBe('a');
      expect(plan.movedIds).toEqual(['b']);
    });

    it('should prevent moving into descendant', () => {
      const docs = [
        createNode('parent', undefined, 'a'),
        createNode('child', 'parent', 'b'),
      ];
      const move: TreeMove = {
        documentIds: ['parent'],
        targetId: 'child',
        zone: 'into',
      };
      expect(() => planTreeMove(docs, move)).toThrow('descendants');
    });

    it('should prevent moving onto selection', () => {
      const docs = [
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
      ];
      const move: TreeMove = {
        documentIds: ['a', 'b'],
        targetId: 'a',
        zone: 'before',
      };
      expect(() => planTreeMove(docs, move)).toThrow('onto the selection');
    });

    it('should reject archived documents', () => {
      const docs = [
        { ...createNode('a', undefined, 'a'), isArchived: true },
      ];
      const move: TreeMove = {
        documentIds: ['a'],
        targetId: undefined,
        zone: 'into',
      };
      expect(() => planTreeMove(docs, move)).toThrow('no longer available');
    });

    it('should handle 100 repeated moves without error', () => {
      let docs = [
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
      ];

      for (let i = 0; i < 100; i++) {
        const move: TreeMove = {
          documentIds: ['b'],
          targetId: 'a',
          zone: i % 2 === 0 ? 'before' : 'after',
        };
        const plan = planTreeMove(docs, move);
        
        // Apply patches
        docs = docs.map(doc => {
          const patch = plan.patches.find(p => p._id === doc._id);
          return patch ? { ...doc, ...patch } : doc;
        });

        expect(plan.patches).toHaveLength(1);
        expect(plan.patches[0].sortKey.length).toBeLessThan(48);
      }
    });

    it('should rebalance when key space is exhausted', () => {
      const docs = [
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'a0'), // Very close to 'a'
        createNode('c', undefined, 'c'),
      ];
      
      // Try to move 'c' between 'a' and 'b' - should trigger rebalance
      const move: TreeMove = {
        documentIds: ['c'],
        targetId: 'b',
        zone: 'before',
      };
      
      const plan = planTreeMove(docs, move);
      
      // Should rebalance all siblings
      expect(plan.patches.length).toBeGreaterThan(1);
      
      // All keys should be valid and in order
      const sortedPatches = plan.patches.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      for (let i = 1; i < sortedPatches.length; i++) {
        expect(sortedPatches[i].sortKey > sortedPatches[i - 1].sortKey).toBe(true);
      }
    });
  });

  describe('flattenTree', () => {
    it('should flatten tree with correct depth', () => {
      const docs = [
        createNode('root', undefined, 'a'),
        createNode('child1', 'root', 'b'),
        createNode('child2', 'root', 'c'),
        createNode('grandchild', 'child1', 'd'),
      ];
      const openIds = new Set(['root', 'child1']);
      const flattened = flattenTree(docs, openIds);

      expect(flattened).toHaveLength(4);
      expect(flattened[0].doc._id).toBe('root');
      expect(flattened[0].depth).toBe(0);
      expect(flattened[1].doc._id).toBe('child1');
      expect(flattened[1].depth).toBe(1);
      expect(flattened[2].doc._id).toBe('grandchild');
      expect(flattened[2].depth).toBe(2);
      expect(flattened[3].doc._id).toBe('child2');
      expect(flattened[3].depth).toBe(1);
    });

    it('should hide children when parent is closed', () => {
      const docs = [
        createNode('root', undefined, 'a'),
        createNode('child', 'root', 'b'),
      ];
      const openIds = new Set<string>();
      const flattened = flattenTree(docs, openIds);

      expect(flattened).toHaveLength(1);
      expect(flattened[0].doc._id).toBe('root');
    });

    it('should indicate hasChildren correctly', () => {
      const docs = [
        createNode('parent', undefined, 'a'),
        createNode('child', 'parent', 'b'),
        createNode('leaf', undefined, 'c'),
      ];
      const openIds = new Set(['parent']);
      const flattened = flattenTree(docs, openIds);

      const parent = flattened.find(r => r.doc._id === 'parent');
      const leaf = flattened.find(r => r.doc._id === 'leaf');
      
      expect(parent?.hasChildren).toBe(true);
      expect(leaf?.hasChildren).toBe(false);
    });

    it('should normalize missing parent to root', () => {
      const docs = [
        createNode('orphan', 'missing-parent', 'a'),
        createNode('root', undefined, 'b'),
      ];
      const openIds = new Set<string>();
      const flattened = flattenTree(docs, openIds);

      // Orphan should be visible at root level
      expect(flattened).toHaveLength(2);
      expect(flattened.some(r => r.doc._id === 'orphan')).toBe(true);
    });

    it('should sort siblings by sortKey', () => {
      const docs = [
        createNode('c', undefined, 'c'),
        createNode('a', undefined, 'a'),
        createNode('b', undefined, 'b'),
      ];
      const openIds = new Set<string>();
      const flattened = flattenTree(docs, openIds);

      expect(flattened[0].doc._id).toBe('a');
      expect(flattened[1].doc._id).toBe('b');
      expect(flattened[2].doc._id).toBe('c');
    });
  });
});
