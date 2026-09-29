import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTaskDueReminder } from '../handlers/task-due-reminder-handler.ts';

// Le handler est exercé contre un stub Core API qui applique le même contrat
// que le vrai client : `query` ne renvoie que les lignes correspondantes et
// `createCalendarEvents` ajoute au magasin. Deux passes sur la même tâche
// rejouent donc un retry réel, ce que la vérification d'idempotence doit
// survivre.

type ReminderRow = { id: string; iCalUid?: string };
type CreatedReminder = {
  title: string;
  startsAt: string;
  endsAt: string;
  reminderMinutes: number;
  iCalUid: string;
  isCanceled: boolean;
  isFullDay: boolean;
};

const buildClient = (initialReminders: ReminderRow[]) => {
  const reminders = [...initialReminders];
  const created: CreatedReminder[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.calendarEvents as {
        __args: { filter: { iCalUid: { eq: string } } };
      };
      const match = reminders.find(
        (reminder) => reminder.iCalUid === entry.__args.filter.iCalUid.eq,
      );

      return {
        calendarEvents: { edges: match ? [{ node: { id: match.id } }] : [] },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const entry = selection.createCalendarEvents as {
        __args: { data: CreatedReminder[] };
      };
      const data = entry.__args.data[0];

      created.push(data);
      reminders.push({ id: `created-${created.length}`, iCalUid: data.iCalUid });

      return { createCalendarEvents: [{ id: `created-${created.length}` }] };
    },
  };

  return { client, reminders, created };
};

test('a due task creates one native calendar reminder', async () => {
  const { client, created } = buildClient([]);

  const result = await createTaskDueReminder(
    {
      taskId: 'task-1',
      taskTitle: 'Livrer le rapport',
      dueAt: '2026-10-01T09:00:00.000Z',
      workspaceId: 'workspace-1',
    },
    client,
  );

  assert.equal(result.status, 'CREATED');
  assert.equal(result.reminderId, 'created-1');
  assert.deepEqual(created, [
    {
      title: 'Rappel – Livrer le rapport',
      startsAt: '2026-10-01T09:00:00.000Z',
      endsAt: '2026-10-01T09:30:00.000Z',
      reminderMinutes: 30,
      iCalUid: result.correlationKey,
      isCanceled: false,
      isFullDay: false,
    },
  ]);
});

test('replaying the same task creates nothing and reports what it skipped', async () => {
  const { client, reminders } = buildClient([]);

  await createTaskDueReminder(
    { taskId: 'task-1', dueAt: '2026-10-01T09:00:00.000Z' },
    client,
  );
  const replayed = await createTaskDueReminder(
    { taskId: 'task-1', dueAt: '2026-10-01T09:00:00.000Z' },
    client,
  );

  assert.equal(replayed.status, 'ALREADY_EXISTS');
  assert.equal(reminders.length, 1);
});

test('a task without a due date is rejected, never silently planned', async () => {
  const { client, reminders, created } = buildClient([]);

  const result = await createTaskDueReminder({ taskId: 'task-1' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(created, []);
  assert.deepEqual(reminders, []);
});

test('a task without an id is rejected before touching the Core API', async () => {
  const { client, created } = buildClient([]);

  const result = await createTaskDueReminder(
    { taskId: '', dueAt: '2026-10-01T09:00:00.000Z' },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(created, []);
});
