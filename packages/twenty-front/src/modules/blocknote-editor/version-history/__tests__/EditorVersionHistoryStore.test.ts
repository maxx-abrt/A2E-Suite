import { EditorVersionHistoryStore } from '@/blocknote-editor/version-history/EditorVersionHistoryStore';

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
    const store = new EditorVersionHistoryStore(3);

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
});
