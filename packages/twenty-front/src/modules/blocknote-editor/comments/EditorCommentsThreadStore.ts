import type {
  CommentBody,
  CommentData,
  CommentReactionData,
  ThreadData,
  ThreadStore,
  ThreadStoreAuth,
} from '@blocknote/core/comments';

// Threads live in memory per editor instance: the comment marks anchoring
// threads are persisted inside the document body by blocknote itself, so
// anchors survive reloads, but thread bodies currently do not (P3.2 v1
// limitation — no server-side comment storage yet).
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
  private readonly threads = new Map<string, ThreadData>();
  private readonly subscribers = new Set<ThreadSubscriber>();

  constructor(options: EditorCommentsThreadStoreOptions) {
    this.currentUserId = options.currentUserId;
    this.auth = new EditorCommentsThreadStoreAuth(options.currentUserId);
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
  }

  async deleteThread(options: { threadId: string }): Promise<void> {
    this.threads.delete(options.threadId);
    this.emit();
  }

  async resolveThread(options: { threadId: string }): Promise<void> {
    const thread = this.getThreadOrThrow(options.threadId);
    const now = new Date();

    thread.resolved = true;
    thread.resolvedUpdatedAt = now;
    thread.resolvedBy = this.currentUserId;
    thread.updatedAt = now;
    this.emit();
  }

  async unresolveThread(options: { threadId: string }): Promise<void> {
    const thread = this.getThreadOrThrow(options.threadId);
    const now = new Date();

    thread.resolved = false;
    thread.resolvedUpdatedAt = now;
    thread.resolvedBy = this.currentUserId;
    thread.updatedAt = now;
    this.emit();
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
