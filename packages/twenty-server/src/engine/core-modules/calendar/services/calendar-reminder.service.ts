import { Injectable, Logger } from '@nestjs/common';

import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { type NotificationQuietHours } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { KeyValuePairService } from 'src/engine/core-modules/key-value-pair/key-value-pair.service';
import { normalizeNotificationPreferences } from 'src/engine/core-modules/notification/utils/normalize-notification-preferences.util';
import { type CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
import {
  buildCalendarReminderNotificationPayload,
  computeCalendarReminderSchedule,
  type CalendarReminderEvent,
} from 'src/engine/core-modules/calendar/utils/calendar-reminder.util';

type NotificationPreferenceKeyValueTypeMap = {
  [key: string]: ReturnType<typeof normalizeNotificationPreferences>;
};

// Dispatches calendar reminders on the P8 notification contract.
//
// Delivery is idempotent: reminderDeliveredAt acts as a write-once key; once
// set the event is never re-dispatched even if the cron fires repeatedly.
//
// Reschedule: update reminderMinutes + clear reminderDeliveredAt → the next
// cron pass picks up the event again.
//
// Cancel: set calendarEvent.isCanceled = true → the scheduler skips it.
//
// D05 documented defaults (open decision; do not change without resolving D05):
//   • Timezone: event.recurrenceTimezone if present, else UTC.
//   • Quiet hours: workspace member's P8 preference utcOffsetMinutes.
//   • Attendee notifications: NOT implemented — D05 must specify whether
//     all participants or only the owner receives the reminder before this
//     can be wired to additional userId lookups.
@Injectable()
export class CalendarReminderService {
  private readonly logger = new Logger(CalendarReminderService.name);

  constructor(
    private readonly twentyOrmGlobalManager: TwentyORMGlobalManager,
    private readonly notificationService: NotificationService,
    private readonly keyValuePairService: KeyValuePairService<NotificationPreferenceKeyValueTypeMap>,
  ) {}

  // Scan a single workspace for events whose reminders are now due and dispatch
  // them via NotificationService. Called from the cron job every minute.
  async dispatchDueReminders({
    workspaceId,
    now,
  }: {
    workspaceId: string;
    now: Date;
  }): Promise<{ dispatched: number; skipped: number }> {
    const repository =
      await this.twentyOrmGlobalManager.getRepositoryForWorkspace<CalendarEventWorkspaceEntity>(
        workspaceId,
        'calendarEvent',
      );

    // Candidate window: only events that start within the next 24 h and have a
    // reminder set but not yet delivered. The `where` clause is intentionally
    // broad so the pure scheduler can apply the precise quiet-hours check.
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1_000);

    const candidates = await repository.find({
      where: {
        reminderDeliveredAt: null,
        isCanceled: false,
      },
      select: [
        'id',
        'title',
        'startsAt',
        'isCanceled',
        'reminderMinutes',
        'reminderDeliveredAt',
        'recurrenceTimezone',
        'createdBy',
      ],
    });

    let dispatched = 0;
    let skipped = 0;

    for (const event of candidates) {
      try {
        // Resolve the event owner userId from createdBy actor.
        const userId =
          (event.createdBy as unknown as { workspaceMemberId?: string })
            ?.workspaceMemberId ?? null;

        if (userId === null) {
          skipped++;
          continue;
        }

        // Resolve user quiet-hours (fail-open so a missing preference never
        // blocks the reminder).
        let quietHours: NotificationQuietHours = { enabled: false };

        try {
          const prefs = await this.keyValuePairService.get({
            userId,
            workspaceId,
            key: 'notification-preferences',
          });

          const normalized = normalizeNotificationPreferences(prefs);

          quietHours = normalized.quietHours;
        } catch {
          // Preference lookup is best-effort — use the disabled fallback.
        }

        const reminderEvent: CalendarReminderEvent = {
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          isCanceled: event.isCanceled,
          reminderMinutes: event.reminderMinutes ?? null,
          reminderDeliveredAt: event.reminderDeliveredAt ?? null,
          recurrenceTimezone: event.recurrenceTimezone ?? null,
        };

        const result = computeCalendarReminderSchedule(
          reminderEvent,
          now,
          quietHours,
        );

        if (!result.due) {
          skipped++;
          continue;
        }

        // Only consider events in the near-future window to avoid scanning the
        // whole workspace history on each cron tick.
        const startsAtMs = event.startsAt ? Date.parse(event.startsAt) : NaN;

        if (isNaN(startsAtMs) || new Date(startsAtMs) > windowEnd) {
          skipped++;
          continue;
        }

        // Dispatch via the P8 notification contract.
        this.notificationService.requestNotifications({
          workspaceId,
          requests: [
            {
              userId,
              type: 'CALENDAR_REMINDER',
              payload: buildCalendarReminderNotificationPayload(
                reminderEvent,
                userId,
              ),
              createdAt: result.scheduledFor,
            },
          ],
        });

        // Set the idempotency key so the event is never re-dispatched.
        await repository.update(event.id, {
          reminderDeliveredAt: now.toISOString(),
        });

        dispatched++;
      } catch (error) {
        this.logger.error(
          `Failed to dispatch reminder for event ${event.id}: ${String(error)}`,
        );
        skipped++;
      }
    }

    return { dispatched, skipped };
  }
}
