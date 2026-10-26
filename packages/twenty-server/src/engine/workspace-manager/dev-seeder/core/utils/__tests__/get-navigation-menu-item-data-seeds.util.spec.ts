import { getNavigationMenuItemFlatEntitySeeds } from 'src/engine/workspace-manager/dev-seeder/core/utils/get-navigation-menu-item-data-seeds.util';
import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

describe('Development seed navigation', () => {
  it('keeps developer demonstration pages out of a light workspace', () => {
    expect(
      getNavigationMenuItemFlatEntitySeeds({
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        flatApplication: {} as never,
        light: true,
      }),
    ).toEqual([]);
  });

  it('keeps the standalone page fixture for full automated tests', () => {
    expect(
      getNavigationMenuItemFlatEntitySeeds({
        workspaceId: SEED_APPLE_WORKSPACE_ID,
        flatApplication: {
          id: 'application-id',
          universalIdentifier: 'identifier',
        } as never,
        light: false,
      }),
    ).toEqual([
      expect.objectContaining({ name: 'Star History', type: 'PAGE_LAYOUT' }),
    ]);
  });
});
