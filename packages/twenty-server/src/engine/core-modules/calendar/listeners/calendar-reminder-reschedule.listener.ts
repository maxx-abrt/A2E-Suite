import { Injectable, Logger } from '@nestjs/common';

import { type ObjectRecordUpdateEvent } from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { CalendarReminderService } from 'src/engine/core-modules/calendar/services/calendar-reminder.service';
import {
  type CalendarReminderScheduleFields,
  shouldRearmCalendarReminder,
} from 'src/engine/core-modules/calendar/utils/calendar-reminder.util';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

// Projection of the standard calendarEvent row read from the database event.
type CalendarEventReminderRecord = CalendarReminderScheduleFields & {
  id: string;
};

// P4C.4 reschedule: an event moved (or given a new lead time) after its
// reminder fired must be reminded again for the new schedule. Hangs off the
// metadata engine's update event, so every write path (the /calendar composer,
// record pages, the API, series edits) is covered. Best-effort: a failure is
// logged and never fails the user's save.
@Injectable()
export class CalendarReminderRescheduleListener {
  private readonly logger = new Logger(CalendarReminderRescheduleListener.name);

  constructor(
    private readonly calendarReminderService: CalendarReminderService,
  ) {}

  @OnDatabaseBatchEvent('calendarEvent', DatabaseEventAction.UPDATED)
  async handleCalendarEventUpdated(
    payload: WorkspaceEventBatch<
      ObjectRecordUpdateEvent<CalendarEventReminderRecord>
    >,
  ): Promise<void> {
    const calendarEventIds = payload.events
      .filter((event) =>
        shouldRearmCalendarReminder(
          event.properties.before,
          event.properties.after,
        ),
      )
      .map((event) => event.recordId);

    if (calendarEventIds.length === 0) {
      return;
    }

    try {
      await this.calendarReminderService.rearmDeliveredReminders({
        workspaceId: payload.workspaceId,
        calendarEventIds,
      });
    } catch (error) {
      this.logger.error(
        `Failed to re-arm rescheduled calendar reminders in workspace ${payload.workspaceId}: ${String(error)}`,
      );
    }
  }
}
