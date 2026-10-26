import { Command, Option } from 'nest-commander';

import {
  ProvisionedWorkspaceCommandRunner,
  type ProvisionedWorkspaceCommandOptions,
} from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { PreInstalledAppsService } from 'src/engine/core-modules/application/pre-installed-apps/pre-installed-apps.service';

type InstallPreInstalledAppsOptions = ProvisionedWorkspaceCommandOptions & {
  deferPostInstall?: boolean;
};

// Backfill: rolls `isPreInstalled=true` registrations out to workspaces
// that existed before the flag was flipped. Idempotent.
@Command({
  name: 'install-pre-installed-apps',
  description:
    'Install every application registration flagged `isPreInstalled` on every provisioned workspace. Idempotent.',
})
export class InstallPreInstalledAppsCommand extends ProvisionedWorkspaceCommandRunner<InstallPreInstalledAppsOptions> {
  protected override failOnWorkspaceErrors = true;

  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly preInstalledAppsService: PreInstalledAppsService,
  ) {
    super(workspaceIteratorService);
  }

  @Option({
    flags: '--defer-post-install',
    description:
      'Queue post-install hooks until the HTTP server and worker are ready',
  })
  parseDeferPostInstall(): boolean {
    return true;
  }

  override async runOnWorkspace({
    workspaceId,
    options,
    index,
    total,
  }: RunOnWorkspaceArgs & {
    options: InstallPreInstalledAppsOptions;
  }): Promise<void> {
    const dryRun = options.dryRun ?? false;

    this.logger.log(
      `${dryRun ? '[DRY RUN] ' : ''}Installing pre-installed apps on workspace ${workspaceId} (${index + 1}/${total})`,
    );

    if (dryRun) {
      return;
    }

    await this.preInstalledAppsService.installOnWorkspace(workspaceId, {
      shouldDeferPostInstall: options.deferPostInstall === true,
    });
  }
}
