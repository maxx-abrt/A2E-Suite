import { EditorCommentsThreadStore } from '@/blocknote-editor/comments/EditorCommentsThreadStore';
import { describe, expect, it } from '@jest/globals';

describe('EditorCommentsThreadStore', () => {
  const CURRENT_USER_ID = 'member-1';
  const OTHER_USER_ID = 'member-2';

  const createThread = async () => {
    const store = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
    });

    const thread = await store.createThread({
      initialComment: { body: [{ type: 'paragraph', content: 'first' }] },
    });

    return { store, thread };
  };

  it('creates a thread authored by the current user', async () => {
    const { store, thread } = await createThread();

    expect(thread.comments).toHaveLength(1);
    expect(thread.comments[0].userId).toBe(CURRENT_USER_ID);
    expect(thread.resolved).toBe(false);

    const retrieved = store.getThread(thread.id);
    expect(retrieved.id).toBe(thread.id);
  });

  it('adds a comment and notifies subscribers', async () => {
    const { store, thread } = await createThread();

    const snapshots: number[] = [];
    store.subscribe((threads) => {
      snapshots.push(threads.get(thread.id)?.comments.length ?? 0);
    });

    const reply = await store.addComment({
      threadId: thread.id,
      comment: { body: [{ type: 'paragraph', content: 'reply' }] },
    });

    expect(reply.userId).toBe(CURRENT_USER_ID);

    const updated = store.getThread(thread.id);
    expect(updated.comments).toHaveLength(2);
    expect(snapshots).toContain(2);
  });

  it('resolves and unresolves a thread with resolver attribution', async () => {
    const { store, thread } = await createThread();

    await store.resolveThread({ threadId: thread.id });

    const resolved = store.getThread(thread.id);
    expect(resolved.resolved).toBe(true);
    expect(resolved.resolvedBy).toBe(CURRENT_USER_ID);

    await store.unresolveThread({ threadId: thread.id });

    expect(store.getThread(thread.id).resolved).toBe(false);
  });

  it('updates and deletes a comment', async () => {
    const { store, thread } = await createThread();
    const commentId = thread.comments[0].id;

    await store.updateComment({
      threadId: thread.id,
      commentId,
      comment: { body: [{ type: 'paragraph', content: 'edited' }] },
    });

    expect(store.getThread(thread.id).comments[0].body).toEqual([
      { type: 'paragraph', content: 'edited' },
    ]);

    await store.deleteComment({ threadId: thread.id, commentId });

    expect(store.getThread(thread.id).comments).toHaveLength(0);
  });

  it('toggles reactions per user', async () => {
    const { store, thread } = await createThread();
    const commentId = thread.comments[0].id;

    await store.addReaction({
      threadId: thread.id,
      commentId,
      emoji: '👍',
    });

    const reacted = store.getThread(thread.id).comments[0];
    expect(reacted.reactions[0].userIds).toEqual([CURRENT_USER_ID]);

    await store.deleteReaction({
      threadId: thread.id,
      commentId,
      emoji: '👍',
    });

    expect(store.getThread(thread.id).comments[0].reactions).toHaveLength(0);
  });

  it('restricts updating a foreign comment', async () => {
    const { thread } = await createThread();
    const comment = thread.comments[0];

    // Author can edit their own comment; a different member cannot.
    const authorStore = new EditorCommentsThreadStore({
      currentUserId: CURRENT_USER_ID,
    });
    expect(authorStore.auth.canUpdateComment(comment)).toBe(true);

    const foreignStore = new EditorCommentsThreadStore({
      currentUserId: OTHER_USER_ID,
    });
    expect(foreignStore.auth.canUpdateComment(comment)).toBe(false);
    expect(foreignStore.auth.canAddComment(thread)).toBe(true);
  });

  it('deletes a thread', async () => {
    const { store, thread } = await createThread();

    await store.deleteThread({ threadId: thread.id });

    const remaining = store.getThreads();
    expect(remaining.has(thread.id)).toBe(false);
  });
});
