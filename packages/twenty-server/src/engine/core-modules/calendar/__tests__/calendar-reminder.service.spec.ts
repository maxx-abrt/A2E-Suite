import { type NotificationService } from 'src/engine/core-modules/notification/services/notification.service';
import { CalendarReminderService } from 'src/engine/core-modules/calendar/services/calendar-reminder.service';
import { type WorkspaceOrmManager } from 'src/engine/twenty-orm/workspace-orm.manager';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const OWNER_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const OWNER_USER_ID = 'user-owner';
const NOW = new Date('2026-09-26T10:00:00.000Z');

type CandidateEvent = {
  id: string;
  title: string | null;
  startsAt: string | null;
  isCanceled: boolean;
  reminderMinutes: number | null;
  reminderDeliveredAt: string | null;
  recurrenceTimezone: string | null;
  createdBy: { workspaceMemberId: string | null };
};

const buildEvent = (overrides: Partial<CandidateEvent> = {}) => ({
  id: 'event-1',
  title: 'Weekly review',
  // Starts in 10 minutes with a 15-minute reminder: due now.
  startsAt: '2026-09-26T10:10:00.000Z',
  isCanceled: false,
  reminderMinutes: 15,
  reminderDeliveredAt: null,
  recurrenceTimezone: null,
  createdBy: { workspaceMemberId: OWNER_MEMBER_ID },
  ...overrides,
});

const buildService = ({
  events = [buildEvent()],
  memberRows = [{ id: OWNER_MEMBER_ID, userId: OWNER_USER_ID }],
  claimAffected = 1,
  getPreferences = jest.fn().mockResolvedValue({
    quietHours: { enabled: false, startMinute: 0, endMinute: 0 },
  }),
}: {
  events?: CandidateEvent[];
  memberRows?: Array<{ id: string; userId: string | null }>;
  claimAffected?: number;
  getPreferences?: jest.Mock;
} = {}) => {
  const findEvents = jest.fn().mockResolvedValue(events);
  const updateEvent = jest.fn().mockResolvedValue({ affected: claimAffected });
  const findMembers = jest.fn().mockResolvedValue(memberRows);
  const getRepository = jest.fn((objectMetadataName: string) =>
    objectMetadataName === 'calendarEvent'
      ? { find: findEvents, update: updateEvent }
      : { find: findMembers },
  );
  const requestNotifications = jest.fn();

  const ormManager = {
    executeInWorkspaceContext: (callback: () => Promise<unknown>) => callback(),
    getRepository,
  } as unknown as WorkspaceOrmManager;
  const notificationService = {
    requestNotifications,
    getPreferences,
  } as unknown as NotificationService;

  return {
    service: new CalendarReminderService(ormManager, notificationService),
    findEvents,
    updateEvent,
    findMembers,
    requestNotifications,
    getPreferences,
  };
};

describe('CalendarReminderService', () => {
  it('notifies the event owner user once and claims the delivery first', async () => {
    const { service, updateEvent, requestNotifications } = buildService();

    const result = await service.dispatchDueReminders({
      workspaceId: WORKSPACE_ID,
      now: NOW,
    });

    expect(result).toEqual({ dispatched: 1, skipped: 0 });
    expect(updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1' }),
      { reminderDeliveredAt: NOW.toISOString() },
    );
    expect(requestNotifications).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      requests: [
        expect.objectContaining({
          // The P8 contract is per user, never per workspace member.
          userId: OWNER_USER_ID,
          type: 'CALENDAR_REMINDER',
          createdAt: new Date('2026-09-26T09:55:00.000Z'),
          payload: expect.objectContaining({ calendarEventId: 'event-1' }),
        }),
      ],
    });
    expect(updateEvent.mock.invocationCallOrder[0]).toBeLessThan(
      requestNotifications.mock.invocationCallOrder[0],
    );
  });

  it('does not notify when another pass already claimed the reminder', async () => {
    const { service, requestNotifications } = buildService({
      claimAffected: 0,
    });

    const result = await service.dispatchDueReminders({
      workspaceId: WORKSPACE_ID,
      now: NOW,
    });

    expect(result).toEqual({ dispatched: 0, skipped: 1 });
    expect(requestNotifications).not.toHaveBeenCalled();
  });

  it('neither claims nor notifies a reminder that is not due yet', async () => {
    const { service, updateEvent, requestNotifications } = buildService({
      events: [buildEvent({ startsAt: '2026-09-26T12:00:00.000Z' })],
    });

    const result = await service.dispatchDueReminders({
      workspaceId: WORKSPACE_ID,
      now: NOW,
    });

    expect(result).toEqual({ dispatched: 0, skipped: 1 });
    expect(updateEvent).not.toHaveBeenCalled();
    expect(requestNotifications).not.toHaveBeenCalled();
  });

  it('skips events whose creator is not a member with a user', async () => {
    const { service, updateEvent, requestNotifications } = buildService({
      events: [
        buildEvent({
          id: 'event-system',
          createdBy: { workspaceMemberId: null },
        }),
        buildEvent({ id: 'event-orphan' }),
      ],
      memberRows: [{ id: OWNER_MEMBER_ID, userId: null }],
    });

    const result = await service.dispatchDueReminders({
      workspaceId: WORKSPACE_ID,
      now: NOW,
    });

    expect(result).toEqual({ dispatched: 0, skipped: 2 });
    expect(updateEvent).not.toHaveBeenCalled();
    expect(requestNotifications).not.toHaveBeenCalled();
  });

  it('only queries reminders that can still fire and resolves members in one read', async () => {
    const { service, findEvents, findMembers } = buildService({
      events: [buildEvent({ id: 'event-1' }), buildEvent({ id: 'event-2' })],
    });

    await service.dispatchDueReminders({ workspaceId: WORKSPACE_ID, now: NOW });

    const [{ where }] = findEvents.mock.calls[0];

    expect(Object.keys(where).sort()).toEqual([
      'isCanceled',
      'reminderDeliveredAt',
      'reminderMinutes',
      'startsAt',
    ]);
    expect(where.isCanceled).toBe(false);
    expect(where.startsAt.value).toBe(NOW.toISOString());
    expect(findMembers).toHaveBeenCalledTimes(1);
  });

  it('falls back to no quiet hours when the preference read fails', async () => {
    const { service, requestNotifications, getPreferences } = buildService({
      getPreferences: jest.fn().mockRejectedValue(new Error('kv down')),
    });

    const result = await service.dispatchDueReminders({
      workspaceId: WORKSPACE_ID,
      now: NOW,
    });

    expect(getPreferences).toHaveBeenCalledWith(OWNER_USER_ID);
    expect(result.dispatched).toBe(1);
    expect(requestNotifications).toHaveBeenCalledTimes(1);
  });

  it('returns early without member lookups when nothing can fire', async () => {
    const { service, findMembers } = buildService({ events: [] });

    const result = await service.dispatchDueReminders({
      workspaceId: WORKSPACE_ID,
      now: NOW,
    });

    expect(result).toEqual({ dispatched: 0, skipped: 0 });
    expect(findMembers).not.toHaveBeenCalled();
  });
});
