import { excludeWorkspaceIds } from 'src/engine/core-modules/upgrade/utils/exclude-workspace-ids.util';

describe('excludeWorkspaceIds', () => {
  it('should return the same list when nothing is excluded', () => {
    const workspaceIds = ['ws-1', 'ws-2'];

    expect(excludeWorkspaceIds(workspaceIds, [])).toBe(workspaceIds);
  });

  it('should drop excluded workspace ids and keep order', () => {
    expect(
      excludeWorkspaceIds(['ws-1', 'ws-2', 'ws-3'], ['ws-2', 'ws-unknown']),
    ).toStrictEqual(['ws-1', 'ws-3']);
  });

  it('should return an empty list when every workspace is excluded', () => {
    expect(excludeWorkspaceIds(['ws-1'], ['ws-1'])).toStrictEqual([]);
  });
});
