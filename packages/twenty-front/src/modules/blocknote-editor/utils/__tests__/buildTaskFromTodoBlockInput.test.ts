import { buildTaskFromTodoBlockInput } from '@/blocknote-editor/utils/buildTaskFromTodoBlockInput';
import { describe, expect, it } from '@jest/globals';

describe('buildTaskFromTodoBlockInput', () => {
  it('builds a TODO task from the to-do title', () => {
    expect(
      buildTaskFromTodoBlockInput({ taskId: 'task-1', title: '  Relancer ' }),
    ).toEqual({ id: 'task-1', title: 'Relancer', status: 'TODO' });
  });

  it('omits dueAt when no date is provided', () => {
    const input = buildTaskFromTodoBlockInput({
      taskId: 'task-1',
      title: 'Relancer',
    });

    expect(input).not.toBeNull();
    expect(input).not.toHaveProperty('dueAt');
  });

  it('keeps an explicit due date', () => {
    expect(
      buildTaskFromTodoBlockInput({
        taskId: 'task-1',
        title: 'Relancer',
        dueAt: '2026-10-01T12:00:00.000Z',
      }),
    ).toEqual({
      id: 'task-1',
      title: 'Relancer',
      status: 'TODO',
      dueAt: '2026-10-01T12:00:00.000Z',
    });
  });

  it('refuses a blank title', () => {
    expect(
      buildTaskFromTodoBlockInput({ taskId: 'task-1', title: '   ' }),
    ).toBeNull();
  });
});
