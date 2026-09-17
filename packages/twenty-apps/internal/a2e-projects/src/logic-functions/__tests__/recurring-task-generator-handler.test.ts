import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generateRecurringTasks } from '../handlers/recurring-task-generator-handler.ts';
import { type RecurringTaskGeneratorInput } from '../../lib/recurring-task-generator.ts';

// The handler is exercised against a stub Core API that enforces the same
// contract the real client does: `query` returns only matching rows and
// `createTasks` appends to the store. Two runs over the same window therefore
// replay a real cron retry, which is what the duplicate check must survive.

type TaskRow = {
  id: string;
  title: string;
  dueAt: string;
  projectId: string;
};

type CreatedTask = {
  title: string;
  dueAt: string;
  projectId: string;
  position?: string;
  projectStatus?: string;
};

type TaskFilter = {
  title: { eq: string };
  dueAt: { eq: string };
  projectId: { eq: string };
};

const buildClient = (initialTasks: TaskRow[]) => {
  const tasks = [...initialTasks];
  const filters: TaskFilter[] = [];
  const created: CreatedTask[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.tasks as { __args: { filter: TaskFilter } };
      const filter = entry.__args.filter;

      filters.push(filter);

      const match = tasks.find(
        (task) =>
          task.title === filter.title.eq &&
          task.dueAt === filter.dueAt.eq &&
          task.projectId === filter.projectId.eq,
      );

      return { tasks: { edges: match ? [{ node: { id: match.id } }] : [] } };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const entry = selection.createTasks as {
        __args: { data: CreatedTask[] };
      };
      const data = entry.__args.data[0];

      created.push(data);
      tasks.push({ ...data, id: `created-${created.length}` });

      return { createTasks: [{ id: `created-${created.length}` }] };
    },
  };

  return { client, tasks, filters, created };
};

const input = (
  overrides: Partial<RecurringTaskGeneratorInput> = {},
): RecurringTaskGeneratorInput => ({
  template: {
    title: 'Revue hebdo',
    projectId: 'project-1',
    frequency: 'DAILY',
    interval: 1,
    startsAt: '2026-09-01T09:00:00.000Z',
  },
  window: {
    from: '2026-09-02T00:00:00.000Z',
    to: '2026-09-04T00:00:00.000Z',
  },
  ...overrides,
});

test('each due occurrence becomes one task carrying title, due date and project', async () => {
  const { client, created, filters } = buildClient([]);

  const result = await generateRecurringTasks(
    input(),
    new Date('2026-09-04T00:00:00.000Z'),
    client,
  );

  assert.deepEqual(result, {
    created: 2,
    skipped: 0,
    dueAt: ['2026-09-02T09:00:00.000Z', '2026-09-03T09:00:00.000Z'],
  });
  assert.deepEqual(created, [
    {
      title: 'Revue hebdo',
      dueAt: '2026-09-02T09:00:00.000Z',
      projectId: 'project-1',
      position: 'last',
    },
    {
      title: 'Revue hebdo',
      dueAt: '2026-09-03T09:00:00.000Z',
      projectId: 'project-1',
      position: 'last',
    },
  ]);
  assert.deepEqual(filters, [
    {
      title: { eq: 'Revue hebdo' },
      dueAt: { eq: '2026-09-02T09:00:00.000Z' },
      projectId: { eq: 'project-1' },
    },
    {
      title: { eq: 'Revue hebdo' },
      dueAt: { eq: '2026-09-03T09:00:00.000Z' },
      projectId: { eq: 'project-1' },
    },
  ]);
});

test('replaying the same window creates nothing and reports what it skipped', async () => {
  const { client, tasks } = buildClient([]);
  const now = new Date('2026-09-04T00:00:00.000Z');

  await generateRecurringTasks(input(), now, client);
  const replayed = await generateRecurringTasks(input(), now, client);

  assert.deepEqual(replayed, { created: 0, skipped: 2, dueAt: [] });
  assert.equal(tasks.length, 2);
});

test('an existing task with another due date does not block the new occurrence', async () => {
  const { client, tasks } = buildClient([
    {
      id: 'task-1',
      title: 'Revue hebdo',
      dueAt: '2026-09-02T09:00:00.000Z',
      projectId: 'project-1',
    },
  ]);

  const result = await generateRecurringTasks(
    input(),
    new Date('2026-09-04T00:00:00.000Z'),
    client,
  );

  assert.deepEqual(result, {
    created: 1,
    skipped: 1,
    dueAt: ['2026-09-03T09:00:00.000Z'],
  });
  assert.equal(tasks.length, 2);
});

test('without an explicit window the step covers the last 24 hours', async () => {
  const { client, created } = buildClient([]);

  const result = await generateRecurringTasks(
    input({ window: undefined }),
    new Date('2026-09-03T10:00:00.000Z'),
    client,
  );

  assert.deepEqual(result, {
    created: 1,
    skipped: 0,
    dueAt: ['2026-09-03T09:00:00.000Z'],
  });
  assert.equal(created.length, 1);
});

test('the recipe project status is written onto the generated task', async () => {
  const { client, created } = buildClient([]);
  const recipe = input();

  await generateRecurringTasks(
    {
      template: { ...recipe.template, projectStatus: 'IN_PROGRESS' },
      window: recipe.window,
    },
    new Date('2026-09-03T00:00:00.000Z'),
    client,
  );

  assert.deepEqual(created[0], {
    title: 'Revue hebdo',
    dueAt: '2026-09-02T09:00:00.000Z',
    projectId: 'project-1',
    projectStatus: 'IN_PROGRESS',
    position: 'last',
  });
});

test('a window with no due occurrence touches the Core API zero times', async () => {
  const { client, filters, created } = buildClient([]);

  const result = await generateRecurringTasks(
    input({
      window: {
        from: '2026-09-02T09:30:00.000Z',
        to: '2026-09-02T18:00:00.000Z',
      },
    }),
    new Date('2026-09-03T00:00:00.000Z'),
    client,
  );

  assert.deepEqual(result, { created: 0, skipped: 0, dueAt: [] });
  assert.deepEqual(filters, []);
  assert.deepEqual(created, []);
});
