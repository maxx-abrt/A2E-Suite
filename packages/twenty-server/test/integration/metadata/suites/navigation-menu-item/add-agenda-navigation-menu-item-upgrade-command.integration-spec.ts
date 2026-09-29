import { deleteManyNavigationMenuItems } from 'test/integration/metadata/suites/navigation-menu-item/utils/delete-many-navigation-menu-items.util';
import { findNavigationMenuItems } from 'test/integration/metadata/suites/navigation-menu-item/utils/find-navigation-menu-items.util';
import { getAppProviderByClassName } from 'test/integration/utils/get-app-provider-by-class-name.util';

import { AddAgendaNavigationMenuItemCommand } from 'src/database/commands/upgrade-version-command/2-39/2-39-workspace-command-1790720500000-add-agenda-navigation-menu-item.command';
import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';

const AGENDA_LINK = '/calendar';

const NAVIGATION_MENU_ITEM_GQL_FIELDS = `
  id
  type
  name
  link
`;

const getAgendaRows = async () => {
  const { data } = await findNavigationMenuItems({
    input: undefined,
    expectToFail: false,
    gqlFields: NAVIGATION_MENU_ITEM_GQL_FIELDS,
  });

  return (data.navigationMenuItems ?? []).filter(
    (navigationMenuItem) => navigationMenuItem.link === AGENDA_LINK,
  );
};

const runAgendaCommand = async () => {
  const command = getAppProviderByClassName<AddAgendaNavigationMenuItemCommand>(
    'AddAgendaNavigationMenuItemCommand',
  );

  await command.runOnWorkspace({
    workspaceId: SEED_APPLE_WORKSPACE_ID,
    options: {},
    index: 0,
    total: 1,
  });
};

// The command runs per workspace against the real DB and the real metadata
// migration path: this proves the standard Agenda row is created exactly once
// and a rerun is a no-op, which a mocked unit spec cannot show.
describe('AddAgendaNavigationMenuItemCommand idempotency', () => {
  it('inserts the Agenda row once and never duplicates it on rerun', async () => {
    const existingAgendaRows = await getAgendaRows();

    if (existingAgendaRows.length > 0) {
      await deleteManyNavigationMenuItems({
        ids: existingAgendaRows.map(
          (navigationMenuItem) => navigationMenuItem.id,
        ),
        expectToFail: false,
      });
    }

    expect(await getAgendaRows()).toHaveLength(0);

    await runAgendaCommand();

    const agendaRowsAfterFirstRun = await getAgendaRows();

    expect(agendaRowsAfterFirstRun).toHaveLength(1);
    expect(agendaRowsAfterFirstRun[0]).toMatchObject({
      type: 'LINK',
      link: AGENDA_LINK,
      name: 'Agenda',
    });

    await runAgendaCommand();

    expect(await getAgendaRows()).toHaveLength(1);
  });
});
