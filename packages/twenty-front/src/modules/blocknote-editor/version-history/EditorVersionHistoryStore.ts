export type EditorVersionSnapshot = {
  versionId: string;
  createdAt: string;
  body: string;
};

export type EditorVersionSubscribeCallback = () => void;

// Snapshots can optionally be persisted through an adapter so history
// survives reloads. Without an adapter the store stays the P3.2 v1 in-memory
// ring buffer (same optional-adapter contract as EditorCommentsThreadStore).
export type EditorVersionHistoryPersistence = {
  loadVersions: () => Promise<EditorVersionSnapshot[]>;
  saveVersion: (snapshot: EditorVersionSnapshot) => Promise<void>;
  deleteVersions: (versionIds: string[]) => Promise<void>;
};

export type EditorVersionHistoryStoreOptions = {
  maxVersions?: number;
  persistence?: EditorVersionHistoryPersistence;
};

const MAX_VERSIONS_PER_EDITOR = 20;

const createVersionId = (): string =>
  `version-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const sortByCreatedAt = (
  snapshots: EditorVersionSnapshot[],
): EditorVersionSnapshot[] =>
  [...snapshots].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );

// Ring buffer of document snapshots, scoped to one editor instance (same
// lifecycle as EditorCommentsThreadStore: the editor is created once per
// record field and its stores are captured at creation time).
// Snapshots are taken on a save-interval by the caller (useEditorVersionHistory)
// and pruned oldest-first. Persistence writes are fire-after-emit: the UI
// updates synchronously and the server write/delete happens in the background,
// so a failing network never blocks editing.
export class EditorVersionHistoryStore {
  private readonly maxVersions: number;

  private readonly persistence?: EditorVersionHistoryPersistence;

  private versions: EditorVersionSnapshot[];

  private subscribers: Set<EditorVersionSubscribeCallback>;

  constructor(options: EditorVersionHistoryStoreOptions = {}) {
    this.maxVersions = options.maxVersions ?? MAX_VERSIONS_PER_EDITOR;
    this.persistence = options.persistence;
    this.versions = [];
    this.subscribers = new Set();
  }

  // Hydration is async while construction is not (the editor instantiates the
  // store synchronously); the owner calls this once after mount. Local
  // snapshots taken before hydration finished are merged in by id, never
  // dropped.
  async loadFromPersistence(): Promise<void> {
    if (!this.persistence) {
      return;
    }

    const persistedVersions = await this.persistence.loadVersions();
    const byVersionId = new Map(
      persistedVersions.map((snapshot) => [snapshot.versionId, snapshot]),
    );

    for (const localSnapshot of this.versions) {
      byVersionId.set(localSnapshot.versionId, localSnapshot);
    }

    const orderedVersions = sortByCreatedAt([...byVersionId.values()]);
    const keptVersions = orderedVersions.slice(-this.maxVersions);
    const droppedVersionIds = orderedVersions
      .slice(0, orderedVersions.length - keptVersions.length)
      .map((snapshot) => snapshot.versionId);

    this.versions = keptVersions;
    this.emit();

    if (droppedVersionIds.length > 0) {
      void this.deleteVersionsInBackground(droppedVersionIds);
    }
  }

  addSnapshot(body: string): EditorVersionSnapshot | null {
    if (body === '') {
      return null;
    }

    const latestVersion = this.versions[this.versions.length - 1];

    if (latestVersion?.body === body) {
      return null;
    }

    const snapshot = {
      versionId: createVersionId(),
      createdAt: new Date().toISOString(),
      body,
    };

    const nextVersions = [...this.versions, snapshot];
    const keptVersions = nextVersions.slice(-this.maxVersions);
    const droppedVersionIds = nextVersions
      .slice(0, nextVersions.length - keptVersions.length)
      .map((droppedSnapshot) => droppedSnapshot.versionId);

    this.versions = keptVersions;
    this.emit();

    void this.saveVersionInBackground(snapshot);

    if (droppedVersionIds.length > 0) {
      void this.deleteVersionsInBackground(droppedVersionIds);
    }

    return snapshot;
  }

  getVersions(): EditorVersionSnapshot[] {
    return this.versions;
  }

  getVersion(versionId: string): EditorVersionSnapshot | undefined {
    return this.versions.find((snapshot) => snapshot.versionId === versionId);
  }

  subscribe(callback: EditorVersionSubscribeCallback): () => void {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private emit(): void {
    for (const subscriber of this.subscribers) {
      subscriber();
    }
  }

  private async saveVersionInBackground(
    snapshot: EditorVersionSnapshot,
  ): Promise<void> {
    try {
      await this.persistence?.saveVersion(snapshot);
    } catch (error) {
      // A failed history write must not surface as an unhandled rejection:
      // the editor keeps working against the in-memory buffer.
      // eslint-disable-next-line no-console
      console.error('Failed to persist document revision', error);
    }
  }

  private async deleteVersionsInBackground(
    versionIds: string[],
  ): Promise<void> {
    try {
      await this.persistence?.deleteVersions(versionIds);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to prune document revisions', error);
    }
  }
}
