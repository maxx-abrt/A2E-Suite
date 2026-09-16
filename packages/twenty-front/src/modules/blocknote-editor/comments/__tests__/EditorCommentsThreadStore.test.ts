import {
  mapDocumentCommentThreadRecordToThreadData,
  mapThreadDataToDocumentCommentThreadInput,
} from '@/blocknote-editor/comments/utils/mapDocumentCommentThread';
import { EditorCommentsThreadStore } from '@/blocknote-editor/comments/EditorCommentsThreadStore';
import { describe, expect, it } from '@jest/globals';

describe('mapDocumentCommentThread', () => {
  it('maps a server record to ThreadData with Date objects', () => {
    const threadData = mapDocumentCommentThreadRecordToThreadData({
      id: 'row-1',
      threadId: 'editor-thread-1',
      comments: [
        {
          type: 'comment',
          id: 'comment-1',
          userId: 'member-1',
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          reactions: [],
          metadata: {},
          body: [{ type: 'paragraph', content: 'hello' }],
        },
      ],
      resolved: true,
      resolvedBy: 'member-1',
      metadata: { source: 'test' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });

    expect(threadData.id).toBe('editor-thread-1');
    expect(threadData.resolved).toBe(true);
    expect(threadData.resolvedBy).toBe('member-1');
    expect(threadData.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
    expect(threadData.updatedAt).toEqual(new Date('2026-01-02T00:00:00Z'));
    expect(threadData.comments).toHaveLength(1);
    expect(threadData.metadata).toEqual({ source: 'test' });
  });

  it('defaults null server columns for a thread row missing json payloads', () => {
    const threadData = mapDocumentCommentThreadRecordToThreadData({
      id: 'row-1',
      threadId: 'editor-thread-1',
      comments: null,
      resolved: false,
      resolvedBy: null,
      metadata: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    expect(threadData.comments).toEqual([]);
    expect(threadData.resolvedBy).toBeUndefined();
    expect(threadData.metadata).toEqual({});
  });

  it('maps ThreadData back to nullable server input columns', () => {
    const input = mapThreadDataToDocumentCommentThreadInput({
      type: 'thread',
      id: 'editor-thread-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      comments: [],
      resolved: false,
      metadata: {},
    });

    expect(input.resolvedBy).toBeNull();
    expect(input.comments).toEqual([]);
    expect(input.resolved).toBe(false);
  });
});

describe('EditorCommentsThreadStore persistence', () => {
  const CURRENT_USER_ID = 'member-1';

  const createMemoryPersistence = () => {
    const savedThreads = new Map<string, unknown>();
    const deletedThreadIds: string[] = [];

    return {
      persistence: {
        loadThreads: async () => Array.from(savedThreads.values()) as never[],
        saveThread: async (thread: unknown) => {
          (savedThreads.set(
            (thread as { id: string }).id,
            structuredClone(thread),
          ),
            undefined);
        },
        deleteThread: async (threadId: string) => {
          deletedThreadIds.push(threadId);
          savedThreads.delete(threadId);
        },
      },
      savedThreads,
      deletedThreadIds,
    };
  };

  it('saves a created thread through the persistence adapter', async () => {
    const { persistence, savedThreads } = createMemoryPersistence();
    const store = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
      persistence,
    });

    const thread = await store.createThread({
      initialComment: { body: [{ type: 'paragraph', content: 'first' }] },
    });

    expect(savedThreads.has(thread.id)).toBe(true);
  });

  it('hydrates threads from persistence on loadFromPersistence', async () => {
    const { persistence, savedThreads } = createMemoryPersistence();
    const writer = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
      persistence,
    });

    const thread = await writer.createThread({
      initialComment: { body: [{ type: 'paragraph', content: 'first' }] },
    });

    expect(savedThreads.has(thread.id)).toBe(true);

    const reader = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
      persistence,
    });

    expect(reader.getThreads().size).toBe(0);

    await reader.loadFromPersistence();

    expect(reader.getThreads().size).toBe(1);
    expect(reader.getThread(thread.id).comments).toHaveLength(1);
  });

  it('deletes a thread through the persistence adapter', async () => {
    const { persistence, savedThreads, deletedThreadIds } =
      createMemoryPersistence();
    const store = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
      persistence,
    });

    const thread = await store.createThread({
      initialComment: { body: [{ type: 'paragraph', content: 'first' }] },
    });

    await store.deleteThread({ threadId: thread.id });

    expect(deletedThreadIds).toEqual([thread.id]);
    expect(savedThreads.has(thread.id)).toBe(false);
  });

  it('keeps in-memory behavior when no persistence is provided', async () => {
    const store = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
    });

    const thread = await store.createThread({
      initialComment: { body: [{ type: 'paragraph', content: 'first' }] },
    });

    await store.loadFromPersistence();

    expect(store.getThread(thread.id).comments).toHaveLength(1);
  });
});
