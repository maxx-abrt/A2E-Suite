import { Temporal } from 'temporal-polyfill';

import { buildCalendarQuickTaskInput } from '@/calendar/utils/buildCalendarQuickTaskInput';
import { groupCalendarTaskDuesByDay } from '@/calendar/utils/groupCalendarTaskDuesByDay';

const dueDay = Temporal.PlainDate.from('2026-07-15');

describe('buildCalendarQuickTaskInput', () => {
  it('builds an open task due at local noon on the chosen day', () => {
    expect(
      buildCalendarQuickTaskInput({
        taskId: 'task-1',
        title: '  Send the report  ',
        dueDay,
        timeZone: 'Europe/Paris',
      }),
    ).toEqual({
      id: 'task-1',
      title: 'Send the report',
      dueAt: '2026-07-15T10:00:00Z',
      status: 'TODO',
    });
  });

  it('refuses a blank title', () => {
    expect(
      buildCalendarQuickTaskInput({
        taskId: 'task-1',
        title: '   ',
        dueDay,
        timeZone: 'UTC',
      }),
    ).toBeNull();
  });

  it('uses the offset in force on that day across a DST switch', () => {
    const input = buildCalendarQuickTaskInput({
      taskId: 'task-1',
      title: 'After the switch',
      dueDay: Temporal.PlainDate.from('2026-10-26'),
      timeZone: 'Europe/Paris',
    });

    expect(input?.dueAt).toBe('2026-10-26T11:00:00Z');
  });

  it.each(['America/Los_Angeles', 'Pacific/Auckland', 'Asia/Kolkata', 'UTC'])(
    'lands back on the chosen day in the overlay for %s',
    (timeZone) => {
      const input = buildCalendarQuickTaskInput({
        taskId: 'task-1',
        title: 'Round trip',
        dueDay,
        timeZone,
      });

      const taskDuesByDay = groupCalendarTaskDuesByDay({
        tasks: input === null ? [] : [input],
        timeZone,
        firstDay: dueDay.subtract({ days: 3 }),
        lastDay: dueDay.add({ days: 3 }),
        today: dueDay,
      });

      expect([...taskDuesByDay.keys()]).toEqual(['2026-07-15']);
      expect(taskDuesByDay.get('2026-07-15')?.[0]?.isOverdue).toBe(false);
    },
  );

  it('keeps the day for a teammate within 11 hours of the author', () => {
    const input = buildCalendarQuickTaskInput({
      taskId: 'task-1',
      title: 'Shared deadline',
      dueDay,
      timeZone: 'Europe/Paris',
    });

    ['America/Los_Angeles', 'Asia/Tokyo'].forEach((teammateTimeZone) => {
      const taskDuesByDay = groupCalendarTaskDuesByDay({
        tasks: input === null ? [] : [input],
        timeZone: teammateTimeZone,
        firstDay: dueDay.subtract({ days: 3 }),
        lastDay: dueDay.add({ days: 3 }),
        today: dueDay,
      });

      expect([...taskDuesByDay.keys()]).toEqual(['2026-07-15']);
    });
  });
});
