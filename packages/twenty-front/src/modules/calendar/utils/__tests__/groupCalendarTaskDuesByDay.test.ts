import { Temporal } from 'temporal-polyfill';

import { type CalendarTaskDueRecord } from '@/calendar/types/CalendarTaskDueRecord';
import { getCalendarTaskDueQueryRange } from '@/calendar/utils/getCalendarTaskDueQueryRange';
import { groupCalendarTaskDuesByDay } from '@/calendar/utils/groupCalendarTaskDuesByDay';

const buildTask = (
  overrides: Partial<CalendarTaskDueRecord>,
): CalendarTaskDueRecord => ({
  id: 'task-1',
  title: 'Task',
  dueAt: null,
  status: 'TODO',
  ...overrides,
});

const firstDay = Temporal.PlainDate.from('2026-07-13');
const lastDay = Temporal.PlainDate.from('2026-07-19');
const today = Temporal.PlainDate.from('2026-07-15');

const summarize = (
  taskDuesByDay: ReturnType<typeof groupCalendarTaskDuesByDay>,
) =>
  Object.fromEntries(
    [...taskDuesByDay.entries()]
      .sort(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .map(([day, taskDues]) => [day, taskDues.map(({ task }) => task.id)]),
  );

describe('groupCalendarTaskDuesByDay', () => {
  it('places a task on the day its due date falls on in the viewer zone', () => {
    const taskDuesByDay = groupCalendarTaskDuesByDay({
      tasks: [
        // 23:30 UTC on the 14th is already the 15th in Paris (UTC+2).
        buildTask({ id: 'late', dueAt: '2026-07-14T23:30:00.000Z' }),
      ],
      timeZone: 'Europe/Paris',
      firstDay,
      lastDay,
      today,
    });

    expect(summarize(taskDuesByDay)).toEqual({ '2026-07-15': ['late'] });
  });

  it('keeps a UTC-midnight due date on the previous day west of UTC', () => {
    const taskDuesByDay = groupCalendarTaskDuesByDay({
      tasks: [buildTask({ id: 'utc', dueAt: '2026-07-16T00:00:00.000Z' })],
      timeZone: 'America/New_York',
      firstDay,
      lastDay,
      today,
    });

    expect(summarize(taskDuesByDay)).toEqual({ '2026-07-15': ['utc'] });
  });

  it('skips tasks without a due date, with an unreadable one, or out of range', () => {
    const taskDuesByDay = groupCalendarTaskDuesByDay({
      tasks: [
        buildTask({ id: 'no-due', dueAt: null }),
        buildTask({ id: 'garbage', dueAt: 'not-a-date' }),
        buildTask({ id: 'before', dueAt: '2026-07-12T10:00:00.000Z' }),
        buildTask({ id: 'after', dueAt: '2026-07-20T10:00:00.000Z' }),
        buildTask({ id: 'inside', dueAt: '2026-07-19T10:00:00.000Z' }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
      today,
    });

    expect(summarize(taskDuesByDay)).toEqual({ '2026-07-19': ['inside'] });
  });

  it('flags open past deadlines as overdue but never done or future ones', () => {
    const taskDuesByDay = groupCalendarTaskDuesByDay({
      tasks: [
        buildTask({ id: 'late-open', dueAt: '2026-07-14T09:00:00.000Z' }),
        buildTask({
          id: 'late-done',
          dueAt: '2026-07-14T10:00:00.000Z',
          status: 'DONE',
        }),
        buildTask({ id: 'today', dueAt: '2026-07-15T09:00:00.000Z' }),
        buildTask({
          id: 'no-status',
          dueAt: '2026-07-13T09:00:00.000Z',
          status: null,
        }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
      today,
    });

    const flags = Object.fromEntries(
      [...taskDuesByDay.values()]
        .flat()
        .map(({ task, isDone, isOverdue }) => [task.id, { isDone, isOverdue }]),
    );

    expect(flags).toEqual({
      'late-open': { isDone: false, isOverdue: true },
      'late-done': { isDone: true, isOverdue: false },
      today: { isDone: false, isOverdue: false },
      'no-status': { isDone: false, isOverdue: true },
    });
  });

  it('orders open tasks by due time, then title, and sinks done tasks', () => {
    const taskDuesByDay = groupCalendarTaskDuesByDay({
      tasks: [
        buildTask({
          id: 'done-early',
          dueAt: '2026-07-16T08:00:00.000Z',
          status: 'DONE',
        }),
        buildTask({ id: 'b-noon', title: 'B', dueAt: '2026-07-16T12:00:00Z' }),
        buildTask({ id: 'a-noon', title: 'A', dueAt: '2026-07-16T12:00:00Z' }),
        buildTask({ id: 'morning', title: 'Z', dueAt: '2026-07-16T09:00:00Z' }),
      ],
      timeZone: 'UTC',
      firstDay,
      lastDay,
      today,
    });

    expect(summarize(taskDuesByDay)).toEqual({
      '2026-07-16': ['morning', 'a-noon', 'b-noon', 'done-early'],
    });
  });

  it('renders a task once even if the API returned it twice', () => {
    const task = buildTask({ id: 'dup', dueAt: '2026-07-16T12:00:00Z' });
    const taskDuesByDay = groupCalendarTaskDuesByDay({
      tasks: [task, { ...task }],
      timeZone: 'UTC',
      firstDay,
      lastDay,
      today,
    });

    expect(summarize(taskDuesByDay)).toEqual({ '2026-07-16': ['dup'] });
  });
});

describe('getCalendarTaskDueQueryRange', () => {
  it('bounds the visible days in the viewer zone, end exclusive', () => {
    expect(
      getCalendarTaskDueQueryRange({
        firstDay,
        lastDay,
        timeZone: 'Europe/Paris',
      }),
    ).toEqual({
      dueAtFrom: '2026-07-12T22:00:00Z',
      dueAtBefore: '2026-07-19T22:00:00Z',
    });
  });

  it('follows the offset change when the range crosses a DST switch', () => {
    expect(
      getCalendarTaskDueQueryRange({
        firstDay: Temporal.PlainDate.from('2026-10-19'),
        lastDay: Temporal.PlainDate.from('2026-10-25'),
        timeZone: 'Europe/Paris',
      }),
    ).toEqual({
      dueAtFrom: '2026-10-18T22:00:00Z',
      dueAtBefore: '2026-10-25T23:00:00Z',
    });
  });

  it('keeps every task the grouping would place inside the query bounds', () => {
    const timeZone = 'America/New_York';
    const { dueAtFrom, dueAtBefore } = getCalendarTaskDueQueryRange({
      firstDay,
      lastDay,
      timeZone,
    });
    const edgeTasks = [
      buildTask({ id: 'first-instant', dueAt: dueAtFrom }),
      buildTask({
        id: 'last-instant',
        dueAt: Temporal.Instant.from(dueAtBefore)
          .subtract({ milliseconds: 1 })
          .toString(),
      }),
      buildTask({ id: 'excluded-end', dueAt: dueAtBefore }),
    ];

    expect(
      summarize(
        groupCalendarTaskDuesByDay({
          tasks: edgeTasks,
          timeZone,
          firstDay,
          lastDay,
          today,
        }),
      ),
    ).toEqual({
      '2026-07-13': ['first-instant'],
      '2026-07-19': ['last-instant'],
    });
  });
});
