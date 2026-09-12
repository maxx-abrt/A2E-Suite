import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptyDatabase,
  databaseSources,
  type DatabaseSnapshot,
} from '@/lib/editor-database';

describe('editor-database', () => {
  const userId = 'test-user-123';
  const databaseId = 'db-test-001';
  const databaseName = 'Test Database';
  const titleLabel = 'Title';

  describe('emptyDatabase', () => {
    it('should create a valid empty database snapshot', () => {
      const snapshot = emptyDatabase(databaseId, userId, databaseName, titleLabel);

      expect(snapshot.id).toBe(databaseId);
      expect(snapshot.name).toBe(databaseName);
      expect(snapshot.documents).toEqual([]);
      expect(snapshot.size).toBe(0);
      expect(snapshot.role).toBe('editor');
      expect(snapshot.createdBy).toMatchObject({ type: 'user', id: userId });
      expect(snapshot.updatedBy).toMatchObject({ type: 'user', id: userId });
      expect(snapshot.createdAt).toBeGreaterThan(0);
      expect(snapshot.updatedAt).toBeGreaterThan(0);
    });

    it('should create a table view by default', () => {
      const snapshot = emptyDatabase(databaseId, userId, databaseName, titleLabel);

      expect(snapshot.viewId).toBe(`${databaseId}-table`);
      expect(snapshot.views).toBeDefined();
      expect(Array.isArray(snapshot.views)).toBe(true);
    });

    it('should add a title property', () => {
      const snapshot = emptyDatabase(databaseId, userId, databaseName, titleLabel);

      const titleProperty = Object.values(snapshot.schema).find(
        (prop: any) => prop.label === titleLabel
      );
      
      expect(titleProperty).toBeDefined();
      expect(titleProperty?.type).toBe('string');
      expect(titleProperty?.id).toBe(`${databaseId}-title`);
    });

    it('should have correct timestamps', () => {
      const before = Date.now();
      const snapshot = emptyDatabase(databaseId, userId, databaseName, titleLabel);
      const after = Date.now();

      expect(snapshot.createdAt).toBeGreaterThanOrEqual(before);
      expect(snapshot.createdAt).toBeLessThanOrEqual(after);
      expect(snapshot.updatedAt).toBe(snapshot.createdAt);
    });
  });

  describe('databaseSources', () => {
    let initialSnapshot: DatabaseSnapshot;
    let saveCallCount: number;
    let lastSavedSnapshot: DatabaseSnapshot | null;

    beforeEach(() => {
      initialSnapshot = emptyDatabase(databaseId, userId, databaseName, titleLabel);
      saveCallCount = 0;
      lastSavedSnapshot = null;
    });

    const createSources = () => {
      return databaseSources(initialSnapshot, (snapshot) => {
        saveCallCount++;
        lastSavedSnapshot = snapshot;
      });
    };

    it('should return collection and document sources', () => {
      const sources = createSources();

      expect(sources.collectionSource).toBeDefined();
      expect(sources.documentSource).toBeDefined();
      expect(sources.persistDebounceMs).toBe(0);
      expect(sources.offlineMode).toBe(false);
      expect(sources.devtools).toBe(false);
    });

    describe('collectionSource', () => {
      it('should fetch initial collection without documents', async () => {
        const sources = createSources();
        const result = await sources.collectionSource.fetch({} as any);

        expect(result.id).toBe(databaseId);
        expect(result.name).toBe(databaseName);
        expect(result.documents).toEqual([]);
      });

      it('should update collection and trigger save', async () => {
        const sources = createSources();
        
        // Mock collection update
        const mockCollection = {
          toJSON: () => ({
            ...initialSnapshot,
            name: 'Updated Database',
            documents: initialSnapshot.documents,
          }),
        };

        await sources.collectionSource.update({ collection: mockCollection } as any, {});

        expect(saveCallCount).toBe(1);
        expect(lastSavedSnapshot?.name).toBe('Updated Database');
      });
    });

    describe('documentSource', () => {
      it('should return empty data for empty database', async () => {
        const sources = createSources();
        const result = await sources.documentSource.fetch('any-id', {} as any);

        expect(result.data).toEqual([]);
        expect(result.totalCount).toBe(0);
      });

      it('should create a document and trigger save', async () => {
        const sources = createSources();
        
        const mockDocument = {
          toJSON: () => ({
            id: 'doc-001',
            props: {
              [`${databaseId}-title`]: { value: 'Test Document' },
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };

        await sources.documentSource.create({ document: mockDocument } as any);

        expect(saveCallCount).toBe(1);
        expect(lastSavedSnapshot?.documents).toHaveLength(1);
        expect(lastSavedSnapshot?.documents[0].id).toBe('doc-001');
        expect(lastSavedSnapshot?.size).toBe(1);
      });

      it('should update an existing document', async () => {
        // Create initial document
        const sources = createSources();
        
        const mockDocument1 = {
          toJSON: () => ({
            id: 'doc-001',
            props: {
              [`${databaseId}-title`]: { value: 'Original Title' },
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };

        await sources.documentSource.create({ document: mockDocument1 } as any);
        expect(saveCallCount).toBe(1);

        // Update the document
        const mockDocument2 = {
          toJSON: () => ({
            id: 'doc-001',
            props: {
              [`${databaseId}-title`]: { value: 'Updated Title' },
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };

        await sources.documentSource.update({
          documentId: 'doc-001',
          document: mockDocument2,
        } as any, {});

        expect(saveCallCount).toBe(2);
        expect(lastSavedSnapshot?.documents).toHaveLength(1);
        expect(lastSavedSnapshot?.documents[0].props[`${databaseId}-title`].value).toBe('Updated Title');
      });

      it('should delete a document', async () => {
        // Create initial documents
        const sources = createSources();
        
        const mockDoc1 = {
          toJSON: () => ({
            id: 'doc-001',
            props: { [`${databaseId}-title`]: { value: 'Doc 1' } },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };

        const mockDoc2 = {
          toJSON: () => ({
            id: 'doc-002',
            props: { [`${databaseId}-title`]: { value: 'Doc 2' } },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };

        await sources.documentSource.create({ document: mockDoc1 } as any);
        await sources.documentSource.create({ document: mockDoc2 } as any);
        expect(lastSavedSnapshot?.documents).toHaveLength(2);

        // Delete one document
        await sources.documentSource.delete({ documentId: 'doc-001' } as any);

        expect(saveCallCount).toBe(3);
        expect(lastSavedSnapshot?.documents).toHaveLength(1);
        expect(lastSavedSnapshot?.documents[0].id).toBe('doc-002');
        expect(lastSavedSnapshot?.size).toBe(1);
      });

      it('should handle multiple CRUD operations', async () => {
        const sources = createSources();

        // Create 3 documents
        for (let i = 1; i <= 3; i++) {
          const mockDoc = {
            toJSON: () => ({
              id: `doc-00${i}`,
              props: { [`${databaseId}-title`]: { value: `Document ${i}` } },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }),
          };
          await sources.documentSource.create({ document: mockDoc } as any);
        }

        expect(lastSavedSnapshot?.documents).toHaveLength(3);
        expect(lastSavedSnapshot?.size).toBe(3);

        // Update one
        const updatedDoc = {
          toJSON: () => ({
            id: 'doc-002',
            props: { [`${databaseId}-title`]: { value: 'Updated Document 2' } },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };
        await sources.documentSource.update({
          documentId: 'doc-002',
          document: updatedDoc,
        } as any, {});

        expect(lastSavedSnapshot?.documents[1].props[`${databaseId}-title`].value).toBe('Updated Document 2');

        // Delete one
        await sources.documentSource.delete({ documentId: 'doc-001' } as any);

        expect(lastSavedSnapshot?.documents).toHaveLength(2);
        expect(lastSavedSnapshot?.size).toBe(2);
        expect(lastSavedSnapshot?.documents.find((d: any) => d.id === 'doc-001')).toBeUndefined();
      });
    });

    it('should maintain snapshot immutability', async () => {
      const sources = createSources();
      
      const mockDoc = {
        toJSON: () => ({
          id: 'doc-001',
          props: { [`${databaseId}-title`]: { value: 'Test' } },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      };

      await sources.documentSource.create({ document: mockDoc } as any);

      // Original snapshot should be unchanged
      expect(initialSnapshot.documents).toHaveLength(0);
      expect(lastSavedSnapshot?.documents).toHaveLength(1);
    });

    it('should update size on every save', async () => {
      const sources = createSources();

      for (let i = 1; i <= 5; i++) {
        const mockDoc = {
          toJSON: () => ({
            id: `doc-00${i}`,
            props: { [`${databaseId}-title`]: { value: `Doc ${i}` } },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        };
        await sources.documentSource.create({ document: mockDoc } as any);
        expect(lastSavedSnapshot?.size).toBe(i);
      }
    });
  });
});
