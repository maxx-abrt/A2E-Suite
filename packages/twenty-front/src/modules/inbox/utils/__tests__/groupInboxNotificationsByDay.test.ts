import { type InboxNotification } from '@/inbox/types/InboxNotification';
import {
  getInboxDayKey,
  getYesterdayDate,
  groupInboxNotificationsByDay,
} from '@/inbox/utils/groupInboxNotificationsByDay';

const localIso = (
  year: number,
  monthIndex: number,
  day: number,
  hours: number,
  minutes: number,
): string => new Date(year, monthIndex, day, hours, minutes).toISOString();

const buildNotification = (
  overrides: Partial<InboxNotification> & Pick<InboxNotification, 'id'>,
): InboxNotification => ({
  type: 'MENTION',
  payload: null,
  createdAt: localIso(2026, 8, 18, 9, 0),
  readAt: null,
  archivedAt: null,
  ...overrides,
});

describe('groupInboxNotificationsByDay', () => {
  it('groups by local calendar day, newest day first', () => {
    const groups = groupInboxNotificationsByDay([
      buildNotification({
        id: 'yesterday',
        createdAt: localIso(2026, 8, 17, 23, 30),
      }),
      buildNotification({
        id: 'today-morning',
        createdAt: localIso(2026, 8, 18, 8, 0),
      }),
    ]);

    expect(groups.map((group) => group.dayKey)).toEqual([
      '2026-09-18',
      '2026-09-17',
    ]);
  });

  it('sorts notifications inside a day newest first', () => {
    const groups = groupInboxNotificationsByDay([
      buildNotification({
        id: 'older',
        createdAt: localIso(2026, 8, 18, 8, 0),
      }),
      buildNotification({
        id: 'newer',
        createdAt: localIso(2026, 8, 18, 12, 0),
      }),
    ]);

    expect(
      groups[0].notifications.map((notification) => notification.id),
    ).toEqual(['newer', 'older']);
  });

  it('ties identical timestamps by id for a stable order', () => {
    const createdAt = localIso(2026, 8, 18, 9, 0);
    const groups = groupInboxNotificationsByDay([
      buildNotification({ id: 'a', createdAt }),
      buildNotification({ id: 'b', createdAt }),
    ]);

    expect(
      groups[0].notifications.map((notification) => notification.id),
    ).toEqual(['b', 'a']);
  });

  it('returns no groups for an empty inbox', () => {
    expect(groupInboxNotificationsByDay([])).toEqual([]);
  });
});

describe('getInboxDayKey', () => {
  it('zero-pads month and day', () => {
    expect(getInboxDayKey(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
});

describe('getYesterdayDate', () => {
  it('returns the previous local day', () => {
    expect(getInboxDayKey(getYesterdayDate(new Date(2026, 8, 18, 0, 5)))).toBe(
      '2026-09-17',
    );
  });
});
