import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { isDefined } from 'twenty-shared/utils';

import { ProvisionedWorkspaceCommandRunner } from 'src/database/commands/command-runners/provisioned-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { computeTwentyStandardApplicationAllFlatEntityMaps } from 'src/engine/workspace-manager/twenty-standard-application/utils/twenty-standard-application-all-flat-entity-maps.constant';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

const CALENDAR_EVENT = STANDARD_OBJECTS.calendarEvent;

// P4C.4 reminder fields on the standard calendarEvent object:
//   reminderMinutes  — minutes before startsAt to fire the reminder (nullable)
//   reminderDeliveredAt — idempotency key; non-null = reminder already sent
// Both are nullable so existing rows and provider-synced events are unaffected.
// D05 documented default: fire in event's recurrenceTimezone; UTC fallback.
const REMINDER_FIELD_UNIVERSAL_IDENTIFIERS = [
  CALENDAR_EVENT.fields.reminderMinutes.universalIdentifier,
  CALENDAR_EVENT.fields.reminderDeliveredAt.universalIdentifier,
];

@RegisteredWorkspaceCommand('2.39.0', 1789905000000)
@Command({
  name: 'upgrade:2-39:add-calendar-event-reminder-fields',
  description:
    'Add P4C.4 reminder fields (reminderMinutes, reminderDeliveredAt) to the standard calendarEvent object on existing workspaces to enable configurable, idempotent event reminders without a provider dependency',
})
export class AddCalendarEventReminderFieldsCommand extends ProvisionedWorkspaceCommandRunner {
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

    const { flatFieldMetadataMaps, flatObjectMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatFieldMetadataMaps',
        'flatObjectMetadataMaps',
      ]);

    const calendarEventObjectMetadata =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        universalIdentifier: CALENDAR_EVENT.universalIdentifier,
        flatEntityMap: flatObjectMetadataMaps.byUniversalIdentifier,
      });

    if (!isDefined(calendarEventObjectMetadata)) {
      return; // workspace without calendarEvent (e.g. bare install) — skip
    }

    const { allFlatEntityMaps } =
      await computeTwentyStandardApplicationAllFlatEntityMaps({
        workspaceId,
        applicationService: this.applicationService,
      });

    const missingFields = REMINDER_FIELD_UNIVERSAL_IDENTIFIERS.filter(
      (universalIdentifier) =>
        !isDefined(
          findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
            universalIdentifier,
            flatEntityMap: flatFieldMetadataMaps.byUniversalIdentifier,
          }),
        ),
    ).map((universalIdentifier) =>
      findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        universalIdentifier,
        flatEntityMap:
          allFlatEntityMaps.flatFieldMetadataMaps.byUniversalIdentifier,
      }),
    );

    const filteredMissing = missingFields.filter(isDefined);

    if (filteredMissing.length === 0) {
      return; // both fields already present
    }

    if (!isDryRun) {
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunMigrations(
        {
          workspaceId,
          fields: filteredMissing,
          options: { createTableIfNotExist: false },
        },
      );

      await this.workspaceCacheService.recomputeAndClear(workspaceId);
    }
  }
}
