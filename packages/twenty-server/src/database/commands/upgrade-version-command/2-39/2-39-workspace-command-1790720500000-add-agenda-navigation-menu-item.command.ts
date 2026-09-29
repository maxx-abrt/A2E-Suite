import { Command } from 'nest-commander';
import { randomUUID } from 'crypto';

import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import {
  AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  STANDARD_NAVIGATION_MENU_ITEM_DEFAULT_COLORS,
  STANDARD_NAVIGATION_MENU_ITEMS,
} from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';
import { createStandardNavigationMenuItemLinkFlatMetadata } from 'src/engine/workspace-manager/twenty-standard-application/utils/navigation-menu-item/create-standard-navigation-menu-item-link-flat-metadata.util';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

// Workspaces provisioned before Agenda became a standard row get the host
// /calendar entry here. Guarded by the standard universal identifier so a
// rerun (or a workspace where the row was already seeded) is a no-op — the
// command is additive and never re-creates a row the user deleted on purpose
// (that provenance lives in the template-hidden record, not here).
@RegisteredWorkspaceCommand('2.39.0', 1790720500000)
@Command({
  name: 'upgrade:2-39:add-agenda-navigation-menu-item',
  description:
    'Add the standard Agenda (/calendar) navigation menu item to existing workspaces that predate it',
})
export class AddAgendaNavigationMenuItemCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { flatNavigationMenuItemMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatNavigationMenuItemMaps',
      ]);

    if (
      isDefined(
        flatNavigationMenuItemMaps.byUniversalIdentifier[
          AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER
        ],
      )
    ) {
      this.logger.log(
        `Agenda navigation menu item already present for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would add the Agenda navigation menu item for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const agendaDefinition = STANDARD_NAVIGATION_MENU_ITEMS.agenda;
    const navigationMenuItemToCreate =
      createStandardNavigationMenuItemLinkFlatMetadata({
        universalIdentifier: AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
        name: agendaDefinition.name,
        link: agendaDefinition.link,
        icon: agendaDefinition.icon,
        color:
          STANDARD_NAVIGATION_MENU_ITEM_DEFAULT_COLORS.agenda ?? null,
        position: agendaDefinition.position,
        navigationMenuItemId: randomUUID(),
        workspaceId,
        twentyStandardApplicationId: twentyStandardFlatApplication.id,
        now: new Date().toISOString(),
      });

    const result =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          isSystemBuild: true,
          workspaceId,
          applicationUniversalIdentifier:
            twentyStandardFlatApplication.universalIdentifier,
          allFlatEntityOperationByMetadataName: {
            navigationMenuItem: {
              flatEntityToCreate: [navigationMenuItemToCreate],
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
        },
      );

    if (result.status === 'fail') {
      throw new Error(
        `Failed to add the Agenda navigation menu item for workspace ${workspaceId}: ${JSON.stringify(
          result,
          null,
          2,
        )}`,
      );
    }

    this.logger.log(
      `Added the Agenda navigation menu item for workspace ${workspaceId}`,
    );
  }
}
