import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { In, IsNull, MoreThan, Not } from 'typeorm';

import { type NotificationQuietHours } from 'src/engine/core-modules/notification/types/notification-preferences.type';
import { NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { DEFAULT_NOTIFICATION_QUIET_HOURS } from 'src/engine/core-modules/notification/constants/notification-policy.constant';
import { WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type CalendarEventWorkspaceEntity } from 'src/modules/calendar/common/standard-objects/calendar-event.workspace-entity';
import {
  buildCalendarReminderNotificationPayload,
  computeCalendarReminderSchedule,
  type CalendarReminderEvent,
} from 'src/engine/core-modules/calendar/utils/calendar-reminder.util';

const WORKSPACE_MEMBER_OBJECT_NAME = 'workspaceMember';

// The workspace-object repository is untyped for this projection; the type
// describes exactly the select the query asks for (mention precedent).
type ReminderOwnerWorkspaceMemberRow = { id: string; userId: string | null };
type ReminderOwnerWorkspaceMemberRepository = {
  find(options: {
    where: { id: unknown };
    select: { id: true; userId: true };
  }): Promise<ReminderOwnerWorkspaceMemberRow[]>;
};

export type CalendarReminderDispatchResult = {
  dispatched: number;
  skipped: number;
};

// Dispatches calendar reminders on the P8 notification contract, one pass per
// workspace (CalendarReminderJob, enqueued every minute by the cron job).
//
// Delivery is idempotent: reminderDeliveredAt is claimed with a conditional
// update (`WHERE reminderDeliveredAt IS NULL`) BEFORE the notification is
// requested, so two overlapping passes can never both notify, and a failed
// notify is not retried into a duplicate.
//
// Reschedule: update reminderMinutes/startsAt and clear reminderDeliveredAt →
// the next pass picks the event up again. Cancel: isCanceled = true.
//
// D05 documented defaults (open decision; do not change without resolving D05):
//   • Recipient: the event creator (createdBy.workspaceMemberId → userId)
//     only; attendee reminders need D05 before any participant lookup.
//   • Quiet hours: the recipient's P8 preference; a reminder whose fire time
//     falls inside quiet hours is dropped, not deferred.
//   • Events that already started are never reminded (a late reminder for a
//     past event is noise, e.g. after worker downtime).
//   • Recurring series: one reminder for the series start instance only;
//     per-occurrence reminders need the occurrence model (P4C.2) + D05.
@Injectable()
export class CalendarReminderService {
  private readonly logger = new Logger(CalendarReminderService.name);

  constructor(
    private readonly workspaceOrmManager: WorkspaceOrmManager,
    private readonly notificationService: NotificationService,
  ) {}

  async dispatchDueReminders({
    workspaceId,
    now,
  }: {
    workspaceId: string;
    now: Date;
  }): Promise<CalendarReminderDispatchResult> {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.workspaceOrmManager.executeInWorkspaceContext(async () => {
      const repository =
        this.workspaceOrmManager.getRepository<CalendarEventWorkspaceEntity>(
          'calendarEvent',
          { shouldBypassPermissionChecks: true },
        );

      // Only rows that can still produce a reminder: configured, undelivered,
      // live and not started yet. The pure scheduler applies the precise due /
      // quiet-hours rules below.
      const candidates = await repository.find({
        where: {
          reminderMinutes: Not(IsNull()),
          reminderDeliveredAt: IsNull(),
          isCanceled: false,
          startsAt: MoreThan(now.toISOString()),
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

      if (candidates.length === 0) {
        return { dispatched: 0, skipped: 0 };
      }

      const userIdByWorkspaceMemberId = await this.resolveOwnerUserIds(
        candidates
          .map((event) => event.createdBy?.workspaceMemberId)
          .filter(isDefined),
      );
      const quietHoursByUserId = new Map<string, NotificationQuietHours>();

      let dispatched = 0;
      let skipped = 0;

      for (const event of candidates) {
        try {
          const ownerWorkspaceMemberId = event.createdBy?.workspaceMemberId;
          const userId = isDefined(ownerWorkspaceMemberId)
            ? userIdByWorkspaceMemberId.get(ownerWorkspaceMemberId)
            : undefined;

          if (!isDefined(userId)) {
            skipped++;
            continue;
          }

          const quietHours = await this.getQuietHours({
            userId,
            quietHoursByUserId,
          });

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

          const claim = await repository.update(
            { id: event.id, reminderDeliveredAt: IsNull() },
            { reminderDeliveredAt: now.toISOString() },
          );

          // Another pass claimed it first: exactly one delivery wins.
          if ((claim.affected ?? 0) === 0) {
            skipped++;
            continue;
          }

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

          dispatched++;
        } catch (error) {
          this.logger.error(
            `Failed to dispatch reminder for event ${event.id}: ${String(error)}`,
          );
          skipped++;
        }
      }

      return { dispatched, skipped };
    }, authContext);
  }

  // Events carry workspace-member actors; the notification contract is
  // per-user, so this is the one member→user hop. A removed member drops out.
  private async resolveOwnerUserIds(
    workspaceMemberIds: string[],
  ): Promise<Map<string, string>> {
    const uniqueWorkspaceMemberIds = [...new Set(workspaceMemberIds)];

    if (uniqueWorkspaceMemberIds.length === 0) {
      return new Map();
    }

    const repository =
      this.workspaceOrmManager.getRepository<ReminderOwnerWorkspaceMemberRepository>(
        WORKSPACE_MEMBER_OBJECT_NAME,
        { shouldBypassPermissionChecks: true },
      );

    const rows = (await repository.find({
      where: { id: In(uniqueWorkspaceMemberIds) },
      select: { id: true, userId: true },
    })) as unknown as ReminderOwnerWorkspaceMemberRow[];

    return new Map(
      rows
        .filter((row): row is { id: string; userId: string } =>
          isDefined(row.userId),
        )
        .map((row) => [row.id, row.userId]),
    );
  }

  // Fail-open: a missing or unreadable preference never blocks a reminder.
  private async getQuietHours({
    userId,
    quietHoursByUserId,
  }: {
    userId: string;
    quietHoursByUserId: Map<string, NotificationQuietHours>;
  }): Promise<NotificationQuietHours> {
    const cachedQuietHours = quietHoursByUserId.get(userId);

    if (isDefined(cachedQuietHours)) {
      return cachedQuietHours;
    }

    let quietHours: NotificationQuietHours = DEFAULT_NOTIFICATION_QUIET_HOURS;

    try {
      quietHours = (await this.notificationService.getPreferences(userId))
        .quietHours;
    } catch {
      quietHours = DEFAULT_NOTIFICATION_QUIET_HOURS;
    }

    quietHoursByUserId.set(userId, quietHours);

    return quietHours;
  }
}
