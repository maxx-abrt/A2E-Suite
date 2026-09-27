import { type ObjectRecordUpdateEvent } from 'twenty-shared/database-events';

import { CalendarReminderRescheduleListener } from 'src/engine/core-modules/calendar/listeners/calendar-reminder-reschedule.listener';
import { type CalendarReminderService } from 'src/engine/core-modules/calendar/services/calendar-reminder.service';
import { type CalendarReminderScheduleFields } from 'src/engine/core-modules/calendar/utils/calendar-reminder.util';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

type CalendarEventRow = CalendarReminderScheduleFields & { id: string };

const DELIVERED: CalendarEventRow = {
  id: 'event-1',
  startsAt: '2026-09-27T10:00:00.000Z',
  reminderMinutes: 15,
  reminderDeliveredAt: '2026-09-27T09:45:00.000Z',
};

const buildUpdateEvent = (
  before: CalendarEventRow,
  after: CalendarEventRow,
): ObjectRecordUpdateEvent<CalendarEventRow> =>
  ({
    recordId: after.id,
    properties: {
      before,
      after,
      updatedFields: [],
      diff: {},
    },
  }) as unknown as ObjectRecordUpdateEvent<CalendarEventRow>;

const buildBatch = (
  events: ObjectRecordUpdateEvent<CalendarEventRow>[],
): WorkspaceEventBatch<ObjectRecordUpdateEvent<CalendarEventRow>> =>
  ({
    name: 'calendarEvent.updated',
    workspaceId: WORKSPACE_ID,
    events,
  }) as unknown as WorkspaceEventBatch<
    ObjectRecordUpdateEvent<CalendarEventRow>
  >;

const buildListener = (
  rearmDeliveredReminders = jest.fn().mockResolvedValue(1),
) => ({
  listener: new CalendarReminderRescheduleListener({
    rearmDeliveredReminders,
  } as unknown as CalendarReminderService),
  rearmDeliveredReminders,
});

describe('CalendarReminderRescheduleListener', () => {
  it('re-arms the delivered reminder of a moved event', async () => {
    const { listener, rearmDeliveredReminders } = buildListener();

    await listener.handleCalendarEventUpdated(
      buildBatch([
        buildUpdateEvent(DELIVERED, {
          ...DELIVERED,
          startsAt: '2026-09-27T11:00:00.000Z',
        }),
      ]),
    );

    expect(rearmDeliveredReminders).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      calendarEventIds: ['event-1'],
    });
  });

  it('re-arms only the rescheduled events of a batch', async () => {
    const { listener, rearmDeliveredReminders } = buildListener();

    await listener.handleCalendarEventUpdated(
      buildBatch([
        buildUpdateEvent(DELIVERED, { ...DELIVERED, reminderMinutes: 60 }),
        buildUpdateEvent(
          { ...DELIVERED, id: 'event-2' },
          { ...DELIVERED, id: 'event-2' },
        ),
        buildUpdateEvent(
          { ...DELIVERED, id: 'event-3', reminderDeliveredAt: null },
          {
            ...DELIVERED,
            id: 'event-3',
            reminderDeliveredAt: null,
            startsAt: '2026-09-28T10:00:00.000Z',
          },
        ),
      ]),
    );

    expect(rearmDeliveredReminders).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      calendarEventIds: ['event-1'],
    });
  });

  it('ignores its own dispatch claim and unrelated edits', async () => {
    const { listener, rearmDeliveredReminders } = buildListener();

    await listener.handleCalendarEventUpdated(
      buildBatch([
        buildUpdateEvent(
          { ...DELIVERED, reminderDeliveredAt: null },
          DELIVERED,
        ),
        buildUpdateEvent(DELIVERED, { ...DELIVERED }),
      ]),
    );

    expect(rearmDeliveredReminders).not.toHaveBeenCalled();
  });

  it('never fails the save when re-arming throws', async () => {
    const { listener } = buildListener(
      jest.fn().mockRejectedValue(new Error('db down')),
    );

    await expect(
      listener.handleCalendarEventUpdated(
        buildBatch([
          buildUpdateEvent(DELIVERED, {
            ...DELIVERED,
            startsAt: '2026-09-27T11:00:00.000Z',
          }),
        ]),
      ),
    ).resolves.toBeUndefined();
  });
});
