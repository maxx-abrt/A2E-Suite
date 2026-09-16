import type {
  CommentBody,
  CommentData,
  CommentReactionData,
  ThreadData,
  ThreadStore,
  ThreadStoreAuth,
} from '@blocknote/core/comments';

// Threads can optionally be persisted through an adapter so bodies survive
// reloads; the anchor marks themselves already travel inside the document
// body, managed by blocknote. Without an adapter the store stays the
// P3.2 v1 in-memory behavior.
export type EditorCommentsThreadPersistence = {
  loadThreads: () => Promise<ThreadData[]>;
  saveThread: (thread: ThreadData) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
};

class EditorCommentsThreadStoreAuth implements ThreadStoreAuth {
  private readonly currentUserId: string;

  constructor(currentUserId: string) {
    this.currentUserId = currentUserId;
  }

  canCreateThread(): boolean {
    return true;
  }

  canAddComment(): boolean {
    return true;
  }

  canUpdateComment(comment: CommentData): boolean {
    return comment.userId === this.currentUserId;
  }

  canDeleteComment(): boolean {
    return true;
  }

  canDeleteThread(): boolean {
    return true;
  }

  canResolveThread(): boolean {
    return true;
  }

  canUnresolveThread(): boolean {
    return true;
  }

  canAddReaction(): boolean {
    return true;
  }

  canDeleteReaction(comment: CommentData): boolean {
    return comment.userId === this.currentUserId;
  }
}

type EditorCommentsThreadStoreOptions = {
  currentUserId: string;
  persistence?: EditorCommentsThreadPersistence;
};

type CreateThreadOptions = {
  initialComment: {
    body: CommentBody;
    metadata?: unknown;
  };
  metadata?: unknown;
};

type AddCommentOptions = {
  comment: {
    body: CommentBody;
    metadata?: unknown;
  };
  threadId: string;
};

type UpdateCommentOptions = {
  comment: {
    body: CommentBody;
    metadata?: unknown;
  };
  threadId: string;
  commentId: string;
};

type ThreadSubscriber = (threads: Map<string, ThreadData>) => void;

export class EditorCommentsThreadStore implements ThreadStore {
  readonly auth: ThreadStoreAuth;

  private readonly currentUserId: string;
  private readonly persistence?: EditorCommentsThreadPersistence;
  private readonly threads = new Map<string, ThreadData>();
  private readonly subscribers = new Set<ThreadSubscriber>();

  constructor(options: EditorCommentsThreadStoreOptions) {
    this.currentUserId = options.currentUserId;
    this.persistence = options.persistence;
    this.auth = new EditorCommentsThreadStoreAuth(options.currentUserId);
  }

  // Hydration is async while construction is not (the editor instantiates
  // the store synchronously); the owner calls this once after mount.
  async loadFromPersistence(): Promise<void> {
    if (!this.persistence) {
      return;
    }

    const persistedThreads = await this.persistence.loadThreads();

    this.threads.clear();
    for (const thread of persistedThreads) {
      this.threads.set(thread.id, thread);
    }

    this.emit();
  }

  async createThread(options: CreateThreadOptions): Promise<ThreadData> {
    const now = new Date();

    const initialComment: CommentData = {
      type: 'comment',
      id: crypto.randomUUID(),
      userId: this.currentUserId,
      createdAt: now,
      updatedAt: now,
      reactions: [],
      metadata: options.initialComment.metadata ?? {},
      body: options.initialComment.body,
    };

    const thread: ThreadData = {
      type: 'thread',
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      comments: [initialComment],
      resolved: false,
      metadata: options.metadata ?? {},
    };

    this.threads.set(thread.id, thread);
    this.emit();

    await this.persistence?.saveThread(thread);

    return thread;
  }

  async addComment(options: AddCommentOptions): Promise<CommentData> {
    const thread = this.getThreadOrThrow(options.threadId);
    const now = new Date();

    const comment: CommentData = {
      type: 'comment',
      id: crypto.randomUUID(),
      userId: this.currentUserId,
      createdAt: now,
      updatedAt: now,
      reactions: [],
      metadata: options.comment.metadata ?? {},
      body: options.comment.body,
    };

    thread.comments.push(comment);
    thread.updatedAt = now;
    this.emit();

    await this.persistence?.saveThread(thread);

    return comment;
  }

  async updateComment(options: UpdateCommentOptions): Promise<void> {
    const thread = this.getThreadOrThrow(options.threadId);
    const comment = thread.comments.find(
      (candidate) => candidate.id === options.commentId,
    );

    if (!comment) {
      throw new Error(
        `Comment ${options.commentId} not found in thread ${options.threadId}`,
      );
    }

    comment.body = options.comment.body;
    comment.metadata = options.comment.metadata ?? comment.metadata;
    comment.updatedAt = new Date();
    thread.updatedAt = comment.updatedAt;
    this.emit();

    await this.persistence?.saveThread(thread);
  }

  async deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void> {
    const thread = this.getThreadOrThrow(options.threadId);

    thread.comments = thread.comments.filter(
      (candidate) => candidate.id !== options.commentId,
    );
    thread.updatedAt = new Date();
    this.emit();

    await this.persistence?.saveThread(thread);
  }

  async deleteThread(options: { threadId: string }): Promise<void> {
    this.threads.delete(options.threadId);
    this.emit();

    await this.persistence?.deleteThread(options.threadId);
  }

  async resolveThread(options: { threadId: string }): Promise<void> {
    const thread = this.getThreadOrThrow(options.threadId);
    const now = new Date();

    thread.resolved = true;
    thread.resolvedUpdatedAt = now;
    thread.resolvedBy = this.currentUserId;
    thread.updatedAt = now;
    this.emit();

    await this.persistence?.saveThread(thread);
  }

  async unresolveThread(options: { threadId: string }): Promise<void> {
    const thread = this.getThreadOrThrow(options.threadId);
    const now = new Date();

    thread.resolved = false;
    thread.resolvedUpdatedAt = now;
    thread.resolvedBy = this.currentUserId;
    thread.updatedAt = now;
    this.emit();

    await this.persistence?.saveThread(thread);
  }

  async addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void> {
    const comment = this.getCommentOrThrow(options.threadId, options.commentId);
    const existingReaction = comment.reactions.find(
      (reaction) => reaction.emoji === options.emoji,
    );

    if (existingReaction) {
      if (!existingReaction.userIds.includes(this.currentUserId)) {
        existingReaction.userIds.push(this.currentUserId);
      }
    } else {
      const reaction: CommentReactionData = {
        emoji: options.emoji,
        createdAt: new Date(),
        userIds: [this.currentUserId],
      };
      comment.reactions.push(reaction);
    }

    this.emit();

    await this.persistence?.saveThread(this.getThreadOrThrow(options.threadId));
  }

  async deleteReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void> {
    const comment = this.getCommentOrThrow(options.threadId, options.commentId);

    comment.reactions = comment.reactions
      .map((reaction) =>
        reaction.emoji === options.emoji
          ? {
              ...reaction,
              userIds: reaction.userIds.filter(
                (userId) => userId !== this.currentUserId,
              ),
            }
          : reaction,
      )
      .filter((reaction) => reaction.userIds.length > 0);

    this.emit();

    await this.persistence?.saveThread(this.getThreadOrThrow(options.threadId));
  }

  getThread(threadId: string): ThreadData {
    return this.getThreadOrThrow(threadId);
  }

  getThreads(): Map<string, ThreadData> {
    return new Map(this.threads);
  }

  subscribe(subscriber: ThreadSubscriber): () => void {
    this.subscribers.add(subscriber);

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private emit(): void {
    const snapshot = new Map(this.threads);

    for (const subscriber of this.subscribers) {
      subscriber(snapshot);
    }
  }

  private getThreadOrThrow(threadId: string): ThreadData {
    const thread = this.threads.get(threadId);

    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    return thread;
  }

  private getCommentOrThrow(threadId: string, commentId: string): CommentData {
    const thread = this.getThreadOrThrow(threadId);
    const comment = thread.comments.find(
      (candidate) => candidate.id === commentId,
    );

    if (!comment) {
      throw new Error(`Comment ${commentId} not found in thread ${threadId}`);
    }

    return comment;
  }
}
