import { NavigationMenuItemType } from 'src/engine/metadata-modules/navigation-menu-item/enums/navigation-menu-item-type.enum';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { createStandardNavigationMenuItemLinkFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/create-standard-navigation-menu-item-link-flat-metadata.util';

const WORKSPACE_ID = '20202020-0000-4000-8000-000000000000';
const STANDARD_APPLICATION_ID = '20202020-0000-4000-8000-000000000001';
const NOW = '2026-09-29T00:00:00.000Z';

describe('createStandardNavigationMenuItemLinkFlatMetadata', () => {
  it('builds an application-owned LINK row for an allow-listed host route', () => {
    const flatNavigationMenuItem =
      createStandardNavigationMenuItemLinkFlatMetadata({
        universalIdentifier: '20202020-b00c-4b0c-8b0c-c0aba11c000c',
        name: 'Agenda',
        link: '/calendar',
        icon: 'IconCalendarEvent',
        color: 'turquoise',
        position: 8,
        navigationMenuItemId: '20202020-0000-4000-8000-0000000000ff',
        workspaceId: WORKSPACE_ID,
        twentyStandardApplicationId: STANDARD_APPLICATION_ID,
        now: NOW,
      });

    expect(flatNavigationMenuItem).toMatchObject({
      type: NavigationMenuItemType.LINK,
      universalIdentifier: '20202020-b00c-4b0c-8b0c-c0aba11c000c',
      applicationId: STANDARD_APPLICATION_ID,
      applicationUniversalIdentifier:
        TWENTY_STANDARD_APPLICATION.universalIdentifier,
      workspaceId: WORKSPACE_ID,
      name: 'Agenda',
      link: '/calendar',
      icon: 'IconCalendarEvent',
      color: 'turquoise',
      position: 8,
      createdAt: NOW,
      updatedAt: NOW,
    });

    // A LINK row must never carry a view or record target: the drawer resolves
    // it from `link` alone.
    expect(flatNavigationMenuItem).toMatchObject({
      targetRecordId: null,
      targetObjectMetadataId: null,
      targetObjectMetadataUniversalIdentifier: null,
      viewId: null,
      viewUniversalIdentifier: null,
      folderId: null,
      folderUniversalIdentifier: null,
      pageLayoutId: null,
      pageLayoutUniversalIdentifier: null,
      userWorkspaceId: null,
    });
  });
});
