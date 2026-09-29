import { type WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { AddAgendaNavigationMenuItemCommand } from 'src/database/commands/upgrade-version-command/2-39/2-39-workspace-command-1790720500000-add-agenda-navigation-menu-item.command';
import { type ApplicationService } from 'src/engine/core-modules/application/application.service';
import { NavigationMenuItemType } from 'src/engine/metadata-modules/navigation-menu-item/enums/navigation-menu-item-type.enum';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { type WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const WORKSPACE_ID = '20202020-0000-0000-0000-000000000001';
const STANDARD_APPLICATION = {
  id: '20202020-0000-0000-0000-0000000000aa',
  universalIdentifier: '20202020-0000-0000-0000-0000000000bb',
};

const buildFlatNavigationMenuItemMaps = ({
  agendaPresent,
}: {
  agendaPresent: boolean;
}) => ({
  byUniversalIdentifier: agendaPresent
    ? {
        [AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER]: {
          universalIdentifier: AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
        },
      }
    : {},
});

describe('AddAgendaNavigationMenuItemCommand', () => {
  let command: AddAgendaNavigationMenuItemCommand;
  let getOrRecomputeMock: jest.Mock;
  let findApplicationMock: jest.Mock;
  let validateBuildAndRunWorkspaceMigrationMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    getOrRecomputeMock = jest.fn();
    findApplicationMock = jest.fn().mockResolvedValue({
      twentyStandardFlatApplication: STANDARD_APPLICATION,
    });
    validateBuildAndRunWorkspaceMigrationMock = jest
      .fn()
      .mockResolvedValue({ status: 'success' });

    command = new AddAgendaNavigationMenuItemCommand(
      {} as WorkspaceIteratorService,
      {
        findWorkspaceTwentyStandardAndCustomApplicationOrThrow:
          findApplicationMock,
      } as unknown as ApplicationService,
      {
        getOrRecompute: getOrRecomputeMock,
      } as unknown as WorkspaceCacheService,
      {
        validateBuildAndRunWorkspaceMigration:
          validateBuildAndRunWorkspaceMigrationMock,
      } as unknown as WorkspaceMigrationValidateBuildAndRunService,
    );
  });

  const runOnWorkspace = (dryRun = false) =>
    command.runOnWorkspace({
      workspaceId: WORKSPACE_ID,
      options: { dryRun },
      index: 0,
      total: 1,
    });

  const mockWorkspaceCache = ({ agendaPresent = false } = {}) => {
    getOrRecomputeMock.mockResolvedValue({
      flatNavigationMenuItemMaps: buildFlatNavigationMenuItemMaps({
        agendaPresent,
      }),
    });
  };

  it('creates the Agenda LINK row when it is absent', async () => {
    mockWorkspaceCache();

    await runOnWorkspace();

    expect(validateBuildAndRunWorkspaceMigrationMock).toHaveBeenCalledWith({
      isSystemBuild: true,
      workspaceId: WORKSPACE_ID,
      applicationUniversalIdentifier: STANDARD_APPLICATION.universalIdentifier,
      allFlatEntityOperationByMetadataName: {
        navigationMenuItem: {
          flatEntityToCreate: [
            expect.objectContaining({
              type: NavigationMenuItemType.LINK,
              universalIdentifier:
                AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
              link: '/calendar',
              name: 'Agenda',
            }),
          ],
          flatEntityToDelete: [],
          flatEntityToUpdate: [],
        },
      },
    });
  });

  it('is a no-op when the Agenda row is already present (idempotent rerun)', async () => {
    mockWorkspaceCache({ agendaPresent: true });

    await runOnWorkspace();

    expect(findApplicationMock).not.toHaveBeenCalled();
    expect(validateBuildAndRunWorkspaceMigrationMock).not.toHaveBeenCalled();
  });

  it('does not write metadata in dry-run mode', async () => {
    mockWorkspaceCache();

    await runOnWorkspace(true);

    expect(validateBuildAndRunWorkspaceMigrationMock).not.toHaveBeenCalled();
  });

  it('throws when the migration fails', async () => {
    mockWorkspaceCache();
    validateBuildAndRunWorkspaceMigrationMock.mockResolvedValue({
      status: 'fail',
      errors: [],
    });

    await expect(runOnWorkspace()).rejects.toThrow(
      `Failed to add the Agenda navigation menu item for workspace ${WORKSPACE_ID}`,
    );
  });
});
