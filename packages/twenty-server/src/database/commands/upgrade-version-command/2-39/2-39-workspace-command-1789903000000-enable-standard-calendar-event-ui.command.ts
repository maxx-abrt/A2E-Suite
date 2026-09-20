import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

// Only the event content fields become locally editable; provider-synced
// metadata fields (iCalUid, external*At, conference*, relations) keep their
// standard read-only semantics.
const LOCAL_EDITABLE_CALENDAR_EVENT_FIELD_UNIVERSAL_IDENTIFIERS = [
  STANDARD_OBJECTS.calendarEvent.fields.title.universalIdentifier,
  STANDARD_OBJECTS.calendarEvent.fields.description.universalIdentifier,
  STANDARD_OBJECTS.calendarEvent.fields.location.universalIdentifier,
  STANDARD_OBJECTS.calendarEvent.fields.startsAt.universalIdentifier,
  STANDARD_OBJECTS.calendarEvent.fields.endsAt.universalIdentifier,
  STANDARD_OBJECTS.calendarEvent.fields.isFullDay.universalIdentifier,
  STANDARD_OBJECTS.calendarEvent.fields.isCanceled.universalIdentifier,
];

@RegisteredWorkspaceCommand('2.39.0', 1789903000000)
@Command({
  name: 'upgrade:2-39:enable-standard-calendar-event-ui',
  description:
    'Make standard calendarEvent records creatable and their content fields editable in the generic record UI so local (channel-less) events can be managed without a connected provider',
})
export class EnableStandardCalendarEventUiCommand extends ProvisionedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    dataSource,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    if (!isDefined(dataSource)) {
      this.logger.warn(`No data source for workspace ${workspaceId}, skipping`);

      return;
    }

    if (options.dryRun) {
      this.logger.log(
        `[DRY RUN] Would enable the standard calendarEvent record UI for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const objectUpdateResult = await dataSource.query<[unknown[], number]>(
      `UPDATE "core"."objectMetadata"
       SET "isUICreatable" = true, "updatedAt" = now()
       WHERE "workspaceId" = $1
         AND "applicationId" = $2
         AND "universalIdentifier" = $3
         AND "isUICreatable" = false`,
      [
        workspaceId,
        twentyStandardFlatApplication.id,
        STANDARD_OBJECTS.calendarEvent.universalIdentifier,
      ],
    );

    const fieldUpdateResult = await dataSource.query<[unknown[], number]>(
      `UPDATE "core"."fieldMetadata"
       SET "isUIEditable" = true, "updatedAt" = now()
       WHERE "workspaceId" = $1
         AND "applicationId" = $2
         AND "universalIdentifier" = ANY($3::uuid[])
         AND "isUIEditable" = false`,
      [
        workspaceId,
        twentyStandardFlatApplication.id,
        LOCAL_EDITABLE_CALENDAR_EVENT_FIELD_UNIVERSAL_IDENTIFIERS,
      ],
    );

    await this.workspaceCacheService.invalidateAndRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatFieldMetadataMaps',
    ]);

    this.logger.log(
      `Enabled calendarEvent UI for workspace ${workspaceId} (${objectUpdateResult[1]} object, ${fieldUpdateResult[1]} field(s) updated)`,
    );
  }
}
