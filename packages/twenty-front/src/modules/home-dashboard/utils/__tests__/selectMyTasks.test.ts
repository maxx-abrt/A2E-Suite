import {
  isTaskOverdue,
  selectMyTasks,
  type HomeTaskSummary,
} from '@/home-dashboard/utils/selectMyTasks';

const buildTask = (
  overrides: Partial<HomeTaskSummary> & { id: string },
): HomeTaskSummary => ({
  title: 'Task',
  status: 'TODO',
  dueAt: null,
  ...overrides,
});

describe('selectMyTasks', () => {
  it('drops completed tasks and sorts by due date with undated last', () => {
    const tasks = [
      buildTask({
        id: 'done',
        status: 'DONE',
        dueAt: '2026-09-10T00:00:00.000Z',
      }),
      buildTask({
        id: 'later',
        dueAt: '2026-09-20T00:00:00.000Z',
      }),
      buildTask({ id: 'undated' }),
      buildTask({
        id: 'sooner',
        status: 'IN_PROGRESS',
        dueAt: '2026-09-12T00:00:00.000Z',
      }),
    ];

    expect(selectMyTasks(tasks, { limit: 10 }).map((task) => task.id)).toEqual([
      'sooner',
      'later',
      'undated',
    ]);
  });

  it('honours the limit', () => {
    const tasks = [
      buildTask({ id: 'a', dueAt: '2026-09-12T00:00:00.000Z' }),
      buildTask({ id: 'b', dueAt: '2026-09-13T00:00:00.000Z' }),
    ];

    expect(selectMyTasks(tasks, { limit: 1 }).map((task) => task.id)).toEqual([
      'a',
    ]);
  });
});

describe('isTaskOverdue', () => {
  const now = new Date(2026, 8, 18);

  it('is true for an incomplete task past its due date', () => {
    expect(
      isTaskOverdue(
        buildTask({ id: 'task', dueAt: '2026-09-17T00:00:00.000Z' }),
        now,
      ),
    ).toBe(true);
  });

  it('is false for a completed or undated task', () => {
    expect(
      isTaskOverdue(
        buildTask({
          id: 'task',
          status: 'DONE',
          dueAt: '2026-09-17T00:00:00.000Z',
        }),
        now,
      ),
    ).toBe(false);
    expect(isTaskOverdue(buildTask({ id: 'task' }), now)).toBe(false);
  });
});
