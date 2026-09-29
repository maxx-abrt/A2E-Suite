import { isDefined } from 'twenty-shared/utils';

import { NavigationMenuItemType } from 'src/engine/metadata-modules/navigation-menu-item/enums/navigation-menu-item-type.enum';
import { AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';

// New workspaces are provisioned from the standard application maps, so the
// Agenda row existing here is what makes it present without any app install.
describe('buildStandardFlatNavigationMenuItemMaps', () => {
  const { allFlatEntityMaps } =
    computeTwentyStandardApplicationAllFlatEntityMaps({
      now: '2026-09-29T00:00:00.000Z',
      workspaceId: '20202020-0000-4000-8000-000000000000',
      twentyStandardApplicationId: '20202020-0000-4000-8000-000000000001',
    });

  const agendaNavigationMenuItem =
    allFlatEntityMaps.flatNavigationMenuItemMaps.byUniversalIdentifier[
      AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER
    ];

  it('seeds the Agenda LINK row pointing at the host calendar', () => {
    expect(isDefined(agendaNavigationMenuItem)).toBe(true);
    expect(agendaNavigationMenuItem).toMatchObject({
      type: NavigationMenuItemType.LINK,
      link: '/calendar',
      name: 'Agenda',
      applicationUniversalIdentifier:
        TWENTY_STANDARD_APPLICATION.universalIdentifier,
    });
  });

  it('places Agenda in the top-level rows', () => {
    expect(agendaNavigationMenuItem?.position).toBe(8);
    expect(agendaNavigationMenuItem?.folderUniversalIdentifier).toBeNull();
  });
});
