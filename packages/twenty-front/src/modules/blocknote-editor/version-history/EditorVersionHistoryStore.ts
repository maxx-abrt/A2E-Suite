export type EditorVersionSnapshot = {
  versionId: string;
  createdAt: string;
  body: string;
};

export type EditorVersionSubscribeCallback = () => void;

const MAX_VERSIONS_PER_EDITOR = 20;

const createVersionId = (): string =>
  `version-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// In-memory ring buffer of document snapshots, scoped to one editor instance
// (same lifecycle as EditorCommentsThreadStore: the editor is created once per
// record field and its stores are captured at creation time).
// Snapshots are taken on a save-interval by the caller (useEditorVersionHistory)
// and pruned oldest-first; server-side persistence is a follow-up (same
// limitation as comment thread bodies).
export class EditorVersionHistoryStore {
  private readonly maxVersions: number;

  private versions: EditorVersionSnapshot[];

  private subscribers: Set<EditorVersionSubscribeCallback>;

  constructor(maxVersions = MAX_VERSIONS_PER_EDITOR) {
    this.maxVersions = maxVersions;
    this.versions = [];
    this.subscribers = new Set();
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

    this.versions = [...this.versions, snapshot].slice(-this.maxVersions);

    for (const subscriber of this.subscribers) {
      subscriber();
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
}
