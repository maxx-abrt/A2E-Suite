import {
  EditorVersionHistoryStore,
  type EditorVersionHistoryPersistence,
  type EditorVersionSnapshot,
} from '@/blocknote-editor/version-history/EditorVersionHistoryStore';

const createPersistenceMock = (
  persistedVersions: EditorVersionSnapshot[] = [],
): {
  persistence: EditorVersionHistoryPersistence;
  savedVersions: EditorVersionSnapshot[];
  deletedVersionIds: string[][];
} => {
  const savedVersions: EditorVersionSnapshot[] = [];
  const deletedVersionIds: string[][] = [];

  return {
    savedVersions,
    deletedVersionIds,
    persistence: {
      loadVersions: jest.fn().mockResolvedValue(persistedVersions),
      saveVersion: jest.fn(async (snapshot: EditorVersionSnapshot) => {
        savedVersions.push(snapshot);
      }),
      deleteVersions: jest.fn(async (versionIds: string[]) => {
        deletedVersionIds.push(versionIds);
      }),
    },
  };
};

describe('EditorVersionHistoryStore', () => {
  it('should skip empty bodies', () => {
    const store = new EditorVersionHistoryStore();

    expect(store.addSnapshot('')).toBeNull();
    expect(store.getVersions()).toEqual([]);
  });

  it('should skip identical consecutive snapshots', () => {
    const store = new EditorVersionHistoryStore();

    store.addSnapshot('{"v":1}');
    expect(store.addSnapshot('{"v":1}')).toBeNull();
    expect(store.getVersions()).toHaveLength(1);
  });

  it('should prune to the configured maximum, oldest first', () => {
    const store = new EditorVersionHistoryStore({ maxVersions: 3 });

    store.addSnapshot('v1');
    store.addSnapshot('v2');
    store.addSnapshot('v3');
    store.addSnapshot('v4');

    const versions = store.getVersions();

    expect(versions).toHaveLength(3);
    expect(versions.map((version) => version.body)).toEqual(['v2', 'v3', 'v4']);
  });

  it('should notify subscribers on new snapshots and allow unsubscribing', () => {
    const store = new EditorVersionHistoryStore();
    let notificationCount = 0;

    const unsubscribe = store.subscribe(() => {
      notificationCount += 1;
    });

    store.addSnapshot('v1');
    unsubscribe();
    store.addSnapshot('v2');

    expect(notificationCount).toBe(1);
  });

  it('should find a version by id', () => {
    const store = new EditorVersionHistoryStore();

    const snapshot = store.addSnapshot('v1');

    expect(store.getVersion(snapshot?.versionId ?? '')?.body).toBe('v1');
    expect(store.getVersion('missing')).toBeUndefined();
  });

  it('should persist a new snapshot through the adapter', () => {
    const { persistence, savedVersions } = createPersistenceMock();
    const store = new EditorVersionHistoryStore({ persistence });

    const snapshot = store.addSnapshot('{"v":1}');

    expect(savedVersions).toEqual([snapshot]);
  });

  it('should hydrate persisted versions on load', async () => {
    const { persistence } = createPersistenceMock([
      { versionId: 'a', createdAt: '2026-01-01T00:00:00.000Z', body: 'old' },
      {
        versionId: 'b',
        createdAt: '2026-01-02T00:00:00.000Z',
        body: 'recent',
      },
    ]);
    const store = new EditorVersionHistoryStore({ persistence });

    await store.loadFromPersistence();

    expect(store.getVersions().map((version) => version.body)).toEqual([
      'old',
      'recent',
    ]);
  });

  it('should not load when no adapter is configured', async () => {
    const store = new EditorVersionHistoryStore();

    await expect(store.loadFromPersistence()).resolves.toBeUndefined();
    expect(store.getVersions()).toEqual([]);
  });

  it('should prune persisted versions beyond the maximum and delete them', async () => {
    const { persistence, deletedVersionIds } = createPersistenceMock([
      { versionId: 'a', createdAt: '2026-01-01T00:00:00.000Z', body: 'v1' },
      { versionId: 'b', createdAt: '2026-01-02T00:00:00.000Z', body: 'v2' },
      { versionId: 'c', createdAt: '2026-01-03T00:00:00.000Z', body: 'v3' },
    ]);
    const store = new EditorVersionHistoryStore({
      maxVersions: 2,
      persistence,
    });

    await store.loadFromPersistence();

    expect(store.getVersions().map((version) => version.versionId)).toEqual([
      'b',
      'c',
    ]);
    expect(deletedVersionIds).toEqual([['a']]);
  });

  it('should keep local snapshots taken before hydration finished', async () => {
    const { persistence } = createPersistenceMock([
      {
        versionId: 'server',
        createdAt: '2026-01-01T00:00:00.000Z',
        body: 'from-server',
      },
    ]);
    const store = new EditorVersionHistoryStore({ persistence });

    store.addSnapshot('local');
    await store.loadFromPersistence();

    expect(
      store
        .getVersions()
        .map((version) => version.body)
        .sort(),
    ).toEqual(['from-server', 'local']);
  });

  it('should not throw when a persistence write fails', async () => {
    // The store logs and swallows the rejection on purpose; silence the
    // expected error output so the suite stays readable.
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const persistence: EditorVersionHistoryPersistence = {
      loadVersions: jest.fn().mockResolvedValue([]),
      saveVersion: jest.fn().mockRejectedValue(new Error('offline')),
      deleteVersions: jest.fn().mockResolvedValue(undefined),
    };
    const store = new EditorVersionHistoryStore({ persistence });

    expect(() => store.addSnapshot('v1')).not.toThrow();
    // The fire-after-emit write settles on a later microtask; flush it so the
    // rejected promise is handled inside the store, not by the test runner.
    await Promise.resolve();
    expect(store.getVersions()).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
