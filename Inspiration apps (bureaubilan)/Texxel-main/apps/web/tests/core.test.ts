import { describe, it, expect } from 'vitest';
import { BlockNoteEditor, BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs, defaultStyleSpecs } from '@blocknote/core';
import { emptyDatabase, databaseSources } from '@/lib/editor-database';
import { reviewIds, serializeEditor, restoreReview } from '@/lib/editor-review';
import { base36Key, midKey, SortKeySpaceError } from '@/lib/sort-key';
import { isDescendant, planTreeMove, type TreeNode, type TreeMove } from '@/lib/document-tree-model';

// Create a minimal schema for testing
const testSchema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

describe('Phase 1 Core Integration Tests', () => {
  
  // Test 1: Verify emptyDatabase creates CollectionView before Collection
  it('should create CollectionView in shared registry before Collection', () => {
    const snapshot = emptyDatabase('db-1', 'user-1', 'Test DB', 'Title');
    
    // Verify CollectionView was created (viewId should exist)
    expect(snapshot.viewId).toBe('db-1-table');
    expect(snapshot.views).toBeDefined();
    expect(Array.isArray(snapshot.views)).toBe(true);
    
    // Verify Collection has the title property added via addProperty
    const titleProp = Object.values(snapshot.schema).find((p: any) => p.label === 'Title');
    expect(titleProp).toBeDefined();
    expect(titleProp?.type).toBe('string');
    expect(titleProp?.id).toBe('db-1-title');
  });

  // Test 2: Real BlockNoteEditor creation with schema
  it('should create actual BlockNoteEditor with schema', () => {
    const editor = BlockNoteEditor.create({
      schema: testSchema,
      initialContent: [
        {
          type: 'paragraph',
          content: 'Test paragraph',
        },
      ],
    });

    expect(editor).toBeDefined();
    expect(editor.document).toBeDefined();
    expect(editor.document.length).toBeGreaterThan(0);
    
    // Verify schema has basic blocks
    const schema = editor.schema;
    expect(schema.blockSchema).toHaveProperty('paragraph');
    expect(schema.blockSchema).toHaveProperty('heading');
    expect(schema.inlineContentSchema).toHaveProperty('text');
  });

  // Test 3: Review mode - serialize/restore with real editor
  it('should serialize editor without review marks', () => {
    const editor = BlockNoteEditor.create({
      schema: testSchema,
      initialContent: [
        {
          type: 'paragraph',
          content: 'Original text',
        },
      ],
    });

    // Serialize without review marks
    const serialized = serializeEditor(editor);
    const parsed = JSON.parse(serialized);
    expect(parsed[0]._bureauReview).toBeUndefined();

    // Verify reviewIds returns empty for no marks
    const ids = reviewIds(editor);
    expect(ids).toEqual([]);
  });

  // Test 4: Database sources CRUD operations
  it('should handle database CRUD operations with real sources', async () => {
    const snapshot = emptyDatabase('db-2', 'user-2', 'CRUD Test', 'Name');
    let savedSnapshot = snapshot;
    
    const sources = databaseSources(snapshot, (s) => {
      savedSnapshot = s;
    });

    // Create document
    const mockDoc = {
      toJSON: () => ({
        id: 'doc-1',
        props: { 'db-2-Name': { value: 'Test Item' } },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    };

    await sources.documentSource.create({ document: mockDoc } as any);
    expect(savedSnapshot.documents).toHaveLength(1);
    expect(savedSnapshot.size).toBe(1);

    // Update document
    const updatedDoc = {
      toJSON: () => ({
        id: 'doc-1',
        props: { 'db-2-Name': { value: 'Updated Item' } },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    };

    await sources.documentSource.update({ documentId: 'doc-1', document: updatedDoc } as any, {});
    expect(savedSnapshot.documents[0].props['db-2-Name'].value).toBe('Updated Item');

    // Delete document
    await sources.documentSource.delete({ documentId: 'doc-1' } as any);
    expect(savedSnapshot.documents).toHaveLength(0);
    expect(savedSnapshot.size).toBe(0);
  });

  // Test 5: Sort key - base36Key with correct numeric prefix
  it('should generate base36 keys with correct length prefix', () => {
    expect(base36Key(0)).toBe('10');
    expect(base36Key(1)).toBe('11');
    expect(base36Key(10)).toBe('1a'); // Correct: '1' (length of 'a') + 'a' (10 in base36)
    expect(base36Key(35)).toBe('1z');
    expect(base36Key(36)).toBe('210'); // '2' (length of '10') + '10' (36 in base36)
  });

  // Test 6: Sort key - midKey exhaustion is by design
  it('should throw SortKeySpaceError when key space exhausted between a and a0', () => {
    // This is by design - 'a' and 'a0' have no midpoint
    expect(() => midKey('a', 'a0')).toThrow(SortKeySpaceError);
    
    // But 'a' and 'a00' should work
    const key = midKey('a', 'a00');
    expect(key).toBe('a0');
    expect(key > 'a').toBe(true);
    expect(key < 'a00').toBe(true);
  });

  // Test 7: Tree model - isDescendant with missing nodes
  it('should return false when target node is missing from map', () => {
    const nodes = new Map<string, TreeNode>([
      ['a', { _id: 'a', createdAt: Date.now() }],
      ['b', { _id: 'b', parentId: 'a', createdAt: Date.now() }],
    ]);
    
    // Target 'd' doesn't exist in the map
    const result = isDescendant(nodes, 'a', 'd');
    expect(result).toBe(false);
  });

  // Test 8: Tree model - cycle detection
  it('should detect cycles in tree structure', () => {
    const nodes = new Map<string, TreeNode>([
      ['a', { _id: 'a', parentId: 'b', createdAt: Date.now() }],
      ['b', { _id: 'b', parentId: 'c', createdAt: Date.now() }],
      ['c', { _id: 'c', parentId: 'a', createdAt: Date.now() }],
    ]);
    
    // This should detect a cycle when traversing from c
    expect(() => isDescendant(nodes, 'x', 'c')).toThrow('cycle');
  });

  // Test 9: Tree move - rebalancing with long key chains
  it('should rebalance sort keys after 100 repeated moves', () => {
    let docs: TreeNode[] = [
      { _id: 'a', sortKey: 'a', createdAt: Date.now() },
      { _id: 'b', sortKey: 'b', createdAt: Date.now() },
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

      // Keys should not exceed 48 chars
      expect(plan.patches[0].sortKey.length).toBeLessThan(48);
    }
  });

  // Test 10: Editor insert and serialize
  it('should insert blocks and serialize to JSON', () => {
    const editor = BlockNoteEditor.create({
      schema: testSchema,
      initialContent: [
        {
          type: 'paragraph',
          content: 'First paragraph',
        },
      ],
    });

    // Insert a new block
    editor.insertBlocks(
      [
        {
          type: 'heading',
          props: { level: 1 },
          content: 'New Heading',
        },
      ],
      editor.document[0],
      'after'
    );

    expect(editor.document.length).toBe(2);
    expect(editor.document[1].type).toBe('heading');
    
    // Serialize to JSON
    const json = JSON.stringify(editor.document);
    expect(json).toContain('heading');
    expect(json).toContain('New Heading');
  });

  // Test 11: Tree move - prevent moving into descendants
  it('should prevent moving parent into its own child', () => {
    const docs: TreeNode[] = [
      { _id: 'parent', sortKey: 'a', createdAt: Date.now() },
      { _id: 'child', parentId: 'parent', sortKey: 'b', createdAt: Date.now() },
    ];

    const move: TreeMove = {
      documentIds: ['parent'],
      targetId: 'child',
      zone: 'into',
    };

    expect(() => planTreeMove(docs, move)).toThrow('descendants');
  });

  // Test 12: Database collection source fetch
  it('should fetch collection without documents', async () => {
    const snapshot = emptyDatabase('db-3', 'user-3', 'Fetch Test', 'Title');
    const sources = databaseSources(snapshot, () => {});

    const result = await sources.collectionSource.fetch({} as any);
    
    expect(result.id).toBe('db-3');
    expect(result.name).toBe('Fetch Test');
    expect(result.documents).toEqual([]);
  });

  // Test 13: Sort key - midKey generates keys in order
  it('should generate midKeys in ascending order', () => {
    let prev: string | null = null;
    const keys: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const key = midKey(prev, null);
      keys.push(key);
      prev = key;
    }

    // All keys should be in ascending order
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });

  // Test 14: Editor with multiple block types
  it('should create editor with multiple block types', () => {
    const editor = BlockNoteEditor.create({
      schema: testSchema,
      initialContent: [
        {
          type: 'heading',
          props: { level: 1 },
          content: 'Title',
        },
        {
          type: 'paragraph',
          content: 'Paragraph text',
        },
        {
          type: 'bulletListItem',
          content: 'List item',
        },
      ],
    });

    expect(editor.document.length).toBe(3);
    expect(editor.document[0].type).toBe('heading');
    expect(editor.document[1].type).toBe('paragraph');
    expect(editor.document[2].type).toBe('bulletListItem');
  });

  // Test 15: Database multiple CRUD operations
  it('should handle multiple database operations in sequence', async () => {
    const snapshot = emptyDatabase('db-4', 'user-4', 'Multi Test', 'Item');
    let savedSnapshot = snapshot;
    
    const sources = databaseSources(snapshot, (s) => {
      savedSnapshot = s;
    });

    // Create 3 documents
    for (let i = 1; i <= 3; i++) {
      const mockDoc = {
        toJSON: () => ({
          id: `doc-${i}`,
          props: { 'db-4-Item': { value: `Item ${i}` } },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      };
      await sources.documentSource.create({ document: mockDoc } as any);
    }

    expect(savedSnapshot.documents).toHaveLength(3);
    expect(savedSnapshot.size).toBe(3);

    // Delete one
    await sources.documentSource.delete({ documentId: 'doc-2' } as any);

    expect(savedSnapshot.documents).toHaveLength(2);
    expect(savedSnapshot.size).toBe(2);
    expect(savedSnapshot.documents.find((d: any) => d.id === 'doc-2')).toBeUndefined();
  });
});
